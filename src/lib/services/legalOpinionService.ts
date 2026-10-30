import { legalOpinionRepository, LegalOpinionRecord, UpsertLegalOpinionInput } from '@/lib/repositories/legalOpinionRepository';
import { executeQuery, executeQueryOne } from '@/lib/db';
import { recordChainedAuditLog } from '@/lib/security/auditSigner';
import { hasPermission } from '@/lib/api/rbac';

export interface LegalOpinionDetails {
  caseId: string;
  isDrafted: boolean;
  isSignedOff: boolean;
  advocateName: string;
  barCouncilRegNo: string;
  marketableTitle: boolean;
  encumbranceStatus: string;
  rootOfTitle: string | null;
  legalScrutinySummary: string | null;
  specialConditions: string | null;
  signedAt: string | null;
  prerequisites: {
    ecRecordsCount: number;
    parentDeedsCount: number;
    hasRevenuePatta: boolean;
    isReadyForSignOff: boolean;
  };
  record: LegalOpinionRecord | null;
}

export class LegalOpinionService {
  /**
   * Retrieves full legal opinion details along with scrutiny prerequisite readiness.
   */
  async getOpinionDetails(caseId: string): Promise<LegalOpinionDetails> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const record = await legalOpinionRepository.findByCaseId(cleanCaseId);

    // Check prerequisites from other scrutiny modules
    const ecRecords = await executeQuery<{ id: string }>(
      `SELECT id FROM ec_records WHERE UPPER(case_id) = ?;`,
      [cleanCaseId]
    );

    const parentDeeds = await executeQuery<{ id: string }>(
      `SELECT id FROM parent_documents WHERE UPPER(case_id) = ?;`,
      [cleanCaseId]
    );

    const revenue = await executeQueryOne<{ patta_number: string | null }>(
      `SELECT patta_number FROM revenue_records WHERE UPPER(case_id) = ?;`,
      [cleanCaseId]
    );

    const hasRevenuePatta = Boolean(revenue && revenue.patta_number && revenue.patta_number.trim() !== '');
    const isReadyForSignOff = ecRecords.length > 0 && parentDeeds.length > 0 && hasRevenuePatta;

    if (!record) {
      return {
        caseId: cleanCaseId,
        isDrafted: false,
        isSignedOff: false,
        advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
        barCouncilRegNo: 'MS/1245/2005',
        marketableTitle: false,
        encumbranceStatus: 'Pending Scrutiny',
        rootOfTitle: null,
        legalScrutinySummary: null,
        specialConditions: null,
        signedAt: null,
        prerequisites: {
          ecRecordsCount: ecRecords.length,
          parentDeedsCount: parentDeeds.length,
          hasRevenuePatta,
          isReadyForSignOff,
        },
        record: null,
      };
    }

    const isSignedOff = record.sign_off_status === 'approved';

