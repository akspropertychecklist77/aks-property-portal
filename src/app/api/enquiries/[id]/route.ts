import { NextResponse } from 'next/server';
import { executeQueryOne, executeRun } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const enquiry = await executeQueryOne(
      `SELECT * FROM enquiries WHERE id = ?;`,
      [id]
    );

    if (!enquiry) {
      return NextResponse.json(
        { success: false, error: `Enquiry ${id} not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: enquiry },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in GET /api/enquiries/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason, assigned_handler_id } = body;

    const validStatuses = ['new', 'contacted', 'accepted', 'rejected', 'spam'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (typeof rejection_reason !== 'undefined') {
      updates.push('rejection_reason = ?');
      values.push(rejection_reason);
    }
    if (typeof assigned_handler_id !== 'undefined') {
      updates.push('assigned_handler_id = ?');
      values.push(assigned_handler_id);
    }

    values.push(id);

    await executeRun(
      `UPDATE enquiries SET ${updates.join(', ')} WHERE id = ?;`,
      values
    );

    return NextResponse.json(
      { success: true, message: `Enquiry ${id} updated successfully.` },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Database Error in PATCH /api/enquiries/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

