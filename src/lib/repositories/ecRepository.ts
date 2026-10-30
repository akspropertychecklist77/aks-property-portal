import { executeQuery, executeQueryOne, executeRun, executeBatch } from '@/lib/db';

export interface ECRecord {
  id: string;
  case_id: string;
  serial_no: number;
  search_period: string;
  doc_number: string;
  sro_name: string;
  deed_nature: string;
  executant: string | null;
  claimant: string | null;
  is_encumbrance_flag: number | boolean;
  remarks: string | null;
  doc_file_name: string | null;
  doc_file_url: string | null;
  source_type: string;
  verification_status: string;
  created_at: string;
}

export interface NewECRecordInput {
  id?: string;
  case_id: string;
  serial_no: number;
  search_period: string;
  doc_number: string;
  sro_name: string;
  deed_nature: string;
  executant?: string | null;
  claimant?: string | null;
  is_encumbrance_flag?: boolean;
  remarks?: string | null;
  doc_file_name?: string | null;
  doc_file_url?: string | null;
  source_type?: string;
  verification_status?: string;
}

export class ECRepository {
  /**
   * Retrieves all EC entries for a specific case ordered by serial_no.
   */
  async findByCaseId(caseId: string): Promise<ECRecord[]> {
    return await executeQuery<ECRecord>(
      `SELECT * FROM ec_records WHERE UPPER(case_id) = ? ORDER BY serial_no ASC;`,
      [caseId.trim().toUpperCase()]
    );
  }

  /**
   * Retrieves a single EC entry by ID and case ID.
   */
  async findById(recordId: string, caseId: string): Promise<ECRecord | null> {
    return await executeQueryOne<ECRecord>(
      `SELECT * FROM ec_records WHERE id = ? AND UPPER(case_id) = ?;`,
      [recordId.trim(), caseId.trim().toUpperCase()]
    );
  }

  /**
   * Inserts a single EC record into the database.
   */
  async create(record: NewECRecordInput): Promise<boolean> {
    const id = record.id || `ec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return await executeRun(
      `INSERT INTO ec_records (
        id, case_id, serial_no, search_period, doc_number,
        sro_name, deed_nature, executant, claimant, is_encumbrance_flag,
        remarks, doc_file_name, doc_file_url, source_type, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        record.case_id.trim().toUpperCase(),
        record.serial_no,
        record.search_period,
        record.doc_number,
        record.sro_name,
        record.deed_nature,
        record.executant || null,
        record.claimant || null,
        record.is_encumbrance_flag ? 1 : 0,
        record.remarks || null,
        record.doc_file_name || null,
        record.doc_file_url || null,
        record.source_type || 'MANUAL_UPLOAD',
        record.verification_status || 'VERIFIED',
      ]
    );
  }

  /**
   * Updates an existing EC record.
   */
  async update(recordId: string, caseId: string, updates: Partial<NewECRecordInput>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.serial_no !== undefined) {
      fields.push(`serial_no = ?`);
      values.push(updates.serial_no);
    }
    if (updates.search_period !== undefined) {
      fields.push(`search_period = ?`);
      values.push(updates.search_period);
    }
    if (updates.doc_number !== undefined) {
      fields.push(`doc_number = ?`);
      values.push(updates.doc_number);
    }
    if (updates.sro_name !== undefined) {
      fields.push(`sro_name = ?`);
      values.push(updates.sro_name);
    }
    if (updates.deed_nature !== undefined) {
      fields.push(`deed_nature = ?`);
      values.push(updates.deed_nature);
    }
    if (updates.executant !== undefined) {
      fields.push(`executant = ?`);
      values.push(updates.executant);
    }
    if (updates.claimant !== undefined) {
      fields.push(`claimant = ?`);
      values.push(updates.claimant);
    }
    if (updates.is_encumbrance_flag !== undefined) {
      fields.push(`is_encumbrance_flag = ?`);
      values.push(updates.is_encumbrance_flag ? 1 : 0);
    }
    if (updates.remarks !== undefined) {
      fields.push(`remarks = ?`);
      values.push(updates.remarks);
    }
    if (updates.doc_file_name !== undefined) {
      fields.push(`doc_file_name = ?`);
      values.push(updates.doc_file_name);
    }
    if (updates.doc_file_url !== undefined) {
      fields.push(`doc_file_url = ?`);
      values.push(updates.doc_file_url);
    }
    if (updates.verification_status !== undefined) {
      fields.push(`verification_status = ?`);
      values.push(updates.verification_status);
    }

    if (fields.length === 0) return true;

    values.push(recordId, caseId.trim().toUpperCase());
    return await executeRun(
      `UPDATE ec_records SET ${fields.join(', ')} WHERE id = ? AND UPPER(case_id) = ?;`,
      values
    );
  }

  /**
   * Deletes an EC record.
   */
  async delete(recordId: string, caseId: string): Promise<boolean> {
    return await executeRun(
      `DELETE FROM ec_records WHERE id = ? AND UPPER(case_id) = ?;`,
      [recordId.trim(), caseId.trim().toUpperCase()]
    );
  }

  /**
   * Inserts multiple EC records atomically using D1 executeBatch.
   */
  async bulkCreate(records: NewECRecordInput[]): Promise<boolean> {
    if (records.length === 0) return true;

    const statements = records.map((r) => {
      const id = r.id || `ec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        sql: `INSERT INTO ec_records (
          id, case_id, serial_no, search_period, doc_number,
          sro_name, deed_nature, executant, claimant, is_encumbrance_flag,
          remarks, doc_file_name, doc_file_url, source_type, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        params: [
          id,
          r.case_id.trim().toUpperCase(),
          r.serial_no,
          r.search_period,
          r.doc_number,
          r.sro_name,
          r.deed_nature,
          r.executant || null,
          r.claimant || null,
          r.is_encumbrance_flag ? 1 : 0,
          r.remarks || null,
          r.doc_file_name || null,
          r.doc_file_url || null,
          r.source_type || 'MANUAL_UPLOAD',
          r.verification_status || 'VERIFIED',
        ],
      };
    });

    return await executeBatch(statements);
  }
}

export const ecRepository = new ECRepository();
