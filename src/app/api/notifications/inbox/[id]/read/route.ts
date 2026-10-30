import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { id } = await params;
    const userId = user?.id || 'usr_adv_001';

    await notificationRepo.markInboxRead(id, userId);

    return successResponse({
      id,
      isRead: true,
      readAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Mark Inbox Item Read Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/INBOX_MARK_READ_FAILED',
      title: 'Failed to Mark Inbox Item Read',
      detail: error.message || 'An error occurred while updating inbox item status.',
      req: request,
    });
  }
}

