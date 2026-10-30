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

async function inspectDDL() {
  console.log('================================================================');
  console.log('  CLOUDFLARE D1 DATABASE DDL AUDIT & STATUS CHECK');
  console.log('================================================================\n');

  const tables = await queryD1(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );

  console.log(`Discovered ${tables.length} User Tables in Cloudflare D1:\n`);
  for (const t of tables) {
    console.log(`TABLE: ${t.name}`);
    console.log(t.sql);
    console.log('----------------------------------------------------------------\n');
  }

  const indexes = await queryD1(
    "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name;"
  );

  console.log(`Discovered ${indexes.length} Custom Indexes in Cloudflare D1:\n`);
  for (const idx of indexes) {
    console.log(`INDEX: ${idx.name} ON ${idx.tbl_name}`);
    if (idx.sql) console.log(idx.sql);
  }
}

inspectDDL().catch(console.error);

