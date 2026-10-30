import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/rbac';

export async function GET(request: Request) {
  const { user, response } = await authenticateRequest(request);
  if (response) return response;

  return NextResponse.json({
    success: true,
    user,
  });
}

