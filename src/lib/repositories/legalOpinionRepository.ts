import { executeQueryOne, executeRun } from '@/lib/db';

export interface LegalOpinionRecord {
  id: string;
  case_id: string;
  advocate_name: string;
  bar_council_reg_no: string | null;
  root_of_title: string | null;
  marketable_title_certified: number | boolean;
  encumbrance_status: string;
  legal_scrutiny_summary: string | null;
  special_conditions: string | null;
  sign_off_status: 'draft' | 'pending_review' | 'approved';
  signed_at: string | null;
}

export interface UpsertLegalOpinionInput {
  id?: string;
  case_id: string;
  advocate_name?: string;
  bar_council_reg_no?: string | null;
  root_of_title?: string | null;
  marketable_title_certified?: boolean;
  encumbrance_status?: string;
  legal_scrutiny_summary?: string | null;
  special_conditions?: string | null;
  sign_off_status?: 'draft' | 'pending_review' | 'approved';
  signed_at?: string | null;
}

export class LegalOpinionRepository {
  /**
   * Retrieves the legal opinion for a specific case.
   */
  async findByCaseId(caseId: string): Promise<LegalOpinionRecord | null> {
    return await executeQueryOne<LegalOpinionRecord>(
      `SELECT * FROM legal_opinions WHERE UPPER(case_id) = ?;`,
      [caseId.trim().toUpperCase()]
    );
  }

  /**
   * Inserts or updates the legal opinion record atomically.
   */
  async upsert(record: UpsertLegalOpinionInput): Promise<boolean> {
    const id = record.id || `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanCaseId = record.case_id.trim().toUpperCase();

    const advocateName = record.advocate_name || 'Advocate A.K. Saravanan (M.E. Energy, LLB)';
    const barCouncilNo = record.bar_council_reg_no || 'MS/1245/2005';
    const signOffStatus = record.sign_off_status || 'draft';

    return await executeRun(
      `INSERT INTO legal_opinions (
        id, case_id, advocate_name, bar_council_reg_no, root_of_title,
        marketable_title_certified, encumbrance_status, legal_scrutiny_summary,
        special_conditions, sign_off_status, signed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_id) DO UPDATE SET
        advocate_name = excluded.advocate_name,
        bar_council_reg_no = excluded.bar_council_reg_no,
        root_of_title = COALESCE(excluded.root_of_title, legal_opinions.root_of_title),
        marketable_title_certified = excluded.marketable_title_certified,
        encumbrance_status = excluded.encumbrance_status,
        legal_scrutiny_summary = COALESCE(excluded.legal_scrutiny_summary, legal_opinions.legal_scrutiny_summary),
        special_conditions = COALESCE(excluded.special_conditions, legal_opinions.special_conditions),
        sign_off_status = excluded.sign_off_status,
        signed_at = excluded.signed_at;`,
      [
        id,
        cleanCaseId,
        advocateName,
        barCouncilNo,
        record.root_of_title || null,
        record.marketable_title_certified ? 1 : 0,
        record.encumbrance_status || 'Clear',
        record.legal_scrutiny_summary || null,
        record.special_conditions || null,
        signOffStatus,
        record.signed_at || (signOffStatus === 'approved' ? new Date().toISOString() : null),
      ]
    );
  }

  /**
   * Deletes the legal opinion for a case.
   */
  async delete(caseId: string): Promise<boolean> {
    return await executeRun(
      `DELETE FROM legal_opinions WHERE UPPER(case_id) = ?;`,
      [caseId.trim().toUpperCase()]
    );
  }
}

export const legalOpinionRepository = new LegalOpinionRepository();
