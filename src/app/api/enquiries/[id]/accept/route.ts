import { NextResponse } from 'next/server';
import { executeQueryOne, executeRun } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: enquiryId } = await params;
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
      return NextResponse.json(
        { success: false, error: `Enquiry with ID "${enquiryId}" was not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    if (enquiry.status === 'accepted' && enquiry.converted_case_id) {
      return NextResponse.json(
        {
          success: false,
          error: `This enquiry has already been accepted and converted to Case "${enquiry.converted_case_id}".`,
          caseId: enquiry.converted_case_id,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Generate official Case ID (e.g., AK-2026-784)
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100 + Math.random() * 900);
    const caseId = body.custom_case_id || `AK-${year}-${randomNum}`;

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
    const handler = body.handler_name || 'Legal Desk Staff';

    // 4. Insert into cases master table (Tier 2 Operations)
    await executeRun(
      `INSERT INTO cases (
        id, source_enquiry_id, client_name, client_phone, client_email,
        service_package, current_stage, district, property_address,
        survey_number, total_fee, advance_amount, balance_amount,
        payment_status, case_status
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'advance_pending', 'active');`,
      [
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
      ]
    );

    // 5. Initialize Stage 1 Milestone Audit Log
    await executeRun(
      `INSERT INTO case_milestone_logs (
        id, case_id, from_stage, to_stage, action_notes, triggered_by
      ) VALUES (?, ?, NULL, 1, ?, ?);`,
      [
        `log_${Date.now()}`,
        caseId,
        `Enquiry [${enquiryId}] accepted by ${handler}. Promoted to active legal case at Stage 1.`,
        handler,
      ]
    );

    // 6. Update enquiry record status to 'accepted' with foreign reference
    await executeRun(
      `UPDATE enquiries 
       SET status = 'accepted', converted_case_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [caseId, enquiryId]
    );

    return NextResponse.json(
      {
        success: true,
        message: `Enquiry ${enquiryId} successfully accepted and promoted to active Case ${caseId}.`,
        caseId,
        enquiryId,
        trackingUrl: `/track/${caseId}`,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in POST /api/enquiries/[id]/accept:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

