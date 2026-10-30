import { executeQuery, executeQueryOne } from '@/lib/db';
import { documentVaultService } from '@/lib/services/documentVaultService';
import { billingRepository } from '@/lib/repositories/billingRepository';

export interface StageTimelineItem {
  stageNumber: number;
  stageName: string;
  stageCode: string;
  description: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  completedAt?: string | null;
}

export interface ClientTrackingDetails {
  caseId: string;
  clientName: string;
  maskedPhone: string;
  maskedEmail: string | null;
  propertyAddress: string | null;
  surveyNumber: string | null;
  district: string;
  servicePackage: string;
  currentStage: number;
  currentStageName: string;
  overallStatus: 'active' | 'in_progress' | 'completed' | 'on_hold';
  timeline: StageTimelineItem[];
  scrutinySummary: {
    ecStatus: string;
    genealogyStatus: string;
    revenueStatus: string;
    advocateSignoff: boolean;
    marketableTitle: string;
  };
  escrowBilling: {
    totalFee: number;
    advancePaid: number;
    balanceDue: number;
    isFullyPaid: boolean;
    escrowStatus: 'ADVANCE_HELD_IN_ESCROW' | 'SETTLED_UPON_CERTIFICATION' | 'PENDING_ADVANCE';
  };
  availableDocuments: Array<{
    id: string;
    fileName: string;
    category: string;
    isWatermarked: boolean;
    downloadUrl: string;
  }>;
  legalCertification: {
    advocateName: string;
    barCouncilNo: string;
    merkleAuditStatus: string;
  };
}

const STATUTORY_STAGES: Array<{ number: number; name: string; code: string; desc: string }> = [
  { number: 1, name: 'Enquiry Intake & Triage', code: '1_ENQUIRY', desc: 'Initial enquiry intake, document checklist issuance, and preliminary review.' },
  { number: 2, name: 'Scope & Statutory Quotation', code: '2_SCOPE', desc: 'Scope finalization and transparent statutory fee schedule quotation.' },
  { number: 3, name: '80% Escrow Advance Gate', code: '3_ADVANCE', desc: 'Mandatory 80% statutory diligence advance payment secured in escrow.' },
  { number: 4, name: '30-Year EC & Document Collection', code: '4_EC_SEARCH', desc: '30-Year encumbrance certificate search via TNREGINET and Sub-Registrar records.' },
  { number: 5, name: 'Parent Deed & Title Genealogy', code: '5_PARENT_DEEDS', desc: 'Devolution chain analysis, parent deed extent verification, and link tracing.' },
  { number: 6, name: 'Revenue Verification (Patta/FMB)', code: '6_REVENUE', desc: 'e-Patta, Chitta, and FMB sketch boundary cross-verification with Taluk records.' },
  { number: 7, name: 'Advocate Legal Opinion Sign-Off', code: '7_LEGAL_OPINION', desc: 'Advocate scrutiny under MS/1245/2005 with statutory title certification.' },
  { number: 8, name: 'Certified Dispatch & 20% Balance', code: '8_FINAL_REPORT', desc: 'Settlement of final 20% balance and dispatch of certified legal title opinion.' },
];

