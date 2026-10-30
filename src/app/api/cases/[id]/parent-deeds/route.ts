import { NextResponse } from 'next/server';
import { parentDeedService } from '@/lib/services/parentDeedService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    const genealogy = await parentDeedService.getTitleGenealogy(caseId);

    return successResponse(genealogy, { caseId });
  } catch (error: any) {
    console.error('Error in GET /api/cases/[id]/parent-deeds:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Failed to Query Title Genealogy',
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

    // Authenticate user: requires 'parent_deeds:edit'
    const { user } = await authenticateRequest(request, 'parent_deeds:edit');

    const body = await request.json().catch(() => ({}));

    const result = await parentDeedService.addParentDeed(caseId, {
      id: body.id,
      sequence_order: body.sequence_order || body.sequenceOrder,
      deed_type: body.deed_type || body.deedType,
      doc_number: body.doc_number || body.docNumber,
      sro_name: body.sro_name || body.sro,
      registration_date: body.registration_date || body.year || body.registrationDate,
      seller_name: body.seller_name || body.executants || body.sellerName,
      buyer_name: body.buyer_name || body.claimants || body.buyerName,
      extent: body.extent,
      link_verified: body.link_verified ?? body.scheduleMatches,
      gap_analysis_notes: body.gap_analysis_notes || body.notes,
      doc_file_name: body.doc_file_name || body.docFileName,
      doc_file_url: body.doc_file_url || body.docFileUrl,
      source_type: body.source_type || body.sourceType,
    });

    return successResponse(
      {
        recordId: result.id,
        caseId,
        message: 'Parent deed successfully indexed in title genealogy.',
      },
      { recordId: result.id, caseId },
      201
    );
  } catch (error: any) {
    console.error('Error in POST /api/cases/[id]/parent-deeds:', error);
    return problemResponse({
      status: error.message?.includes('required') ? 400 : 500,
      type: 'https://api.akspropertychecklist.in/errors/PARENT_DEED_CREATION_FAILED',
      title: 'Parent Deed Indexing Failed',
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
    const { user } = await authenticateRequest(request, 'parent_deeds:edit');

    const body = await request.json().catch(() => ({}));
    const recordId = body.id || body.recordId;

    if (!recordId) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/MISSING_ID',
        title: 'Missing Record ID',
        detail: 'Parent deed ID must be provided in the request body.',
        req: request,
      });
    }

    await parentDeedService.updateParentDeed(recordId, caseId, {
      sequence_order: body.sequence_order || body.sequenceOrder,
      deed_type: body.deed_type || body.deedType,
      doc_number: body.doc_number || body.docNumber,
      sro_name: body.sro_name || body.sro,
      registration_date: body.registration_date || body.year || body.registrationDate,
      seller_name: body.seller_name || body.executants || body.sellerName,
      buyer_name: body.buyer_name || body.claimants || body.buyerName,
      extent: body.extent,
      link_verified: body.link_verified ?? body.scheduleMatches,
      gap_analysis_notes: body.gap_analysis_notes || body.notes,
      doc_file_name: body.doc_file_name || body.docFileName,
      doc_file_url: body.doc_file_url || body.docFileUrl,
    });

    return successResponse({
      recordId,
      caseId,
      message: 'Parent deed updated successfully in title genealogy.',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/cases/[id]/parent-deeds:', error);
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

    // Authenticate user
    const { user } = await authenticateRequest(request, 'parent_deeds:edit');

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

    await parentDeedService.deleteParentDeed(recordId, caseId);

    return successResponse({
      recordId,
      caseId,
      message: 'Parent deed deleted from title genealogy.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/cases/[id]/parent-deeds:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELETE_ERROR',
      title: 'Deletion Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

