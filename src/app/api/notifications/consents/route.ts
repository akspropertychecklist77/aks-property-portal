import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateRequest(request, 'notifications:read');
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const clientPhone = searchParams.get('clientPhone') || undefined;
    const caseId = searchParams.get('caseId') || undefined;

    const consents = await notificationRepo.queryConsents({ clientPhone, caseId });

    return successResponse({
      consents,
      count: consents.length,
    });
  } catch (error: any) {
    console.error('Query Client Consents Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/CONSENT_QUERY_FAILED',
      title: 'Failed to Query Communication Consents',
      detail: error.message || 'An error occurred while querying consents.',
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
      caseId,
      clientPhone,
      clientEmail,
      channel,
      consentStatus,
      consentSource = 'PORTAL_OPT_IN',
      evidenceReference,
    } = body;

    if (!clientPhone || !channel || !consentStatus) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_CONSENT_PAYLOAD',
        title: 'Missing Required Fields',
        detail: 'clientPhone, channel, and consentStatus (OPTED_IN, OPTED_OUT, REVOKED) are required.',
        req: request,
      });
    }

    await notificationRepo.recordClientConsent({
      case_id: caseId || null,
      client_phone: clientPhone,
      client_email: clientEmail || null,
      channel,
      consent_status: consentStatus,
      consent_source: consentSource,
      captured_by: user?.username || 'STAFF',
      evidence_reference: evidenceReference || null,
    });

    return successResponse(
      { clientPhone, channel, consentStatus, recorded: true },
      { recordedBy: user?.username }
    );
  } catch (error: any) {
    console.error('Record Client Consent Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/CONSENT_RECORD_FAILED',
      title: 'Failed to Record Communication Consent',
      detail: error.message || 'An error occurred while recording consent.',
      req: request,
    });
  }
}

