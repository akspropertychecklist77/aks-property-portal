import { executeQuery, executeQueryOne, executeRun, executeBatch } from '@/lib/db';

export interface NotificationOutboxRecord {
  id: string;
  event_id: string;
  event_name: string;
  source_module: string;
  entity_type: string;
  entity_id: string;
  case_id: string | null;
  docket_number: string | null;
  payload_json: string;
  correlation_id: string | null;
  idempotency_key: string;
  status: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'COMPLETED' | 'FAILED';
  last_error: string | null;
  retry_count: number;
  published_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryRecord {
  id: string;
  outbox_id: string;
  event_id: string;
  case_id: string | null;
  recipient_type: string;
  recipient_id: string | null;
  recipient_address: string;
  recipient_address_hash: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'IN_APP';
  template_id: string;
  template_version_id: string;
  provider: 'RESEND' | 'META_WHATSAPP' | 'INTERNAL';
  provider_message_id: string | null;
  subject: string | null;
  delivery_status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SUBMITTED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED' | 'REJECTED' | 'CANCELLED' | 'SUPPRESSED';
  priority: string;
  attempt_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  failure_code: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRuleRecord {
  id: string;
  rule_code: string;
  event_name: string;
  source_module: string;
  recipient_type: string;
  recipient_resolution: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'IN_APP';
  template_id: string;
  language_code: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  is_enabled: boolean;
  delay_minutes: number;
  business_hours_only: boolean;
  max_reminders: number;
}

export interface NotificationTemplateWithVersion {
  id: string;
  template_code: string;
  template_name: string;
  event_name: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'IN_APP';
  language_code: string;
  provider_template_name: string | null;
  version_number: number;
  version_id: string;
  subject_template: string | null;
  body_html: string | null;
  body_text: string | null;
  body_json: string | null;
  placeholder_schema_json: string;
  approval_status: string;
}

export interface NotificationInboxRecord {
  id: string;
  user_id: string;
  notification_delivery_id: string | null;
  event_name: string;
  title: string;
  message: string;
  related_entity_type: string;
  related_entity_id: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export class NotificationRepository {
  /**
   * Helper to hash recipient address (phone/email) using Web Crypto SHA-256
   */
  async hashAddress(address: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(address.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ---------------------------------------------------------------------------
  // 1. OUTBOX OPERATIONS
  // ---------------------------------------------------------------------------
  async insertOutboxEvent(event: {
    id?: string;
    event_id: string;
    event_name: string;
    source_module: string;
    entity_type: string;
    entity_id: string;
    case_id?: string | null;
    docket_number?: string | null;
    payload_json: string;
    correlation_id?: string | null;
    idempotency_key: string;
  }): Promise<NotificationOutboxRecord> {
    const id = event.id || `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    await executeRun(
      `INSERT INTO notification_outbox (
        id, event_id, event_name, source_module, entity_type, entity_id,
        case_id, docket_number, payload_json, correlation_id, idempotency_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING');`,
      [
        id,
        event.event_id,
        event.event_name,
        event.source_module,
        event.entity_type,
        event.entity_id,
        event.case_id || null,
        event.docket_number || null,
        event.payload_json,
        event.correlation_id || null,
        event.idempotency_key,
      ]
    );

    const record = await this.findOutboxById(id);
    if (!record) throw new Error(`Failed to retrieve inserted outbox record ${id}`);
    return record;
  }

  async findOutboxById(id: string): Promise<NotificationOutboxRecord | null> {
    return await executeQueryOne<NotificationOutboxRecord>(
      `SELECT * FROM notification_outbox WHERE id = ?;`,
      [id]
    );
  }

  async findOutboxByIdempotencyKey(key: string): Promise<NotificationOutboxRecord | null> {
    return await executeQueryOne<NotificationOutboxRecord>(
      `SELECT * FROM notification_outbox WHERE idempotency_key = ?;`,
      [key]
    );
  }

  async getPendingOutboxEvents(limit = 20): Promise<NotificationOutboxRecord[]> {
    return await executeQuery<NotificationOutboxRecord>(
      `SELECT * FROM notification_outbox 
       WHERE status IN ('PENDING', 'FAILED') AND retry_count < 5
       ORDER BY created_at ASC LIMIT ?;`,
      [limit]
    );
  }

  async updateOutboxStatus(
    id: string,
    status: 'PROCESSING' | 'PUBLISHED' | 'COMPLETED' | 'FAILED',
    lastError?: string | null
  ): Promise<void> {
    const isCompleted = status === 'COMPLETED';
    const isPublished = status === 'PUBLISHED';

    await executeRun(
      `UPDATE notification_outbox 
       SET status = ?, 
           last_error = ?,
           retry_count = retry_count + (CASE WHEN ? = 'FAILED' THEN 1 ELSE 0 END),
           published_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE published_at END,
           processed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE processed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [status, lastError || null, status, isPublished ? 1 : 0, isCompleted ? 1 : 0, id]
    );
  }

  // ---------------------------------------------------------------------------
  // 2. RULES & TEMPLATES RESOLUTION
  // ---------------------------------------------------------------------------
  async findActiveRulesForEvent(eventName: string): Promise<NotificationRuleRecord[]> {
    return await executeQuery<NotificationRuleRecord>(
      `SELECT * FROM notification_rules 
       WHERE event_name = ? AND is_enabled = 1 
       ORDER BY priority DESC;`,
      [eventName]
    );
  }

  async findTemplateWithActiveVersion(templateId: string): Promise<NotificationTemplateWithVersion | null> {
    return await executeQueryOne<NotificationTemplateWithVersion>(
      `SELECT 
        t.id, t.template_code, t.template_name, t.event_name, t.channel, t.language_code, t.provider_template_name,
        v.id as version_id, v.version_number, v.subject_template, v.body_html, v.body_text, v.body_json,
        v.placeholder_schema_json, v.approval_status
       FROM notification_templates t
       JOIN notification_template_versions v ON v.template_id = t.id
       WHERE t.id = ? AND t.is_active = 1 AND v.approval_status = 'PUBLISHED'
       ORDER BY v.version_number DESC LIMIT 1;`,
      [templateId]
    );
  }

  // ---------------------------------------------------------------------------
  // 3. CONSENT OPERATIONS (Meta WhatsApp & Email Compliance)
  // ---------------------------------------------------------------------------
  async getClientConsent(phone: string, channel: 'WHATSAPP' | 'EMAIL'): Promise<boolean> {
    const record = await executeQueryOne<{ consent_status: string }>(
      `SELECT consent_status FROM client_communication_consents
       WHERE client_phone = ? AND channel = ?
       ORDER BY consent_timestamp DESC LIMIT 1;`,
      [phone.trim(), channel]
    );
    return record?.consent_status === 'OPTED_IN';
  }

  async recordClientConsent(input: {
    case_id?: string | null;
    client_phone: string;
    client_email?: string | null;
    channel: 'WHATSAPP' | 'EMAIL';
    consent_status: 'OPTED_IN' | 'OPTED_OUT' | 'REVOKED';
    consent_source: string;
    captured_by?: string | null;
    evidence_reference?: string | null;
  }): Promise<void> {
    const id = `cns_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeRun(
      `INSERT INTO client_communication_consents (
        id, case_id, client_phone, client_email, channel, consent_status,
        consent_source, captured_by, evidence_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.case_id || null,
        input.client_phone.trim(),
        input.client_email ? input.client_email.trim() : null,
        input.channel,
        input.consent_status,
        input.consent_source,
        input.captured_by || null,
        input.evidence_reference || null,
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // 4. DELIVERY OPERATIONS
  // ---------------------------------------------------------------------------
  async createDelivery(input: {
    outbox_id: string;
    event_id: string;
    case_id?: string | null;
    recipient_type: string;
    recipient_id?: string | null;
    recipient_address: string;
    channel: 'EMAIL' | 'WHATSAPP' | 'IN_APP';
    template_id: string;
    template_version_id: string;
    provider: 'RESEND' | 'META_WHATSAPP' | 'INTERNAL';
    subject?: string | null;
    priority?: string;
  }): Promise<NotificationDeliveryRecord> {
    const id = `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const addressHash = await this.hashAddress(input.recipient_address);

    await executeRun(
      `INSERT OR IGNORE INTO notification_deliveries (
        id, outbox_id, event_id, case_id, recipient_type, recipient_id,
        recipient_address, recipient_address_hash, channel, template_id, template_version_id,
        provider, subject, delivery_status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?);`,
      [
        id,
        input.outbox_id,
        input.event_id,
        input.case_id || null,
        input.recipient_type,
        input.recipient_id || null,
        input.recipient_address,
        addressHash,
        input.channel,
        input.template_id,
        input.template_version_id,
        input.provider,
        input.subject || null,
        input.priority || 'NORMAL',
      ]
    );

    const record = await this.findDeliveryById(id);
    if (!record) {
      // If IGNORE occurred due to existing outbox_id + recipient + channel, query existing
      const existing = await executeQueryOne<NotificationDeliveryRecord>(
        `SELECT * FROM notification_deliveries WHERE outbox_id = ? AND recipient_address_hash = ? AND channel = ?;`,
        [input.outbox_id, addressHash, input.channel]
      );
      if (existing) return existing;
      throw new Error(`Failed to create or retrieve notification delivery for outbox ${input.outbox_id}`);
    }
    return record;
  }

  async findDeliveryById(id: string): Promise<NotificationDeliveryRecord | null> {
    return await executeQueryOne<NotificationDeliveryRecord>(
      `SELECT * FROM notification_deliveries WHERE id = ?;`,
      [id]
    );
  }

  async findDeliveryByProviderMessageId(provider: string, messageId: string): Promise<NotificationDeliveryRecord | null> {
    return await executeQueryOne<NotificationDeliveryRecord>(
      `SELECT * FROM notification_deliveries WHERE provider = ? AND provider_message_id = ?;`,
      [provider, messageId]
    );
  }

  async updateDeliveryStatus(
    id: string,
    update: {
      status: 'SUBMITTED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED' | 'REJECTED' | 'SUPPRESSED';
      provider_message_id?: string | null;
      failure_code?: string | null;
      failure_reason?: string | null;
    }
  ): Promise<void> {
    const isSent = update.status === 'SENT' || update.status === 'SUBMITTED';
    const isDelivered = update.status === 'DELIVERED';
    const isRead = update.status === 'READ';
    const isFailed = update.status === 'FAILED' || update.status === 'BOUNCED' || update.status === 'REJECTED' || update.status === 'SUPPRESSED';

    await executeRun(
      `UPDATE notification_deliveries
       SET delivery_status = ?,
           provider_message_id = COALESCE(?, provider_message_id),
           failure_code = ?,
           failure_reason = ?,
           attempt_count = attempt_count + 1,
           sent_at = CASE WHEN ? AND sent_at IS NULL THEN CURRENT_TIMESTAMP ELSE sent_at END,
           delivered_at = CASE WHEN ? AND delivered_at IS NULL THEN CURRENT_TIMESTAMP ELSE delivered_at END,
           read_at = CASE WHEN ? AND read_at IS NULL THEN CURRENT_TIMESTAMP ELSE read_at END,
           failed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE failed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        update.status,
        update.provider_message_id || null,
        update.failure_code || null,
        update.failure_reason || null,
        isSent ? 1 : 0,
        isDelivered ? 1 : 0,
        isRead ? 1 : 0,
        isFailed ? 1 : 0,
        id,
      ]
    );
  }

  async recordDeliveryAttempt(attempt: {
    notification_delivery_id: string;
    attempt_number: number;
    provider: string;
    request_reference?: string | null;
    provider_message_id?: string | null;
    attempt_status: 'SUCCESS' | 'TRANSIENT_FAILURE' | 'PERMANENT_FAILURE';
    response_code?: number | null;
    error_code?: string | null;
    error_message?: string | null;
    retry_after_seconds?: number | null;
  }): Promise<void> {
    const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeRun(
      `INSERT INTO notification_delivery_attempts (
        id, notification_delivery_id, attempt_number, provider, request_reference,
        provider_message_id, attempt_status, response_code, error_code, error_message, retry_after_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        attempt.notification_delivery_id,
        attempt.attempt_number,
        attempt.provider,
        attempt.request_reference || null,
        attempt.provider_message_id || null,
        attempt.attempt_status,
        attempt.response_code || null,
        attempt.error_code || null,
        attempt.error_message || null,
        attempt.retry_after_seconds || null,
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // 5. STAFF IN-APP INBOX
  // ---------------------------------------------------------------------------
  async createInboxNotification(item: {
    user_id: string;
    notification_delivery_id?: string | null;
    event_name: string;
    title: string;
    message: string;
    related_entity_type: string;
    related_entity_id: string;
    action_url?: string | null;
  }): Promise<NotificationInboxRecord> {
    const id = `inb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeRun(
      `INSERT INTO notification_inbox (
        id, user_id, notification_delivery_id, event_name, title, message,
        related_entity_type, related_entity_id, action_url, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        id,
        item.user_id,
        item.notification_delivery_id || null,
        item.event_name,
        item.title,
        item.message,
        item.related_entity_type,
        item.related_entity_id,
        item.action_url || null,
      ]
    );

    const record = await executeQueryOne<NotificationInboxRecord>(
      `SELECT * FROM notification_inbox WHERE id = ?;`,
      [id]
    );
    if (!record) throw new Error(`Failed to retrieve inserted inbox notification ${id}`);
    return record;
  }

  async getUserInbox(userId: string, unreadOnly = false, limit = 50): Promise<NotificationInboxRecord[]> {
    const sql = unreadOnly
      ? `SELECT * FROM notification_inbox WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT ?;`
      : `SELECT * FROM notification_inbox WHERE user_id = ? ORDER BY created_at DESC LIMIT ?;`;
    return await executeQuery<NotificationInboxRecord>(sql, [userId, limit]);
  }

  async markInboxRead(id: string, userId: string): Promise<void> {
    await executeRun(
      `UPDATE notification_inbox 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?;`,
      [id, userId]
    );
  }

  async markAllInboxRead(userId: string): Promise<void> {
    await executeRun(
      `UPDATE notification_inbox 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND is_read = 0;`,
      [userId]
    );
  }

  async getUnreadInboxCount(userId: string): Promise<number> {
    const res = await executeQueryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM notification_inbox WHERE user_id = ? AND is_read = 0;`,
      [userId]
    );
    return res?.count || 0;
  }

  // ---------------------------------------------------------------------------
  // 6. WEBHOOK DEDUPLICATION & LOGGING
  // ---------------------------------------------------------------------------
  async recordWebhookEvent(event: {
    provider: 'RESEND' | 'META_WHATSAPP';
    provider_event_id: string;
    provider_message_id?: string | null;
    event_type: string;
    payload_hash: string;
  }): Promise<{ isDuplicate: boolean; webhookId: string }> {
    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      await executeRun(
        `INSERT INTO notification_webhook_events (
          id, provider, provider_event_id, provider_message_id, event_type, payload_hash, processing_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING');`,
        [
          id,
          event.provider,
          event.provider_event_id,
          event.provider_message_id || null,
          event.event_type,
          event.payload_hash,
        ]
      );
      return { isDuplicate: false, webhookId: id };
    } catch {
      // UNIQUE constraint violation: Duplicate event from provider
      return { isDuplicate: true, webhookId: '' };
    }
  }

  async markWebhookProcessed(id: string, status: 'PROCESSED' | 'FAILED' | 'IGNORED', error?: string): Promise<void> {
    await executeRun(
      `UPDATE notification_webhook_events
       SET processing_status = ?, processing_error = ?, processed_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [status, error || null, id]
    );
  }

  // ---------------------------------------------------------------------------
  // 7. QUERY & MANAGEMENT EXTENSIONS
  // ---------------------------------------------------------------------------
  async listDeliveries(filter: {
    caseId?: string;
    status?: string;
    channel?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotificationDeliveryRecord[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.caseId) {
      conditions.push('case_id = ?');
      params.push(filter.caseId.trim().toUpperCase());
    }
    if (filter.status) {
      conditions.push('delivery_status = ?');
      params.push(filter.status);
    }
    if (filter.channel) {
      conditions.push('channel = ?');
      params.push(filter.channel);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    return await executeQuery<NotificationDeliveryRecord>(
      `SELECT * FROM notification_deliveries ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
      params
    );
  }

  async getDeliveryAttempts(deliveryId: string): Promise<any[]> {
    return await executeQuery<any>(
      `SELECT * FROM notification_delivery_attempts WHERE notification_delivery_id = ? ORDER BY attempt_number ASC;`,
      [deliveryId]
    );
  }

  async listTemplates(filter?: { channel?: string; eventName?: string }): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.channel) {
      conditions.push('t.channel = ?');
      params.push(filter.channel);
    }
    if (filter?.eventName) {
      conditions.push('t.event_name = ?');
      params.push(filter.eventName);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return await executeQuery<any>(
      `SELECT t.*, v.version_number, v.approval_status, v.subject_template, v.body_text
       FROM notification_templates t
       LEFT JOIN notification_template_versions v ON v.template_id = t.id AND v.approval_status = 'PUBLISHED'
       ${whereClause}
       ORDER BY t.created_at DESC;`,
      params
    );
  }

  async createTemplate(input: {
    id?: string;
    template_code: string;
    template_name: string;
    event_name: string;
    channel: 'EMAIL' | 'WHATSAPP' | 'IN_APP';
    language_code?: string;
    provider_template_name?: string | null;
  }): Promise<string> {
    const id = input.id || `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeRun(
      `INSERT INTO notification_templates (
        id, template_code, template_name, event_name, channel, language_code, provider_template_name, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        id,
        input.template_code,
        input.template_name,
        input.event_name,
        input.channel,
        input.language_code || 'en',
        input.provider_template_name || null,
      ]
    );
    return id;
  }

  async createTemplateVersion(input: {
    template_id: string;
    version_number: number;
    subject_template?: string | null;
    body_html?: string | null;
    body_text?: string | null;
    body_json?: string | null;
    placeholder_schema_json?: string;
    approval_status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
    created_by?: string;
  }): Promise<string> {
    const id = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeRun(
      `INSERT INTO notification_template_versions (
        id, template_id, version_number, subject_template, body_html, body_text,
        body_json, placeholder_schema_json, approval_status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.template_id,
        input.version_number,
        input.subject_template || null,
        input.body_html || null,
        input.body_text || null,
        input.body_json || null,
        input.placeholder_schema_json || '{}',
        input.approval_status || 'PUBLISHED',
        input.created_by || 'SYSTEM',
      ]
    );
    return id;
  }

  async listRules(eventName?: string): Promise<NotificationRuleRecord[]> {
    if (eventName) {
      return await executeQuery<NotificationRuleRecord>(
        `SELECT * FROM notification_rules WHERE event_name = ? ORDER BY priority DESC;`,
        [eventName]
      );
    }
    return await executeQuery<NotificationRuleRecord>(
      `SELECT * FROM notification_rules ORDER BY event_name ASC, priority DESC;`
    );
  }

  async createRule(input: {
    id?: string;
    rule_code: string;
    event_name: string;
    source_module: string;
    recipient_type: string;
    recipient_resolution: string;
    channel: 'EMAIL' | 'WHATSAPP' | 'IN_APP';
    template_id: string;
    language_code?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    is_enabled?: boolean;
    delay_minutes?: number;
    business_hours_only?: boolean;
  }): Promise<string> {
    const id = input.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await executeRun(
      `INSERT INTO notification_rules (
        id, rule_code, event_name, source_module, recipient_type, recipient_resolution,
        channel, template_id, language_code, priority, is_enabled, delay_minutes, business_hours_only
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.rule_code,
        input.event_name,
        input.source_module,
        input.recipient_type,
        input.recipient_resolution,
        input.channel,
        input.template_id,
        input.language_code || 'en',
        input.priority || 'NORMAL',
        input.is_enabled !== false ? 1 : 0,
        input.delay_minutes || 0,
        input.business_hours_only ? 1 : 0,
      ]
    );
    return id;
  }

  async queryConsents(filter?: { clientPhone?: string; caseId?: string }): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.clientPhone) {
      conditions.push('client_phone = ?');
      params.push(filter.clientPhone.trim());
    }
    if (filter?.caseId) {
      conditions.push('case_id = ?');
      params.push(filter.caseId.trim().toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return await executeQuery<any>(
      `SELECT * FROM client_communication_consents ${whereClause} ORDER BY consent_timestamp DESC LIMIT 100;`,
      params
    );
  }
}

export const notificationRepo = new NotificationRepository();
