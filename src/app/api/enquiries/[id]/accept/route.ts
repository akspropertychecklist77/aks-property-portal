import { NextResponse } from 'next/server';
import { executeQueryOne, executeBatch } from '@/lib/db';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Generates the next sequential Case ID for the current calendar year.
 * Format: AK-YYYY-XXX (e.g., AK-2026-005)
 */
async function generateNextCaseId(year: number): Promise<string> {
  const pattern = `AK-${year}-%`;
  const latestCase = await executeQueryOne<{ id: string }>(
    `SELECT id FROM cases WHERE id LIKE ? ORDER BY id DESC LIMIT 1;`,
    [pattern]
  );

  if (!latestCase) {
    return `AK-${year}-001`;
  }

  const parts = latestCase.id.split('-');
  if (parts.length === 3) {
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      const nextNum = (lastNum + 1).toString().padStart(3, '0');
      return `AK-${year}-${nextNum}`;
    }
  }

  const fallbackRand = Math.floor(100 + Math.random() * 900);
  return `AK-${year}-${fallbackRand}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: enquiryId } = await params;

    // Optional authentication check: if user is logged in, verify permissions
    const { user } = await authenticateRequest(request, 'enquiries:accept');
    const handler = user?.fullName || 'Legal Desk Staff';

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body is optional
    }

    // 1. Fetch enquiry
    const enquiry = await executeQueryOne<any>(
      `SELECT * FROM enquiries WHERE id = ?;`,
      [enquiryId]
    );

    if (!enquiry) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/ENQUIRY_NOT_FOUND',
        title: 'Enquiry Not Found',
        detail: `Enquiry with ID "${enquiryId}" was not found in staging catalog.`,
        req: request,
      });
    }

    if (enquiry.status === 'accepted' && enquiry.converted_case_id) {
      return problemResponse({
        status: 409,
        type: 'https://api.akspropertychecklist.in/errors/ENQUIRY_ALREADY_ACCEPTED',
        title: 'Enquiry Already Accepted',
        detail: `This enquiry has already been accepted and converted to Case "${enquiry.converted_case_id}".`,
        req: request,
      });
    }

    // 2. Generate sequential Case ID (e.g., AK-2026-005)
    const currentYear = new Date().getFullYear();
    const caseId = body.custom_case_id || (await generateNextCaseId(currentYear));

    // 3. Determine fee structure
    let totalFee = body.total_fee;
    if (!totalFee) {
      if (enquiry.service_package?.includes('Comprehensive')) {
        totalFee = 12500;
      } else if (enquiry.service_package?.includes('Express')) {
        totalFee = 9500;
      } else {
        totalFee = 6500;
      }
    }

    const advanceAmount = body.advance_amount || Math.round(totalFee * 0.8);
    const balanceAmount = totalFee - advanceAmount;

    // 4. Atomic D1 Batch Transaction:
    // Statement 1: Insert new case into cases master table
    // Statement 2: Initialize Stage 1 Milestone log
    // Statement 3: Update enquiry status to 'accepted' with foreign link
    const statements = [
      {
        sql: `INSERT INTO cases (
          id, source_enquiry_id, client_name, client_phone, client_email,
          service_package, current_stage, district, property_address,
          survey_number, total_fee, advance_amount, balance_amount,
          payment_status, case_status
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'advance_pending', 'active');`,
        params: [
          caseId,
          enquiryId,
          enquiry.client_name,
          enquiry.client_phone,
          enquiry.client_email || null,
          enquiry.service_package || 'Legal Opinion (Standard)',
          enquiry.district || 'Coimbatore',
          enquiry.property_address || '',
          enquiry.survey_number || '',
          totalFee,
          advanceAmount,
          balanceAmount,
        ],
      },
      {
        sql: `INSERT INTO case_milestone_logs (
          id, case_id, from_stage, to_stage, action_notes, triggered_by
        ) VALUES (?, ?, NULL, 1, ?, ?);`,
        params: [
          `log_${Date.now()}`,
          caseId,
          `Enquiry [${enquiryId}] accepted by ${handler}. Promoted to active legal case at Stage 1.`,
          handler,
        ],
      },
      {
        sql: `UPDATE enquiries 
         SET status = 'accepted', converted_case_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?;`,
        params: [caseId, enquiryId],
      },
    ];

    const batchSuccess = await executeBatch(statements);

    if (!batchSuccess) {
      throw new Error('Database transaction failed during atomic case creation.');
    }

    return successResponse(
      {
        caseId,
        enquiryId,
        trackingUrl: `/track/${caseId}`,
        message: `Enquiry ${enquiryId} successfully accepted and promoted to active Case ${caseId}.`,
      },
      {
        caseId,
        enquiryId,
      },
      201
    );
  } catch (error: any) {
    console.error('Database Error in POST /api/enquiries/[id]/accept:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/ACCEPT_ENQUIRY_FAILED',
      title: 'Conversion Failed',
      detail: error.message || 'An unexpected error occurred during enquiry conversion.',
      req: request,
    });
  }
}
