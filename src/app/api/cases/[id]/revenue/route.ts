import { NextResponse } from 'next/server';
import { revenueService } from '@/lib/services/revenueService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    const revenueStatus = await revenueService.getRevenueVerification(caseId);

    return successResponse(revenueStatus, { caseId });
  } catch (error: any) {
    console.error('Error in GET /api/cases/[id]/revenue:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Failed to Query Revenue Verification',
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

    // Authenticate user: requires 'revenue:verify'
    const { user } = await authenticateRequest(request, 'revenue:verify');

    const body = await request.json().catch(() => ({}));
    const data = body.data || body;

    await revenueService.upsertRevenue(caseId, {
      current_sale_deed_no: data.current_sale_deed_no || data.currentDeedNo,
      patta_number: data.patta_number || data.pattaNumber,
      patta_holder_name: data.patta_holder_name || data.pattaHolder,
      field_survey_no: data.field_survey_no || data.surveyNumber,
      sub_division: data.sub_division || data.subDivision,
      village_taluk: data.village_taluk || data.villageTaluk,
      chitta_adangal_verified: data.chitta_adangal_verified ?? data.chittaVerified,
      fmb_sketch_verified: data.fmb_sketch_verified ?? data.fmbVerified,
      guideline_value: data.guideline_value || data.guidelineValue,
      patta_file_url: data.patta_file_url || data.pattaFileUrl,
      patta_file_name: data.patta_file_name || data.pattaFileName,
      chitta_file_url: data.chitta_file_url || data.chittaFileUrl,
      chitta_file_name: data.chitta_file_name || data.chittaFileName,
      fmb_file_url: data.fmb_file_url || data.fmbFileUrl,
      fmb_file_name: data.fmb_file_name || data.fmbFileName,
      source_type: data.source_type || data.sourceType || 'MANUAL_UPLOAD',
    });

    return successResponse({
      caseId,
      message: 'Revenue records (Patta, Chitta, FMB Blueprint) successfully recorded in database.',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/cases/[id]/revenue:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/REVENUE_UPDATE_FAILED',
      title: 'Revenue Verification Failed',
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

    // Authenticate user: requires 'revenue:verify'
    const { user } = await authenticateRequest(request, 'revenue:verify');

    await revenueService.deleteRevenue(caseId);

    return successResponse({
      caseId,
      message: 'Revenue records deleted from case docket.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/cases/[id]/revenue:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DELETE_ERROR',
      title: 'Deletion Failed',
      detail: error.message || 'An unexpected error occurred.',
      req: request,
    });
  }
}

