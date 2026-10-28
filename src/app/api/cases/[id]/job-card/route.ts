import { NextResponse } from 'next/server';
import { executeQuery, executeRun } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();
    const body = await request.json();
    const { type, data } = body;

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

      return NextResponse.json({
        success: true,
        message: 'EC Record saved to database successfully',
        recordId,
      });
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

      return NextResponse.json({
        success: true,
        message: 'Parent Document saved to database successfully',
        recordId,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown record type' }, { status: 400 });
  } catch (error: any) {
    console.error('Job Card DB Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseId = decodeURIComponent(id).trim().toUpperCase();
    const body = await request.json();
    const { type, data } = body;

    if (type === 'REVENUE_PATTA') {
      // Upsert revenue records
      await executeRun(
        `INSERT INTO revenue_records (
          id, case_id, patta_number, patta_holder_name, field_survey_no,
          sub_division, village_taluk, chitta_adangal_verified, fmb_sketch_verified,
          patta_file_url, fmb_file_url, source_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(case_id) DO UPDATE SET
          patta_number = CASE WHEN excluded.patta_number != '' THEN excluded.patta_number ELSE revenue_records.patta_number END,
          patta_holder_name = CASE WHEN excluded.patta_holder_name != '' THEN excluded.patta_holder_name ELSE revenue_records.patta_holder_name END,
          field_survey_no = CASE WHEN excluded.field_survey_no != '' THEN excluded.field_survey_no ELSE revenue_records.field_survey_no END,
          sub_division = CASE WHEN excluded.sub_division != '' THEN excluded.sub_division ELSE revenue_records.sub_division END,
          village_taluk = CASE WHEN excluded.village_taluk != '' THEN excluded.village_taluk ELSE revenue_records.village_taluk END,
          chitta_adangal_verified = CASE WHEN excluded.chitta_adangal_verified = 1 THEN 1 ELSE revenue_records.chitta_adangal_verified END,
          fmb_sketch_verified = CASE WHEN excluded.fmb_sketch_verified = 1 THEN 1 ELSE revenue_records.fmb_sketch_verified END,
          patta_file_url = COALESCE(excluded.patta_file_url, revenue_records.patta_file_url),
          fmb_file_url = COALESCE(excluded.fmb_file_url, revenue_records.fmb_file_url),
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
          data.fmbFileUrl || null,
          data.sourceType || 'MANUAL_UPLOAD',
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Revenue & Patta records updated in database',
      });
    }

    if (type === 'ADVOCATE_OPINION') {
      await executeRun(
        `INSERT INTO legal_opinions (
          id, case_id, advocate_name, root_of_title, marketable_title_certified,
          encumbrance_status, legal_scrutiny_summary, special_conditions, sign_off_status, signed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(case_id) DO UPDATE SET
          marketable_title_certified = excluded.marketable_title_certified,
          encumbrance_status = excluded.encumbrance_status,
          legal_scrutiny_summary = excluded.legal_scrutiny_summary,
          special_conditions = excluded.special_conditions,
          sign_off_status = excluded.sign_off_status,
          signed_at = CURRENT_TIMESTAMP;`,
        [
          `op_${Date.now()}`,
          caseId,
          data.advocateName || 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
          data.rootOfTitle || 'Chain of title unbroken for 30+ years.',
          data.marketableTitle === 'Clear' ? 1 : 0,
          data.encumbranceStatus || 'Nil Encumbrance',
          Array.isArray(data.keyFindings) ? data.keyFindings.join('\n') : data.keyFindings || '',
          Array.isArray(data.recommendations) ? data.recommendations.join('\n') : data.recommendations || '',
          data.advocateSignoff ? 'approved' : 'draft',
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Advocate Legal Opinion signed and recorded in database',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown update type' }, { status: 400 });
  } catch (error: any) {
    console.error('Job Card PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    if (!recordId) {
      return NextResponse.json({ success: false, error: 'Record ID required' }, { status: 400 });
    }

    if (type === 'EC_RECORD') {
      await executeRun(`DELETE FROM ec_records WHERE id = ? AND case_id = ?;`, [recordId, caseId]);
      return NextResponse.json({ success: true, message: 'EC record deleted' });
    }

    if (type === 'PARENT_DOC') {
      await executeRun(`DELETE FROM parent_documents WHERE id = ? AND case_id = ?;`, [recordId, caseId]);
      return NextResponse.json({ success: true, message: 'Parent document deleted' });
    }

    return NextResponse.json({ success: false, error: 'Invalid delete target' }, { status: 400 });
  } catch (error: any) {
    console.error('Job Card DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

