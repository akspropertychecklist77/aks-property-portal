import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { notificationService } from '@/lib/services/notificationService';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const eventIdHeader = request.headers.get('svix-id') || `resend_${Date.now()}`;
    
    // 1. Calculate payload hash for deduplication
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(rawBody));
    const payloadHash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const payload = JSON.parse(rawBody);
    const eventType = payload.type || 'unknown';
    const emailData = payload.data || {};
    const providerMessageId = emailData.email_id || emailData.id || null;

    // 2. Webhook Deduplication Gate
    const { isDuplicate, webhookId } = await notificationRepo.recordWebhookEvent({
      provider: 'RESEND',
      provider_event_id: eventIdHeader,
      provider_message_id: providerMessageId,
      event_type: eventType,
      payload_hash: payloadHash,
    });

    if (isDuplicate) {
      return NextResponse.json({ received: true, deduplicated: true }, { status: 200 });
    }

    // 3. Process Status Mapping
    try {
      if (providerMessageId) {
        let mappedStatus: 'DELIVERED' | 'READ' | 'BOUNCED' | 'FAILED' | null = null;
        let failureReason: string | undefined = undefined;

        if (eventType === 'email.delivered') {
          mappedStatus = 'DELIVERED';
        } else if (eventType === 'email.opened' || eventType === 'email.clicked') {
          mappedStatus = 'READ';
        } else if (eventType === 'email.bounced') {
          mappedStatus = 'BOUNCED';
          failureReason = emailData.bounce?.message || 'Email address bounced';
        } else if (eventType === 'email.complained') {
          mappedStatus = 'BOUNCED';
          failureReason = 'Recipient registered spam complaint';
        }

        if (mappedStatus) {
          await notificationService.handleProviderStatusUpdate(
            'RESEND',
            providerMessageId,
            mappedStatus,
            failureReason
          );
        }
      }

      await notificationRepo.markWebhookProcessed(webhookId, 'PROCESSED');
      return NextResponse.json({ received: true, processed: true }, { status: 200 });
    } catch (procErr: any) {
      await notificationRepo.markWebhookProcessed(webhookId, 'FAILED', procErr.message);
      throw procErr;
    }
  } catch (error: any) {
    console.error('Resend Webhook Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/RESEND_WEBHOOK_FAILURE',
      title: 'Resend Webhook Ingestion Failed',
      detail: error.message || 'An error occurred while processing Resend webhook.',
      req: request,
    });
  }
}

