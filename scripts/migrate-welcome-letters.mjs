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

async function migrate() {
  console.log('Migrating case_welcome_letters table to Cloudflare D1...');

  const ddl = `
    CREATE TABLE IF NOT EXISTS case_welcome_letters (
        id VARCHAR(36) PRIMARY KEY,
        case_id VARCHAR(30) UNIQUE NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        letter_ref_no VARCHAR(60) UNIQUE NOT NULL,
        letter_date DATE NOT NULL,
        template_version VARCHAR(20) DEFAULT 'v1.0' NOT NULL,
        scope_summary TEXT NOT NULL,
        documents_required_json TEXT NOT NULL,
        delivery_timeline_days INT DEFAULT 7 NOT NULL,
        total_fee DECIMAL(10,2) NOT NULL,
        advance_amount DECIMAL(10,2) NOT NULL,
        balance_amount DECIMAL(10,2) NOT NULL,
        terms_and_conditions TEXT NOT NULL,
        custom_clauses TEXT,
        approval_status VARCHAR(30) DEFAULT 'draft' NOT NULL,
        approved_by VARCHAR(100),
        approved_at TIMESTAMP,
        sent_status VARCHAR(30) DEFAULT 'not_sent' NOT NULL,
        sent_at TIMESTAMP,
        sent_channel VARCHAR(40),
        sent_by VARCHAR(100),
        dispatch_ref VARCHAR(100),
        pdf_storage_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wl_case_id ON case_welcome_letters(case_id);
    CREATE INDEX IF NOT EXISTS idx_wl_ref_no ON case_welcome_letters(letter_ref_no);
    CREATE INDEX IF NOT EXISTS idx_wl_status ON case_welcome_letters(approval_status, sent_status);
  `;

  await runD1(ddl);

  const tables = await queryD1("SELECT name FROM sqlite_master WHERE type='table' AND name='case_welcome_letters';");
  if (tables.length > 0) {
    console.log('✓ Successfully created table case_welcome_letters in live Cloudflare D1!');
  } else {
    console.error('✗ Migration failed: table not found.');
  }
}

migrate().catch(console.error);

