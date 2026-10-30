import { welcomeLetterRepository, WelcomeLetterRecord, UpsertWelcomeLetterInput } from '@/lib/repositories/welcomeLetterRepository';
import { executeQueryOne } from '@/lib/db';
import { recordChainedAuditLog } from '@/lib/security/auditSigner';
import { billingRepository } from '@/lib/repositories/billingRepository';

export interface WelcomeLetterDetails {
  caseId: string;
  isGenerated: boolean;
  isApproved: boolean;
  isSent: boolean;
  letter: WelcomeLetterRecord;
  caseDetails: {
    clientName: string;
    clientPhone: string;
    clientEmail: string | null;
    propertyAddress: string | null;
    surveyNumber: string | null;
    district: string;
    totalFee: number;
    advanceAmount: number;
    balanceAmount: number;
    paymentStatus: string;
  };
  advocateChamber: {
    advocateName: string;
    enrollmentNo: string;
    chamberAddress: string;
    phone: string;
    email: string;
  };
  gate4Readiness: {
    isLetterApproved: boolean;
    isLetterSent: boolean;
    isAdvancePaid: boolean;
    canOpenJobCard: boolean;
  };
}

const DEFAULT_SCOPE_BULLETS = [
  '30-Year Encumbrance Search (1994–2024) across the jurisdictional Sub-Registrar Office via TNREGINET.',
  'Detailed Ancestral Parent Deed Devolution Lineage Analysis (root of title verification).',
  'Revenue Records Verification (Computerized e-Patta Passbook, Chitta, FMB Sketch, Village A-Register).',
  'Physical site inspection notes, guideline value alignment, and road access verification.',
];

const DEFAULT_DOCUMENTS_REQUIRED = [
  { name: 'Prior Registered Title / Parent Deeds', mandatory: true, description: 'Copies of prior link deeds establishing chain of ownership.' },
  { name: 'Computerized e-Patta Passbook', mandatory: true, description: 'Current Taluk revenue patta reflecting vendor or predecessor in title.' },
  { name: 'FMB Sketch & Boundary Measurements', mandatory: true, description: 'Field Measurement Book sketch indicating demarcated boundaries.' },
  { name: 'Current Property Tax & Water Receipts', mandatory: false, description: 'Latest receipt showing municipal / panchayat tax clearance.' },
];

export class WelcomeLetterService {
  /**
   * Chamber master legal details
   */
  readonly chamber = {
    advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
    enrollmentNo: 'MS/1245/2005',
    chamberAddress: 'Chamber No. 12, District Court Complex, Coimbatore – 641 018',
    phone: '+91 93631 06310',
    email: 'advocate.saravanan@aks.org.in',
  };

