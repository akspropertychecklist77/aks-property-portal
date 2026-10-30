import { NextResponse } from 'next/server';
import { executeQuery, executeRun } from '@/lib/db';
import { authenticateRequest, hasPermission } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();

    // Authenticate user
    const { user } = await authenticateRequest(request);

    const body = await request.json().catch(() => ({}));
    const { type, data } = body;

    if (!data) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_PAYLOAD',
        title: 'Missing Payload',
        detail: 'Request body must contain a valid "data" object.',
        req: request,
      });
    }

    if (type === 'EC_RECORD') {
      const recordId = data.id || `ec_${Date.now()}`;
      await executeRun(
        `INSERT INTO ec_records (
          id, case_id, serial_no, search_period, doc_number,
          sro_name, deed_nature, executant, claimant, is_encumbrance_flag,
          remarks, doc_file_name, doc_file_url, source_type, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          recordId,
          caseId,
          data.serialNo || Date.now() % 1000,
          data.period || '1994 - 2026',
          data.docNumber || 'Pending',
          data.sro || 'SRO Office',
          data.natureOfDeed || 'Sale Deed',
          data.parties ? data.parties.split(' to ')[0] || data.parties : '',
          data.parties ? data.parties.split(' to ')[1] || '' : '',
          data.isEncumbrance ? 1 : 0,
          data.remarks || '',
          data.docFileName || null,
          data.docFileUrl || null,
          data.sourceType || 'MANUAL_UPLOAD',
          data.verificationStatus || 'VERIFIED',
        ]
      );

      return successResponse(
        {
          recordId,
          caseId,
          message: 'EC Record indexed in Job Card successfully.',
        },
        { caseId, recordId },
        201
      );
    }

    if (type === 'PARENT_DOC') {
      const recordId = data.id || `pd_${Date.now()}`;
      await executeRun(
        `INSERT INTO parent_documents (
          id, case_id, sequence_order, deed_type, doc_number,
          sro_name, registration_date, seller_name, buyer_name, extent,
          link_verified, gap_analysis_notes, doc_file_name, doc_file_url, source_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          recordId,
          caseId,
          data.sequenceOrder || 1,
          data.deedType || 'Sale Deed',
          data.docNumber || 'Pending',
          data.sro || 'SRO Office',
          data.year || '2000',
          data.executants || '',
          data.claimants || '',
          data.extent || '2,400 Sq.Ft',
          data.scheduleMatches !== false ? 1 : 0,
          data.notes || '',
          data.docFileName || null,
          data.docFileUrl || null,
          data.sourceType || 'MANUAL_UPLOAD',
        ]
      );

      return successResponse(
        {
          recordId,
          caseId,
          message: 'Parent deed genealogy link saved successfully.',
        },
        { caseId, recordId },
        201
      );
    }

    return problemResponse({
      status: 400,
      type: 'https://api.akspropertychecklist.in/errors/INVALID_RECORD_TYPE',
      title: 'Unknown Record Type',
      detail: `Unsupported record type "${type}". Allowed: EC_RECORD, PARENT_DOC.`,
      req: request,
    });
  } catch (error: any) {
    console.error('Job Card DB Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/JOB_CARD_ERROR',
      title: 'Job Card Mutation Failed',
      detail: error.message || 'An unexpected error occurred in Job Card operations.',
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
    const { type, data } = body;

    if (!data) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_PAYLOAD',
        title: 'Missing Payload',
        detail: 'Request body must contain a valid "data" object.',
        req: request,
      });
    }

    if (type === 'REVENUE_PATTA') {
      await executeRun(
        `INSERT INTO revenue_records (
          id, case_id, patta_number, patta_holder_name, field_survey_no,
          sub_division, village_taluk, chitta_adangal_verified, fmb_sketch_verified,
          patta_file_url, patta_file_name, chitta_file_url, chitta_file_name,
          fmb_file_url, fmb_file_name, source_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(case_id) DO UPDATE SET
          patta_number = CASE WHEN excluded.patta_number != '' THEN excluded.patta_number ELSE revenue_records.patta_number END,
          patta_holder_name = CASE WHEN excluded.patta_holder_name != '' THEN excluded.patta_holder_name ELSE revenue_records.patta_holder_name END,
          field_survey_no = CASE WHEN excluded.field_survey_no != '' THEN excluded.field_survey_no ELSE revenue_records.field_survey_no END,
          sub_division = CASE WHEN excluded.sub_division != '' THEN excluded.sub_division ELSE revenue_records.sub_division END,
          village_taluk = CASE WHEN excluded.village_taluk != '' THEN excluded.village_taluk ELSE revenue_records.village_taluk END,
          chitta_adangal_verified = CASE WHEN excluded.chitta_adangal_verified = 1 THEN 1 ELSE revenue_records.chitta_adangal_verified END,
          fmb_sketch_verified = CASE WHEN excluded.fmb_sketch_verified = 1 THEN 1 ELSE revenue_records.fmb_sketch_verified END,
          patta_file_url = COALESCE(excluded.patta_file_url, revenue_records.patta_file_url),
          patta_file_name = COALESCE(excluded.patta_file_name, revenue_records.patta_file_name),
          chitta_file_url = COALESCE(excluded.chitta_file_url, revenue_records.chitta_file_url),
          chitta_file_name = COALESCE(excluded.chitta_file_name, revenue_records.chitta_file_name),
          fmb_file_url = COALESCE(excluded.fmb_file_url, revenue_records.fmb_file_url),
          fmb_file_name = COALESCE(excluded.fmb_file_name, revenue_records.fmb_file_name),
          source_type = excluded.source_type;`,
        [
          `rev_${Date.now()}`,
          caseId,
          data.pattaNumber || '',
          data.pattaHolder || '',
          data.surveyNumber || '',
          data.subDivision || '',
          data.villageTaluk || '',
          data.chittaVerified ? 1 : 0,
          data.fmbVerified ? 1 : 0,
          data.pattaFileUrl || null,
          data.pattaFileName || null,
          data.chittaFileUrl || null,
          data.chittaFileName || null,
          data.fmbFileUrl || null,
          data.fmbFileName || null,
          data.sourceType || 'MANUAL_UPLOAD',
        ]
      );

      return successResponse({
        caseId,
        message: 'Revenue records (Patta, Chitta, FMB) updated in database.',
      });
    }

    if (type === 'ADVOCATE_OPINION') {
      // Security Gate: Signing off the opinion requires 'stage:sign_opinion' capability
      if (data.advocateSignoff && user && !hasPermission(user.role, 'stage:sign_opinion')) {
        return problemResponse({
          status: 403,
          type: 'https://api.akspropertychecklist.in/errors/UNAUTHORIZED_OPINION_SIGNOFF',
          title: 'Sign-Off Authority Required',
          detail: 'Only Advocate Partner (Bar Council Enrollment No. MS/1245/2005) is authorized to sign and certify legal opinions.',
          req: request,
        });
      }

      const signOffStatus = data.advocateSignoff ? 'approved' : 'draft';
      const advocateName = data.advocateName || user?.fullName || 'Advocate A.K. Saravanan (M.E. Energy, LLB)';
      const barCouncilNo = data.barCouncilNo || user?.barCouncilNo || 'MS/1245/2005';

      await executeRun(
        `INSERT INTO legal_opinions (
          id, case_id, advocate_name, bar_council_reg_no, root_of_title, marketable_title_certified,
          encumbrance_status, legal_scrutiny_summary, special_conditions, sign_off_status, signed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(case_id) DO UPDATE SET
          advocate_name = excluded.advocate_name,
          bar_council_reg_no = excluded.bar_council_reg_no,
          marketable_title_certified = excluded.marketable_title_certified,
          encumbrance_status = excluded.encumbrance_status,
          legal_scrutiny_summary = excluded.legal_scrutiny_summary,
          special_conditions = excluded.special_conditions,
          sign_off_status = excluded.sign_off_status,
          signed_at = CURRENT_TIMESTAMP;`,
        [
          `op_${Date.now()}`,
          caseId,
          advocateName,
          barCouncilNo,
          data.rootOfTitle || 'Chain of title unbroken for 30+ years.',
          data.marketableTitle === 'Clear' ? 1 : 0,
          data.encumbranceStatus || 'Nil Encumbrance',
          Array.isArray(data.keyFindings) ? data.keyFindings.join('\n') : data.keyFindings || '',
          Array.isArray(data.recommendations) ? data.recommendations.join('\n') : data.recommendations || '',
          signOffStatus,
        ]
      );

      return successResponse({
        caseId,
        signOffStatus,
        advocateName,
        barCouncilNo,
        message: data.advocateSignoff
          ? `Advocate Legal Opinion formally signed and certified under ${barCouncilNo}.`
          : 'Draft legal opinion findings saved successfully.',
      });
    }

    return problemResponse({
      status: 400,
      type: 'https://api.akspropertychecklist.in/errors/INVALID_UPDATE_TYPE',
      title: 'Unknown Update Type',
      detail: `Unsupported update type "${type}". Allowed: REVENUE_PATTA, ADVOCATE_OPINION.`,
      req: request,
    });
  } catch (error: any) {
    console.error('Job Card PUT Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/JOB_CARD_ERROR',
      title: 'Job Card Update Failed',
      detail: error.message || 'An unexpected error occurred during update.',
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const recordId = searchParams.get('recordId');

    // Authenticate user
    const { user } = await authenticateRequest(request);

    if (!recordId) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/MISSING_PARAM',
        title: 'Missing Record ID',
        detail: 'The "recordId" query parameter is required for deletion.',
        req: request,
      });
    }

    if (type === 'EC_RECORD') {
      await executeRun(`DELETE FROM ec_records WHERE id = ? AND case_id = ?;`, [recordId, caseId]);
      return successResponse({ recordId, caseId, message: 'EC record deleted from Job Card.' });
    }

    if (type === 'PARENT_DOC') {
      await executeRun(`DELETE FROM parent_documents WHERE id = ? AND case_id = ?;`, [recordId, caseId]);
      return successResponse({ recordId, caseId, message: 'Parent document deleted from Job Card.' });
    }

    return problemResponse({
      status: 400,
      type: 'https://api.akspropertychecklist.in/errors/INVALID_TARGET',
      title: 'Invalid Delete Target',
      detail: 'Invalid delete target type. Allowed: EC_RECORD, PARENT_DOC.',
      req: request,
    });
  } catch (error: any) {
    console.error('Job Card DELETE Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/JOB_CARD_ERROR',
      title: 'Deletion Failed',
      detail: error.message || 'An unexpected error occurred during deletion.',
      req: request,
    });
  }
}