    return {
      caseId: cleanCaseId,
      isDrafted: true,
      isSignedOff,
      advocateName: record.advocate_name,
      barCouncilRegNo: record.bar_council_reg_no || 'MS/1245/2005',
      marketableTitle: record.marketable_title_certified === 1 || record.marketable_title_certified === true,
      encumbranceStatus: record.encumbrance_status,
      rootOfTitle: record.root_of_title,
      legalScrutinySummary: record.legal_scrutiny_summary,
      specialConditions: record.special_conditions,
      signedAt: record.signed_at,
      prerequisites: {
        ecRecordsCount: ecRecords.length,
        parentDeedsCount: parentDeeds.length,
        hasRevenuePatta,
        isReadyForSignOff,
      },
      record,
    };
  }

  /**
   * Saves work-in-progress draft findings (accessible to legal scrutinizers and clerks).
   */
  async saveDraft(
    caseId: string,
    input: Partial<UpsertLegalOpinionInput>,
    authorName = 'Legal Research Associate'
  ): Promise<{ success: boolean }> {
    const cleanCaseId = caseId.trim().toUpperCase();

    const ok = await legalOpinionRepository.upsert({
      case_id: cleanCaseId,
      advocate_name: input.advocate_name || 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
      bar_council_reg_no: input.bar_council_reg_no || 'MS/1245/2005',
      root_of_title: input.root_of_title || null,
      marketable_title_certified: Boolean(input.marketable_title_certified),
      encumbrance_status: input.encumbrance_status || 'Nil Encumbrance',
      legal_scrutiny_summary: input.legal_scrutiny_summary || null,
      special_conditions: input.special_conditions || null,
      sign_off_status: 'draft',
      signed_at: null,
    });

    if (!ok) {
      throw new Error('Failed to save draft legal opinion findings.');
    }

    return { success: true };
  }

  /**
   * Formally signs, stamps, and certifies the Legal Opinion under Bar Council enrollment MS/1245/2005.
   * Strictly gated by 'stage:sign_opinion' capability.
   */
  async certifyAndSign(
    caseId: string,
    input: Partial<UpsertLegalOpinionInput>,
    advocateUser: { id: string; fullName: string; role: string; barCouncilNo?: string }
  ): Promise<{
    caseId: string;
    advocateName: string;
    barCouncilRegNo: string;
    signedAt: string;
    marketableTitle: boolean;
    auditHash: string;
  }> {
    // 1. Authority Guard: Only Advocate Partner or Admin can certify legal opinions
    if (!hasPermission(advocateUser.role, 'stage:sign_opinion')) {
      throw new Error(
        `Unauthorized: Role "${advocateUser.role}" lacks statutory authority to sign legal opinions. Bar Council Enrollment No. MS/1245/2005 required.`
      );
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const advocateName = advocateUser.fullName || 'Advocate A.K. Saravanan (M.E. Energy, LLB)';
    const barCouncilRegNo = advocateUser.barCouncilNo || 'MS/1245/2005';
    const signedAt = new Date().toISOString();
    const isMarketable = input.marketable_title_certified !== false;

    // 2. Persist approved opinion in D1
    const ok = await legalOpinionRepository.upsert({
      case_id: cleanCaseId,
      advocate_name: advocateName,
      bar_council_reg_no: barCouncilRegNo,
      root_of_title: input.root_of_title || 'Unbroken 30+ year chain of title verified through registered Sub-Registrar documents.',
      marketable_title_certified: isMarketable,
      encumbrance_status: input.encumbrance_status || (isMarketable ? 'Nil Encumbrance' : 'Encumbered'),
      legal_scrutiny_summary: input.legal_scrutiny_summary || 'Title verification completed in compliance with Registration Act 1908 and Tamil Nadu Patta Pass Book Act 1983.',
      special_conditions: input.special_conditions || 'Subject to physical boundary verification by Taluk surveyor.',
      sign_off_status: 'approved',
      signed_at: signedAt,
    });

    if (!ok) {
      throw new Error('Failed to record signed legal opinion in database.');
    }

    // 3. Record Cryptographically Chained Tamper-Evident Merkle Audit Log
    const auditResult = await recordChainedAuditLog({
      caseId: cleanCaseId,
      action: 'LEGAL_OPINION_SIGNED_AND_CERTIFIED',
      previousState: 'DRAFT_OPINION',
      newState: `CERTIFIED_MARKETABLE_TITLE_${isMarketable ? 'CLEAR' : 'DEFECTIVE'}`,
      performedBy: `${advocateName} (${barCouncilRegNo})`,
    });

    return {
      caseId: cleanCaseId,
      advocateName,
      barCouncilRegNo,
      signedAt,
      marketableTitle: isMarketable,
      auditHash: auditResult.hash,
    };
  }

  /**
   * Deletes the legal opinion for a case.
   */
  async deleteOpinion(caseId: string): Promise<boolean> {
    return await legalOpinionRepository.delete(caseId);
  }
}

export const legalOpinionService = new LegalOpinionService();

