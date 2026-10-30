import { notificationRepo } from '@/lib/repositories/notificationRepository';
import { notificationService } from './notificationService';

export interface QueueMessage {
  type: 'DISPATCH_DELIVERY' | 'PROCESS_OUTBOX' | 'PUBLISH_EVENT';
  deliveryId?: string;
  outboxId?: string;
  eventPayload?: any;
}

/**
 * Cloudflare Queues batch consumer for asynchronous notification delivery.
 * Automatically configured via [[queues.consumers]] in wrangler.toml.
 */
export async function processNotificationQueueBatch(
  batch: {
    queue: string;
    messages: Array<{
      id: string;
      body: QueueMessage | string;
      ack(): void;
      retry(): void;
    }>;
  },
  env?: any
): Promise<{ processed: number; retried: number; failed: number }> {
  let processed = 0;
  let retried = 0;
  let failed = 0;

  for (const message of batch.messages) {
    try {
      const payload: QueueMessage =
        typeof message.body === 'string' ? JSON.parse(message.body) : message.body;

      if (payload.type === 'DISPATCH_DELIVERY' && payload.deliveryId) {
        const result = await notificationService.retryDelivery(payload.deliveryId);
        if (result.success) {
          message.ack();
          processed++;
        } else {
          // If status is permanent failure or suppressed, ack so it doesn't loop forever
          if (result.status === 'SUPPRESSED' || result.status === 'FAILED') {
            message.ack();
            failed++;
          } else {
            message.retry();
            retried++;
          }
        }
      } else if (payload.type === 'PUBLISH_EVENT' && payload.eventPayload) {
        await notificationService.publishEvent(payload.eventPayload);
        message.ack();
        processed++;
      } else {
        // Unknown format, ack to discard gracefully
        message.ack();
        processed++;
      }
    } catch (err: any) {
      console.error(`[QueueConsumer] Failed to process message ${message.id}:`, err);
      try {
        message.retry();
        retried++;
      } catch {
        failed++;
      }
    }
  }

  return { processed, retried, failed };
}

