import { NextResponse } from 'next/server';
import { enquiryService } from '@/lib/services/enquiryService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: enquiryId } = await params;

    // Authenticate user
    const { user } = await authenticateRequest(request, 'enquiries:accept');
    const handler = user?.fullName || 'Advocate A.K. Saravanan Legal Desk';

    const body = await request.json().catch(() => ({}));

    const result = await enquiryService.promoteToCase({
      enquiryId: decodeURIComponent(enquiryId).trim(),
      customCaseId: body.custom_case_id,
      totalFee: body.total_fee,
      advanceAmount: body.advance_amount,
      balanceAmount: body.balance_amount,
      handlerName: body.handler_name || handler,
    });

    return successResponse(
      {
        caseId: result.caseId,
        enquiryId: result.enquiryId,
        totalFee: result.totalFee,
        advanceAmount: result.advanceAmount,
        balanceAmount: result.balanceAmount,
        trackingUrl: result.trackingUrl,
        message: `Enquiry ${enquiryId} successfully accepted and promoted to active legal case ${result.caseId}.`,
      },
      {
        caseId: result.caseId,
        enquiryId: result.enquiryId,
      },
      201
    );
  } catch (error: any) {
    console.error('Error in POST /api/enquiries/[id]/accept:', error);
    return problemResponse({
      status: error.message?.includes('already accepted')
        ? 409
        : error.message?.includes('not exist')
        ? 404
        : 500,
      type: 'https://api.akspropertychecklist.in/errors/ACCEPT_ENQUIRY_FAILED',
      title: 'Conversion Failed',
      detail: error.message || 'An unexpected error occurred during enquiry conversion.',
      req: request,
    });
  }
}
