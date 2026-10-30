import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { id } = await params;
    const delivery = await notificationRepo.findDeliveryById(id);

    if (!delivery) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/DELIVERY_NOT_FOUND',
        title: 'Notification Delivery Not Found',
        detail: `No delivery record found with ID ${id}.`,
        req: request,
      });
    }

    const attempts = await notificationRepo.getDeliveryAttempts(id);

    return successResponse({
      delivery,
      attempts,
    });
  } catch (error: any) {
    console.error('Get Notification Delivery Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELIVERY_FETCH_FAILED',
      title: 'Failed to Fetch Delivery Details',
      detail: error.message || 'An error occurred while fetching delivery details.',
      req: request,
    });
  }
}

