import { executeQueryOne, executeRun } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'aks_portal_session';
const DEFAULT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  barCouncilNo?: string;
  isActive: boolean;
}

/**
 * Generates a 256-bit cryptographically secure session token.
 */
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates an active session in the database and returns the session details.
 */
export async function createSession(
  userId: string,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown'
): Promise<{ id: string; sessionToken: string; expiresAt: string }> {
  const sessionToken = generateSessionToken();
  const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const expiresAt = new Date(
    Date.now() + DEFAULT_SESSION_MAX_AGE_SECONDS * 1000
  ).toISOString();

  await executeRun(
    `INSERT INTO user_sessions (id, user_id, session_token, ip_address, user_agent, is_revoked, expires_at)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    [sessionId, userId, sessionToken, ipAddress, userAgent, expiresAt]
  );

  return { id: sessionId, sessionToken, expiresAt };
}

/**
 * Validates a session token from Cookie or Bearer header.
 * Returns the authenticated user record if active and unexpired.
 */
export async function validateSession(
  sessionToken: string
): Promise<AuthenticatedUser | null> {
  if (!sessionToken || sessionToken.trim() === '') {
    return null;
  }

  const cleanToken = sessionToken.trim();

  const row = await executeQueryOne<{
    session_id: string;
    expires_at: string;
    is_revoked: number;
    user_id: string;
    username: string;
    email: string;
    full_name: string;
    role: string;
    phone: string | null;
    bar_council_reg_no: string | null;
    is_active: number;
  }>(
    `SELECT 
       s.id as session_id,
       s.expires_at,
       s.is_revoked,
       u.id as user_id,
       u.username,
       u.email,
       u.full_name,
       u.role,
       u.phone,
       u.bar_council_reg_no,
       u.is_active
     FROM user_sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.session_token = ?
       AND s.is_revoked = 0
       AND u.is_active = 1;`,
    [cleanToken]
  );

  if (!row) {
    return null;
  }

  // Check expiration
  const expiresAtMs = new Date(row.expires_at).getTime();
  if (Date.now() > expiresAtMs) {
    return null;
  }

  return {
    id: row.user_id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone || undefined,
    barCouncilNo: row.bar_council_reg_no || undefined,
    isActive: Boolean(row.is_active),
  };
}

/**
 * Revokes a session immediately.
 */
export async function revokeSession(sessionToken: string): Promise<boolean> {
  if (!sessionToken) return false;
  return await executeRun(
    `UPDATE user_sessions SET is_revoked = 1 WHERE session_token = ?;`,
    [sessionToken.trim()]
  );
}

/**
 * Records a failed login attempt and checks for account lockout.
 */
export async function recordFailedLogin(username: string): Promise<{
  locked: boolean;
  attempts: number;
  lockedUntil?: string;
}> {
  const cleanUser = username.trim().toLowerCase();
  const user = await executeQueryOne<{ id: string; failed_login_attempts: number }>(
    `SELECT id, failed_login_attempts FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?;`,
    [cleanUser, cleanUser]
  );

  if (!user) {
    return { locked: false, attempts: 0 };
  }

  const newAttempts = (user.failed_login_attempts || 0) + 1;
  let lockedUntil: string | null = null;

  if (newAttempts >= 5) {
    // Lock for 30 minutes
    lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }

  await executeRun(
    `UPDATE users 
     SET failed_login_attempts = ?, locked_until = ?
     WHERE id = ?;`,
    [newAttempts, lockedUntil, user.id]
  );

  return {
    locked: newAttempts >= 5,
    attempts: newAttempts,
    lockedUntil: lockedUntil || undefined,
  };
}

/**
 * Resets failed login attempts upon successful authentication.
 */
export async function resetFailedLogins(userId: string): Promise<void> {
  await executeRun(
    `UPDATE users 
     SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP
     WHERE id = ?;`,
    [userId]
  );
}

/**
 * Checks whether an account is currently locked out.
 */
export function isAccountLocked(lockedUntil: string | null | undefined): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

/**
 * Extracts session token from Cookie header or Authorization Bearer header.
 */
export function extractSessionToken(request: Request): string | null {
  // 1. Try Cookie header
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        return decodeURIComponent(cookie.substring(SESSION_COOKIE_NAME.length + 1));
      }
    }
  }

  // 2. Try Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Generates the Set-Cookie string for a secure, HttpOnly session cookie.
 */
export function createSessionCookie(
  token: string,
  maxAge = DEFAULT_SESSION_MAX_AGE_SECONDS
): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${
    isProd ? '; Secure' : ''
  }`;
}

/**
 * Generates the Set-Cookie string to clear an expired session cookie.
 */
export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

