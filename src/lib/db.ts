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

// Initialize or retrieve local SQLite connection
function getLocalDb() {
  if (!localDb) {
    // Dynamic import to prevent bundler errors in edge runtime
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'database', 'portal.db');
    localDb = new Database(dbPath);
    localDb.pragma('journal_mode = WAL');
  }
  return localDb;
}

/**
 * Universal Database Query Runner
 * Works seamlessly on:
 * 1. Local PC during development (better-sqlite3 on portal.db)
 * 2. Cloudflare Pages edge runtime (native Cloudflare D1 via env.DB)
 */
export async function executeQuery<T = any>(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<T[]> {
  // If running inside Cloudflare Pages with D1 binding
  if (cloudflareDb && typeof cloudflareDb.prepare === 'function') {
    const stmt = cloudflareDb.prepare(sql).bind(...params);
    const result = await stmt.all<T>();
    return result.results || [];
  }

  // Otherwise fallback to local SQLite (Node.js dev environment)
  const db = getLocalDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export async function executeQueryOne<T = any>(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<T | null> {
  if (cloudflareDb && typeof cloudflareDb.prepare === 'function') {
    const stmt = cloudflareDb.prepare(sql).bind(...params);
    return await stmt.first<T>();
  }

  const db = getLocalDb();
  const stmt = db.prepare(sql);
  const result = stmt.get(...params);
  return (result as T) || null;
}

export async function executeRun(
  sql: string,
  params: any[] = [],
  cloudflareDb?: CloudflareD1
): Promise<boolean> {
  if (cloudflareDb && typeof cloudflareDb.prepare === 'function') {
    const stmt = cloudflareDb.prepare(sql).bind(...params);
    const res = await stmt.run();
    return res.success;
  }

  const db = getLocalDb();
  const stmt = db.prepare(sql);
  stmt.run(...params);
  return true;
}

