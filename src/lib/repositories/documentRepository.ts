import { executeQuery, executeQueryOne, executeRun } from '@/lib/db';

export interface CaseDocumentRecord {
  id: string;
  case_id: string;
  file_name: string;
  file_category: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  is_watermarked: number | boolean;
  uploaded_at: string;
}

export interface CreateDocumentInput {
  id?: string;
  case_id: string;
  file_name: string;
  file_category: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  is_watermarked?: boolean;
}

export class DocumentRepository {
  /**
   * Retrieves all documents associated with a case, optionally filtered by category.
   */
  async findByCaseId(caseId: string, category?: string): Promise<CaseDocumentRecord[]> {
    const cleanCaseId = caseId.trim().toUpperCase();
    if (category) {
      return await executeQuery<CaseDocumentRecord>(
        `SELECT * FROM case_documents 
         WHERE UPPER(case_id) = ? AND UPPER(file_category) = ? 
         ORDER BY uploaded_at DESC;`,
        [cleanCaseId, category.trim().toUpperCase()]
      );
    }
    return await executeQuery<CaseDocumentRecord>(
      `SELECT * FROM case_documents 
       WHERE UPPER(case_id) = ? 
       ORDER BY uploaded_at DESC;`,
      [cleanCaseId]
    );
  }

  /**
   * Retrieves a single document by ID.
   */
  async findById(docId: string): Promise<CaseDocumentRecord | null> {
    return await executeQueryOne<CaseDocumentRecord>(
      `SELECT * FROM case_documents WHERE id = ?;`,
      [docId.trim()]
    );
  }

  /**
   * Checks for duplicate files in the case docket using filename or SHA-256 pattern in path.
   */
  async findDuplicate(caseId: string, fileName: string, sha256Pattern: string): Promise<CaseDocumentRecord | null> {
    return await executeQueryOne<CaseDocumentRecord>(
      `SELECT * FROM case_documents
       WHERE UPPER(case_id) = ? AND (file_name = ? OR storage_path LIKE ?);`,
      [caseId.trim().toUpperCase(), fileName.trim(), `%${sha256Pattern}%`]
    );
  }

  /**
   * Persists a new document record into D1.
   */
  async create(input: CreateDocumentInput): Promise<CaseDocumentRecord> {
    const id = input.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanCaseId = input.case_id.trim().toUpperCase();
    const isWatermarked = input.is_watermarked ? 1 : 0;

    await executeRun(
      `INSERT INTO case_documents (
         id, case_id, file_name, file_category, storage_path, file_size_bytes, mime_type, is_watermarked
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        cleanCaseId,
        input.file_name.trim(),
        input.file_category.trim(),
        input.storage_path.trim(),
        input.file_size_bytes,
        input.mime_type.trim(),
        isWatermarked,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve created document with id: ${id}`);
    }
    return created;
  }

  /**
   * Deletes a document record from D1.
   */
  async delete(docId: string): Promise<boolean> {
    return await executeRun(
      `DELETE FROM case_documents WHERE id = ?;`,
      [docId.trim()]
    );
  }

  /**
   * Updates watermarked status of a document.
   */
  async updateWatermarked(docId: string, isWatermarked: boolean): Promise<boolean> {
    return await executeRun(
      `UPDATE case_documents SET is_watermarked = ? WHERE id = ?;`,
      [isWatermarked ? 1 : 0, docId.trim()]
    );
  }
}

export const documentRepository = new DocumentRepository();
