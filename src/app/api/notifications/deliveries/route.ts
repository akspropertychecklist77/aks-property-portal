import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId') || undefined;
    const status = searchParams.get('status') || undefined;
    const channel = searchParams.get('channel') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const deliveries = await notificationRepo.listDeliveries({
      caseId,
      status,
      channel,
      limit,
      offset,
    });

    return successResponse({
      deliveries,
      count: deliveries.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List Notification Deliveries Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELIVERIES_FETCH_FAILED',
      title: 'Failed to List Notification Deliveries',
      detail: error.message || 'An error occurred while fetching deliveries.',
      req: request,
    });
  }
}

