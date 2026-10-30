import { NextResponse } from 'next/server';
import {
  createClearSessionCookie,
  extractSessionToken,
  revokeSession,
} from '@/lib/security/session';

export async function POST(request: Request) {
  try {
    const token = extractSessionToken(request);
    if (token) {
      await revokeSession(token);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully.',
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': createClearSessionCookie(),
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

