import { NextResponse } from 'next/server';
import { executeQuery, executeRun } from '@/lib/db';

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
    return NextResponse.json(
      { success: true, count: cases.length, data: cases },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in GET /api/cases:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const caseId = id || `AK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const fee = total_fee || 6500;
    const advance = advance_amount || Math.round(fee * 0.8);
    const balance = fee - advance;

    await executeRun(
      `INSERT INTO cases (
        id, client_name, client_phone, client_email, service_package,
        current_stage, district, property_address, survey_number,
        total_fee, advance_amount, balance_amount, payment_status, case_status
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'advance_pending', 'active');`,
      [
        caseId,
        client_name,
        client_phone,
        client_email || null,
        service_package || 'Legal Opinion (Standard)',
        district || 'Coimbatore',
        property_address || '',
        survey_number || '',
        fee,
        advance,
        balance,
      ]
    );

    // Record Stage 1 audit log
    await executeRun(
      `INSERT INTO case_milestone_logs (id, case_id, from_stage, to_stage, action_notes, triggered_by)
       VALUES (?, ?, NULL, 1, 'Initial client intake created from Website', 'website');`,
      [`log_${Date.now()}`, caseId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Case successfully created in database',
        caseId,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in POST /api/cases:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

