import { parentDeedRepository, ParentDeedRecord, NewParentDeedInput } from '@/lib/repositories/parentDeedRepository';

export interface ChainLinkAnalysis {
  fromStep: number;
  toStep: number;
  fromBuyer: string;
  toSeller: string;
  isLinked: boolean;
  notes: string;
}

export interface TitleGenealogySummary {
  caseId: string;
  totalDeeds: number;
  rootOwner: string | null;
  currentOwner: string | null;
  chainIntegrity: 'UNBROKEN_CHAIN' | 'GAP_DETECTED' | 'INSUFFICIENT_RECORDS';
  spanSummary: string;
  linkAnalyses: ChainLinkAnalysis[];
  deeds: ParentDeedRecord[];
}

export class ParentDeedService {
  /**
   * Normalizes individual or party names for fuzzy link comparison.
   * Strips honorifics (Thiru, Mr., Dr., Mrs.), common punctuation, and extra whitespace.
   */
  private normalizePartyName(name: string | null | undefined): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\b(thiru|mr|mrs|ms|dr|smt|late)\b\.?/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Evaluates devolution link between seller in deed N+1 and buyer in deed N.
   */
  private checkPartyLink(buyerName: string | null, sellerName: string | null): boolean {
    const normBuyer = this.normalizePartyName(buyerName);
    const normSeller = this.normalizePartyName(sellerName);

    if (!normBuyer || !normSeller) return false;

    // Exact or substring match (to handle initials like P. Natarajan vs Natarajan)
    return normBuyer === normSeller || normBuyer.includes(normSeller) || normSeller.includes(normBuyer);
  }

  /**
   * Analyzes the complete title genealogy chain and performs automated devolution link analysis.
   */
  async getTitleGenealogy(caseId: string): Promise<TitleGenealogySummary> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const deeds = await parentDeedRepository.findByCaseId(cleanCaseId);

    if (deeds.length === 0) {
      return {
        caseId: cleanCaseId,
        totalDeeds: 0,
        rootOwner: null,
        currentOwner: null,
        chainIntegrity: 'INSUFFICIENT_RECORDS',
        spanSummary: 'No parent deeds indexed in Job Card.',
        linkAnalyses: [],
        deeds: [],
      };
    }

    const linkAnalyses: ChainLinkAnalysis[] = [];
    let hasBrokenLink = false;

    // Analyze transitions between consecutive deeds
    for (let i = 0; i < deeds.length - 1; i++) {
      const current = deeds[i];
      const next = deeds[i + 1];

      const fromBuyer = current.buyer_name || 'Unknown Buyer';
      const toSeller = next.seller_name || 'Unknown Seller';

      const isDirectMatch = this.checkPartyLink(fromBuyer, toSeller);
      // If there is an explicit gap analysis note explaining succession/inheritance, accept link as explained
      const isExplainedBySuccession = Boolean(
        next.gap_analysis_notes &&
          (next.gap_analysis_notes.toLowerCase().includes('succession') ||
            next.gap_analysis_notes.toLowerCase().includes('settlement') ||
            next.gap_analysis_notes.toLowerCase().includes('legal heir') ||
            next.gap_analysis_notes.toLowerCase().includes('partition'))
      );

      const isLinked = isDirectMatch || isExplainedBySuccession;

      if (!isLinked) {
        hasBrokenLink = true;
      }

      linkAnalyses.push({
        fromStep: current.sequence_order,
        toStep: next.sequence_order,
        fromBuyer,
        toSeller,
        isLinked,
        notes: isDirectMatch
          ? 'Direct titular conveyance match confirmed.'
          : isExplainedBySuccession
          ? `Devolution verified via succession document: ${next.gap_analysis_notes}`
          : `Potential title gap: Buyer "${fromBuyer}" does not match Seller "${toSeller}". Missing link deed or Legal Heirship Certificate required.`,
      });
    }

