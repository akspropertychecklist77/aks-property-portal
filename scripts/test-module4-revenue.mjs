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

async function runModule4Test() {
  console.log('================================================================');
  console.log('  MODULE 4 VERIFICATION: REVENUE VERIFICATION (PATTA/CHITTA/FMB)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const testCaseId = `AK-2026-REV-${Date.now() % 10000}`;

  // SETUP: Create parent Case docket in D1 to satisfy foreign key constraints
  try {
    await queryD1(
      `INSERT INTO cases (id, client_name, client_phone, service_package, current_stage, district, survey_number, total_fee, advance_amount, balance_amount, payment_status, case_status)
       VALUES (?, 'N. Karthikeyan', '+91 98422 12345', 'Legal Opinion (Standard)', 5, 'Coimbatore', 'S.F. No. 342/1B', 6500.00, 5200.00, 1300.00, 'advance_paid', 'active');`,
      [testCaseId]
    );
  } catch (e) {
    console.error('Setup failed:', e);
  }

  // TEST 1: Upsert Revenue Verification Record in Cloudflare D1
  const revId = `rev_${Date.now()}`;
  try {
    process.stdout.write('Test 1: Record Tamil Nilam e-Patta, Chitta & FMB Sketch... ');
    await queryD1(
      `INSERT INTO revenue_records (
        id, case_id, current_sale_deed_no, patta_number, patta_holder_name,
        field_survey_no, sub_division, village_taluk, chitta_adangal_verified,
        fmb_sketch_verified, guideline_value, patta_file_url, patta_file_name,
        chitta_file_url, chitta_file_name, fmb_file_url, fmb_file_name, source_type
      ) VALUES (?, ?, 'Doc No. 892/2008', '842', 'N. Karthikeyan', 'S.F. No. 342/1B', '1B', 'Saravanampatti Village, Coimbatore North Taluk', 1, 1, 2200.00, '/uploads/patta/842.pdf', 'e_Patta_Passbook_842.pdf', '/uploads/chitta/chitta_342.pdf', 'Chitta_Adangal_342.pdf', '/uploads/fmb/fmb_sketch_342_1b.pdf', 'FMB_Sketch_342_1B.pdf', 'TN_ESERVICES_AUTO_FETCH');`,
      [revId, testCaseId]
    );

    const rows = await queryD1(`SELECT * FROM revenue_records WHERE case_id = ?;`, [testCaseId]);
    assert(rows.length === 1, 'Revenue record must exist in D1');
    assert.strictEqual(rows[0].patta_number, '842');
    assert.strictEqual(rows[0].patta_holder_name, 'N. Karthikeyan');
    assert.strictEqual(rows[0].chitta_adangal_verified, 1);
    assert.strictEqual(rows[0].fmb_sketch_verified, 1);
    assert.strictEqual(rows[0].guideline_value, 2200);

    console.log('✓ PASSED (Patta 842, Chitta, FMB Blueprint recorded)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 2: Patta Holder Alignment & Completeness Scoring
  try {
    process.stdout.write('Test 2: Patta Holder Alignment & Completeness Scoring (100%)... ');
    const rows = await queryD1(`SELECT * FROM revenue_records WHERE case_id = ?;`, [testCaseId]);
    const r = rows[0];

    // Compute completeness score:
    // patta_number (+25), patta_holder_name (+25), chitta (+25), fmb (+25)
    let score = 0;
    if (r.patta_number) score += 25;
    if (r.patta_holder_name) score += 25;
    if (r.chitta_adangal_verified === 1) score += 25;
    if (r.fmb_sketch_verified === 1) score += 25;

    assert.strictEqual(score, 100, 'All 4 revenue pillars must total 100%');

    // Alignment check:
    const cases = await queryD1(`SELECT client_name, survey_number FROM cases WHERE id = ?;`, [testCaseId]);
    const isHolderAligned = r.patta_holder_name.toLowerCase() === cases[0].client_name.toLowerCase();
    assert.strictEqual(isHolderAligned, true, 'Patta holder must match case client name');

    const isSurveyAligned = r.field_survey_no.toLowerCase() === cases[0].survey_number.toLowerCase();
    assert.strictEqual(isSurveyAligned, true, 'Field survey number must match case survey number');

    console.log(`✓ PASSED (Score: 100%, Patta Holder: ALIGNED, Survey: MATCH)`);
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 3: Idempotent Upsert (Updating Guideline Value)
  try {
    process.stdout.write('Test 3: Idempotent ON CONFLICT Upsert (Guideline Value Update)... ');
    await queryD1(
      `INSERT INTO revenue_records (
        id, case_id, patta_number, patta_holder_name, field_survey_no, guideline_value, chitta_adangal_verified, fmb_sketch_verified, source_type
      ) VALUES (?, ?, '842', 'N. Karthikeyan', 'S.F. No. 342/1B', 2450.00, 1, 1, 'VAO_FIELD_INSPECTION')
      ON CONFLICT(case_id) DO UPDATE SET
        guideline_value = excluded.guideline_value,
        source_type = excluded.source_type;`,
      [`rev_update_${Date.now()}`, testCaseId]
    );

    const updated = await queryD1(`SELECT guideline_value, source_type, patta_number FROM revenue_records WHERE case_id = ?;`, [testCaseId]);
    assert.strictEqual(updated[0].guideline_value, 2450);
    assert.strictEqual(updated[0].source_type, 'VAO_FIELD_INSPECTION');
    assert.strictEqual(updated[0].patta_number, '842'); // Preserved

    console.log('✓ PASSED (Guideline value revised to ₹2,450/Sq.Ft via atomic upsert)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 4: Statutory Workflow Gate 2 Validation (Requires Patta for Stage 6)
  try {
    process.stdout.write('Test 4: Workflow Gate 2 Prerequisite (Patta verified for Stage 6)... ');
    const rev = await queryD1(`SELECT patta_number FROM revenue_records WHERE case_id = ?;`, [testCaseId]);
    const hasPatta = Boolean(rev.length > 0 && rev[0].patta_number);
    assert.strictEqual(hasPatta, true, 'Patta must be present to satisfy Gate 2');

    console.log('✓ PASSED (Satisfies statutory Gate 2 for Opinion Formulation)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // CLEANUP
  try {
    await queryD1(`DELETE FROM revenue_records WHERE case_id = ?;`, [testCaseId]);
    await queryD1(`DELETE FROM cases WHERE id = ?;`, [testCaseId]);
    console.log('Cleanup: Ephemeral test revenue record and case docket safely purged.\n');
  } catch (e) {}

  console.log('================================================================');
  console.log(`  MODULE 4 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runModule4Test().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
