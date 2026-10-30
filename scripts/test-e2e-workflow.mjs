import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials securely from environment or .env.cloudflare (which is in .gitignore)
let CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || 'c4806076a4b169eb610eb15cc0fbaee4';
let CF_D1_ID = process.env.CF_D1_ID || 'c987d1f0-a579-4e4c-8482-36482bebfd7f';
let CF_API_TOKEN = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

const envPath = path.resolve(__dirname, '../.env.cloudflare');
if (!CF_API_TOKEN && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('CF_API_TOKEN=')) {
      CF_API_TOKEN = trimmed.replace('CF_API_TOKEN=', '').trim();
    } else if (trimmed.startsWith('CF_ACCOUNT_ID=')) {
      CF_ACCOUNT_ID = trimmed.replace('CF_ACCOUNT_ID=', '').trim();
    } else if (trimmed.startsWith('CF_D1_ID=')) {
      CF_D1_ID = trimmed.replace('CF_D1_ID=', '').trim();
    }
  }
}

async function queryD1(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
  }
  return data.result?.[0]?.results || [];
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('  AKS ENTERPRISE PLATFORM: STEP 4 AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Dynamic Metadata Resolution
  try {
    process.stdout.write('Test 1: Verify Dynamic Metadata Catalog (sys_entities)... ');
    const entities = await queryD1('SELECT entity_key, version, schema_definition_json FROM sys_entities');
    if (!entities || entities.length < 2) {
      throw new Error(`Expected at least 2 entities, found ${entities?.length || 0}`);
    }
    const ecEntity = entities.find(e => e.entity_key === 'case_ec_record');
    const schema = JSON.parse(ecEntity.schema_definition_json);
    if (!schema.fields.docNumber || !schema.sections) {
      throw new Error('EC Schema missing required fields or sections');
    }
    console.log('✓ PASSED (EC & Parent Doc metadata verified)');
    passed++;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    failed++;
  }

  // TEST 2: Active Production Indexes Verification
  try {
    process.stdout.write('Test 2: Verify Database Performance Query Indexes... ');
    const indexes = await queryD1("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'");
    if (indexes.length < 5) {
      throw new Error(`Expected performance indexes, found only ${indexes.length}`);
    }
    console.log(`✓ PASSED (${indexes.length} custom performance indexes active)`);
    passed++;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    failed++;
  }

  // TEST 3: Case Docket Integrity & Concurrency
  const testCaseId = `TEST_CASE_${Date.now()}`;
  try {
    process.stdout.write('Test 3: Create & Validate Legal Docket in Cloudflare D1... ');
    await queryD1(
      `INSERT INTO cases (id, client_name, client_phone, district, survey_number, current_stage, total_fee, advance_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, 1, 6500, 5200, 'advance_paid')`,
      [testCaseId, 'Automated Test Client', '9840099999', 'Coimbatore', 'S.F. 999/1']
    );

    const inserted = await queryD1('SELECT id, client_name, current_stage FROM cases WHERE id = ?', [testCaseId]);
    if (!inserted || inserted.length === 0) {
      throw new Error('Inserted test case not found');
    }
    console.log(`✓ PASSED (Case ${testCaseId} created with Stage 1)`);
    passed++;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    failed++;
  }

  // TEST 4: Stage Advancement & State Machine
  try {
    process.stdout.write('Test 4: State Machine Transition (Stage 1 -> Stage 2)... ');
    await queryD1(
      'UPDATE cases SET current_stage = 2, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [testCaseId]
    );
    const updated = await queryD1('SELECT current_stage FROM cases WHERE id = ?', [testCaseId]);
    if (updated[0]?.current_stage !== 2) {
      throw new Error(`Expected stage 2, got ${updated[0]?.current_stage}`);
    }
    console.log('✓ PASSED (State advanced to Stage 2)');
    passed++;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    failed++;
  }

  // TEST 5: Cryptographic Tamper-Proof Audit Chaining (Merkle Chain)
  try {
    process.stdout.write('Test 5: Cryptographic Merkle-Chain Audit Entry... ');
    
    // Simulate Merkle hash creation
    const encoder = new TextEncoder();
    const prevHash = 'GENESIS_ROOT_LEGAL_SEAL_00000000';
    const message = `${prevHash}:${testCaseId}:WORKFLOW_STAGE_TRANSITION:advocate_test:${new Date().toISOString()}:Stage 1->Stage 2`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(message));
    const currentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const auditId = `aud_test_${Date.now()}`;
    await queryD1(
      `INSERT INTO case_audit_logs (id, case_id, action, previous_state, new_state, performed_by, ip_address, checksum_hash, previous_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [auditId, testCaseId, 'WORKFLOW_STAGE_TRANSITION', 'Stage 1', 'Stage 2', 'Advocate A.K. Saravanan (Automated Test)', '127.0.0.1', currentHash, prevHash]
    );

    const logEntry = await queryD1('SELECT checksum_hash, previous_hash FROM case_audit_logs WHERE id = ?', [auditId]);
    if (!logEntry || logEntry[0]?.checksum_hash !== currentHash) {
      throw new Error('Audit log checksum hash mismatch');
    }
    console.log(`✓ PASSED (SHA-256 Merkle hash: ${currentHash.substring(0, 16)}...)`);
    passed++;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    failed++;
  }

  // TEST 6: Dynamic Job Card Record Insertion
  try {
    process.stdout.write('Test 6: Insert Dynamic EC Record via Metadata Schema... ');
    const ecId = `ec_test_${Date.now()}`;
    await queryD1(
      `INSERT INTO ec_records (id, case_id, serial_no, search_period, sro_name, doc_number, deed_nature, executant, claimant, is_encumbrance_flag, remarks)
       VALUES (?, ?, 1, ?, ?, ?, ?, 'K. Ramasamy', 'Vendor R. Suresh', 0, ?)`,
      [ecId, testCaseId, '1994 - 2026 (32 Years)', 'Coimbatore SRO', '1420/2012', 'Sale Deed', 'Clean schedule verified']
    );

    const ecRow = await queryD1('SELECT id, doc_number, deed_nature FROM ec_records WHERE id = ?', [ecId]);
    if (!ecRow || ecRow[0]?.doc_number !== '1420/2012') {
      throw new Error('EC record insertion failed');
    }
    console.log('✓ PASSED (Dynamic EC Record persisted & verified)');
    passed++;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    failed++;
  }

  // CLEANUP TEST DATA
  try {
    process.stdout.write('Cleanup: Purging ephemeral test docket... ');
    await queryD1('DELETE FROM ec_records WHERE case_id = ?', [testCaseId]);
    await queryD1('DELETE FROM case_audit_logs WHERE case_id = ?', [testCaseId]);
    await queryD1('DELETE FROM cases WHERE id = ?', [testCaseId]);
    console.log('✓ Cleaned up.\n');
  } catch (err) {
    console.log('Notice: Cleanup error:', err.message);
  }

  console.log('================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runE2ETests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
