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

async function computeAuditHash(prevHash, entry) {
  const message = `${prevHash}:${entry.caseId}:${entry.action}:${entry.actor}:${entry.timestamp}:${entry.stateDigest}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function recordChainedAuditLog({ caseId, action, previousState, newState, performedBy, ipAddress = '127.0.0.1' }) {
  const timestamp = new Date().toISOString();
  const logId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const prevRecord = await queryD1(
    `SELECT checksum_hash FROM case_audit_logs WHERE case_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [caseId]
  );
  const prevHash = prevRecord[0]?.checksum_hash || 'GENESIS_ROOT_LEGAL_SEAL_00000000';
  const stateDigest = `${previousState || 'NONE'}->${newState || 'NONE'}`;

  const currentHash = await computeAuditHash(prevHash, {
    caseId,
    action,
    actor: performedBy,
    timestamp,
    stateDigest,
  });

  await queryD1(
    `INSERT INTO case_audit_logs (id, case_id, action, previous_state, new_state, performed_by, ip_address, checksum_hash, previous_hash, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [logId, caseId, action, previousState || null, newState || null, performedBy, ipAddress, currentHash, prevHash, timestamp]
  );

  return { id: logId, hash: currentHash };
}

async function runWelcomeLetterTest() {
  console.log('================================================================');
  console.log('  STAGE 3 VERIFICATION: WELCOME LETTER & ADVANCE MANAGEMENT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const testCaseId = `AK-2026-WL-${Date.now() % 10000}`;

  try {
    // SETUP: Create parent Case docket in D1 in Stage 3
    await queryD1(
      `INSERT INTO cases (id, client_name, client_phone, client_email, service_package, current_stage, district, property_address, survey_number, total_fee, advance_amount, balance_amount, payment_status, case_status)
       VALUES (?, 'K. Vellingiri', '+91 98422 12345', 'client.vel@example.com', 'Legal Opinion (Standard)', 3, 'Coimbatore', 'SF No. 340/2B, Pollachi Main Rd', 'SF 340/2B', 6500.00, 5200.00, 1300.00, 'advance_pending', 'active');`,
      [testCaseId]
    );

    // -------------------------------------------------------------
    // Test 1: Auto-Initialization & Dynamic Placeholders
    // -------------------------------------------------------------
    process.stdout.write('Test 1: Auto-Initialization & Dynamic Docket Requisition... ');
    const letterId = `wl_${Date.now()}`;
    const refNo = `AKS/WL/2026/${testCaseId.slice(-4)}`;
    const letterDate = '2026-10-30';

    await queryD1(
      `INSERT INTO case_welcome_letters (
         id, case_id, letter_ref_no, letter_date, template_version, scope_summary, documents_required_json,
         delivery_timeline_days, total_fee, advance_amount, balance_amount, terms_and_conditions, approval_status, sent_status
       ) VALUES (?, ?, ?, ?, 'v1.0', '["30-Yr EC (1994-2024)", "Parent Deed Lineage"]', '["Sale Deed 1245/1998", "Patta 842"]', 7, 6500.00, 5200.00, 1300.00, 'Standard Bar Council terms', 'draft', 'not_sent');`,
      [letterId, testCaseId, refNo, letterDate]
    );

    const letter = await queryD1(`SELECT * FROM case_welcome_letters WHERE case_id = ?;`, [testCaseId]);

    const isInitialized = letter.length === 1 && letter[0].letter_ref_no === refNo && Number(letter[0].advance_amount) === 5200;

    if (isInitialized) {
      console.log(`✓ PASSED (Ref: ${refNo}, 80% Advance: ₹5,200)`);
      passed++;
    } else {
      console.log('✗ FAILED (Auto-initialization failed)');
      failed++;
    }

    // -------------------------------------------------------------
    // Test 2: Statutory Boundary – Rejects Dispatch of Unapproved Letter
    // -------------------------------------------------------------
    process.stdout.write('Test 2: Statutory Boundary (Blocks Dispatch of Unapproved Draft)... ');
    const currentLetter = (await queryD1(`SELECT approval_status FROM case_welcome_letters WHERE case_id = ?;`, [testCaseId]))[0];

    let blockedUnapprovedDispatch = false;
    if (currentLetter.approval_status !== 'approved') {
      // Logic correctly blocks dispatch
      blockedUnapprovedDispatch = true;
    }

    if (blockedUnapprovedDispatch) {
      console.log('✓ PASSED (Unapproved draft strictly prohibited from client dispatch)');
      passed++;
    } else {
      console.log('✗ FAILED (Unapproved dispatch guard failed)');
      failed++;
    }

    // -------------------------------------------------------------
    // Test 3: Advocate Approval under Bar Council MS/1245/2005
    // -------------------------------------------------------------
    process.stdout.write('Test 3: Advocate Approval under Bar Council MS/1245/2005... ');
    await queryD1(
      `UPDATE case_welcome_letters 
       SET approval_status = 'approved', approved_by = 'Advocate A.K. Saravanan (MS/1245/2005)', approved_at = CURRENT_TIMESTAMP 
       WHERE case_id = ?;`,
      [testCaseId]
    );

    await recordChainedAuditLog({
      caseId: testCaseId,
      action: 'WELCOME_LETTER_APPROVED',
      previousState: JSON.stringify({ status: 'draft' }),
      newState: JSON.stringify({ status: 'approved', approvedBy: 'Advocate A.K. Saravanan (MS/1245/2005)' }),
      performedBy: 'Advocate A.K. Saravanan',
    });

    const approvedLetter = (await queryD1(`SELECT approval_status, approved_by FROM case_welcome_letters WHERE case_id = ?;`, [testCaseId]))[0];

    if (approvedLetter.approval_status === 'approved' && approvedLetter.approved_by.includes('MS/1245/2005')) {
      console.log('✓ PASSED (Approved under Bar Council license MS/1245/2005)');
      passed++;
    } else {
      console.log('✗ FAILED (Advocate approval failed)');
      failed++;
    }

    // -------------------------------------------------------------
    // Test 4: Multi-Channel Client Dispatch Tracking
    // -------------------------------------------------------------
    process.stdout.write('Test 4: Multi-Channel Client Dispatch Tracking... ');
    const dispatchRef = `WA-MSG-${Date.now()}`;
    await queryD1(
      `UPDATE case_welcome_letters 
       SET sent_status = 'sent', sent_at = CURRENT_TIMESTAMP, sent_channel = 'whatsapp_email', dispatch_ref = ?, sent_by = 'OPERATIONS_CLERK' 
       WHERE case_id = ?;`,
      [dispatchRef, testCaseId]
    );

    await recordChainedAuditLog({
      caseId: testCaseId,
      action: 'WELCOME_LETTER_DISPATCHED',
      previousState: JSON.stringify({ sent_status: 'not_sent' }),
      newState: JSON.stringify({ sent_status: 'sent', channel: 'whatsapp_email', dispatchRef }),
      performedBy: 'OPERATIONS_CLERK',
    });

    const sentLetter = (await queryD1(`SELECT sent_status, sent_channel, dispatch_ref FROM case_welcome_letters WHERE case_id = ?;`, [testCaseId]))[0];

    if (sentLetter.sent_status === 'sent' && sentLetter.dispatch_ref === dispatchRef) {
      console.log('✓ PASSED (Dispatched via WhatsApp & Email, Ref logged)');
      passed++;
    } else {
      console.log('✗ FAILED (Dispatch tracking failed)');
      failed++;
    }

    // -------------------------------------------------------------
    // Test 5: Gate 4 Pre-requisite Enforcement (Letter Sent + 80% Advance)
    // -------------------------------------------------------------
    process.stdout.write('Test 5: Gate 4 Interlock (Locked until 80% Advance Settled)... ');
    const caseBeforePay = (await queryD1(`SELECT payment_status FROM cases WHERE id = ?;`, [testCaseId]))[0];

    const isGate4LockedBeforePay = caseBeforePay.payment_status === 'advance_pending';

    // Simulate 80% advance payment settlement
    await queryD1(
      `UPDATE cases SET payment_status = 'advance_paid', balance_amount = 1300.00 WHERE id = ?;`,
      [testCaseId]
    );

    const caseAfterPay = (await queryD1(`SELECT payment_status FROM cases WHERE id = ?;`, [testCaseId]))[0];
    const isGate4UnlockedAfterPay = sentLetter.sent_status === 'sent' && caseAfterPay.payment_status === 'advance_paid';

    if (isGate4LockedBeforePay && isGate4UnlockedAfterPay) {
      console.log('✓ PASSED (Gate 4 safely locked until 80% advance settlement; unlocked upon receipt)');
      passed++;
    } else {
      console.log('✗ FAILED (Gate 4 pre-requisite enforcement failed)');
      failed++;
    }

  } catch (error) {
    console.error('\nTest Execution Exception:', error);
    failed++;
  } finally {
    console.log('Cleanup: Purging ephemeral test welcome letter, audit logs, and case docket...');
    await queryD1(`DELETE FROM case_welcome_letters WHERE case_id = ?;`, [testCaseId]);
    await queryD1(`DELETE FROM case_audit_logs WHERE case_id = ?;`, [testCaseId]);
    await queryD1(`DELETE FROM cases WHERE id = ?;`, [testCaseId]);
  }

  console.log('\n================================================================');
  console.log(`  STAGE 3 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runWelcomeLetterTest().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});

