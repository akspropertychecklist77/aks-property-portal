import { NextResponse } from 'next/server';
import { welcomeLetterService } from '@/lib/services/welcomeLetterService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check: requires view permission
    const { user, response } = await authenticateRequest(
      request,
      'cases:read_own'
    );
    if (response) return response;

    const details = await welcomeLetterService.getOrCreateLetter(caseId);

    return successResponse(details, {
      caseId: caseId.toUpperCase(),
      queriedBy: user?.username,
    });
  } catch (error: any) {
    console.error('Get Welcome Letter Error:', error);
    return problemResponse({
      status: error.message?.includes('not found') ? 404 : 500,
      type: 'https://api.akspropertychecklist.in/errors/WELCOME_LETTER_FETCH_FAILURE',
      title: 'Failed to Retrieve Welcome Letter',
      detail: error.message || 'An error occurred while fetching welcome letter details.',
      req: request,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check: requires stage advance or clerk permission
    const { user, response } = await authenticateRequest(
      request,
      'stage:advance_1_to_3'
    );
    if (response) return response;

    const body = await request.json();
    const updated = await welcomeLetterService.saveDraft(caseId, body);

    return successResponse(
      { record: updated },
      {
        caseId: caseId.toUpperCase(),
        updatedBy: user?.username,
      }
    );
  } catch (error: any) {
    console.error('Save Welcome Letter Draft Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/WELCOME_LETTER_SAVE_FAILURE',
      title: 'Failed to Save Welcome Letter Draft',
      detail: error.message || 'An error occurred while saving welcome letter draft.',
      req: request,
    });
  }
}

