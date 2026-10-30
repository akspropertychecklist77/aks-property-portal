import { NextResponse } from 'next/server';
import { legalOpinionService } from '@/lib/services/legalOpinionService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    const opinionDetails = await legalOpinionService.getOpinionDetails(caseId);

    return successResponse(opinionDetails, { caseId });
  } catch (error: any) {
    console.error('Error in GET /api/cases/[id]/opinion:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Failed to Query Legal Opinion',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    // Authenticate user
    const { user } = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const data = body.data || body;

    const isSigningOff = Boolean(data.signOff || data.advocateSignoff || data.sign_off_status === 'approved');

    if (isSigningOff) {
      // Execute formal sign-off under advocate authority
      const signoffResult = await legalOpinionService.certifyAndSign(
        caseId,
        {
          root_of_title: data.root_of_title || data.rootOfTitle,
          marketable_title_certified: data.marketable_title_certified ?? (data.marketableTitle === 'Clear' || data.marketableTitle === true),
          encumbrance_status: data.encumbrance_status || data.encumbranceStatus,
          legal_scrutiny_summary: Array.isArray(data.keyFindings) ? data.keyFindings.join('\n') : data.legal_scrutiny_summary || data.keyFindings,
          special_conditions: Array.isArray(data.recommendations) ? data.recommendations.join('\n') : data.special_conditions || data.recommendations,
        },
        {
          id: user?.id || 'usr_adv_001',
          fullName: user?.fullName || data.advocateName || 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
          role: user?.role || 'ADVOCATE_ADMIN',
          barCouncilNo: user?.barCouncilNo || data.barCouncilNo || 'MS/1245/2005',
        }
      );

      return successResponse(
        {
          ...signoffResult,
          message: `Legal Opinion formally certified and signed under Bar Council seal ${signoffResult.barCouncilRegNo}.`,
        },
        { caseId, status: 'approved' }
      );
    } else {
      // Save work-in-progress draft
      await legalOpinionService.saveDraft(
        caseId,
        {
          advocate_name: data.advocate_name || data.advocateName,
          bar_council_reg_no: data.bar_council_reg_no || data.barCouncilNo,
          root_of_title: data.root_of_title || data.rootOfTitle,
          marketable_title_certified: data.marketable_title_certified ?? (data.marketableTitle === 'Clear'),
          encumbrance_status: data.encumbrance_status || data.encumbranceStatus,
          legal_scrutiny_summary: Array.isArray(data.keyFindings) ? data.keyFindings.join('\n') : data.legal_scrutiny_summary || data.keyFindings,
          special_conditions: Array.isArray(data.recommendations) ? data.recommendations.join('\n') : data.special_conditions || data.recommendations,
        },
        user?.fullName || 'Legal Desk Staff'
      );

      return successResponse({
        caseId,
        status: 'draft',
        message: 'Draft legal opinion findings saved successfully.',
      });
    }
  } catch (error: any) {
    console.error('Error in PUT /api/cases/[id]/opinion:', error);
    return problemResponse({
      status: error.message?.includes('Unauthorized') ? 403 : 500,
      type: 'https://api.akspropertychecklist.in/errors/OPINION_MUTATION_FAILED',
      title: 'Legal Opinion Save Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    // Authenticate user: requires 'stage:sign_opinion' to delete an opinion
    const { user } = await authenticateRequest(request, 'stage:sign_opinion');

    await legalOpinionService.deleteOpinion(caseId);

    return successResponse({
      caseId,
      message: 'Legal opinion record deleted.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/cases/[id]/opinion:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELETE_ERROR',
      title: 'Deletion Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}
