import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const userId = user?.id || 'usr_adv_001';
    await notificationRepo.markAllInboxRead(userId);

    return successResponse({
      markedAllRead: true,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Mark All Inbox Read Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/INBOX_MARK_ALL_READ_FAILED',
      title: 'Failed to Mark All Inbox Read',
      detail: error.message || 'An error occurred while marking all inbox items read.',
      req: request,
    });
  }
}

