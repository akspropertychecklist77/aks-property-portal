import { executeQuery, executeQueryOne, executeRun, executeBatch } from '@/lib/db';

export interface ParentDeedRecord {
  id: string;
  case_id: string;
  sequence_order: number;
  deed_type: string;
  doc_number: string;
  sro_name: string | null;
  registration_date: string | null;
  seller_name: string | null;
  buyer_name: string | null;
  extent: string | null;
  link_verified: number | boolean;
  gap_analysis_notes: string | null;
  doc_file_name: string | null;
  doc_file_url: string | null;
  source_type: string;
}

export interface NewParentDeedInput {
  id?: string;
  case_id: string;
  sequence_order: number;
  deed_type: string;
  doc_number: string;
  sro_name?: string | null;
  registration_date?: string | null;
  seller_name?: string | null;
  buyer_name?: string | null;
  extent?: string | null;
  link_verified?: boolean;
  gap_analysis_notes?: string | null;
  doc_file_name?: string | null;
  doc_file_url?: string | null;
  source_type?: string;
}

export class ParentDeedRepository {
  /**
   * Retrieves all parent deeds for a case ordered chronologically by sequence_order.
   */
  async findByCaseId(caseId: string): Promise<ParentDeedRecord[]> {
    return await executeQuery<ParentDeedRecord>(
      `SELECT * FROM parent_documents WHERE UPPER(case_id) = ? ORDER BY sequence_order ASC;`,
      [caseId.trim().toUpperCase()]
    );
  }

  /**
   * Retrieves a single parent deed record by ID and case ID.
   */
  async findById(recordId: string, caseId: string): Promise<ParentDeedRecord | null> {
    return await executeQueryOne<ParentDeedRecord>(
      `SELECT * FROM parent_documents WHERE id = ? AND UPPER(case_id) = ?;`,
      [recordId.trim(), caseId.trim().toUpperCase()]
    );
  }

  /**
   * Inserts a single parent deed into the database.
   */
  async create(record: NewParentDeedInput): Promise<boolean> {
    const id = record.id || `pd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return await executeRun(
      `INSERT INTO parent_documents (
        id, case_id, sequence_order, deed_type, doc_number,
        sro_name, registration_date, seller_name, buyer_name, extent,
        link_verified, gap_analysis_notes, doc_file_name, doc_file_url, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        record.case_id.trim().toUpperCase(),
        record.sequence_order,
        record.deed_type,
        record.doc_number,
        record.sro_name || null,
        record.registration_date || null,
        record.seller_name || null,
        record.buyer_name || null,
        record.extent || null,
        record.link_verified !== false ? 1 : 0,
        record.gap_analysis_notes || null,
        record.doc_file_name || null,
        record.doc_file_url || null,
        record.source_type || 'MANUAL_UPLOAD',
      ]
    );
  }

  /**
   * Updates an existing parent deed record.
   */
  async update(recordId: string, caseId: string, updates: Partial<NewParentDeedInput>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.sequence_order !== undefined) {
      fields.push(`sequence_order = ?`);
      values.push(updates.sequence_order);
    }
    if (updates.deed_type !== undefined) {
      fields.push(`deed_type = ?`);
      values.push(updates.deed_type);
    }
    if (updates.doc_number !== undefined) {
      fields.push(`doc_number = ?`);
      values.push(updates.doc_number);
    }
    if (updates.sro_name !== undefined) {
      fields.push(`sro_name = ?`);
      values.push(updates.sro_name);
    }
    if (updates.registration_date !== undefined) {
      fields.push(`registration_date = ?`);
      values.push(updates.registration_date);
    }
    if (updates.seller_name !== undefined) {
      fields.push(`seller_name = ?`);
      values.push(updates.seller_name);
    }
    if (updates.buyer_name !== undefined) {
      fields.push(`buyer_name = ?`);
      values.push(updates.buyer_name);
    }
    if (updates.extent !== undefined) {
      fields.push(`extent = ?`);
      values.push(updates.extent);
    }
    if (updates.link_verified !== undefined) {
      fields.push(`link_verified = ?`);
      values.push(updates.link_verified ? 1 : 0);
    }
    if (updates.gap_analysis_notes !== undefined) {
      fields.push(`gap_analysis_notes = ?`);
      values.push(updates.gap_analysis_notes);
    }
    if (updates.doc_file_name !== undefined) {
      fields.push(`doc_file_name = ?`);
      values.push(updates.doc_file_name);
    }
    if (updates.doc_file_url !== undefined) {
      fields.push(`doc_file_url = ?`);
      values.push(updates.doc_file_url);
    }

    if (fields.length === 0) return true;

    values.push(recordId, caseId.trim().toUpperCase());
    return await executeRun(
      `UPDATE parent_documents SET ${fields.join(', ')} WHERE id = ? AND UPPER(case_id) = ?;`,
      values
    );
  }

  /**
   * Deletes a parent deed record.
   */
  async delete(recordId: string, caseId: string): Promise<boolean> {
    return await executeRun(
      `DELETE FROM parent_documents WHERE id = ? AND UPPER(case_id) = ?;`,
      [recordId.trim(), caseId.trim().toUpperCase()]
    );
  }

  /**
   * Inserts multiple parent deeds atomically using D1 executeBatch.
   */
  async bulkCreate(records: NewParentDeedInput[]): Promise<boolean> {
    if (records.length === 0) return true;

    const statements = records.map((r) => {
      const id = r.id || `pd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        sql: `INSERT INTO parent_documents (
          id, case_id, sequence_order, deed_type, doc_number,
          sro_name, registration_date, seller_name, buyer_name, extent,
          link_verified, gap_analysis_notes, doc_file_name, doc_file_url, source_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        params: [
          id,
          r.case_id.trim().toUpperCase(),
          r.sequence_order,
          r.deed_type,
          r.doc_number,
          r.sro_name || null,
          r.registration_date || null,
          r.seller_name || null,
          r.buyer_name || null,
          r.extent || null,
          r.link_verified !== false ? 1 : 0,
          r.gap_analysis_notes || null,
          r.doc_file_name || null,
          r.doc_file_url || null,
          r.source_type || 'MANUAL_UPLOAD',
        ],
      };
    });

    return await executeBatch(statements);
  }
}

export const parentDeedRepository = new ParentDeedRepository();
