import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:manage');
    if (response) return response;

    const body = await request.json();
    const { eventName, sourceModule, entityType, entityId, caseId, docketNumber, payload, correlationId, idempotencyKey } = body;

    if (!eventName || !sourceModule || !entityType || !entityId) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_NOTIFICATION_EVENT',
        title: 'Missing Required Fields',
        detail: 'eventName, sourceModule, entityType, and entityId are required.',
        req: request,
      });
    }

    const result = await notificationService.publishEvent({
      eventName,
      sourceModule,
      entityType,
      entityId,
      caseId: caseId || undefined,
      docketNumber: docketNumber || undefined,
      payload: payload || {},
      correlationId: correlationId || undefined,
      idempotencyKey: idempotencyKey || undefined,
    });

    return successResponse(result, { eventName, entityId, publishedBy: user?.username });
  } catch (error: any) {
    console.error('Publish Notification Event Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/NOTIFICATION_PUBLISH_FAILED',
      title: 'Failed to Publish Notification Event',
      detail: error.message || 'An error occurred during event publication.',
      req: request,
    });
  }
}

