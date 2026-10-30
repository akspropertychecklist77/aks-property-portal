import { NextResponse } from 'next/server';
import { trackingService } from '@/lib/services/trackingService';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const url = new URL(request.url);

    // Phone verification can be provided via query param or custom header
    const phone = url.searchParams.get('phone') || request.headers.get('x-client-phone');
    const token = url.searchParams.get('token');

    // If internal authenticated user is querying tracking endpoint, allow bypass
    const isInternalAuth = Boolean(
      request.headers.get('cookie')?.includes('aks_portal_session') ||
      request.headers.get('authorization')?.startsWith('Bearer ')
    );

    const trackingDetails = await trackingService.getCaseTrackingDetails({
      caseId,
      phone,
      bypassPhoneCheck: isInternalAuth || Boolean(token),
    });

    return successResponse(trackingDetails, {
      caseId: caseId.toUpperCase(),
      accessedAt: new Date().toISOString(),
      channel: 'PUBLIC_CLIENT_PORTAL',
    });
  } catch (error: any) {
    console.error('Client Tracking API Error:', error);
    const isAuthError = error.message?.includes('Security verification failed');
    const isNotFound = error.message?.includes('not found');

    return problemResponse({
      status: isAuthError ? 401 : isNotFound ? 404 : 500,
      type: isAuthError
        ? 'https://api.akspropertychecklist.in/errors/TRACKING_AUTH_REQUIRED'
        : 'https://api.akspropertychecklist.in/errors/TRACKING_FAILURE',
      title: isAuthError ? 'Phone Verification Required' : 'Tracking Request Failed',
      detail: error.message || 'An error occurred while loading case tracking details.',
      req: request,
    });
  }
}

