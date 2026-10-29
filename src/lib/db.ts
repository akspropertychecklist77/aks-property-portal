import path from 'path';

// Interface for Cloudflare D1 Database binding
interface CloudflareD1 {
  prepare: (query: string) => {
    bind: (...params: any[]) => {
      all: <T = any>() => Promise<{ results: T[]; success: boolean }>;
      first: <T = any>() => Promise<T | null>;
      run: () => Promise<{ success: boolean }>;
    };
  };
}

let localDb: any = null;

// Cloudflare D1 HTTP API Credentials
// Allows Local Box development to interact directly with the Cloudflare D1 production database!
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'c4806076a4b169eb610eb15cc0fbaee4';
const CF_D1_ID = process.env.CLOUDFLARE_D1_ID || 'c987d1f0-a579-4e4c-8482-36482bebfd7f';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

/**
 * Cloudflare D1 REST HTTPS Query Runner
 * Enables Local Box (localhost:3000) to query Cloudflare D1 directly over secure HTTPS.
 */
async function queryCloudflareD1Http<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
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
    if (data.success && data.result?.[0]?.results) {
      return data.result[0].results as T[];
    }
    if (!data.success) {
      console.error('Cloudflare D1 Query Error:', data.errors);
    }
  } catch (err: any) {
    console.error('Cloudflare D1 HTTP query failed:', err?.message || err);
  }
  return [];
}

/**
 * Cloudflare D1 REST HTTPS Run / Mutation Runner
 * Enables Local Box (localhost:3000) to execute INSERT/UPDATE/DELETE on Cloudflare D1 directly.
 */
async function runCloudflareD1Http(sql: string, params: any[] = []): Promise<boolean> {
  try {
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
    if (data.success && data.result?.[0]?.success) {
      return true;
    }
    if (!data.success) {
      console.error('Cloudflare D1 Mutation Error:', data.errors);
    }
  } catch (err: any) {
    console.error('Cloudflare D1 HTTP mutation failed:', err?.message || err);
  }
  return false;
}

// Initialize or retrieve local SQLite connection (Dev environment fallback only)
function getLocalDb() {
  if (localDb) return localDb;

  // Never load better-sqlite3 in production or Cloudflare environment
  if (
    process.env.NODE_ENV === 'production' ||
    typeof (process.env as any).CF_PAGES !== 'undefined' ||
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  ) {
    return null;
  }

  // Prevent glibcVersionRuntime crash in environments where process.report is missing
  if (typeof process !== 'undefined' && !process.report) {
    (process as any).report = {
      getReport: () => ({ header: { glibcVersionRuntime: '2.31' } }),
    };
  }

  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'database', 'portal.db');
    localDb = new Database(dbPath);
    localDb.pragma('journal_mode = WAL');
    return localDb;
  } catch (err) {
    return null;
  }
}

// Automatically detect Cloudflare D1 native edge binding from runtime environment
function getCloudflareD1(): CloudflareD1 | null {
  // 1. Global D1 binding (Cloudflare Workers / Pages)
  if (typeof (globalThis as any).DB !== 'undefined' && typeof (globalThis as any).DB.prepare === 'function') {
    return (globalThis as any).DB;
  }
  // 2. Process environment binding
  if (typeof (process.env as any)?.DB !== 'undefined' && typeof (process.env as any).DB.prepare === 'function') {
    return (process.env as any).DB;
  }
  // 3. OpenNext / next-on-pages context check
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    if (ctx?.env?.DB?.prepare) return ctx.env.DB;
  } catch (e) {}

  return null;
}

/**
 * Universal Database Query Runner
 * Works seamlessly across:
 * 1. Cloudflare Native D1 Edge Binding (env.DB) when deployed in Cloudflare Workers
 * 2. Cloudflare D1 Direct HTTPS REST API when running on Local Box (npm run dev)
 * 3. Local SQLite file (portal.db) when completely offline
 */
export async function executeQuery<T = any>(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<T[]> {
  // 1. Native Cloudflare D1 Worker Binding (Production Edge)
  const d1 = cloudflareDb || getCloudflareD1();
  if (d1 && typeof d1.prepare === 'function') {
    const stmt = d1.prepare(sql).bind(...params);
    const result = await stmt.all<T>();
    return result.results || [];
  }

  // 2. Direct Cloudflare D1 HTTPS API (Local Box Development)
  // Interacts directly with the live Cloudflare D1 database!
  if (CF_API_TOKEN) {
    const results = await queryCloudflareD1Http<T>(sql, params);
    return results;
  }

  // 3. Offline Local SQLite fallback
  const db = getLocalDb();
  if (db) {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  return [];
}

export async function executeQueryOne<T = any>(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<T | null> {
  // 1. Native Cloudflare D1 Worker Binding (Production Edge)
  const d1 = cloudflareDb || getCloudflareD1();
  if (d1 && typeof d1.prepare === 'function') {
    const stmt = d1.prepare(sql).bind(...params);
    return await stmt.first<T>();
  }

  // 2. Direct Cloudflare D1 HTTPS API (Local Box Development)
  if (CF_API_TOKEN) {
    const results = await queryCloudflareD1Http<T>(sql, params);
    return results[0] || null;
  }

  // 3. Offline Local SQLite fallback
  const db = getLocalDb();
  if (db) {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  return null;
}

export async function executeRun(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<boolean> {
  // 1. Native Cloudflare D1 Worker Binding (Production Edge)
  const d1 = cloudflareDb || getCloudflareD1();
  if (d1 && typeof d1.prepare === 'function') {
    const stmt = d1.prepare(sql).bind(...params);
    const res = await stmt.run();
    return res.success;
  }

  // 2. Direct Cloudflare D1 HTTPS API (Local Box Development)
  // Executes mutations (INSERT, UPDATE, DELETE) directly in Cloudflare D1!
  if (CF_API_TOKEN) {
    return await runCloudflareD1Http(sql, params);
  }

  // 3. Offline Local SQLite fallback
  const db = getLocalDb();
  if (db) {
    const stmt = db.prepare(sql);
    stmt.run(...params);
    return true;
  }

  return false;
}