    const rootOwner = deeds[0].buyer_name || deeds[0].seller_name || null;
    const currentOwner = deeds[deeds.length - 1].buyer_name || null;

    const chainIntegrity: 'UNBROKEN_CHAIN' | 'GAP_DETECTED' | 'INSUFFICIENT_RECORDS' =
      deeds.length < 2
        ? 'INSUFFICIENT_RECORDS'
        : hasBrokenLink
        ? 'GAP_DETECTED'
        : 'UNBROKEN_CHAIN';

    const spanSummary = `${deeds[0].registration_date || '1994'} to ${
      deeds[deeds.length - 1].registration_date || 'Present'
    } (${deeds.length} Chronological Conveyances)`;

    return {
      caseId: cleanCaseId,
      totalDeeds: deeds.length,
      rootOwner,
      currentOwner,
      chainIntegrity,
      spanSummary,
      linkAnalyses,
      deeds,
    };
  }

  /**
   * Adds a new chronological parent deed to the title genealogy.
   */
  async addParentDeed(caseId: string, input: Partial<NewParentDeedInput>): Promise<{ id: string; success: boolean }> {
    if (!input.doc_number || input.doc_number.trim() === '') {
      throw new Error('Registered document number is required.');
    }
    if (!input.deed_type || input.deed_type.trim() === '') {
      throw new Error('Deed type (e.g. Sale Deed, Settlement Deed, Partition Deed) is required.');
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const existing = await parentDeedRepository.findByCaseId(cleanCaseId);
    const nextSequence = input.sequence_order || existing.length + 1;
    const recordId = input.id || `pd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const ok = await parentDeedRepository.create({
      id: recordId,
      case_id: cleanCaseId,
      sequence_order: nextSequence,
      deed_type: input.deed_type.trim(),
      doc_number: input.doc_number.trim(),
      sro_name: input.sro_name?.trim() || 'SRO Office',
      registration_date: input.registration_date?.trim() || null,
      seller_name: input.seller_name?.trim() || null,
      buyer_name: input.buyer_name?.trim() || null,
      extent: input.extent?.trim() || '2,400 Sq.Ft',
      link_verified: input.link_verified !== false,
      gap_analysis_notes: input.gap_analysis_notes?.trim() || null,
      doc_file_name: input.doc_file_name || null,
      doc_file_url: input.doc_file_url || null,
      source_type: input.source_type || 'MANUAL_UPLOAD',
    });

    if (!ok) {
      throw new Error('Failed to persist parent document into database.');
    }

    return { id: recordId, success: true };
  }

  /**
   * Updates an existing parent deed record.
   */
  async updateParentDeed(recordId: string, caseId: string, updates: Partial<NewParentDeedInput>): Promise<boolean> {
    const existing = await parentDeedRepository.findById(recordId, caseId);
    if (!existing) {
      throw new Error(`Parent deed "${recordId}" does not exist for case "${caseId}".`);
    }

    return await parentDeedRepository.update(recordId, caseId, updates);
  }

  /**
   * Deletes a parent deed record from the title genealogy.
   */
  async deleteParentDeed(recordId: string, caseId: string): Promise<boolean> {
    const existing = await parentDeedRepository.findById(recordId, caseId);
    if (!existing) {
      throw new Error(`Parent deed "${recordId}" does not exist for case "${caseId}".`);
    }

    return await parentDeedRepository.delete(recordId, caseId);
  }

  /**
   * Attaches an uploaded deed scan (PDF/DOCX) from the Vault to a parent deed record.
   */
  async attachDocument(
    recordId: string,
    caseId: string,
    doc: { fileName: string; fileUrl: string }
  ): Promise<boolean> {
    return await this.updateParentDeed(recordId, caseId, {
      doc_file_name: doc.fileName,
      doc_file_url: doc.fileUrl,
    });
  }
}

export const parentDeedService = new ParentDeedService();
