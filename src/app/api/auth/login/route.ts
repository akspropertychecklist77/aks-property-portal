import { NextResponse } from 'next/server';
import { executeQueryOne, executeRun } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/security/passwordHasher';
import {
  createSession,
  createSessionCookie,
  isAccountLocked,
  recordFailedLogin,
  resetFailedLogins,
} from '@/lib/security/session';
import { problemResponse } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_CREDENTIALS',
        title: 'Validation Error',
        detail: 'Username and password are required fields.',
        req: request,
      });
    }

    const cleanUser = username.trim().toLowerCase();

    // Query user record by username or email
    const user = await executeQueryOne<{
      id: string;
      username: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      phone: string | null;
      bar_council_reg_no: string | null;
      is_active: number;
      failed_login_attempts: number;
      locked_until: string | null;
    }>(
      `SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?;`,
      [cleanUser, cleanUser]
    );

    if (!user) {
      return problemResponse({
        status: 401,
        type: 'https://api.akspropertychecklist.in/errors/AUTHENTICATION_FAILED',
        title: 'Authentication Failed',
        detail: 'Invalid username or password.',
        req: request,
      });
    }

    // Check account lockout
    if (isAccountLocked(user.locked_until)) {
      return problemResponse({
        status: 403,
        type: 'https://api.akspropertychecklist.in/errors/ACCOUNT_LOCKED',
        title: 'Account Temporarily Locked',
        detail: `This account has been locked due to excessive failed attempts. Please retry after ${user.locked_until}.`,
        req: request,
      });
    }

    // Verify password via Web Crypto PBKDF2 with automatic re-hashing support
    const { verified, needsRehash } = await verifyPassword(
      password,
      user.password_hash
    );

    if (!verified) {
      const lockResult = await recordFailedLogin(cleanUser);
      if (lockResult.locked) {
        return problemResponse({
          status: 403,
          type: 'https://api.akspropertychecklist.in/errors/ACCOUNT_LOCKED',
          title: 'Account Locked',
          detail: 'Account locked for 30 minutes due to 5 consecutive failed attempts.',
          req: request,
        });
      }
      return problemResponse({
        status: 401,
        type: 'https://api.akspropertychecklist.in/errors/AUTHENTICATION_FAILED',
        title: 'Authentication Failed',
        detail: `Invalid username or password. (${5 - lockResult.attempts} attempts remaining before lockout)`,
        req: request,
      });
    }

    if (!user.is_active) {
      return problemResponse({
        status: 403,
        type: 'https://api.akspropertychecklist.in/errors/ACCOUNT_DEACTIVATED',
        title: 'Account Inactive',
        detail: 'Account has been deactivated. Please contact the platform administrator.',
        req: request,
      });
    }

    // Auto-upgrade legacy hash to PBKDF2-SHA256
    if (needsRehash) {
      try {
        const upgradedHash = await hashPassword(password);
        await executeRun(`UPDATE users SET password_hash = ? WHERE id = ?;`, [
          upgradedHash,
          user.id,
        ]);
      } catch (e) {
        console.warn('Password re-hash upgrade notice:', e);
      }
    }

    // Reset failed logins & update last login timestamp
    await resetFailedLogins(user.id);

    // Extract IP and User-Agent
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser Client';

    // Issue cryptographic session token
    const { sessionToken } = await createSession(user.id, ip, userAgent);

    // Create HttpOnly Secure Cookie
    const cookieHeader = createSessionCookie(sessionToken);

    return NextResponse.json(
      {
        success: true,
        message: 'Authentication successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          barCouncilNo: user.bar_council_reg_no,
        },
        sessionToken,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (error: any) {
    console.error('Database Error in POST /api/auth/login:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/INTERNAL_ERROR',
      title: 'Server Error',
      detail: error.message || 'An unexpected error occurred during authentication.',
      req: request,
    });
  }
}
