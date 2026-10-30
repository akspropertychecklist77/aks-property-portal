import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || undefined;
    const eventName = searchParams.get('eventName') || undefined;

    const templates = await notificationRepo.listTemplates({ channel, eventName });

    return successResponse({
      templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('List Notification Templates Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/TEMPLATES_FETCH_FAILED',
      title: 'Failed to List Notification Templates',
      detail: error.message || 'An error occurred while fetching templates.',
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
      templateCode,
      templateName,
      eventName,
      channel,
      languageCode = 'en',
      providerTemplateName,
      subjectTemplate,
      bodyHtml,
      bodyText,
      bodyJson,
      placeholderSchemaJson,
    } = body;

    if (!templateCode || !templateName || !eventName || !channel) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_TEMPLATE_PAYLOAD',
        title: 'Missing Required Fields',
        detail: 'templateCode, templateName, eventName, and channel are required.',
        req: request,
      });
    }

    const templateId = await notificationRepo.createTemplate({
      template_code: templateCode,
      template_name: templateName,
      event_name: eventName,
      channel,
      language_code: languageCode,
      provider_template_name: providerTemplateName || null,
    });

    const versionId = await notificationRepo.createTemplateVersion({
      template_id: templateId,
      version_number: 1,
      subject_template: subjectTemplate || null,
      body_html: bodyHtml || null,
      body_text: bodyText || null,
      body_json: bodyJson ? (typeof bodyJson === 'string' ? bodyJson : JSON.stringify(bodyJson)) : null,
      placeholder_schema_json: placeholderSchemaJson ? (typeof placeholderSchemaJson === 'string' ? placeholderSchemaJson : JSON.stringify(placeholderSchemaJson)) : '{}',
      approval_status: 'PUBLISHED',
      created_by: user?.username || 'SYSTEM',
    });

    return successResponse(
      { templateId, versionId, templateCode, versionNumber: 1 },
      { createdBy: user?.username }
    );
  } catch (error: any) {
    console.error('Create Notification Template Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/TEMPLATE_CREATE_FAILED',
      title: 'Failed to Create Notification Template',
      detail: error.message || 'An error occurred while creating the template.',
      req: request,
    });
  }
}

