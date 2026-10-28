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

// Cloudflare D1 HTTP API Credentials (Fallback when native binding is not injected)
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'c4806076a4b169eb610eb15cc0fbaee4';
const CF_D1_ID = process.env.CLOUDFLARE_D1_ID || 'c987d1f0-a579-4e4c-8482-36482bebfd7f';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

/**
 * Cloudflare D1 REST HTTPS Query Runner
 * Direct cloud-to-database communication fallback.
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
  } catch (err: any) {
    console.error('Cloudflare D1 HTTP fallback failed:', err?.message || err);
  }
  return [];
}

// Initialize or retrieve local SQLite connection (Dev environment only)
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

// Automatically detect Cloudflare D1 binding from runtime environment
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
 * 1. Cloudflare Native D1 Edge Binding (env.DB)
 * 2. Cloudflare D1 Direct HTTPS REST API (Cloud fallback)
 * 3. Local SQLite during PC development (portal.db)
 */
export async function executeQuery<T = any>(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<T[]> {
  // 1. Native Cloudflare D1 Worker Binding
  const d1 = cloudflareDb || getCloudflareD1();
  if (d1 && typeof d1.prepare === 'function') {
    const stmt = d1.prepare(sql).bind(...params);
    const result = await stmt.all<T>();
    return result.results || [];
  }

  // 2. Local SQLite during development (Node.js on PC)
  const db = getLocalDb();
  if (db) {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  // 3. Fallback to Cloudflare D1 HTTPS Query API
  return await queryCloudflareD1Http<T>(sql, params);
}

export async function executeQueryOne<T = any>(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<T | null> {
  const d1 = cloudflareDb || getCloudflareD1();
  if (d1 && typeof d1.prepare === 'function') {
    const stmt = d1.prepare(sql).bind(...params);
    return await stmt.first<T>();
  }

  const db = getLocalDb();
  if (db) {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  const results = await queryCloudflareD1Http<T>(sql, params);
  return results[0] || null;
}

export async function executeRun(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<boolean> {
  const d1 = cloudflareDb || getCloudflareD1();
  if (d1 && typeof d1.prepare === 'function') {
    const stmt = d1.prepare(sql).bind(...params);
    const res = await stmt.run();
    return res.success;
  }

  const db = getLocalDb();
  if (db) {
    const stmt = db.prepare(sql);
    stmt.run(...params);
    return true;
  }

  await queryCloudflareD1Http(sql, params);
  return true;
}
