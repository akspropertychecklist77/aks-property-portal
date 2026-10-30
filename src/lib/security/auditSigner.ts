import { executeQueryOne, executeRun } from '@/lib/db';

/**
 * Computes an immutable SHA-256 hash chaining this audit entry to the prior entry.
 * Implements a Merkle-Chain audit trail for legal non-repudiation.
 */
export async function computeAuditHash(
  prevHash: string,
  entry: {
    caseId: string;
    action: string;
    actor: string;
    timestamp: string;
    stateDigest: string;
  }
): Promise<string> {
  const message = `${prevHash}:${entry.caseId}:${entry.action}:${entry.actor}:${entry.timestamp}:${entry.stateDigest}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Inserts a tamper-proof chained audit record into Cloudflare D1.
 */
export async function recordChainedAuditLog({
  caseId,
  action,
  previousState,
  newState,
  performedBy,
  ipAddress = '127.0.0.1',
}: {
  caseId: string;
  action: string;
  previousState?: string | null;
  newState?: string | null;
  performedBy: string;
  ipAddress?: string;
}): Promise<{ id: string; hash: string }> {
  const timestamp = new Date().toISOString();
  const logId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Fetch previous hash for this case
  const prevRecord = await executeQueryOne<{ checksum_hash: string }>(
    `SELECT checksum_hash FROM case_audit_logs WHERE case_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [caseId]
  );
  const prevHash = prevRecord?.checksum_hash || 'GENESIS_ROOT_LEGAL_SEAL_00000000';

  // 2. Digest of states
  const stateDigest = `${previousState || 'NONE'}->${newState || 'NONE'}`;

  // 3. Compute chained SHA-256 hash
  const currentHash = await computeAuditHash(prevHash, {
    caseId,
    action,
    actor: performedBy,
    timestamp,
    stateDigest,
  });

  // 4. Persist to D1
  await executeRun(
    `INSERT INTO case_audit_logs (id, case_id, action, previous_state, new_state, performed_by, ip_address, checksum_hash, previous_hash, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      logId,
      caseId,
      action,
      previousState || null,
      newState || null,
      performedBy,
      ipAddress,
      currentHash,
      prevHash,
      timestamp,
    ]
  );

  return { id: logId, hash: currentHash };
}