  /**
   * Retrieves or auto-initializes the Welcome Letter for a case docket.
   */
  async getOrCreateLetter(caseId: string): Promise<WelcomeLetterDetails> {
    const cleanCaseId = caseId.trim().toUpperCase();

    // 1. Fetch case details
    const caseRecord = await executeQueryOne<{
      id: string;
      client_name: string;
      client_phone: string;
      client_email: string | null;
      property_address: string | null;
      survey_number: string | null;
      district: string;
      total_fee: number;
      advance_amount: number;
      balance_amount: number;
      payment_status: string;
    }>(
      `SELECT id, client_name, client_phone, client_email, property_address, survey_number, district, total_fee, advance_amount, balance_amount, payment_status
       FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!caseRecord) {
      throw new Error(`Case docket ${cleanCaseId} not found.`);
    }

    // 2. Fetch existing letter or initialize
    let letter = await welcomeLetterRepository.findByCaseId(cleanCaseId);
    let isGenerated = Boolean(letter);

    if (!letter) {
      const year = new Date().getFullYear();
      const rawDigits = cleanCaseId.replace(/[^0-9]/g, '');
      const serial = rawDigits.slice(-4) || '0001';
      const refNo = `AKS/WL/${year}/${serial}`;

      const totalFee = Number(caseRecord.total_fee) || 6500.00;
      const advanceAmount = Number(caseRecord.advance_amount) || Math.round(totalFee * 0.8);
      const balanceAmount = Number(caseRecord.balance_amount) || (totalFee - advanceAmount);

      letter = await welcomeLetterRepository.upsert({
        case_id: cleanCaseId,
        letter_ref_no: refNo,
        letter_date: new Date().toISOString().split('T')[0],
        scope_summary: JSON.stringify(DEFAULT_SCOPE_BULLETS),
        documents_required_json: JSON.stringify(DEFAULT_DOCUMENTS_REQUIRED),
        delivery_timeline_days: 7,
        total_fee: totalFee,
        advance_amount: advanceAmount,
        balance_amount: balanceAmount,
        terms_and_conditions: 'This legal engagement is subject to the statutory standards of the Bar Council of India. Legal opinion will be finalized based on verified records.',
      });
      isGenerated = true;
    }

    const isApproved = letter.approval_status === 'approved';
    const isSent = letter.sent_status === 'sent';
    const isAdvancePaid = caseRecord.payment_status === 'advance_paid' || caseRecord.payment_status === 'fully_paid';

    return {
      caseId: cleanCaseId,
      isGenerated,
      isApproved,
      isSent,
      letter,
      caseDetails: {
        clientName: caseRecord.client_name,
        clientPhone: caseRecord.client_phone,
        clientEmail: caseRecord.client_email,
        propertyAddress: caseRecord.property_address,
        surveyNumber: caseRecord.survey_number,
        district: caseRecord.district,
        totalFee: Number(caseRecord.total_fee),
        advanceAmount: Number(caseRecord.advance_amount),
        balanceAmount: Number(caseRecord.balance_amount),
        paymentStatus: caseRecord.payment_status,
      },
      advocateChamber: this.chamber,
      gate4Readiness: {
        isLetterApproved: isApproved,
        isLetterSent: isSent,
        isAdvancePaid,
        canOpenJobCard: isSent && isAdvancePaid,
      },
    };
  }

  /**
   * Saves updated draft parameters.
   */
  async saveDraft(
    caseId: string,
    input: Partial<UpsertWelcomeLetterInput>
  ): Promise<WelcomeLetterRecord> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const existing = await welcomeLetterRepository.findByCaseId(cleanCaseId);
    if (!existing) {
      throw new Error(`Welcome Letter for ${cleanCaseId} does not exist. Please initialize first.`);
    }

    return await welcomeLetterRepository.upsert({
      case_id: cleanCaseId,
      letter_ref_no: input.letter_ref_no || existing.letter_ref_no,
      letter_date: input.letter_date || existing.letter_date,
      scope_summary: input.scope_summary || existing.scope_summary,
      documents_required_json: input.documents_required_json || existing.documents_required_json,
      delivery_timeline_days: input.delivery_timeline_days ?? existing.delivery_timeline_days,
      total_fee: input.total_fee ?? existing.total_fee,
      advance_amount: input.advance_amount ?? existing.advance_amount,
      balance_amount: input.balance_amount ?? existing.balance_amount,
      terms_and_conditions: input.terms_and_conditions || existing.terms_and_conditions,
      custom_clauses: input.custom_clauses ?? existing.custom_clauses,
      approval_status: 'draft', // Reset to draft if edited
    });
  }

  /**
   * Formally approves the Welcome Letter under Bar Council MS/1245/2005 authority.
   */
  async approveLetter(
    caseId: string,
    advocateUser: string = 'Advocate A.K. Saravanan',
    ipAddress = '127.0.0.1'
  ): Promise<{ approved: boolean; record: WelcomeLetterRecord }> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const letter = await welcomeLetterRepository.findByCaseId(cleanCaseId);
    if (!letter) throw new Error(`Welcome Letter for ${cleanCaseId} not found.`);

    await welcomeLetterRepository.approve(cleanCaseId, advocateUser);

    // Record chained cryptographic audit log
    await recordChainedAuditLog({
      caseId: cleanCaseId,
      action: 'WELCOME_LETTER_APPROVED',
      previousState: JSON.stringify({ status: letter.approval_status }),
      newState: JSON.stringify({
        status: 'approved',
        refNo: letter.letter_ref_no,
        approvedBy: advocateUser,
        barCouncilLicense: this.chamber.enrollmentNo,
      }),
      performedBy: advocateUser,
      ipAddress,
    });

    const updated = (await welcomeLetterRepository.findByCaseId(cleanCaseId))!;
    return { approved: true, record: updated };
  }

  /**
   * Records verified dispatch of the Welcome Letter to the client.
   */
  async sendLetter(
    caseId: string,
    channel: string,
    dispatchRef: string,
    actor: string = 'OPERATIONS_CLERK',
    ipAddress = '127.0.0.1'
  ): Promise<{ sent: boolean; record: WelcomeLetterRecord; gate4Unlocked: boolean }> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const letter = await welcomeLetterRepository.findByCaseId(cleanCaseId);
    if (!letter) throw new Error(`Welcome Letter for ${cleanCaseId} not found.`);

    if (letter.approval_status !== 'approved') {
      throw new Error('Statutory violation: An unapproved Welcome Letter cannot be officially dispatched to the client.');
    }

    await welcomeLetterRepository.markSent(cleanCaseId, channel, dispatchRef, actor);

    // Audit log
    await recordChainedAuditLog({
      caseId: cleanCaseId,
      action: 'WELCOME_LETTER_DISPATCHED',
      previousState: JSON.stringify({ sent_status: letter.sent_status }),
      newState: JSON.stringify({
        sent_status: 'sent',
        channel,
        dispatchRef,
        dispatchedBy: actor,
      }),
      performedBy: actor,
      ipAddress,
    });

    const updated = (await welcomeLetterRepository.findByCaseId(cleanCaseId))!;
    const details = await this.getOrCreateLetter(cleanCaseId);

    return {
      sent: true,
      record: updated,
      gate4Unlocked: details.gate4Readiness.canOpenJobCard,
    };
  }
}

export const welcomeLetterService = new WelcomeLetterService();

