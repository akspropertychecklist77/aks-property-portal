import { NextResponse } from 'next/server';
import { documentVaultService } from '@/lib/services/documentVaultService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check: requires view permission
    const { user, response } = await authenticateRequest(
      request,
      'documents:view_watermarked'
    );
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    const result = await documentVaultService.listDocuments(caseId, category);

    return successResponse(result, {
      caseId: caseId.toUpperCase(),
      queriedBy: user?.username || 'AuthenticatedUser',
    });
  } catch (error: any) {
    console.error('List Documents API Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DOCUMENT_FETCH_FAILURE',
      title: 'Failed to List Case Documents',
      detail: error.message || 'An unexpected error occurred while listing documents.',
      req: request,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check: requires 'documents:upload'
    const { user, response } = await authenticateRequest(request, 'documents:upload');
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'GENERAL';

    if (!file) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/FILE_MISSING',
        title: 'Missing File Payload',
        detail: 'No file was provided in the multipart form data.',
        req: request,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    const uploadResult = await documentVaultService.uploadDocument({
      caseId,
      fileName: file.name,
      category,
      buffer,
      declaredMimeType: file.type,
      actor: user?.username || 'OPERATIONS_CLERK',
      ipAddress: clientIp,
    });

    return successResponse(
      {
        document: uploadResult.document,
        isDuplicate: uploadResult.isDuplicate,
        sha256: uploadResult.sha256,
      },
      {
        caseId: caseId.toUpperCase(),
        uploadedBy: user?.username,
      },
      201
    );
  } catch (error: any) {
    console.error('Document Upload API Error:', error);
    const isValidation =
      error.message?.includes('Invalid file content') ||
      error.message?.includes('exceeds statutory 15 MB');

    return problemResponse({
      status: isValidation ? 415 : 500,
      type: 'https://api.akspropertychecklist.in/errors/UPLOAD_FAILURE',
      title: isValidation ? 'Document Validation Failure' : 'Upload Failed',
      detail: error.message || 'An error occurred during vault upload.',
      req: request,
    });
  }
}
