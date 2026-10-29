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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `SELECT * FROM enquiries`;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ` WHERE status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC;`;

    const enquiries = await executeQuery(sql, params);
    return NextResponse.json(
      { success: true, count: enquiries.length, data: enquiries },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in GET /api/enquiries:', error);
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
      client_name,
      client_phone,
      client_email,
      service_package,
      district,
      property_address,
      survey_number,
      client_notes,
      source,
    } = body;

    if (!client_name || !client_phone) {
      return NextResponse.json(
        { success: false, error: 'client_name and client_phone are required fields.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate human-friendly Enquiry ID (e.g., ENQ-2026-419)
    const enquiryId = `ENQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    await executeRun(
      `INSERT INTO enquiries (
        id, client_name, client_phone, client_email, service_package,
        district, property_address, survey_number, client_notes, source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new');`,
      [
        enquiryId,
        client_name,
        client_phone,
        client_email || null,
        service_package || 'Legal Opinion (Standard)',
        district || 'Coimbatore',
        property_address || '',
        survey_number || '',
        client_notes || '',
        source || 'website',
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Enquiry successfully registered in intake staging buffer.',
        enquiryId,
        data: {
          id: enquiryId,
          client_name,
          client_phone,
          status: 'new',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in POST /api/enquiries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

