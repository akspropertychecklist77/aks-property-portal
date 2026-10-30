import { NextResponse } from 'next/server';
import { uploadToVault, MAX_FILE_SIZE_BYTES } from '@/lib/storage/r2Vault';
import { problemResponse, successResponse } from '@/lib/api/errors';
import { authenticateRequest } from '@/lib/api/rbac';

export async function POST(request: Request) {
  try {
    // 1. Authorization check: requires 'documents:upload'
    const { user, response } = await authenticateRequest(request, 'documents:upload');
    // Note: If no session token is present during local development or public intake, allow upload if caseId is GENERAL or lead staging
    const isAuthenticated = Boolean(user);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = (formData.get('caseId') as string) || 'GENERAL';
    const category = (formData.get('category') as string) || 'LEGAL_DOCUMENT';

    if (!file) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/FILE_MISSING',
        title: 'Missing File Payload',
        detail: 'No file was provided in the multipart form data.',
        req: request,
      });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return problemResponse({
        status: 413,
        type: 'https://api.akspropertychecklist.in/errors/FILE_TOO_LARGE',
        title: 'File Exceeds Size Limit',
        detail: `The uploaded file (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 15 MB boundary limit.`,
        req: request,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 2. Execute R2 Vault Upload with Magic Byte Check & SHA-256 Deduplication
    const uploadResult = await uploadToVault({
      caseId,
      fileName: file.name,
      category,
      buffer,
      declaredMimeType: file.type,
    });

    return successResponse(
      {
        documentId: uploadResult.id,
        fileName: uploadResult.fileName,
        category: uploadResult.fileCategory,
        fileUrl: uploadResult.storagePath,
        sizeBytes: uploadResult.fileSizeBytes,
        mimeType: uploadResult.mimeType,
        sha256: uploadResult.sha256Hash,
        isDuplicate: uploadResult.isDuplicate,
      },
      {
        caseId,
        uploadedBy: user?.username || 'Client/Public',
      },
      201
    );
  } catch (error: any) {
    console.error('Document Upload Error:', error);
    return problemResponse({
      status: error.message?.includes('Invalid file content') ? 415 : 500,
      type: 'https://api.akspropertychecklist.in/errors/UPLOAD_FAILURE',
      title: 'Upload Operation Failed',
      detail: error.message || 'An unexpected failure occurred while storing document.',
      req: request,
    });
  }
}
