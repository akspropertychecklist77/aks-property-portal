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

async function runD1(sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
  return data.success;
}

async function queryD1(sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
  return data.result?.[0]?.results || [];
}

async function migrateNotificationService() {
  console.log('================================================================');
  console.log('  MIGRATION: 0006_create_notification_service.sql');
  console.log('================================================================\n');

  const migrationFile = path.resolve(__dirname, '../database/migrations/0006_create_notification_service.sql');
  const ddlContent = fs.readFileSync(migrationFile, 'utf8');

  // Parse clean SQL statements stripped of comments
  const statements = ddlContent
    .split(';')
    .map(s => s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} clean DDL schema operations against Cloudflare D1...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await runD1(stmt);
      const firstLine = stmt.split('\n')[0].substring(0, 60);
      console.log(`  [${i + 1}/${statements.length}] ✓ ${firstLine}...`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] ✗ Error executing statement:`, err.message);
      throw err;
    }
  }

  console.log('\nSeeding default notification templates and routing rules...');

  // Seed Default Templates & Rules
  const seedStatements = [
    // 1. Template: Welcome Letter Approved (Email)
    `INSERT OR IGNORE INTO notification_templates (id, template_code, template_name, event_name, channel, language_code, category, description, is_active)
     VALUES ('tmpl_wl_email_v1', 'WL_APPROVED_CLIENT_EMAIL_V1', 'Welcome Letter Client Email', 'WELCOME_LETTER_APPROVED', 'EMAIL', 'en', 'TRANSACTIONAL', 'Official welcome letterhead email with case scope and fee schedule', 1);`,

    // Version for Welcome Letter Email
    `INSERT OR IGNORE INTO notification_template_versions (id, template_id, version_number, subject_template, body_html, body_text, placeholder_schema_json, approval_status)
     VALUES ('ver_wl_email_v1', 'tmpl_wl_email_v1', 1, 'AKS Legal Chambers – Welcome & Verification Mandate: Docket {{docket_number}}',
     '<h2>Chambers of Advocate A.K. Saravanan</h2><p>Dear {{client_name}},</p><p>We have opened your property title scrutiny docket <strong>{{docket_number}}</strong> for S.F. No. {{survey_number}}, {{district}}.</p><p>80% Advance Fee Payable: <strong>₹{{advance_amount}}</strong>.</p><p><a href="{{portal_url}}">View Live Case Tracker</a></p>',
     'Chambers of Advocate A.K. Saravanan. Docket: {{docket_number}}. Client: {{client_name}}. Survey: {{survey_number}}. Advance: Rs {{advance_amount}}. Link: {{portal_url}}',
     '["client_name", "docket_number", "survey_number", "district", "advance_amount", "portal_url"]', 'PUBLISHED');`,

    // 2. Template: Welcome Letter Approved (WhatsApp)
    `INSERT OR IGNORE INTO notification_templates (id, template_code, template_name, event_name, channel, language_code, provider_template_name, category, description, is_active)
     VALUES ('tmpl_wl_wa_v1', 'WL_APPROVED_CLIENT_WA_V1', 'Welcome Letter Client WhatsApp', 'WELCOME_LETTER_APPROVED', 'WHATSAPP', 'en', 'aks_welcome_letter_v1', 'TRANSACTIONAL', 'Official WhatsApp notification for welcome letter', 1);`,

    // Version for Welcome Letter WhatsApp
    `INSERT OR IGNORE INTO notification_template_versions (id, template_id, version_number, body_text, body_json, placeholder_schema_json, approval_status, provider_approval_status)
     VALUES ('ver_wl_wa_v1', 'tmpl_wl_wa_v1', 1,
     'Namaste {{client_name}}, your property title due diligence docket {{docket_number}} has been initiated under Advocate A.K. Saravanan (MS/1245/2005). Advance payable: Rs {{advance_amount}}. Track docket: {{portal_url}}',
     '{"name": "aks_welcome_letter_v1", "components": [{"type": "body", "parameters": [{"type": "text", "text": "{{client_name}}"}, {"type": "text", "text": "{{docket_number}}"}, {"type": "text", "text": "{{advance_amount}}"}, {"type": "text", "text": "{{portal_url}}"}]}]}',
     '["client_name", "docket_number", "advance_amount", "portal_url"]', 'PUBLISHED', 'APPROVED');`,

    // 3. Routing Rules
    `INSERT OR IGNORE INTO notification_rules (id, rule_code, event_name, source_module, recipient_type, recipient_resolution, channel, template_id, priority, is_enabled)
     VALUES ('rule_wl_client_email', 'RULE_WL_CLIENT_EMAIL', 'WELCOME_LETTER_APPROVED', 'WELCOME_LETTER', 'CLIENT', 'CASE_CLIENT', 'EMAIL', 'tmpl_wl_email_v1', 'HIGH', 1);`,

    `INSERT OR IGNORE INTO notification_rules (id, rule_code, event_name, source_module, recipient_type, recipient_resolution, channel, template_id, priority, is_enabled)
     VALUES ('rule_wl_client_wa', 'RULE_WL_CLIENT_WA', 'WELCOME_LETTER_APPROVED', 'WELCOME_LETTER', 'CLIENT', 'CASE_CLIENT', 'WHATSAPP', 'tmpl_wl_wa_v1', 'HIGH', 1);`,

    // 4. In-App Internal Rule: Notify Accounts when Welcome Letter Dispatched
    `INSERT OR IGNORE INTO notification_templates (id, template_code, template_name, event_name, channel, language_code, category, description, is_active)
     VALUES ('tmpl_wl_internal_accounts', 'INTERNAL_WL_DISPATCHED_INBOX', 'Welcome Letter Dispatched Accounts Alert', 'WELCOME_LETTER_SENT', 'IN_APP', 'en', 'INTERNAL', 'Alerts accounts staff that 80% advance is due', 1);`,

    `INSERT OR IGNORE INTO notification_template_versions (id, template_id, version_number, subject_template, body_text, placeholder_schema_json, approval_status)
     VALUES ('ver_wl_internal_accounts', 'tmpl_wl_internal_accounts', 1, 'Advance Fee Due: {{docket_number}}', 'Welcome Letter sent to {{client_name}}. Advance fee of Rs {{advance_amount}} pending settlement.', '["docket_number", "client_name", "advance_amount"]', 'PUBLISHED');`,

    `INSERT OR IGNORE INTO notification_rules (id, rule_code, event_name, source_module, recipient_type, recipient_resolution, channel, template_id, priority, is_enabled)
     VALUES ('rule_wl_internal_accounts', 'RULE_WL_INTERNAL_ACCOUNTS', 'WELCOME_LETTER_SENT', 'WELCOME_LETTER', 'ACCOUNTS', 'MODULE_ROLE', 'IN_APP', 'tmpl_wl_internal_accounts', 'NORMAL', 1);`
  ];

  for (const seed of seedStatements) {
    await runD1(seed);
  }
  console.log('✓ Seeded default templates, versions, and routing rules successfully.');

  // Verification Audit
  const tables = await queryD1(
    "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'notification_%' OR name = 'client_communication_consents') ORDER BY name;"
  );

  console.log('\nVerification Audit – New Notification Tables in Live Cloudflare D1:');
  for (const t of tables) {
    console.log(`  ✓ Table: ${t.name}`);
  }

  console.log('\n================================================================');
  console.log(`  MIGRATION COMPLETE: ${tables.length} Notification Tables Live in D1`);
  console.log('================================================================\n');
}

migrateNotificationService().catch(err => {
  console.error('\nMigration Fatal Error:', err);
  process.exit(1);
});
