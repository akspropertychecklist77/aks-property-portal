import { NextResponse } from 'next/server';
import { enquiryService } from '@/lib/services/enquiryService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

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
    const cleanId = decodeURIComponent(id).trim();

    const enquiry = await enquiryService.getEnquiryById(cleanId);

    if (!enquiry) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/ENQUIRY_NOT_FOUND',
        title: 'Enquiry Not Found',
        detail: `Enquiry with ID "${cleanId}" does not exist in staging buffer.`,
        req: request,
        headers: corsHeaders,
      });
    }

    return successResponse(enquiry, { enquiryId: cleanId }, 200, corsHeaders);
  } catch (error: any) {
    console.error('Error in GET /api/enquiries/[id]:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Database Query Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
      headers: corsHeaders,
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    // Authenticate user
    const { user } = await authenticateRequest(request, 'enquiries:read');

    const body = await request.json().catch(() => ({}));
    const { status, rejection_reason, assigned_handler_id } = body;

    const validStatuses = ['new', 'contacted', 'accepted', 'rejected', 'spam'];
    if (status && !validStatuses.includes(status)) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_STATUS',
        title: 'Invalid Status Value',
        detail: `Status must be one of: ${validStatuses.join(', ')}`,
        req: request,
        headers: corsHeaders,
      });
    }

    await enquiryService.updateStatus(
      cleanId,
      status,
      rejection_reason,
      assigned_handler_id || user?.id
    );

    return successResponse(
      {
        id: cleanId,
        status,
        rejectionReason: rejection_reason || null,
        updatedBy: user?.username || 'staff',
      },
      {
        message: `Enquiry ${cleanId} status successfully updated to "${status}".`,
      },
      200,
      corsHeaders
    );
  } catch (error: any) {
    console.error('Error in PATCH /api/enquiries/[id]:', error);
    return problemResponse({
      status: error.message?.includes('not found') ? 404 : 500,
      type: 'https://api.akspropertychecklist.in/errors/UPDATE_ERROR',
      title: 'Status Update Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
      headers: corsHeaders,
    });
  }
}
