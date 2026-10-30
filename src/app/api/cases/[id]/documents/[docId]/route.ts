import { NextResponse } from 'next/server';
import { documentVaultService } from '@/lib/services/documentVaultService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: caseId, docId } = await params;

    // 1. Authorization check
    const { user, response } = await authenticateRequest(
      request,
      'documents:view_watermarked'
    );
    if (response) return response;

    const doc = await documentVaultService.getDocument(docId);
    if (!doc || doc.case_id.toUpperCase() !== caseId.toUpperCase()) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/DOCUMENT_NOT_FOUND',
        title: 'Document Not Found',
        detail: `Document with ID ${docId} does not exist in docket ${caseId}.`,
        req: request,
      });
    }

    const token = await documentVaultService.generateDownloadToken(
      doc.id,
      caseId,
      Boolean(doc.is_watermarked)
    );
    const downloadUrl = `/api/cases/${caseId.toUpperCase()}/documents/${doc.id}/download?token=${token}`;

    return successResponse(
      {
        ...doc,
        downloadUrl,
      },
      {
        caseId: caseId.toUpperCase(),
        queriedBy: user?.username,
      }
    );
  } catch (error: any) {
    console.error('Get Document API Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DOCUMENT_FETCH_FAILURE',
      title: 'Failed to Retrieve Document',
      detail: error.message || 'An error occurred while fetching document details.',
      req: request,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: caseId, docId } = await params;

    // 1. Authorization check: requires 'documents:delete'
    const { user, response } = await authenticateRequest(request, 'documents:delete');
    if (response) return response;

    const doc = await documentVaultService.getDocument(docId);
    if (!doc || doc.case_id.toUpperCase() !== caseId.toUpperCase()) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/DOCUMENT_NOT_FOUND',
        title: 'Document Not Found',
        detail: `Document with ID ${docId} does not exist in docket ${caseId}.`,
        req: request,
      });
    }

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await documentVaultService.deleteDocument(
      docId,
      user?.username || 'ADMIN',
      clientIp
    );

    return successResponse(
      { deleted: true, documentId: docId },
      {
        caseId: caseId.toUpperCase(),
        deletedBy: user?.username,
      }
    );
  } catch (error: any) {
    console.error('Delete Document API Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELETE_FAILURE',
      title: 'Document Deletion Failed',
      detail: error.message || 'An error occurred while deleting document.',
      req: request,
    });
  }
}
