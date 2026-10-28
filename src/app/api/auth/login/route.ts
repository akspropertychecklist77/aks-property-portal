import { NextResponse } from 'next/server';
import { executeQueryOne, executeRun } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();

    // Query user record by username or email
    const user = await executeQueryOne(
      `SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?;`,
      [cleanUser, cleanUser]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      );
    }

    // Generate session token
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await executeRun(
      `INSERT INTO user_sessions (id, user_id, session_token, ip_address, expires_at)
       VALUES (?, ?, ?, '127.0.0.1', ?);`,
      [`ses_${Date.now()}`, user.id, sessionToken, expiresAt]
    );

    // Update last login
    await executeRun(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0 WHERE id = ?;`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        barCouncilNo: user.bar_council_reg_no,
      },
      sessionToken,
    });
  } catch (error: any) {
    console.error('Database Error in POST /api/auth/login:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
