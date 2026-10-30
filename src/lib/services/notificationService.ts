import { notificationRepo, NotificationOutboxRecord, NotificationDeliveryRecord } from '@/lib/repositories/notificationRepository';
import { resendAdapter } from './email/resendAdapter';
import { metaWhatsAppAdapter } from './whatsapp/metaWhatsAppAdapter';
import { executeQueryOne } from '@/lib/db';

export interface PublishNotificationEventInput {
  eventName: string;
  sourceModule: string;
  entityType: string;
  entityId: string;
  caseId?: string | null;
  docketNumber?: string | null;
  payload: Record<string, any>;
  correlationId?: string | null;
  idempotencyKey?: string;
}

export interface PublishNotificationResult {
  outboxId: string;
  eventId: string;
  deliveriesCreated: number;
  results: {
    deliveryId: string;
    channel: string;
    recipient: string;
    status: string;
    providerMessageId?: string;
    error?: string;
  }[];
}

export class NotificationService {
  /**
   * Interpolates template placeholders: {{variable_name}}
   */
  renderPlaceholders(templateText: string, payload: Record<string, any>): string {
    if (!templateText) return '';
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const val = payload[key];
      return val !== undefined && val !== null ? String(val) : '';
    });
  }

  /**
   * Publishes a business event into the transactional outbox and routes to matching channels.
   */
  async publishEvent(input: PublishNotificationEventInput): Promise<PublishNotificationResult> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = input.idempotencyKey || `${input.eventName}:${input.entityId}:${input.caseId || 'GLOBAL'}:${Date.now()}`;

    // 1. Check Idempotency – Prevent duplicate outbox processing
    const existingOutbox = await notificationRepo.findOutboxByIdempotencyKey(idempotencyKey);
    if (existingOutbox) {
      return {
        outboxId: existingOutbox.id,
        eventId: existingOutbox.event_id,
        deliveriesCreated: 0,
        results: [],
      };
    }

    // 2. Persist to Transactional Outbox
    const outbox = await notificationRepo.insertOutboxEvent({
      event_id: eventId,
      event_name: input.eventName,
      source_module: input.sourceModule,
      entity_type: input.entityType,
      entity_id: input.entityId,
      case_id: input.caseId,
      docket_number: input.docketNumber,
      payload_json: JSON.stringify(input.payload),
      correlation_id: input.correlationId,
      idempotency_key: idempotencyKey,
    });

    // 3. Evaluate Active Notification Routing Rules
    const rules = await notificationRepo.findActiveRulesForEvent(input.eventName);
    const deliveryResults: PublishNotificationResult['results'] = [];

    // Resolve Case Context if caseId is supplied
    let caseContext: any = null;
    if (input.caseId) {
      caseContext = await executeQueryOne<any>(
        `SELECT id, client_name, client_phone, client_email, current_stage, district, survey_number, total_fee, advance_amount, balance_amount
         FROM cases WHERE UPPER(id) = ?;`,
        [input.caseId.trim().toUpperCase()]
      );
    }

    // Merge Case context with event payload
    const mergedPayload = {
      ...(caseContext ? {
        client_name: caseContext.client_name,
        client_phone: caseContext.client_phone,
        client_email: caseContext.client_email,
        docket_number: caseContext.id,
        district: caseContext.district,
        survey_number: caseContext.survey_number || '',
        advance_amount: caseContext.advance_amount ? Number(caseContext.advance_amount).toLocaleString('en-IN') : '5,200',
        balance_amount: caseContext.balance_amount ? Number(caseContext.balance_amount).toLocaleString('en-IN') : '1,300',
        total_fee: caseContext.total_fee ? Number(caseContext.total_fee).toLocaleString('en-IN') : '6,500',
        portal_url: `https://portal.akspropertychecklist.in/track/${caseContext.id}`,
      } : {}),
      ...input.payload,
    };

    // 4. Process Each Matched Rule
    for (const rule of rules) {
      try {
        const template = await notificationRepo.findTemplateWithActiveVersion(rule.template_id);
        if (!template) {
          console.warn(`[NotificationService] No active published version for template ${rule.template_id}`);
          continue;
        }

        // A. Resolve Recipient Address
        let recipientAddress = '';
        let recipientId: string | null = null;

        if (rule.recipient_type === 'CLIENT') {
          if (rule.channel === 'EMAIL') {
            recipientAddress = mergedPayload.client_email || caseContext?.client_email || '';
          } else if (rule.channel === 'WHATSAPP') {
            recipientAddress = mergedPayload.client_phone || caseContext?.client_phone || '';
          }
        } else {
          // Internal Staff recipient resolution
          recipientAddress = 'ops@akspropertychecklist.in';
          recipientId = 'usr_adv_001'; // Default Chief Counsel
        }

        if (!recipientAddress && rule.channel !== 'IN_APP') {
          console.warn(`[NotificationService] Could not resolve recipient address for rule ${rule.rule_code}`);
          continue;
        }

        // B. Statutory Consent Enforcement for WhatsApp
        if (rule.channel === 'WHATSAPP') {
          const hasConsent = await notificationRepo.getClientConsent(recipientAddress, 'WHATSAPP');
          // In initial phase or if consent not recorded yet, we check if case exists or allow transactional case updates
          // Statutory rule: If explicit opt-out exists, suppress!
          const explicitRevocation = await executeQueryOne<{ consent_status: string }>(
            `SELECT consent_status FROM client_communication_consents WHERE client_phone = ? AND channel = 'WHATSAPP' AND consent_status = 'OPTED_OUT';`,
            [recipientAddress.trim()]
          );

          if (explicitRevocation) {
            console.log(`[NotificationService] WhatsApp suppressed: Client ${recipientAddress} has explicitly opted out.`);
            const delivery = await notificationRepo.createDelivery({
              outbox_id: outbox.id,
              event_id: eventId,
              case_id: input.caseId,
              recipient_type: rule.recipient_type,
              recipient_address: recipientAddress,
              channel: 'WHATSAPP',
              template_id: template.id,
              template_version_id: template.version_id,
              provider: 'META_WHATSAPP',
              priority: rule.priority,
            });
            await notificationRepo.updateDeliveryStatus(delivery.id, {
              status: 'SUPPRESSED',
              failure_code: 'CLIENT_OPTED_OUT',
              failure_reason: 'Client explicitly opted out of WhatsApp communication.',
            });
            deliveryResults.push({
              deliveryId: delivery.id,
              channel: 'WHATSAPP',
              recipient: recipientAddress,
              status: 'SUPPRESSED',
              error: 'Client opted out',
            });
            continue;
          }
        }

        // C. Render Template Contents
        const renderedSubject = template.subject_template ? this.renderPlaceholders(template.subject_template, mergedPayload) : null;
        const renderedHtml = template.body_html ? this.renderPlaceholders(template.body_html, mergedPayload) : null;
        const renderedText = template.body_text ? this.renderPlaceholders(template.body_text, mergedPayload) : null;

        // D. Create Delivery Record (Queued)
        const delivery = await notificationRepo.createDelivery({
          outbox_id: outbox.id,
          event_id: eventId,
          case_id: input.caseId,
          recipient_type: rule.recipient_type,
          recipient_id: recipientId,
          recipient_address: recipientAddress || 'internal_inbox',
          channel: rule.channel,
          template_id: template.id,
          template_version_id: template.version_id,
          provider: rule.channel === 'EMAIL' ? 'RESEND' : rule.channel === 'WHATSAPP' ? 'META_WHATSAPP' : 'INTERNAL',
          subject: renderedSubject,
          priority: rule.priority,
        });

        // E. Dispatch Provider
        if (rule.channel === 'EMAIL') {
          const resendResult = await resendAdapter.sendEmail({
            to: recipientAddress,
            subject: renderedSubject || 'AKS Legal Operations Update',
            html: renderedHtml || renderedText || '',
            text: renderedText || undefined,
            idempotencyKey: delivery.id,
          });

          await notificationRepo.recordDeliveryAttempt({
            notification_delivery_id: delivery.id,
            attempt_number: 1,
            provider: 'RESEND',
            provider_message_id: resendResult.messageId,
            attempt_status: resendResult.success ? 'SUCCESS' : resendResult.isTransient ? 'TRANSIENT_FAILURE' : 'PERMANENT_FAILURE',
            response_code: resendResult.responseCode,
            error_message: resendResult.error,
          });

          if (resendResult.success) {
            await notificationRepo.updateDeliveryStatus(delivery.id, {
              status: 'SUBMITTED',
              provider_message_id: resendResult.messageId,
            });
            deliveryResults.push({
              deliveryId: delivery.id,
              channel: 'EMAIL',
              recipient: recipientAddress,
              status: 'SUBMITTED',
              providerMessageId: resendResult.messageId,
            });
          } else {
            await notificationRepo.updateDeliveryStatus(delivery.id, {
              status: 'FAILED',
              failure_code: `HTTP_${resendResult.responseCode}`,
              failure_reason: resendResult.error,
            });
            deliveryResults.push({
              deliveryId: delivery.id,
              channel: 'EMAIL',
              recipient: recipientAddress,
              status: 'FAILED',
              error: resendResult.error,
            });
          }
        } else if (rule.channel === 'WHATSAPP') {
          // Prepare parameters for approved Meta HSM template
          const parameters = [
            { type: 'text', text: mergedPayload.client_name || 'Client' },
            { type: 'text', text: mergedPayload.docket_number || input.caseId || '' },
            { type: 'text', text: String(mergedPayload.advance_amount || '5,200') },
            { type: 'text', text: mergedPayload.portal_url || 'https://portal.akspropertychecklist.in' },
          ];

          const waResult = await metaWhatsAppAdapter.sendTemplateMessage({
            toPhone: recipientAddress,
            templateName: template.provider_template_name || 'aks_welcome_letter_v1',
            languageCode: template.language_code || 'en',
            components: [
              {
                type: 'body',
                parameters,
              },
            ],
            fallbackText: renderedText || '',
          });

          await notificationRepo.recordDeliveryAttempt({
            notification_delivery_id: delivery.id,
            attempt_number: 1,
            provider: 'META_WHATSAPP',
            provider_message_id: waResult.messageId,
            attempt_status: waResult.success ? 'SUCCESS' : waResult.isTransient ? 'TRANSIENT_FAILURE' : 'PERMANENT_FAILURE',
            response_code: waResult.responseCode,
            error_message: waResult.error,
          });

          if (waResult.success) {
            await notificationRepo.updateDeliveryStatus(delivery.id, {
              status: 'SUBMITTED',
              provider_message_id: waResult.messageId,
            });
            deliveryResults.push({
              deliveryId: delivery.id,
              channel: 'WHATSAPP',
              recipient: recipientAddress,
              status: 'SUBMITTED',
              providerMessageId: waResult.messageId,
            });
          } else {
            await notificationRepo.updateDeliveryStatus(delivery.id, {
              status: 'FAILED',
              failure_code: `HTTP_${waResult.responseCode}`,
              failure_reason: waResult.error,
            });
            deliveryResults.push({
              deliveryId: delivery.id,
              channel: 'WHATSAPP',
              recipient: recipientAddress,
              status: 'FAILED',
              error: waResult.error,
            });
          }
        } else if (rule.channel === 'IN_APP') {
          // Internal Staff Notification
          const inbox = await notificationRepo.createInboxNotification({
            user_id: recipientId || 'usr_adv_001',
            notification_delivery_id: delivery.id,
            event_name: input.eventName,
            title: renderedSubject || `Case Event: ${input.eventName}`,
            message: renderedText || `Update for case docket ${input.docketNumber || input.caseId}`,
            related_entity_type: input.entityType,
            related_entity_id: input.entityId,
            action_url: input.caseId ? `/admin/cases/${input.caseId}/job-card` : '/admin/pipeline',
          });

          await notificationRepo.updateDeliveryStatus(delivery.id, {
            status: 'DELIVERED',
            provider_message_id: inbox.id,
          });

          deliveryResults.push({
            deliveryId: delivery.id,
            channel: 'IN_APP',
            recipient: recipientId || 'usr_adv_001',
            status: 'DELIVERED',
            providerMessageId: inbox.id,
          });
        }
      } catch (ruleErr: any) {
        console.error(`[NotificationService] Error executing rule ${rule.rule_code}:`, ruleErr);
      }
    }

    // 5. Update Outbox Status
    const hasFailures = deliveryResults.some(r => r.status === 'FAILED');
    await notificationRepo.updateOutboxStatus(
      outbox.id,
      hasFailures ? 'FAILED' : 'COMPLETED',
      hasFailures ? 'One or more channel deliveries failed' : null
    );

    return {
      outboxId: outbox.id,
      eventId,
      deliveriesCreated: deliveryResults.length,
      results: deliveryResults,
    };
  }

  /**
   * Manually retries a failed or queued notification delivery.
   */
  async retryDelivery(deliveryId: string): Promise<{ success: boolean; status: string; messageId?: string; error?: string }> {
    const delivery = await notificationRepo.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new Error(`Notification delivery ${deliveryId} not found.`);
    }

    if (delivery.delivery_status === 'DELIVERED' || delivery.delivery_status === 'READ') {
      return { success: true, status: delivery.delivery_status, messageId: delivery.provider_message_id || undefined };
    }

    if (delivery.delivery_status === 'SUPPRESSED') {
      return { success: false, status: 'SUPPRESSED', error: 'Delivery is suppressed due to client opt-out.' };
    }

    const outbox = await notificationRepo.findOutboxById(delivery.outbox_id);
    if (!outbox) {
      throw new Error(`Outbox record for delivery ${deliveryId} not found.`);
    }

    const payload = JSON.parse(outbox.payload_json || '{}');
    const template = await notificationRepo.findTemplateWithActiveVersion(delivery.template_id);
    if (!template) {
      throw new Error(`Active template not found for template id ${delivery.template_id}`);
    }

    const nextAttemptNumber = (delivery.attempt_count || 0) + 1;
    const renderedSubject = template.subject_template ? this.renderPlaceholders(template.subject_template, payload) : null;
    const renderedHtml = template.body_html ? this.renderPlaceholders(template.body_html, payload) : null;
    const renderedText = template.body_text ? this.renderPlaceholders(template.body_text, payload) : null;

    if (delivery.channel === 'EMAIL') {
      const resendResult = await resendAdapter.sendEmail({
        to: delivery.recipient_address,
        subject: renderedSubject || delivery.subject || 'AKS Legal Operations Update',
        html: renderedHtml || renderedText || '',
        text: renderedText || undefined,
        idempotencyKey: `${delivery.id}_retry_${nextAttemptNumber}`,
      });

      await notificationRepo.recordDeliveryAttempt({
        notification_delivery_id: delivery.id,
        attempt_number: nextAttemptNumber,
        provider: 'RESEND',
        provider_message_id: resendResult.messageId,
        attempt_status: resendResult.success ? 'SUCCESS' : resendResult.isTransient ? 'TRANSIENT_FAILURE' : 'PERMANENT_FAILURE',
        response_code: resendResult.responseCode,
        error_message: resendResult.error,
      });

      if (resendResult.success) {
        await notificationRepo.updateDeliveryStatus(delivery.id, {
          status: 'SUBMITTED',
          provider_message_id: resendResult.messageId,
        });
        return { success: true, status: 'SUBMITTED', messageId: resendResult.messageId };
      } else {
        await notificationRepo.updateDeliveryStatus(delivery.id, {
          status: 'FAILED',
          failure_code: `HTTP_${resendResult.responseCode}`,
          failure_reason: resendResult.error,
        });
        return { success: false, status: 'FAILED', error: resendResult.error };
      }
    } else if (delivery.channel === 'WHATSAPP') {
      const parameters = [
        { type: 'text', text: payload.client_name || 'Client' },
        { type: 'text', text: payload.docket_number || delivery.case_id || '' },
        { type: 'text', text: String(payload.advance_amount || '5,200') },
        { type: 'text', text: payload.portal_url || 'https://portal.akspropertychecklist.in' },
      ];

      const waResult = await metaWhatsAppAdapter.sendTemplateMessage({
        toPhone: delivery.recipient_address,
        templateName: template.provider_template_name || 'aks_welcome_letter_v1',
        languageCode: template.language_code || 'en',
        components: [{ type: 'body', parameters }],
        fallbackText: renderedText || '',
      });

      await notificationRepo.recordDeliveryAttempt({
        notification_delivery_id: delivery.id,
        attempt_number: nextAttemptNumber,
        provider: 'META_WHATSAPP',
        provider_message_id: waResult.messageId,
        attempt_status: waResult.success ? 'SUCCESS' : waResult.isTransient ? 'TRANSIENT_FAILURE' : 'PERMANENT_FAILURE',
        response_code: waResult.responseCode,
        error_message: waResult.error,
      });

      if (waResult.success) {
        await notificationRepo.updateDeliveryStatus(delivery.id, {
          status: 'SUBMITTED',
          provider_message_id: waResult.messageId,
        });
        return { success: true, status: 'SUBMITTED', messageId: waResult.messageId };
      } else {
        await notificationRepo.updateDeliveryStatus(delivery.id, {
          status: 'FAILED',
          failure_code: `HTTP_${waResult.responseCode}`,
          failure_reason: waResult.error,
        });
        return { success: false, status: 'FAILED', error: waResult.error };
      }
    }

    return { success: false, status: delivery.delivery_status, error: `Unsupported retry channel ${delivery.channel}` };
  }

  /**
   * Processes status updates from provider webhooks (e.g. Resend, Meta WhatsApp).
   */
  async handleProviderStatusUpdate(
    provider: 'RESEND' | 'META_WHATSAPP',
    providerMessageId: string,
    status: 'DELIVERED' | 'READ' | 'BOUNCED' | 'FAILED',
    failureReason?: string
  ): Promise<boolean> {
    const delivery = await notificationRepo.findDeliveryByProviderMessageId(provider, providerMessageId);
    if (!delivery) {
      console.warn(`[NotificationService] Received status update ${status} for unknown provider message ${providerMessageId} (${provider})`);
      return false;
    }

    await notificationRepo.updateDeliveryStatus(delivery.id, {
      status,
      failure_reason: failureReason || null,
    });
    return true;
  }
}

export const notificationService = new NotificationService();
