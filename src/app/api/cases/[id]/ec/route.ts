import { NextResponse } from 'next/server';
import { ecService } from '@/lib/services/ecService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    const matrix = await ecService.getScrutinyMatrix(caseId);

    return successResponse(matrix, { caseId });
  } catch (error: any) {
    console.error('Error in GET /api/cases/[id]/ec:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Failed to Query EC Records',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    // Authenticate user: requires 'ec:create_edit'
    const { user } = await authenticateRequest(request, 'ec:create_edit');

    const body = await request.json().catch(() => ({}));

    const result = await ecService.addRecord(caseId, {
      id: body.id,
      serial_no: body.serial_no || body.serialNo,
      search_period: body.search_period || body.period,
      doc_number: body.doc_number || body.docNumber,
      sro_name: body.sro_name || body.sro,
      deed_nature: body.deed_nature || body.natureOfDeed,
      executant: body.executant || (body.parties ? body.parties.split(' to ')[0] : undefined),
      claimant: body.claimant || (body.parties ? body.parties.split(' to ')[1] : undefined),
      is_encumbrance_flag: body.is_encumbrance_flag ?? body.isEncumbrance,
      remarks: body.remarks,
      doc_file_name: body.doc_file_name || body.docFileName,
      doc_file_url: body.doc_file_url || body.docFileUrl,
      source_type: body.source_type || body.sourceType,
      verification_status: body.verification_status || body.verificationStatus,
    });

    return successResponse(
      {
        recordId: result.id,
        caseId,
        message: '30-Year EC record successfully indexed in legal Job Card.',
      },
      { recordId: result.id, caseId },
      201
    );
  } catch (error: any) {
    console.error('Error in POST /api/cases/[id]/ec:', error);
    return problemResponse({
      status: error.message?.includes('required') ? 400 : 500,
      type: 'https://api.akspropertychecklist.in/errors/EC_CREATION_FAILED',
      title: 'EC Indexing Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    // Authenticate user
    const { user } = await authenticateRequest(request, 'ec:create_edit');

    const body = await request.json().catch(() => ({}));
    const recordId = body.id || body.recordId;

    if (!recordId) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/MISSING_ID',
        title: 'Missing Record ID',
        detail: 'The EC record ID must be provided in the request body.',
        req: request,
      });
    }

    await ecService.updateRecord(recordId, caseId, {
      serial_no: body.serial_no || body.serialNo,
      search_period: body.search_period || body.period,
      doc_number: body.doc_number || body.docNumber,
      sro_name: body.sro_name || body.sro,
      deed_nature: body.deed_nature || body.natureOfDeed,
      executant: body.executant,
      claimant: body.claimant,
      is_encumbrance_flag: body.is_encumbrance_flag ?? body.isEncumbrance,
      remarks: body.remarks,
      doc_file_name: body.doc_file_name || body.docFileName,
      doc_file_url: body.doc_file_url || body.docFileUrl,
      verification_status: body.verification_status || body.verificationStatus,
    });

    return successResponse({
      recordId,
      caseId,
      message: 'EC record updated successfully.',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/cases/[id]/ec:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/UPDATE_ERROR',
      title: 'Update Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    // Authenticate user: requires 'ec:delete'
    const { user } = await authenticateRequest(request, 'ec:delete');

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId') || searchParams.get('id');

    if (!recordId) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/MISSING_ID',
        title: 'Missing Record ID',
        detail: 'The recordId query parameter is required for deletion.',
        req: request,
      });
    }

    await ecService.deleteRecord(recordId, caseId);

    return successResponse({
      recordId,
      caseId,
      message: 'EC record deleted from Job Card.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/cases/[id]/ec:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELETE_ERROR',
      title: 'Deletion Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}
