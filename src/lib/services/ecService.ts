import { ecRepository, ECRecord, NewECRecordInput } from '@/lib/repositories/ecRepository';

export interface ECScrutinySummary {
  caseId: string;
  totalRecords: number;
  encumbranceCount: number;
  clearDeedsCount: number;
  distinctSROs: string[];
  overallStatus: 'NIL_ENCUMBRANCE' | 'ENCUMBERED' | 'UNVERIFIED';
  searchPeriodSpan: string;
  records: ECRecord[];
}

export class ECService {
  /**
   * Retrieves all 30-year EC records for a case and computes statutory metrics.
   */
  async getScrutinyMatrix(caseId: string): Promise<ECScrutinySummary> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const records = await ecRepository.findByCaseId(cleanCaseId);

    const encumbranceCount = records.filter(
      (r) => r.is_encumbrance_flag === 1 || r.is_encumbrance_flag === true
    ).length;
    const clearDeedsCount = records.length - encumbranceCount;

    const sroSet = new Set<string>();
    records.forEach((r) => {
      if (r.sro_name && r.sro_name.trim() !== '') {
        sroSet.add(r.sro_name.trim());
      }
    });

    let overallStatus: 'NIL_ENCUMBRANCE' | 'ENCUMBERED' | 'UNVERIFIED' = 'UNVERIFIED';
    if (records.length > 0) {
      overallStatus = encumbranceCount > 0 ? 'ENCUMBERED' : 'NIL_ENCUMBRANCE';
    }

    // Determine aggregate search period (e.g., "1994 - 2026")
    let searchPeriodSpan = '1994 - 2026 (30+ Years)';
    if (records.length > 0 && records[0].search_period) {
      searchPeriodSpan = records[0].search_period;
    }

    return {
      caseId: cleanCaseId,
      totalRecords: records.length,
      encumbranceCount,
      clearDeedsCount,
      distinctSROs: Array.from(sroSet),
      overallStatus,
      searchPeriodSpan,
      records,
    };
  }

  /**
   * Adds a new Sub-Registrar transaction entry to the 30-year search matrix.
   */
  async addRecord(caseId: string, input: Partial<NewECRecordInput>): Promise<{ id: string; success: boolean }> {
    if (!input.doc_number || input.doc_number.trim() === '') {
      throw new Error('Registered document number (Doc No / Year) is required.');
    }
    if (!input.sro_name || input.sro_name.trim() === '') {
      throw new Error('Sub-Registrar Office (SRO) name is required.');
    }
    if (!input.deed_nature || input.deed_nature.trim() === '') {
      throw new Error('Nature of deed (e.g. Sale Deed, Mortgage, Settlement) is required.');
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const existing = await ecRepository.findByCaseId(cleanCaseId);
    const nextSerial = input.serial_no || existing.length + 1;
    const recordId = input.id || `ec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const ok = await ecRepository.create({
      id: recordId,
      case_id: cleanCaseId,
      serial_no: nextSerial,
      search_period: input.search_period || '1994 - 2026 (30-Year Search)',
      doc_number: input.doc_number.trim(),
      sro_name: input.sro_name.trim(),
      deed_nature: input.deed_nature.trim(),
      executant: input.executant?.trim() || null,
      claimant: input.claimant?.trim() || null,
      is_encumbrance_flag: Boolean(input.is_encumbrance_flag),
      remarks: input.remarks?.trim() || null,
      doc_file_name: input.doc_file_name || null,
      doc_file_url: input.doc_file_url || null,
      source_type: input.source_type || 'MANUAL_UPLOAD',
      verification_status: input.verification_status || 'VERIFIED',
    });

    if (!ok) {
      throw new Error('Failed to persist EC transaction record to database.');
    }

    return { id: recordId, success: true };
  }

  /**
   * Updates an existing EC record.
   */
  async updateRecord(recordId: string, caseId: string, updates: Partial<NewECRecordInput>): Promise<boolean> {
    const existing = await ecRepository.findById(recordId, caseId);
    if (!existing) {
      throw new Error(`EC record "${recordId}" does not exist for case "${caseId}".`);
    }

    return await ecRepository.update(recordId, caseId, updates);
  }

  /**
   * Deletes an EC record from the scrutiny matrix.
   */
  async deleteRecord(recordId: string, caseId: string): Promise<boolean> {
    const existing = await ecRepository.findById(recordId, caseId);
    if (!existing) {
      throw new Error(`EC record "${recordId}" does not exist for case "${caseId}".`);
    }

    return await ecRepository.delete(recordId, caseId);
  }

  /**
   * Attaches an uploaded legal deed (PDF/DOCX) from the Vault to an EC record.
   */
  async attachDocument(
    recordId: string,
    caseId: string,
    doc: { fileName: string; fileUrl: string }
  ): Promise<boolean> {
    return await this.updateRecord(recordId, caseId, {
      doc_file_name: doc.fileName,
      doc_file_url: doc.fileUrl,
    });
  }
}

export const ecService = new ECService();

