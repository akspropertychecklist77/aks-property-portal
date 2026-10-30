import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const userId = user?.id || 'usr_adv_001';
    const items = await notificationRepo.getUserInbox(userId, unreadOnly, limit);
    const unreadCount = await notificationRepo.getUnreadInboxCount(userId);

    return successResponse({
      items,
      unreadCount,
      totalReturned: items.length,
    });
  } catch (error: any) {
    console.error('Get User Inbox Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/INBOX_FETCH_FAILED',
      title: 'Failed to Fetch Inbox Notifications',
      detail: error.message || 'An error occurred while fetching inbox items.',
      req: request,
    });
  }
}

