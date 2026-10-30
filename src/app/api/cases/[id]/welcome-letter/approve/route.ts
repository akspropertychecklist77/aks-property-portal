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

    // 1. Authorization check: requires advocate authority
    const { user, response } = await authenticateRequest(
      request,
      'stage:advance_1_to_3'
    );
    if (response) return response;

    // Enforce advocate statutory role check
    const isAdvocate =
      user?.role === 'ADVOCATE_PARTNER' ||
      user?.role === 'ADVOCATE_ADMIN' ||
      user?.role === 'SUPER_ADMIN';

    if (!isAdvocate) {
      return problemResponse({
        status: 403,
        type: 'https://api.akspropertychecklist.in/errors/STATUTORY_APPROVAL_RESTRICTED',
        title: 'Advocate Approval Required',
        detail: 'The Welcome Letter & Statutory Engagement Requisition must be reviewed and approved by an authorized Advocate under Bar Council enrollment.',
        req: request,
      });
    }

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await welcomeLetterService.approveLetter(
      caseId,
      user?.fullName || user?.username || 'Advocate A.K. Saravanan (MS/1245/2005)',
      clientIp
    );

    return successResponse(result, {
      caseId: caseId.toUpperCase(),
      approvedBy: user?.username,
      barCouncilLicense: 'MS/1245/2005',
    });
  } catch (error: any) {
    console.error('Approve Welcome Letter Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/APPROVAL_FAILURE',
      title: 'Failed to Approve Welcome Letter',
      detail: error.message || 'An error occurred during advocate sign-off.',
      req: request,
    });
  }
}
