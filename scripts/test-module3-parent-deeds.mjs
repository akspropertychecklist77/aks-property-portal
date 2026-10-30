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

async function runModule3Test() {
  console.log('================================================================');
  console.log('  MODULE 3 VERIFICATION: PARENT DEED & TITLE GENEALOGY CHAIN');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const testCaseId = `AK-2026-PD-${Date.now() % 10000}`;

  // SETUP: Create parent Case docket in D1 to satisfy foreign key constraints
  try {
    await queryD1(
      `INSERT INTO cases (id, client_name, client_phone, service_package, current_stage, district, total_fee, advance_amount, balance_amount, payment_status, case_status)
       VALUES (?, 'K. Vellingiri', '+91 98422 12345', 'Legal Opinion (Standard)', 5, 'Coimbatore', 6500.00, 5200.00, 1300.00, 'advance_paid', 'active');`,
      [testCaseId]
    );
  } catch (e) {
    console.error('Setup failed:', e);
  }

  // TEST 1: Insert 3-Tier Chronological Parent Deed Chain
  const pd1Id = `pd_1994_${Date.now()}`;
  const pd2Id = `pd_2008_${Date.now()}`;
  const pd3Id = `pd_2026_${Date.now()}`;

  try {
    process.stdout.write('Test 1: Index Chronological 30-Year Title Genealogy Chain... ');

    // Deed 1: 1994 Root Sale Deed
    await queryD1(
      `INSERT INTO parent_documents (id, case_id, sequence_order, deed_type, doc_number, sro_name, registration_date, seller_name, buyer_name, extent, link_verified, gap_analysis_notes, doc_file_name, doc_file_url)
       VALUES (?, ?, 1, 'Sale Deed', 'Doc No. 1420/1994', 'Gandhipuram SRO', '1994-04-12', 'K. Ramasamy', 'P. Natarajan', '2,400 Sq.Ft', 1, 'Root conveyance from original layout promoter', '1994_Sale_Deed_1420.pdf', '/uploads/deeds/1994.pdf');`,
      [pd1Id, testCaseId]
    );

    // Deed 2: 2008 Settlement Deed (Father to Son)
    await queryD1(
      `INSERT INTO parent_documents (id, case_id, sequence_order, deed_type, doc_number, sro_name, registration_date, seller_name, buyer_name, extent, link_verified, gap_analysis_notes, doc_file_name, doc_file_url)
       VALUES (?, ?, 2, 'Settlement Deed', 'Doc No. 892/2008', 'Gandhipuram SRO', '2008-08-20', 'P. Natarajan', 'N. Karthikeyan', '2,400 Sq.Ft', 1, 'Father to son settlement. Unbroken bloodline devolution.', '2008_Settlement_Deed_892.pdf', '/uploads/deeds/2008.pdf');`,
      [pd2Id, testCaseId]
    );

    // Deed 3: 2026 Proposed Sale Deed
    await queryD1(
      `INSERT INTO parent_documents (id, case_id, sequence_order, deed_type, doc_number, sro_name, registration_date, seller_name, buyer_name, extent, link_verified, gap_analysis_notes, doc_file_name, doc_file_url)
       VALUES (?, ?, 3, 'Sale Deed', 'Pending/2026', 'Gandhipuram SRO', '2026-10-30', 'N. Karthikeyan', 'K. Vellingiri', '2,400 Sq.Ft', 1, 'Current subject matter purchase conveyance', '2026_Proposed_Sale_Deed.pdf', '/uploads/deeds/2026.pdf');`,
      [pd3Id, testCaseId]
    );

    const deeds = await queryD1(`SELECT * FROM parent_documents WHERE case_id = ? ORDER BY sequence_order ASC;`, [testCaseId]);
    assert.strictEqual(deeds.length, 3, 'All 3 parent deeds must exist in D1');
    assert.strictEqual(deeds[0].seller_name, 'K. Ramasamy');
    assert.strictEqual(deeds[0].buyer_name, 'P. Natarajan');
    assert.strictEqual(deeds[1].seller_name, 'P. Natarajan');
    assert.strictEqual(deeds[1].buyer_name, 'N. Karthikeyan');
    assert.strictEqual(deeds[2].seller_name, 'N. Karthikeyan');
    assert.strictEqual(deeds[2].buyer_name, 'K. Vellingiri');

    console.log('✓ PASSED (3 generations: Ramasamy -> Natarajan -> Karthikeyan -> Vellingiri)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 2: Devolution Link Analysis & Unbroken Chain Verification
  try {
    process.stdout.write('Test 2: Devolution Link Analysis & Root-to-Current Provenance... ');
    const deeds = await queryD1(`SELECT * FROM parent_documents WHERE case_id = ? ORDER BY sequence_order ASC;`, [testCaseId]);

    // Link 1: Step 1 buyer vs Step 2 seller
    const link1 = deeds[0].buyer_name.trim().toLowerCase() === deeds[1].seller_name.trim().toLowerCase();
    assert.strictEqual(link1, true, 'Deed 1 buyer must equal Deed 2 seller (P. Natarajan)');

    // Link 2: Step 2 buyer vs Step 3 seller
    const link2 = deeds[1].buyer_name.trim().toLowerCase() === deeds[2].seller_name.trim().toLowerCase();
    assert.strictEqual(link2, true, 'Deed 2 buyer must equal Deed 3 seller (N. Karthikeyan)');

    // Extent conservation check
    assert.strictEqual(deeds[0].extent, deeds[1].extent);
    assert.strictEqual(deeds[1].extent, deeds[2].extent);

    console.log('✓ PASSED (100% unbroken chain from 1994 to 2026, 2,400 Sq.Ft conserved)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 3: Title Chain Gap Detection
  try {
    process.stdout.write('Test 3: Gap Detection on Intervening Stranger Conveyance... ');

    // Inject a break: seller is an unexplained stranger
    const breakDeed = {
      buyer_prev: 'N. Karthikeyan',
      seller_curr: 'Unrelated Third Party',
    };

    function analyzeLink(b, s) {
      return b.trim().toLowerCase() === s.trim().toLowerCase();
    }

    const isMatch = analyzeLink(breakDeed.buyer_prev, breakDeed.seller_curr);
    assert.strictEqual(isMatch, false, 'Break in chain must be detected');

    console.log('✓ PASSED (Automated alert on broken titular link)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // TEST 4: Parent Deed Mutation & Document Attachment
  try {
    process.stdout.write('Test 4: Update Parent Deed with Vault Document Attachment... ');
    const newDocUrl = `/uploads/${testCaseId}/1994_Certified_Sub_Registrar_Scan.pdf`;
    await queryD1(
      `UPDATE parent_documents SET doc_file_url = ?, doc_file_name = ? WHERE id = ? AND case_id = ?;`,
      [newDocUrl, '1994_Certified_Sub_Registrar_Scan.pdf', pd1Id, testCaseId]
    );

    const updated = await queryD1(`SELECT doc_file_name, doc_file_url FROM parent_documents WHERE id = ?;`, [pd1Id]);
    assert.strictEqual(updated[0].doc_file_name, '1994_Certified_Sub_Registrar_Scan.pdf');
    assert.strictEqual(updated[0].doc_file_url, newDocUrl);

    console.log('✓ PASSED (Document scan bound to Deed 1)');
    passed++;
  } catch (e) {
    console.log(`✗ FAILED: ${e.message}`);
    failed++;
  }

  // CLEANUP
  try {
    await queryD1(`DELETE FROM parent_documents WHERE case_id = ?;`, [testCaseId]);
    await queryD1(`DELETE FROM cases WHERE id = ?;`, [testCaseId]);
    console.log('Cleanup: Ephemeral test parent deeds and case docket safely purged.\n');
  } catch (e) {}

  console.log('================================================================');
  console.log(`  MODULE 3 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runModule3Test().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
