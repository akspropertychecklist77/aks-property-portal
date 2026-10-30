import { revenueRepository, RevenueRecord, UpsertRevenueInput } from '@/lib/repositories/revenueRepository';
import { executeQueryOne } from '@/lib/db';

export interface RevenueVerificationSummary {
  caseId: string;
  isRecorded: boolean;
  completenessScore: number; // 0 - 100%
  pattaAlignmentStatus: 'ALIGNED' | 'NAME_MUTATION_REQUIRED' | 'UNVERIFIED';
  surveyAlignmentStatus: 'SURVEY_MATCH' | 'DISCREPANCY_FLAGGED' | 'UNVERIFIED';
  documentsAttached: {
    hasPatta: boolean;
    hasChitta: boolean;
    hasFmbSketch: boolean;
  };
  record: RevenueRecord | null;
}

export class RevenueService {
  /**
   * Evaluates the statutory revenue verification status under Tamil Nadu Patta Pass Book Act.
   */
  async getRevenueVerification(caseId: string): Promise<RevenueVerificationSummary> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const record = await revenueRepository.findByCaseId(cleanCaseId);

    // Fetch parent case details for cross-reference
    const parentCase = await executeQueryOne<{
      client_name: string;
      survey_number: string;
      district: string;
    }>(
      `SELECT client_name, survey_number, district FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!record) {
      return {
        caseId: cleanCaseId,
        isRecorded: false,
        completenessScore: 0,
        pattaAlignmentStatus: 'UNVERIFIED',
        surveyAlignmentStatus: 'UNVERIFIED',
        documentsAttached: {
          hasPatta: false,
          hasChitta: false,
          hasFmbSketch: false,
        },
        record: null,
      };
    }

    // 1. Calculate Completeness Score (0 - 100%)
    let score = 0;
    if (record.patta_number && record.patta_number.trim() !== '') score += 25;
    if (record.patta_holder_name && record.patta_holder_name.trim() !== '') score += 25;
    if (record.chitta_adangal_verified === 1 || record.chitta_adangal_verified === true) score += 25;
    if (record.fmb_sketch_verified === 1 || record.fmb_sketch_verified === true) score += 25;

    // 2. Patta Holder vs Client/Vendor Alignment
    let pattaAlignmentStatus: 'ALIGNED' | 'NAME_MUTATION_REQUIRED' | 'UNVERIFIED' = 'UNVERIFIED';
    if (record.patta_holder_name && record.patta_holder_name.trim() !== '') {
      const normPattaHolder = record.patta_holder_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normClient = parentCase?.client_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

      if (normClient && (normPattaHolder.includes(normClient) || normClient.includes(normPattaHolder))) {
        pattaAlignmentStatus = 'ALIGNED';
      } else {
        // Patta stands in name of prior owner or ancestor
        pattaAlignmentStatus = 'NAME_MUTATION_REQUIRED';
      }
    }

    // 3. Survey Number Alignment
    let surveyAlignmentStatus: 'SURVEY_MATCH' | 'DISCREPANCY_FLAGGED' | 'UNVERIFIED' = 'UNVERIFIED';
    if (record.field_survey_no && record.field_survey_no.trim() !== '') {
      const normRecordSurvey = record.field_survey_no.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normCaseSurvey = parentCase?.survey_number?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

      if (normCaseSurvey && (normRecordSurvey.includes(normCaseSurvey) || normCaseSurvey.includes(normRecordSurvey))) {
        surveyAlignmentStatus = 'SURVEY_MATCH';
      } else if (normCaseSurvey) {
        surveyAlignmentStatus = 'DISCREPANCY_FLAGGED';
      } else {
        surveyAlignmentStatus = 'SURVEY_MATCH';
      }
    }

    return {
      caseId: cleanCaseId,
      isRecorded: true,
      completenessScore: score,
      pattaAlignmentStatus,
      surveyAlignmentStatus,
      documentsAttached: {
        hasPatta: Boolean(record.patta_file_url),
        hasChitta: Boolean(record.chitta_file_url),
        hasFmbSketch: Boolean(record.fmb_file_url),
      },
      record,
    };
  }

  /**
   * Upserts the revenue department verification details for a case.
   */
  async upsertRevenue(caseId: string, input: Partial<UpsertRevenueInput>): Promise<{ success: boolean }> {
    const cleanCaseId = caseId.trim().toUpperCase();

    const ok = await revenueRepository.upsert({
      case_id: cleanCaseId,
      current_sale_deed_no: input.current_sale_deed_no || null,
      patta_number: input.patta_number?.trim() || null,
      patta_holder_name: input.patta_holder_name?.trim() || null,
      field_survey_no: input.field_survey_no?.trim() || null,
      sub_division: input.sub_division?.trim() || null,
      village_taluk: input.village_taluk?.trim() || null,
      chitta_adangal_verified: Boolean(input.chitta_adangal_verified),
      fmb_sketch_verified: Boolean(input.fmb_sketch_verified),
      guideline_value: input.guideline_value ? Number(input.guideline_value) : null,
      patta_file_url: input.patta_file_url || null,
      patta_file_name: input.patta_file_name || null,
      chitta_file_url: input.chitta_file_url || null,
      chitta_file_name: input.chitta_file_name || null,
      fmb_file_url: input.fmb_file_url || null,
      fmb_file_name: input.fmb_file_name || null,
      source_type: input.source_type || 'MANUAL_UPLOAD',
    });

    if (!ok) {
      throw new Error('Failed to persist revenue records to database.');
    }

    return { success: true };
  }

  /**
   * Attaches an uploaded revenue document (Patta, Chitta, or FMB Sketch) from the Vault.
   */
  async attachDocument(
    caseId: string,
    docType: 'PATTA' | 'CHITTA' | 'FMB',
    doc: { fileName: string; fileUrl: string }
  ): Promise<boolean> {
    const updates: Partial<UpsertRevenueInput> = { case_id: caseId };

    if (docType === 'PATTA') {
      updates.patta_file_name = doc.fileName;
      updates.patta_file_url = doc.fileUrl;
    } else if (docType === 'CHITTA') {
      updates.chitta_file_name = doc.fileName;
      updates.chitta_file_url = doc.fileUrl;
      updates.chitta_adangal_verified = true;
    } else if (docType === 'FMB') {
      updates.fmb_file_name = doc.fileName;
      updates.fmb_file_url = doc.fileUrl;
      updates.fmb_sketch_verified = true;
    }

    const res = await this.upsertRevenue(caseId, updates);
    return res.success;
  }

  /**
   * Deletes the revenue verification record for a case.
   */
  async deleteRevenue(caseId: string): Promise<boolean> {
    return await revenueRepository.delete(caseId);
  }
}

export const revenueService = new RevenueService();
