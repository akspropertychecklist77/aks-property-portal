import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('eventName') || undefined;

    const rules = await notificationRepo.listRules(eventName);

    return successResponse({
      rules,
      count: rules.length,
    });
  } catch (error: any) {
    console.error('List Notification Rules Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/RULES_FETCH_FAILED',
      title: 'Failed to List Notification Rules',
      detail: error.message || 'An error occurred while fetching routing rules.',
      req: request,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:manage');
    if (response) return response;

    const body = await request.json();
    const {
      ruleCode,
      eventName,
      sourceModule,
      recipientType,
      recipientResolution = 'DYNAMIC_CLIENT',
      channel,
      templateId,
      languageCode = 'en',
      priority = 'NORMAL',
      isEnabled = true,
      delayMinutes = 0,
      businessHoursOnly = false,
    } = body;

    if (!ruleCode || !eventName || !sourceModule || !recipientType || !channel || !templateId) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_RULE_PAYLOAD',
        title: 'Missing Required Fields',
        detail: 'ruleCode, eventName, sourceModule, recipientType, channel, and templateId are required.',
        req: request,
      });
    }

    const ruleId = await notificationRepo.createRule({
      rule_code: ruleCode,
      event_name: eventName,
      source_module: sourceModule,
      recipient_type: recipientType,
      recipient_resolution: recipientResolution,
      channel,
      template_id: templateId,
      language_code: languageCode,
      priority,
      is_enabled: isEnabled,
      delay_minutes: delayMinutes,
      business_hours_only: businessHoursOnly,
    });

    return successResponse(
      { ruleId, ruleCode, eventName, channel },
      { createdBy: user?.username }
    );
  } catch (error: any) {
    console.error('Create Notification Rule Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/RULE_CREATE_FAILED',
      title: 'Failed to Create Notification Rule',
      detail: error.message || 'An error occurred while creating routing rule.',
      req: request,
    });
  }
}