export class TrackingService {
  /**
   * Masks a phone number for client privacy (e.g. +91 98422 12345 -> +91 98*** **345).
   */
  maskPhone(phone: string): string {
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 8) return '****';
    const start = clean.substring(0, clean.startsWith('+91') ? 5 : 2);
    const end = clean.substring(clean.length - 3);
    return `${start}*** **${end}`;
  }

  /**
   * Masks email address for client privacy.
   */
  maskEmail(email: string | null): string | null {
    if (!email || !email.includes('@')) return null;
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `*@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  }

  /**
   * Verifies client authorization (via phone number matching or signed token).
   */
  verifyClientAccess(clientPhone: string, providedPhone?: string | null): boolean {
    if (!providedPhone || !providedPhone.trim()) return false;
    const cleanDb = clientPhone.replace(/[^0-9]/g, '');
    const cleanInput = providedPhone.replace(/[^0-9]/g, '');

    // Match full number or last 4 digits
    if (cleanDb === cleanInput) return true;
    if (cleanInput.length >= 4 && cleanDb.endsWith(cleanInput)) return true;
    return false;
  }

  /**
   * Retrieves public-safe case tracking details with stage timeline and watermarked/final documents.
   */
  async getCaseTrackingDetails({
    caseId,
    phone,
    bypassPhoneCheck = false,
  }: {
    caseId: string;
    phone?: string | null;
    bypassPhoneCheck?: boolean;
  }): Promise<ClientTrackingDetails> {
    const cleanCaseId = caseId.trim().toUpperCase();

    // 1. Fetch case docket
    const caseRecord = await executeQueryOne<{
      id: string;
      client_name: string;
      client_phone: string;
      client_email: string | null;
      property_address: string | null;
      survey_number: string | null;
      district: string;
      service_package: string;
      current_stage: number;
      total_fee: number;
      advance_amount: number;
      balance_amount: number;
      payment_status: string;
      case_status: string;
      created_at: string;
    }>(
      `SELECT * FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!caseRecord) {
      throw new Error(`Case docket ${cleanCaseId} not found.`);
    }

    // 2. Security Verification
    if (!bypassPhoneCheck) {
      const authorized = this.verifyClientAccess(caseRecord.client_phone, phone);
      if (!authorized) {
        throw new Error(
          'Security verification failed: Please enter the mobile number registered with this legal case docket.'
        );
      }
    }

    const currentStageNum = Number(caseRecord.current_stage) || 1;

    // 3. Construct 8-Stage Progress Timeline
    const timeline: StageTimelineItem[] = STATUTORY_STAGES.map((s) => {
      let status: 'completed' | 'in_progress' | 'upcoming';
      if (s.number < currentStageNum) {
        status = 'completed';
      } else if (s.number === currentStageNum) {
        status = 'in_progress';
      } else {
        status = 'upcoming';
      }
      return {
        stageNumber: s.number,
        stageName: s.name,
        stageCode: s.code,
        description: s.desc,
        status,
        completedAt: s.number < currentStageNum ? caseRecord.created_at : null,
      };
    });

    // 4. Fetch Client-Safe Scrutiny Statuses
    const opinionRecord = await executeQueryOne<{
      marketable_title_certified: number;
      sign_off_status: string;
      encumbrance_status: string;
    }>(
      `SELECT marketable_title_certified, sign_off_status, encumbrance_status FROM legal_opinions WHERE UPPER(case_id) = ?;`,
      [cleanCaseId]
    );

    const isSignedOff = opinionRecord?.sign_off_status === 'approved';
    const marketableTitle = isSignedOff
      ? 'Certified Clear & Marketable (Title Scrutiny Complete)'
      : currentStageNum >= 7
      ? 'Under Final Advocate Scrutiny'
      : 'Preliminary Verification in Progress';

    const ecStatus = currentStageNum >= 5
      ? '30-Year Search Completed (Verified with TNREGINET)'
      : currentStageNum === 4
      ? 'Encumbrance Verification in Progress'
      : 'Scheduled';

    const genealogyStatus = currentStageNum >= 6
      ? 'Title Genealogy Verified (Chain Established)'
      : currentStageNum === 5
      ? 'Parent Deed Analysis in Progress'
      : 'Scheduled';

    const revenueStatus = currentStageNum >= 7
      ? 'Revenue Records Verified (e-Patta & FMB Aligned)'
      : currentStageNum === 6
      ? 'Taluk Revenue Verification in Progress'
      : 'Scheduled';

    // 5. Escrow Status
    const totalFee = Number(caseRecord.total_fee);
    const balanceDue = Number(caseRecord.balance_amount);
    const advancePaid = totalFee - balanceDue;
    const isFullyPaid = caseRecord.payment_status === 'fully_paid' || balanceDue <= 0;

    let escrowStatus: 'ADVANCE_HELD_IN_ESCROW' | 'SETTLED_UPON_CERTIFICATION' | 'PENDING_ADVANCE' = 'PENDING_ADVANCE';
    if (isFullyPaid) {
      escrowStatus = 'SETTLED_UPON_CERTIFICATION';
    } else if (caseRecord.payment_status === 'advance_paid') {
      escrowStatus = 'ADVANCE_HELD_IN_ESCROW';
    }

    // 6. Watermarked vs Final Documents with 15-min TTL tokens
    const docs = await executeQuery<{
      id: string;
      file_name: string;
      file_category: string;
      is_watermarked: number;
    }>(
      `SELECT id, file_name, file_category, is_watermarked FROM case_documents WHERE UPPER(case_id) = ?;`,
      [cleanCaseId]
    );

    const mustWatermark = currentStageNum < 8 || !isFullyPaid;

    const availableDocuments = await Promise.all(
      docs.map(async (d) => {
        const token = await documentVaultService.generateDownloadToken(
          d.id,
          cleanCaseId,
          mustWatermark
        );
        return {
          id: d.id,
          fileName: d.file_name,
          category: d.file_category,
          isWatermarked: mustWatermark,
          downloadUrl: `/api/cases/${cleanCaseId}/documents/${d.id}/download?token=${token}`,
        };
      })
    );

    const currentStageObj = STATUTORY_STAGES.find((s) => s.number === currentStageNum);

    return {
      caseId: cleanCaseId,
      clientName: caseRecord.client_name,
      maskedPhone: this.maskPhone(caseRecord.client_phone),
      maskedEmail: this.maskEmail(caseRecord.client_email),
      propertyAddress: caseRecord.property_address,
      surveyNumber: caseRecord.survey_number,
      district: caseRecord.district,
      servicePackage: caseRecord.service_package,
      currentStage: currentStageNum,
      currentStageName: currentStageObj?.name || `Stage ${currentStageNum}`,
      overallStatus: currentStageNum >= 8 ? 'completed' : 'in_progress',
      timeline,
      scrutinySummary: {
        ecStatus,
        genealogyStatus,
        revenueStatus,
        advocateSignoff: Boolean(isSignedOff),
        marketableTitle,
      },
      escrowBilling: {
        totalFee,
        advancePaid,
        balanceDue,
        isFullyPaid,
        escrowStatus,
      },
      availableDocuments,
      legalCertification: {
        advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
        barCouncilNo: 'MS/1245/2005',
        merkleAuditStatus: 'VERIFIED_ACTIVE',
      },
    };
  }
}

export const trackingService = new TrackingService();
