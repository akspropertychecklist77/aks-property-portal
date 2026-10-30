import { executeQuery, executeQueryOne, executeRun, executeBatch } from '@/lib/db';

export interface EnquiryRecord {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_package: string;
  district: string;
  property_address: string | null;
  survey_number: string | null;
  client_notes: string | null;
  source: string;
  status: 'new' | 'contacted' | 'accepted' | 'rejected' | 'spam';
  assigned_handler_id: string | null;
  converted_case_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryFilterParams {
  status?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export class EnquiryRepository {
  /**
   * Finds enquiries with optional status filter, search query, and pagination.
   */
  async findMany(filters: EnquiryFilterParams = {}): Promise<EnquiryRecord[]> {
    let sql = `SELECT * FROM enquiries WHERE 1=1`;
    const params: any[] = [];

    if (filters.status && filters.status !== 'all') {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const term = `%${filters.searchTerm.trim()}%`;
      sql += ` AND (client_name LIKE ? OR client_phone LIKE ? OR district LIKE ? OR survey_number LIKE ? OR id LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    return await executeQuery<EnquiryRecord>(sql, params);
  }

  /**
   * Finds an enquiry record by ID.
   */
  async findById(id: string): Promise<EnquiryRecord | null> {
    return await executeQueryOne<EnquiryRecord>(
      `SELECT * FROM enquiries WHERE id = ?;`,
      [id.trim()]
    );
  }

  /**
   * Checks for duplicate leads from the same phone number within a rolling window (e.g. 24 hours).
   */
  async findRecentDuplicate(phone: string, district?: string): Promise<EnquiryRecord | null> {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let sql = `SELECT * FROM enquiries 
               WHERE REPLACE(REPLACE(client_phone, ' ', ''), '+91', '') = ? 
                 AND status != 'rejected'
                 AND created_at >= datetime('now', '-1 day')`;
    const params: any[] = [cleanPhone.slice(-10)];

    if (district) {
      sql += ` AND LOWER(district) = LOWER(?)`;
      params.push(district);
    }

    sql += ` ORDER BY created_at DESC LIMIT 1;`;

    return await executeQueryOne<EnquiryRecord>(sql, params);
  }

  /**
   * Inserts a new inbound enquiry into the Tier 1 staging buffer.
   */
  async create(record: {
    id: string;
    client_name: string;
    client_phone: string;
    client_email?: string | null;
    service_package?: string;
    district: string;
    property_address?: string;
    survey_number?: string;
    client_notes?: string;
    source?: string;
  }): Promise<boolean> {
    return await executeRun(
      `INSERT INTO enquiries (
        id, client_name, client_phone, client_email, service_package,
        district, property_address, survey_number, client_notes, source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new');`,
      [
        record.id,
        record.client_name.trim(),
        record.client_phone.trim(),
        record.client_email ? record.client_email.trim() : null,
        record.service_package || 'Legal Opinion (Standard)',
        record.district.trim(),
        record.property_address ? record.property_address.trim() : '',
        record.survey_number ? record.survey_number.trim() : '',
        record.client_notes ? record.client_notes.trim() : '',
        record.source || 'website',
      ]
    );
  }

  /**
   * Updates enquiry triage status, rejection reason, or assigned handler.
   */
  async updateStatus(
    id: string,
    status: 'new' | 'contacted' | 'accepted' | 'rejected' | 'spam',
    rejectionReason?: string,
    handlerId?: string
  ): Promise<boolean> {
    return await executeRun(
      `UPDATE enquiries 
       SET status = ?, 
           rejection_reason = COALESCE(?, rejection_reason),
           assigned_handler_id = COALESCE(?, assigned_handler_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [status, rejectionReason || null, handlerId || null, id]
    );
  }

  /**
   * Atomically executes case creation, milestone log initialization, and enquiry promotion.
   */
  async promoteToCaseAtomic({
    enquiryId,
    caseId,
    clientName,
    clientPhone,
    clientEmail,
    servicePackage,
    district,
    propertyAddress,
    surveyNumber,
    totalFee,
    advanceAmount,
    balanceAmount,
    handlerName,
  }: {
    enquiryId: string;
    caseId: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string | null;
    servicePackage: string;
    district: string;
    propertyAddress?: string;
    surveyNumber?: string;
    totalFee: number;
    advanceAmount: number;
    balanceAmount: number;
    handlerName: string;
  }): Promise<boolean> {
    const statements = [
      {
        sql: `INSERT INTO cases (
          id, source_enquiry_id, client_name, client_phone, client_email,
          service_package, current_stage, district, property_address,
          survey_number, total_fee, advance_amount, balance_amount,
          payment_status, case_status
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'advance_pending', 'active');`,
        params: [
          caseId,
          enquiryId,
          clientName,
          clientPhone,
          clientEmail || null,
          servicePackage,
          district,
          propertyAddress || '',
          surveyNumber || '',
          totalFee,
          advanceAmount,
          balanceAmount,
        ],
      },
      {
        sql: `INSERT INTO case_milestone_logs (
          id, case_id, from_stage, to_stage, action_notes, triggered_by
        ) VALUES (?, ?, NULL, 1, ?, ?);`,
        params: [
          `log_${Date.now()}`,
          caseId,
          `Enquiry [${enquiryId}] accepted by ${handlerName}. Promoted to active legal case docket at Stage 1.`,
          handlerName,
        ],
      },
      {
        sql: `UPDATE enquiries 
         SET status = 'accepted', converted_case_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?;`,
        params: [caseId, enquiryId],
      },
    ];

    return await executeBatch(statements);
  }
}

export const enquiryRepository = new EnquiryRepository();

