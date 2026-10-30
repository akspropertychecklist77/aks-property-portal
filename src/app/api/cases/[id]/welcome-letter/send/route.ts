import { NextResponse } from 'next/server';
import { welcomeLetterService } from '@/lib/services/welcomeLetterService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check
    const { user, response } = await authenticateRequest(
      request,
      'stage:advance_1_to_3'
    );
    if (response) return response;

    const body = await request.json();
    const { channel, dispatchRef } = body;

    if (!channel || !dispatchRef) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_DISPATCH_PAYLOAD',
        title: 'Missing Dispatch Parameters',
        detail: 'Both delivery channel (email, whatsapp, courier, in_person) and dispatch tracking reference are required.',
        req: request,
      });
    }

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await welcomeLetterService.sendLetter(
      caseId,
      channel,
      dispatchRef,
      user?.username || 'OPERATIONS_CLERK',
      clientIp
    );

    return successResponse(result, {
      caseId: caseId.toUpperCase(),
      dispatchedBy: user?.username,
      channel,
      gate4Unlocked: result.gate4Unlocked,
    });
  } catch (error: any) {
    console.error('Send Welcome Letter Error:', error);
    const isStatutoryError = error.message?.includes('unapproved Welcome Letter');

    return problemResponse({
      status: isStatutoryError ? 409 : 500,
      type: isStatutoryError
        ? 'https://api.akspropertychecklist.in/errors/UNAPPROVED_DISPATCH_PROHIBITED'
        : 'https://api.akspropertychecklist.in/errors/DISPATCH_FAILURE',
      title: isStatutoryError ? 'Unapproved Letter Cannot be Sent' : 'Failed to Record Dispatch',
      detail: error.message || 'An error occurred while marking letter as sent.',
      req: request,
    });
  }
}

