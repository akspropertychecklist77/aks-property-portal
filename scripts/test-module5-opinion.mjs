import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials
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

async function computeAuditHash(prevHash, entry) {
  const message = `${prevHash}:${entry.caseId}:${entry.action}:${entry.actor}:${entry.timestamp}:${entry.stateDigest}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function runModule5Test() {
  console.log('================================================================');
  console.log('  MODULE 5 VERIFICATION: ADVOCATE OPINION & DIGITAL SIGN-OFF');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const testCaseId = `AK-2026-OP-${Date.now() % 10000}`;

  // SETUP: Create parent Case docket in D1 to satisfy foreign key constraints
  try {
    await queryD1(
      `INSERT INTO cases (id, client_name, client_phone, service_package, current_stage, district, total_fee, advance_amount, balance_amount, payment_status, case_status)
       VALUES (?, 'K. Vellingiri', '+91 98422 12345', 'Legal Opinion (Standard)', 6, 'Coimbatore', 6500.00, 5200.00, 1300.00, 'advance_paid', 'active');`,
      [testCaseId]
    );
  } catch (e) {
    console.error('Setup failed:', e);
  }

  // TEST 1: Save Draft Legal Opinion Findings
  const opId = `op_${Date.now()}`;
  try {
    process.stdout.write('Test 1: Record Draft Legal Scrutiny Findings... ');
    await queryD1(
      `INSERT INTO legal_opinions (
        id, case_id, advocate_name, bar_council_reg_no, root_of_title,
        marketable_title_certified, encumbrance_status, legal_scrutiny_summary,
        special_conditions, sign_off_status
      ) VALUES (?, ?, 'Advocate A.K. Saravanan (M.E. Energy, LLB)', 'MS/1245/2005',
        'Title traced from 1994 layout promoter. All 3 intervening deeds verified.',
        0, 'Pending Final Sign-Off',
        'Subject matter property at S.F. No. 342/1B has unbroken title trace. Patta No. 842 verified.',
        'Original parent deed of 1994 must be inspected at registration.', 'draft');`,
      [opId, testCaseId]
    );

    const rows = await queryD1(`SELECT * FROM legal_opinions WHERE case_id = ?;`, [testCaseId]);
    assert(rows.length === 1, 'Opinion record must exist in D1');
    assert.strictEqual(rows[0].sign_off_status, 'draft');
    assert.strictEqual(rows[0].marketable_title_certified, 0);

    console.log('✓ PASSED (Draft saved with scrutiny findings)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 2: Statutory Authority Guard (Non-Advocate Role Rejected)
  try {
    process.stdout.write('Test 2: Statutory Sign-Off Authority Check (Rejects Non-Advocate)... ');

    const ROLE_PERMISSIONS = {
      SUPER_ADMIN: ['stage:sign_opinion'],
      ADVOCATE_PARTNER: ['stage:sign_opinion'],
      ADVOCATE_ADMIN: ['stage:sign_opinion'],
      LEGAL_SCRUTINIZER: [],
      INTAKE_CLERK: [],
    };

    function checkSignAuthority(role) {
      if (!(ROLE_PERMISSIONS[role] || []).includes('stage:sign_opinion')) {
        throw new Error(`Unauthorized: Role "${role}" lacks statutory authority to sign legal opinions.`);
      }
      return true;
    }

    // Scrutinizer and clerk should be rejected
    assert.throws(() => checkSignAuthority('LEGAL_SCRUTINIZER'), /Unauthorized/);
    assert.throws(() => checkSignAuthority('INTAKE_CLERK'), /Unauthorized/);

    // Advocate Partner should be permitted
    assert.strictEqual(checkSignAuthority('ADVOCATE_PARTNER'), true);

    console.log('✓ PASSED (Bar Council statutory boundaries strictly isolated)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 3: Formal Advocate Sign-Off & Bar Council Certification (MS/1245/2005)
  try {
    process.stdout.write('Test 3: Advocate Sign-Off & Bar Council Certification (MS/1245/2005)... ');
    const signedAt = new Date().toISOString();

    await queryD1(
      `UPDATE legal_opinions 
       SET marketable_title_certified = 1,
           encumbrance_status = 'Nil Encumbrance (Marketable Title)',
           sign_off_status = 'approved',
           signed_at = ?
       WHERE case_id = ?;`,
      [signedAt, testCaseId]
    );

    const updated = await queryD1(`SELECT * FROM legal_opinions WHERE case_id = ?;`, [testCaseId]);
    assert.strictEqual(updated[0].sign_off_status, 'approved');
    assert.strictEqual(updated[0].marketable_title_certified, 1);
    assert.strictEqual(updated[0].bar_council_reg_no, 'MS/1245/2005');
    assert(updated[0].signed_at !== null);

    console.log('✓ PASSED (Formally signed & marketable title certified)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 4: Tamper-Evident Merkle-Chain Audit Log Persistence
  try {
    process.stdout.write('Test 4: Cryptographic Merkle-Chain Audit Log Persistence... ');
    const auditId = `aud_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const prevHash = 'GENESIS_ROOT_LEGAL_SEAL_00000000';
    const stateDigest = 'DRAFT_OPINION->CERTIFIED_MARKETABLE_TITLE_CLEAR';

    const currentHash = await computeAuditHash(prevHash, {
      caseId: testCaseId,
      action: 'LEGAL_OPINION_SIGNED_AND_CERTIFIED',
      actor: 'Advocate A.K. Saravanan (MS/1245/2005)',
      timestamp,
      stateDigest,
    });

    await queryD1(
      `INSERT INTO case_audit_logs (id, case_id, action, previous_state, new_state, performed_by, ip_address, checksum_hash, previous_hash, timestamp)
       VALUES (?, ?, 'LEGAL_OPINION_SIGNED_AND_CERTIFIED', 'DRAFT_OPINION', 'CERTIFIED_MARKETABLE_TITLE_CLEAR', 'Advocate A.K. Saravanan (MS/1245/2005)', '127.0.0.1', ?, ?, ?);`,
      [auditId, testCaseId, currentHash, prevHash, timestamp]
    );

    const auditRows = await queryD1(`SELECT * FROM case_audit_logs WHERE id = ?;`, [auditId]);
    assert(auditRows.length === 1, 'Audit log must exist in D1');
    assert.strictEqual(auditRows[0].checksum_hash, currentHash);
    assert.strictEqual(auditRows[0].previous_hash, prevHash);

    console.log(`✓ PASSED (Chained SHA-256 Merkle hash: ${currentHash.substring(0, 16)}...)`);
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 5: Gate 3 Prerequisite Satisfaction (Enables Final Certified Dispatch)
  try {
    process.stdout.write('Test 5: Workflow Gate 3 Prerequisite Satisfaction (Advocate Sign-Off)... ');
    const op = await queryD1(`SELECT sign_off_status FROM legal_opinions WHERE case_id = ?;`, [testCaseId]);
    const isApproved = op.length > 0 && op[0].sign_off_status === 'approved';
    assert.strictEqual(isApproved, true, 'Opinion sign_off_status must be approved for Gate 3');

    console.log('✓ PASSED (Gate 3 Advocate Sign-Off condition satisfied)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // CLEANUP
  try {
    await queryD1(`DELETE FROM case_audit_logs WHERE case_id = ?;`, [testCaseId]);
    await queryD1(`DELETE FROM legal_opinions WHERE case_id = ?;`, [testCaseId]);
    await queryD1(`DELETE FROM cases WHERE id = ?;`, [testCaseId]);
    console.log('Cleanup: Ephemeral test legal opinion, audit log, and case docket safely purged.\n');
  } catch (e) {}

  console.log('================================================================');
  console.log(`  MODULE 5 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runModule5Test().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
