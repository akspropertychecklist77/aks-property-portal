import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:manage');
    if (response) return response;

    const { id } = await params;
    const result = await notificationService.retryDelivery(id);

    return successResponse(result, { deliveryId: id, retriedBy: user?.username });
  } catch (error: any) {
    console.error('Retry Notification Delivery Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELIVERY_RETRY_FAILED',
      title: 'Failed to Retry Notification Delivery',
      detail: error.message || 'An error occurred while retrying the delivery.',
      req: request,
    });
  }
}

