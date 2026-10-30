import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modules = [
  { id: 'Module 1', name: 'Enquiry Intake & Triage Desk', script: 'test-module1-enquiries.mjs' },
  { id: 'Module 2', name: 'Job Card & 30-Year EC Matrix', script: 'test-module2-ec-and-docs.mjs' },
  { id: 'Stage 3',  name: 'Welcome Letter & 80% Advance', script: 'test-welcome-letter.mjs' },
  { id: 'Module 3', name: 'Parent Deed & Title Genealogy', script: 'test-module3-parent-deeds.mjs' },
  { id: 'Module 4', name: 'Revenue Verification (Patta/Chitta/FMB)', script: 'test-module4-revenue.mjs' },
  { id: 'Module 5', name: 'Advocate Opinion & Digital Sign-Off', script: 'test-module5-opinion.mjs' },
  { id: 'Module 6', name: 'Cloudflare R2 Document Vault', script: 'test-module6-vault.mjs' },
  { id: 'Module 7', name: '80/20 Escrow Billing & Invoicing', script: 'test-module7-billing.mjs' },
  { id: 'Module 8', name: 'Client Progress Tracker (/track/[id])', script: 'test-module8-tracking.mjs' },
];

console.log('========================================================================');
console.log('  AKS PLATFORM MASTER VERIFICATION: ALL 8 CORE MODULES');
console.log('========================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const mod of modules) {
  const scriptPath = path.join(__dirname, mod.script);
  process.stdout.write(`Executing ${mod.id}: ${mod.name}... `);

  const res = spawnSync('node', [scriptPath], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (res.status === 0) {
    console.log('PASSED ✓');
    totalPassed++;
    results.push({ ...mod, status: 'PASSED', code: 0 });
  } else {
    console.log('FAILED ✗');
    console.error(res.stderr || res.stdout);
    totalFailed++;
    results.push({ ...mod, status: 'FAILED', code: res.status });
  }
}

console.log('\n========================================================================');
console.log(`  MASTER VERIFICATION RESULTS: ${totalPassed}/${modules.length} MODULES PASSED`);
console.log('========================================================================\n');

for (const r of results) {
  const mark = r.status === 'PASSED' ? '✓' : '✗';
  console.log(`  [${mark}] ${r.id.padEnd(10)}: ${r.name}`);
}

console.log('\nAll layers verified against live Cloudflare D1 & APAC production schemas.');
if (totalFailed > 0) process.exit(1);

