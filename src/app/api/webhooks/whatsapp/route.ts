import { NextResponse } from 'next/server';
import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { notificationService } from '@/lib/services/notificationService';
import { problemResponse, successResponse } from '@/lib/api/errors';

/**
 * Meta Webhook Challenge Verification (GET)
 * Meta calls this when configuring the webhook endpoint in the App Dashboard.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'aks_wa_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * Meta Webhook Status & Message Processing (POST)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // 1. Calculate payload hash for deduplication
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(rawBody));
    const payloadHash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const payload = JSON.parse(rawBody);

    // Meta sends entries
    const entries = payload.entry || [];
    let processedStatuses = 0;

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value || {};
        const statuses = val.statuses || [];

        for (const statusItem of statuses) {
          const wamid = statusItem.id;
          const status = statusItem.status; // 'sent' | 'delivered' | 'read' | 'failed'
          const eventId = `wa_${wamid}_${status}`;

          // Deduplicate
          const { isDuplicate, webhookId } = await notificationRepo.recordWebhookEvent({
            provider: 'META_WHATSAPP',
            provider_event_id: eventId,
            provider_message_id: wamid,
            event_type: `message.${status}`,
            payload_hash: payloadHash,
          });

          if (isDuplicate) continue;

          try {
            let mappedStatus: 'DELIVERED' | 'READ' | 'FAILED' | null = null;
            let failureReason: string | undefined = undefined;

            if (status === 'delivered') {
              mappedStatus = 'DELIVERED';
            } else if (status === 'read') {
              mappedStatus = 'READ';
            } else if (status === 'failed') {
              mappedStatus = 'FAILED';
              const err = statusItem.errors?.[0];
              failureReason = err ? `${err.code}: ${err.title || err.message}` : 'WhatsApp delivery failed';
            }

            if (mappedStatus) {
              await notificationService.handleProviderStatusUpdate(
                'META_WHATSAPP',
                wamid,
                mappedStatus,
                failureReason
              );
            }

            await notificationRepo.markWebhookProcessed(webhookId, 'PROCESSED');
            processedStatuses++;
          } catch (err: any) {
            await notificationRepo.markWebhookProcessed(webhookId, 'FAILED', err.message);
          }
        }
      }
    }

    return NextResponse.json({ received: true, processedCount: processedStatuses }, { status: 200 });
  } catch (error: any) {
    console.error('WhatsApp Webhook Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/WHATSAPP_WEBHOOK_FAILURE',
      title: 'WhatsApp Webhook Ingestion Failed',
      detail: error.message || 'An error occurred while processing WhatsApp webhook.',
      req: request,
    });
  }
}

