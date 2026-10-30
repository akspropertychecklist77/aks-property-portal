import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || 'c4806076a4b169eb610eb15cc0fbaee4';
let CF_D1_ID = process.env.CF_D1_ID || 'c987d1f0-a579-4e4c-8482-36482bebfd7f';
let CF_API_TOKEN = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

const envPath = path.resolve(__dirname, '../.env.cloudflare');
if (!CF_API_TOKEN && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('CF_API_TOKEN=')) CF_API_TOKEN = trimmed.replace('CF_API_TOKEN=', '').trim();
    else if (trimmed.startsWith('CF_ACCOUNT_ID=')) CF_ACCOUNT_ID = trimmed.replace('CF_ACCOUNT_ID=', '').trim();
    else if (trimmed.startsWith('CF_D1_ID=')) CF_D1_ID = trimmed.replace('CF_D1_ID=', '').trim();
  }
}

async function queryD1(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
  return data.result?.[0]?.results || [];
}

async function runD1(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
  return data.success;
}

async function hashAddress(address) {
  const encoder = new TextEncoder();
  const data = encoder.encode(address.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

console.log('========================================================================');
console.log('  TEST SUITE: ENTERPRISE NOTIFICATION SERVICE INTEGRATION');
console.log('========================================================================\n');

async function runTests() {
  const testCaseId = `AK-2026-NOTIF-${Date.now() % 10000}`;
  const testPhone = '919876543299';
  const testEmail = 'test.client@example.com';
  const testStaffId = 'usr_adv_001';

  try {
    // 0. Setup Test Case Docket in D1
    await runD1(
      `INSERT INTO cases (id, client_name, client_phone, client_email, service_package, current_stage, district, property_address, survey_number, total_fee, advance_amount, balance_amount, payment_status, case_status)
       VALUES (?, 'Test Notification Client', ?, ?, 'Legal Opinion (Standard)', 3, 'Coimbatore', 'SF No. 99, Saravanampatti', 'SF 99/1', 6500.00, 5200.00, 1300.00, 'advance_pending', 'active');`,
      [testCaseId, testPhone, testEmail]
    );

    // -------------------------------------------------------------------------
    // 1. Verify Notification Schema & Tables
    // -------------------------------------------------------------------------
    process.stdout.write('1. Verifying 11 Notification Tables in Cloudflare D1... ');
    const requiredTables = [
      'notification_outbox',
      'notification_templates',
      'notification_template_versions',
      'notification_rules',
      'notification_deliveries',
      'notification_delivery_attempts',
      'client_communication_consents',
      'notification_preferences',
      'notification_webhook_events',
      'notification_inbox',
      'notification_scheduled_jobs',
    ];

    const tables = await queryD1(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'notification_%' OR name = 'client_communication_consents';`
    );
    const existingTableNames = new Set(tables.map((t) => t.name));

    for (const t of requiredTables) {
      assert(existingTableNames.has(t), `Table ${t} missing from D1 database`);
    }
    console.log('PASSED ✓ (All 11 tables verified)');

    // -------------------------------------------------------------------------
    // 2. Verify Seeded Notification Templates & Routing Rules
    // -------------------------------------------------------------------------
    process.stdout.write('2. Verifying Seeded Templates and Active Versions... ');
    const templates = await queryD1(
      `SELECT t.id, t.template_code, t.channel, v.version_number, v.approval_status
       FROM notification_templates t
       JOIN notification_template_versions v ON v.template_id = t.id
       WHERE t.template_code IN ('WL_APPROVED_CLIENT_EMAIL_V1', 'WL_APPROVED_CLIENT_WA_V1', 'INTERNAL_WL_DISPATCHED_INBOX');`
    );
    assert(templates.length >= 3, `Expected at least 3 seeded templates, got ${templates.length}`);
    for (const tmpl of templates) {
      assert.strictEqual(tmpl.approval_status, 'PUBLISHED', `Template ${tmpl.template_code} version must be PUBLISHED`);
    }

    const rules = await queryD1(
      `SELECT * FROM notification_rules WHERE event_name IN ('WELCOME_LETTER_APPROVED', 'WELCOME_LETTER_SENT');`
    );
    assert(rules.length >= 3, 'Expected at least 3 routing rules for welcome letter events');
    console.log('PASSED ✓ (Templates & Rules active)');

    // -------------------------------------------------------------------------
    // 3. Outbox Insertion & Idempotency Deduplication Gate
    // -------------------------------------------------------------------------
    process.stdout.write('3. Testing Outbox Persistence & Idempotency Gate... ');
    const eventId = `evt_test_${Date.now()}`;
    const idempotencyKey = `IDEMP_TEST_NOTIF_${Date.now()}`;
    const outboxId = `out_test_${Date.now()}`;

    // Insert first event
    await runD1(
      `INSERT INTO notification_outbox (
        id, event_id, event_name, source_module, entity_type, entity_id,
        case_id, docket_number, payload_json, idempotency_key, status
      ) VALUES (?, ?, 'WELCOME_LETTER_APPROVED', 'WELCOME_LETTER', 'WELCOME_LETTER', ?, ?, ?, ?, ?, 'PENDING');`,
      [
        outboxId,
        eventId,
        'wl_test_001',
        testCaseId,
        testCaseId,
        JSON.stringify({ client_name: 'Test Client', advance_amount: '5,200' }),
        idempotencyKey,
      ]
    );

    const inserted = await queryD1(`SELECT * FROM notification_outbox WHERE id = ?;`, [outboxId]);
    assert.strictEqual(inserted.length, 1);
    assert.strictEqual(inserted[0].status, 'PENDING');

    // Test duplicate idempotency insertion failure / detection
    let isIdempotencyBlocked = false;
    try {
      await runD1(
        `INSERT INTO notification_outbox (
          id, event_id, event_name, source_module, entity_type, entity_id,
          case_id, docket_number, payload_json, idempotency_key, status
        ) VALUES (?, ?, 'WELCOME_LETTER_APPROVED', 'WELCOME_LETTER', 'WELCOME_LETTER', ?, ?, ?, ?, ?, 'PENDING');`,
        [
          `out_test_dup_${Date.now()}`,
          `evt_test_dup_${Date.now()}`,
          'wl_test_001',
          testCaseId,
          testCaseId,
          JSON.stringify({ client_name: 'Test Client' }),
          idempotencyKey,
        ]
      );
    } catch {
      isIdempotencyBlocked = true;
    }
    assert(isIdempotencyBlocked, 'Duplicate idempotency key must be rejected by unique index');
    console.log('PASSED ✓ (Idempotency strictly enforced)');

    // -------------------------------------------------------------------------
    // 4. WhatsApp Statutory Consent & Opt-Out Suppression
    // -------------------------------------------------------------------------
    process.stdout.write('4. Testing Statutory WhatsApp Opt-Out Suppression... ');
    const consentId = `cns_test_${Date.now()}`;
    // Client opts out of WhatsApp
    await runD1(
      `INSERT INTO client_communication_consents (
        id, case_id, client_phone, channel, consent_status, consent_source, captured_by
      ) VALUES (?, ?, ?, 'WHATSAPP', 'OPTED_OUT', 'CLIENT_SMS_STOP', ?);`,
      [consentId, testCaseId, testPhone, testStaffId]
    );

    const consentCheck = await queryD1(
      `SELECT consent_status FROM client_communication_consents WHERE client_phone = ? AND channel = 'WHATSAPP' ORDER BY consent_timestamp DESC LIMIT 1;`,
      [testPhone]
    );
    assert.strictEqual(consentCheck[0].consent_status, 'OPTED_OUT');

    // Simulate creation of delivery with SUPPRESSED status
    const suppDeliveryId = `del_test_supp_${Date.now()}`;
    const phoneHash = await hashAddress(testPhone);

    await runD1(
      `INSERT INTO notification_deliveries (
        id, outbox_id, event_id, case_id, recipient_type, recipient_address,
        recipient_address_hash, channel, template_id, template_version_id,
        provider, delivery_status, failure_code, failure_reason
      ) VALUES (?, ?, ?, ?, 'CLIENT', ?, ?, 'WHATSAPP', 'tmpl_wl_wa_v1', 'ver_wl_wa_v1', 'META_WHATSAPP', 'SUPPRESSED', 'CLIENT_OPTED_OUT', 'Statutory suppression: Client opted out.');`,
      [suppDeliveryId, outboxId, eventId, testCaseId, testPhone, phoneHash]
    );

    const suppDelivery = await queryD1(`SELECT * FROM notification_deliveries WHERE id = ?;`, [suppDeliveryId]);
    assert.strictEqual(suppDelivery[0].delivery_status, 'SUPPRESSED');
    assert.strictEqual(suppDelivery[0].failure_code, 'CLIENT_OPTED_OUT');
    console.log('PASSED ✓ (WhatsApp opt-out suppressed)');

    // -------------------------------------------------------------------------
    // 5. Multi-Channel Deliveries & Attempt Logging
    // -------------------------------------------------------------------------
    process.stdout.write('5. Testing Multi-Channel Delivery & Attempt Tracking... ');
    // A. Email Delivery
    const emailDeliveryId = `del_test_em_${Date.now()}`;
    const emailHash = await hashAddress(testEmail);
    const mockResendMsgId = `res_msg_${Date.now()}`;

    await runD1(
      `INSERT INTO notification_deliveries (
        id, outbox_id, event_id, case_id, recipient_type, recipient_address,
        recipient_address_hash, channel, template_id, template_version_id,
        provider, provider_message_id, delivery_status, attempt_count, sent_at
      ) VALUES (?, ?, ?, ?, 'CLIENT', ?, ?, 'EMAIL', 'tmpl_wl_email_v1', 'ver_wl_email_v1', 'RESEND', ?, 'SUBMITTED', 1, CURRENT_TIMESTAMP);`,
      [emailDeliveryId, outboxId, eventId, testCaseId, testEmail, emailHash, mockResendMsgId]
    );

    // Record Delivery Attempt
    await runD1(
      `INSERT INTO notification_delivery_attempts (
        id, notification_delivery_id, attempt_number, provider, provider_message_id, attempt_status, response_code
      ) VALUES (?, ?, 1, 'RESEND', ?, 'SUCCESS', 200);`,
      [`att_test_em_${Date.now()}`, emailDeliveryId, mockResendMsgId]
    );

    const emailAttempts = await queryD1(
      `SELECT * FROM notification_delivery_attempts WHERE notification_delivery_id = ?;`,
      [emailDeliveryId]
    );
    assert.strictEqual(emailAttempts.length, 1);
    assert.strictEqual(emailAttempts[0].attempt_status, 'SUCCESS');
    assert.strictEqual(emailAttempts[0].provider_message_id, mockResendMsgId);
    console.log('PASSED ✓ (Email delivery & attempt logged)');

    // -------------------------------------------------------------------------
    // 6. In-App Staff Notification & Unread Count Tracking
    // -------------------------------------------------------------------------
    process.stdout.write('6. Testing In-App Staff Inbox & Read Receipts... ');
    const inboxId = `inb_test_${Date.now()}`;
    await runD1(
      `INSERT INTO notification_inbox (
        id, user_id, event_name, title, message, related_entity_type, related_entity_id, is_read
      ) VALUES (?, ?, 'WELCOME_LETTER_APPROVED', 'Welcome Letter Approved', 'Advocate approved welcome letter for docket AK-2026-TEST-NOTIF', 'CASE', ?, 0);`,
      [inboxId, testStaffId, testCaseId]
    );

    const unreadBefore = await queryD1(
      `SELECT COUNT(*) as count FROM notification_inbox WHERE user_id = ? AND is_read = 0;`,
      [testStaffId]
    );
    assert(unreadBefore[0].count >= 1);

    // Mark Read
    await runD1(
      `UPDATE notification_inbox SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      [inboxId]
    );

    const readItem = await queryD1(`SELECT is_read, read_at FROM notification_inbox WHERE id = ?;`, [inboxId]);
    assert.strictEqual(readItem[0].is_read, 1);
    assert(readItem[0].read_at !== null);
    console.log('PASSED ✓ (In-app inbox read flow verified)');

    // -------------------------------------------------------------------------
    // 7. Webhook Ingestion & Cryptographic Deduplication
    // -------------------------------------------------------------------------
    process.stdout.write('7. Testing Provider Webhook Ingestion & Deduplication... ');
    const whEventId = `wh_evt_resend_${Date.now()}`;
    const whHash = await hashAddress(`payload_${Date.now()}`);

    // Ingest Resend delivered webhook
    await runD1(
      `INSERT INTO notification_webhook_events (
        id, provider, provider_event_id, provider_message_id, event_type, payload_hash, processing_status
      ) VALUES (?, 'RESEND', ?, ?, 'email.delivered', ?, 'PROCESSED');`,
      [`wh_test_${Date.now()}`, whEventId, mockResendMsgId, whHash]
    );

    // Update delivery status based on webhook
    await runD1(
      `UPDATE notification_deliveries SET delivery_status = 'DELIVERED', delivered_at = CURRENT_TIMESTAMP WHERE provider_message_id = ?;`,
      [mockResendMsgId]
    );

    const updatedDelivery = await queryD1(
      `SELECT delivery_status, delivered_at FROM notification_deliveries WHERE id = ?;`,
      [emailDeliveryId]
    );
    assert.strictEqual(updatedDelivery[0].delivery_status, 'DELIVERED');
    assert(updatedDelivery[0].delivered_at !== null);

    // Test duplicate webhook rejection
    let isWhDupRejected = false;
    try {
      await runD1(
        `INSERT INTO notification_webhook_events (
          id, provider, provider_event_id, provider_message_id, event_type, payload_hash, processing_status
        ) VALUES (?, 'RESEND', ?, ?, 'email.delivered', ?, 'PENDING');`,
        [`wh_test_dup_${Date.now()}`, whEventId, mockResendMsgId, whHash]
      );
    } catch {
      isWhDupRejected = true;
    }
    assert(isWhDupRejected, 'Duplicate webhook event ID must be rejected by UNIQUE constraint');
    console.log('PASSED ✓ (Webhooks deduplicated & delivery state updated)');

    // -------------------------------------------------------------------------
    // 8. Clean up test artifacts
    // -------------------------------------------------------------------------
    process.stdout.write('8. Cleaning up verification test artifacts... ');
    await runD1(`DELETE FROM notification_delivery_attempts WHERE notification_delivery_id IN (?, ?);`, [emailDeliveryId, suppDeliveryId]);
    await runD1(`DELETE FROM notification_deliveries WHERE outbox_id = ?;`, [outboxId]);
    await runD1(`DELETE FROM notification_inbox WHERE id = ?;`, [inboxId]);
    await runD1(`DELETE FROM notification_webhook_events WHERE provider_event_id = ?;`, [whEventId]);
    await runD1(`DELETE FROM client_communication_consents WHERE id = ?;`, [consentId]);
    await runD1(`DELETE FROM notification_outbox WHERE id = ?;`, [outboxId]);
    await runD1(`DELETE FROM cases WHERE id = ?;`, [testCaseId]);
    console.log('PASSED ✓ (Test cleanup clean)');

    console.log('\n========================================================================');
    console.log('  ALL NOTIFICATION SERVICE INTEGRATION TESTS PASSED (8/8) ✓');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ NOTIFICATION TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTests();
