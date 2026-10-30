import { NextResponse } from 'next/server';
import { executeQuery, executeBatch } from '@/lib/db';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const cases = await executeQuery(
      `SELECT * FROM cases ORDER BY created_at DESC;`
    );
    return successResponse(cases, { count: cases.length }, 200, corsHeaders);
  } catch (error: any) {
    console.error('Database Error in GET /api/cases:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Database Query Failed',
      detail: error.message || 'An unexpected error occurred while listing cases.',
      req: request,
      headers: corsHeaders,
    });
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const { user } = await authenticateRequest(request, 'cases:create');
    const actor = user?.fullName || 'Legal Desk Staff';

    const body = await request.json().catch(() => ({}));
    const {
      id,
      client_name,
      client_phone,
      client_email,
      service_package,
      district,
      property_address,
      survey_number,
      total_fee,
      advance_amount,
    } = body;

    // Field-Level Validation
    const invalidParams: { name: string; reason: string }[] = [];

    if (!client_name || typeof client_name !== 'string' || client_name.trim().length < 2) {
      invalidParams.push({ name: 'client_name', reason: 'Client full name is required (minimum 2 characters).' });
    }

    const cleanPhone = (client_phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      invalidParams.push({ name: 'client_phone', reason: 'A valid 10-digit mobile number is required.' });
    }

    if (!district || typeof district !== 'string' || district.trim().length === 0) {
      invalidParams.push({ name: 'district', reason: 'District is required.' });
    }

    if (invalidParams.length > 0) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/VALIDATION_FAILED',
        title: 'Validation Error',
        detail: invalidParams[0].reason,
        invalidParams,
        req: request,
        headers: corsHeaders,
      });
    }

    const caseId = id || `AK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const fee = total_fee ? Number(total_fee) : 6500;
    const advance = advance_amount ? Number(advance_amount) : Math.round(fee * 0.8);
    const balance = fee - advance;

    // Atomic D1 Batch: Insert Case + Insert Stage 1 Milestone Log
    const statements = [
      {
        sql: `INSERT INTO cases (
          id, client_name, client_phone, client_email, service_package,
          current_stage, district, property_address, survey_number,
          total_fee, advance_amount, balance_amount, payment_status, case_status
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'advance_pending', 'active');`,
        params: [
          caseId,
          client_name.trim(),
          client_phone.trim(),
          client_email ? client_email.trim() : null,
          service_package || 'Legal Opinion (Standard)',
          district.trim(),
          property_address ? property_address.trim() : '',
          survey_number ? survey_number.trim() : '',
          fee,
          advance,
          balance,
        ],
      },
      {
        sql: `INSERT INTO case_milestone_logs (id, case_id, from_stage, to_stage, action_notes, triggered_by)
              VALUES (?, ?, NULL, 1, 'Initial client intake created from Legal Desk', ?);`,
        params: [`log_${Date.now()}`, caseId, actor],
      },
    ];

    const batchSuccess = await executeBatch(statements);
    if (!batchSuccess) {
      throw new Error('Database transaction failed during case creation.');
    }

    return successResponse(
      {
        caseId,
        message: 'Case successfully created in database',
      },
      { caseId },
      201,
      corsHeaders
    );
  } catch (error: any) {
    console.error('Database Error in POST /api/cases:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/CASE_CREATION_FAILED',
      title: 'Case Creation Failed',
      detail: error.message || 'An unexpected database error occurred.',
      req: request,
      headers: corsHeaders,
    });
  }
}
