import { executeQueryOne, executeRun } from '@/lib/db';

export interface RevenueRecord {
  id: string;
  case_id: string;
  current_sale_deed_no: string | null;
  patta_number: string | null;
  patta_holder_name: string | null;
  field_survey_no: string | null;
  sub_division: string | null;
  village_taluk: string | null;
  chitta_adangal_verified: number | boolean;
  fmb_sketch_verified: number | boolean;
  guideline_value: number | null;
  patta_file_url: string | null;
  patta_file_name: string | null;
  chitta_file_url: string | null;
  chitta_file_name: string | null;
  fmb_file_url: string | null;
  fmb_file_name: string | null;
  source_type: string;
}

export interface UpsertRevenueInput {
  id?: string;
  case_id: string;
  current_sale_deed_no?: string | null;
  patta_number?: string | null;
  patta_holder_name?: string | null;
  field_survey_no?: string | null;
  sub_division?: string | null;
  village_taluk?: string | null;
  chitta_adangal_verified?: boolean;
  fmb_sketch_verified?: boolean;
  guideline_value?: number | null;
  patta_file_url?: string | null;
  patta_file_name?: string | null;
  chitta_file_url?: string | null;
  chitta_file_name?: string | null;
  fmb_file_url?: string | null;
  fmb_file_name?: string | null;
  source_type?: string;
}

export class RevenueRepository {
  /**
   * Retrieves the revenue record for a given case.
   */
  async findByCaseId(caseId: string): Promise<RevenueRecord | null> {
    return await executeQueryOne<RevenueRecord>(
      `SELECT * FROM revenue_records WHERE UPPER(case_id) = ?;`,
      [caseId.trim().toUpperCase()]
    );
  }

  /**
   * Inserts or updates the revenue verification record atomically using ON CONFLICT(case_id).
   */
  async upsert(record: UpsertRevenueInput): Promise<boolean> {
    const id = record.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanCaseId = record.case_id.trim().toUpperCase();

    return await executeRun(
      `INSERT INTO revenue_records (
        id, case_id, current_sale_deed_no, patta_number, patta_holder_name,
        field_survey_no, sub_division, village_taluk, chitta_adangal_verified,
        fmb_sketch_verified, guideline_value, patta_file_url, patta_file_name,
        chitta_file_url, chitta_file_name, fmb_file_url, fmb_file_name, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_id) DO UPDATE SET
        current_sale_deed_no = COALESCE(excluded.current_sale_deed_no, revenue_records.current_sale_deed_no),
        patta_number = CASE WHEN excluded.patta_number IS NOT NULL AND excluded.patta_number != '' THEN excluded.patta_number ELSE revenue_records.patta_number END,
        patta_holder_name = CASE WHEN excluded.patta_holder_name IS NOT NULL AND excluded.patta_holder_name != '' THEN excluded.patta_holder_name ELSE revenue_records.patta_holder_name END,
        field_survey_no = CASE WHEN excluded.field_survey_no IS NOT NULL AND excluded.field_survey_no != '' THEN excluded.field_survey_no ELSE revenue_records.field_survey_no END,
        sub_division = CASE WHEN excluded.sub_division IS NOT NULL AND excluded.sub_division != '' THEN excluded.sub_division ELSE revenue_records.sub_division END,
        village_taluk = CASE WHEN excluded.village_taluk IS NOT NULL AND excluded.village_taluk != '' THEN excluded.village_taluk ELSE revenue_records.village_taluk END,
        chitta_adangal_verified = excluded.chitta_adangal_verified,
        fmb_sketch_verified = excluded.fmb_sketch_verified,
        guideline_value = COALESCE(excluded.guideline_value, revenue_records.guideline_value),
        patta_file_url = COALESCE(excluded.patta_file_url, revenue_records.patta_file_url),
        patta_file_name = COALESCE(excluded.patta_file_name, revenue_records.patta_file_name),
        chitta_file_url = COALESCE(excluded.chitta_file_url, revenue_records.chitta_file_url),
        chitta_file_name = COALESCE(excluded.chitta_file_name, revenue_records.chitta_file_name),
        fmb_file_url = COALESCE(excluded.fmb_file_url, revenue_records.fmb_file_url),
        fmb_file_name = COALESCE(excluded.fmb_file_name, revenue_records.fmb_file_name),
        source_type = excluded.source_type;`,
      [
        id,
        cleanCaseId,
        record.current_sale_deed_no || null,
        record.patta_number || null,
        record.patta_holder_name || null,
        record.field_survey_no || null,
        record.sub_division || null,
        record.village_taluk || null,
        record.chitta_adangal_verified ? 1 : 0,
        record.fmb_sketch_verified ? 1 : 0,
        record.guideline_value || null,
        record.patta_file_url || null,
        record.patta_file_name || null,
        record.chitta_file_url || null,
        record.chitta_file_name || null,
        record.fmb_file_url || null,
        record.fmb_file_name || null,
        record.source_type || 'MANUAL_UPLOAD',
      ]
    );
  }

  /**
   * Deletes the revenue verification record for a given case.
   */
  async delete(caseId: string): Promise<boolean> {
    return await executeRun(
      `DELETE FROM revenue_records WHERE UPPER(case_id) = ?;`,
      [caseId.trim().toUpperCase()]
    );
  }
}

export const revenueRepository = new RevenueRepository();

