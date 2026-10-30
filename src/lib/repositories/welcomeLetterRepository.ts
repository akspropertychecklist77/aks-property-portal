import { executeQueryOne, executeRun } from '@/lib/db';

export interface WelcomeLetterRecord {
  id: string;
  case_id: string;
  letter_ref_no: string;
  letter_date: string;
  template_version: string;
  scope_summary: string;
  documents_required_json: string;
  delivery_timeline_days: number;
  total_fee: number;
  advance_amount: number;
  balance_amount: number;
  terms_and_conditions: string;
  custom_clauses: string | null;
  approval_status: 'draft' | 'awaiting_approval' | 'approved';
  approved_by: string | null;
  approved_at: string | null;
  sent_status: 'not_sent' | 'sent';
  sent_at: string | null;
  sent_channel: string | null;
  sent_by: string | null;
  dispatch_ref: string | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertWelcomeLetterInput {
  case_id: string;
  letter_ref_no: string;
  letter_date: string;
  template_version?: string;
  scope_summary: string;
  documents_required_json: string;
  delivery_timeline_days?: number;
  total_fee: number;
  advance_amount: number;
  balance_amount: number;
  terms_and_conditions: string;
  custom_clauses?: string | null;
  approval_status?: 'draft' | 'awaiting_approval' | 'approved';
}

export class WelcomeLetterRepository {
  /**
   * Retrieves the Welcome Letter record for a specific case docket.
   */
  async findByCaseId(caseId: string): Promise<WelcomeLetterRecord | null> {
    return await executeQueryOne<WelcomeLetterRecord>(
      `SELECT * FROM case_welcome_letters WHERE UPPER(case_id) = ?;`,
      [caseId.trim().toUpperCase()]
    );
  }

  /**
   * Retrieves a Welcome Letter by its unique reference number.
   */
  async findByRefNo(refNo: string): Promise<WelcomeLetterRecord | null> {
    return await executeQueryOne<WelcomeLetterRecord>(
      `SELECT * FROM case_welcome_letters WHERE letter_ref_no = ?;`,
      [refNo.trim()]
    );
  }

  /**
   * Creates or updates a Welcome Letter draft in Cloudflare D1.
   */
  async upsert(input: UpsertWelcomeLetterInput): Promise<WelcomeLetterRecord> {
    const cleanCaseId = input.case_id.trim().toUpperCase();
    const existing = await this.findByCaseId(cleanCaseId);

    if (existing) {
      await executeRun(
        `UPDATE case_welcome_letters
         SET letter_ref_no = ?,
             letter_date = ?,
             scope_summary = ?,
             documents_required_json = ?,
             delivery_timeline_days = ?,
             total_fee = ?,
             advance_amount = ?,
             balance_amount = ?,
             terms_and_conditions = ?,
             custom_clauses = ?,
             approval_status = COALESCE(?, approval_status),
             updated_at = CURRENT_TIMESTAMP
         WHERE UPPER(case_id) = ?;`,
        [
          input.letter_ref_no.trim(),
          input.letter_date.trim(),
          input.scope_summary.trim(),
          input.documents_required_json.trim(),
          input.delivery_timeline_days ?? 7,
          input.total_fee,
          input.advance_amount,
          input.balance_amount,
          input.terms_and_conditions.trim(),
          input.custom_clauses?.trim() || null,
          input.approval_status || null,
          cleanCaseId,
        ]
      );
    } else {
      const id = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await executeRun(
        `INSERT INTO case_welcome_letters (
           id, case_id, letter_ref_no, letter_date, template_version,
           scope_summary, documents_required_json, delivery_timeline_days,
           total_fee, advance_amount, balance_amount, terms_and_conditions,
           custom_clauses, approval_status, sent_status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_sent');`,
        [
          id,
          cleanCaseId,
          input.letter_ref_no.trim(),
          input.letter_date.trim(),
          input.template_version || 'v1.0',
          input.scope_summary.trim(),
          input.documents_required_json.trim(),
          input.delivery_timeline_days ?? 7,
          input.total_fee,
          input.advance_amount,
          input.balance_amount,
          input.terms_and_conditions.trim(),
          input.custom_clauses?.trim() || null,
          input.approval_status || 'draft',
        ]
      );
    }

    const saved = await this.findByCaseId(cleanCaseId);
    if (!saved) throw new Error(`Failed to retrieve Welcome Letter for case: ${cleanCaseId}`);
    return saved;
  }

  /**
   * Updates advocate approval status.
   */
  async approve(caseId: string, approvedBy: string): Promise<boolean> {
    const cleanCaseId = caseId.trim().toUpperCase();
    return await executeRun(
      `UPDATE case_welcome_letters
       SET approval_status = 'approved',
           approved_by = ?,
           approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE UPPER(case_id) = ?;`,
      [approvedBy.trim(), cleanCaseId]
    );
  }

  /**
   * Updates client dispatch status.
   */
  async markSent(
    caseId: string,
    channel: string,
    dispatchRef: string,
    sentBy: string
  ): Promise<boolean> {
    const cleanCaseId = caseId.trim().toUpperCase();
    return await executeRun(
      `UPDATE case_welcome_letters
       SET sent_status = 'sent',
           sent_at = CURRENT_TIMESTAMP,
           sent_channel = ?,
           dispatch_ref = ?,
           sent_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE UPPER(case_id) = ?;`,
      [channel.trim(), dispatchRef.trim(), sentBy.trim(), cleanCaseId]
    );
  }
}

export const welcomeLetterRepository = new WelcomeLetterRepository();

