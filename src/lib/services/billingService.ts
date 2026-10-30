import { billingRepository, PaymentRecord, CaseBillingSummary, CreatePaymentInput } from '@/lib/repositories/billingRepository';
import { executeQueryOne } from '@/lib/db';
import { recordChainedAuditLog } from '@/lib/security/auditSigner';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || process.env.AUTH_SECRET || 'AKS_ESCROW_WEBHOOK_SECRET_2026';

export interface RecordPaymentResult {
  payment: PaymentRecord;
  isDuplicate: boolean;
  invoiceNumber: string;
  summary: CaseBillingSummary;
  unlockedGates: {
    stage4GateOpened: boolean;
    stage8GateOpened: boolean;
  };
}

export interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  caseId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  propertyAddress: string | null;
  surveyNumber: string | null;
  servicePackage: string;
  totalFee: number;
  advanceAmount: number;
  balanceAmount: number;
  totalPaid: number;
  paymentStatus: string;
  escrowStatus: 'ADVANCE_HELD_IN_ESCROW' | 'SETTLED_UPON_CERTIFICATION' | 'PENDING_ADVANCE';
  lineItems: Array<{
    description: string;
    amount: number;
  }>;
  payments: PaymentRecord[];
  advocateCertification: {
    advocateName: string;
    enrollmentNo: string;
    office: string;
  };
}

export class BillingService {
  /**
   * Records a statutory payment (80% advance or 20% balance) with escrow state transitions.
   */
  async recordPayment({
    caseId,
    paymentStage,
    amount,
    paymentMode,
    transactionRef,
    verifiedBy = 'SYSTEM',
    ipAddress = '127.0.0.1',
  }: {
    caseId: string;
    paymentStage: 'STAGE_1_3_ADVANCE' | 'STAGE_8_BALANCE' | 'FULL_PAYMENT';
    amount: number;
    paymentMode: string;
    transactionRef?: string | null;
    verifiedBy?: string;
    ipAddress?: string;
  }): Promise<RecordPaymentResult> {
    const cleanCaseId = caseId.trim().toUpperCase();

    // 1. Fetch case details
    const caseRecord = await executeQueryOne<{
      id: string;
      total_fee: number;
      advance_amount: number;
      balance_amount: number;
      payment_status: string;
      current_stage: number;
    }>(
      `SELECT id, total_fee, advance_amount, balance_amount, payment_status, current_stage
       FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!caseRecord) {
      throw new Error(`Case docket ${cleanCaseId} not found.`);
    }

    // 2. Idempotency Check: if transaction reference already processed, return existing
    if (transactionRef && transactionRef.trim()) {
      const existing = await billingRepository.findByTransactionRef(transactionRef.trim());
      if (existing) {
        const summary = (await billingRepository.getBillingSummary(cleanCaseId))!;
        return {
          payment: existing,
          isDuplicate: true,
          invoiceNumber: `INV-2026-${cleanCaseId}`,
          summary,
          unlockedGates: {
            stage4GateOpened: summary.canAdvanceToStage4,
            stage8GateOpened: summary.canAdvanceToStage8,
          },
        };
      }
    }

    // 3. Persist payment
    const payment = await billingRepository.create({
      case_id: cleanCaseId,
      payment_stage: paymentStage,
      amount,
      payment_mode: paymentMode,
      transaction_ref: transactionRef,
      verified_by: verifiedBy,
    });

    // 4. Calculate new payment status & balance
    const allPayments = await billingRepository.findByCaseId(cleanCaseId);
    const totalPaid = allPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const totalFee = Number(caseRecord.total_fee);
    const newBalance = Math.max(0, totalFee - totalPaid);

    let newStatus = caseRecord.payment_status;
    if (totalPaid >= totalFee || newBalance <= 0) {
      newStatus = 'fully_paid';
    } else if (totalPaid >= Number(caseRecord.advance_amount)) {
      newStatus = 'advance_paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial_advance';
    }

    // Update case record in D1
    await billingRepository.updateCaseEscrow(cleanCaseId, newStatus, newBalance);

    // 5. Cryptographic Merkle-Chain Audit Logging
    const isFullSettlement = newStatus === 'fully_paid';
    const auditAction = isFullSettlement ? 'BALANCE_SETTLED' : 'PAYMENT_RECORDED';

    await recordChainedAuditLog({
      caseId: cleanCaseId,
      action: auditAction,
      previousState: JSON.stringify({
        paymentStatus: caseRecord.payment_status,
        balance: caseRecord.balance_amount,
      }),
      newState: JSON.stringify({
        paymentId: payment.id,
        amount,
        paymentStage,
        newStatus,
        newBalance,
        totalPaid,
      }),
      performedBy: verifiedBy,
      ipAddress,
    });

    const summary = (await billingRepository.getBillingSummary(cleanCaseId))!;
    const invoiceNumber = `INV-2026-${cleanCaseId}`;

    return {
      payment,
      isDuplicate: false,
      invoiceNumber,
      summary,
      unlockedGates: {
        stage4GateOpened: summary.canAdvanceToStage4,
        stage8GateOpened: summary.canAdvanceToStage8,
      },
    };
  }

  /**
   * Cryptographically verifies incoming payment gateway webhook signature using Edge Web Crypto HMAC-SHA256.
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureBytes = Buffer.from(signature, 'hex');
      return await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        encoder.encode(payload)
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Generates formal digital tax invoice with breakdown of legal diligence milestones.
   */
  async getInvoiceDetails(caseId: string): Promise<InvoiceDetails> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const caseRecord = await executeQueryOne<{
      id: string;
      client_name: string;
      client_phone: string;
      client_email: string | null;
      property_address: string | null;
      survey_number: string | null;
      service_package: string;
      total_fee: number;
      advance_amount: number;
      balance_amount: number;
      payment_status: string;
      created_at: string;
    }>(
      `SELECT id, client_name, client_phone, client_email, property_address, survey_number, service_package, total_fee, advance_amount, balance_amount, payment_status, created_at
       FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!caseRecord) {
      throw new Error(`Case docket ${cleanCaseId} not found.`);
    }

    const payments = await billingRepository.findByCaseId(cleanCaseId);
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const totalFee = Number(caseRecord.total_fee);
    const advanceAmount = Number(caseRecord.advance_amount);
    const balanceAmount = Number(caseRecord.balance_amount);

    let escrowStatus: 'ADVANCE_HELD_IN_ESCROW' | 'SETTLED_UPON_CERTIFICATION' | 'PENDING_ADVANCE' = 'PENDING_ADVANCE';
    if (caseRecord.payment_status === 'fully_paid') {
      escrowStatus = 'SETTLED_UPON_CERTIFICATION';
    } else if (caseRecord.payment_status === 'advance_paid') {
      escrowStatus = 'ADVANCE_HELD_IN_ESCROW';
    }

    return {
      invoiceNumber: `INV-2026-${cleanCaseId}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      caseId: cleanCaseId,
      clientName: caseRecord.client_name,
      clientPhone: caseRecord.client_phone,
      clientEmail: caseRecord.client_email,
      propertyAddress: caseRecord.property_address,
      surveyNumber: caseRecord.survey_number,
      servicePackage: caseRecord.service_package,
      totalFee,
      advanceAmount,
      balanceAmount,
      totalPaid,
      paymentStatus: caseRecord.payment_status,
      escrowStatus,
      lineItems: [
        {
          description: '30-Year Encumbrance Search & Sub-Registrar Verification (TNREGINET)',
          amount: Math.round(totalFee * 0.45),
        },
        {
          description: 'Revenue Department Verification (e-Patta, Chitta, FMB Sketch Alignment)',
          amount: Math.round(totalFee * 0.25),
        },
        {
          description: 'Advocate Legal Opinion & Title Scrutiny Certification (MS/1245/2005)',
          amount: Math.round(totalFee * 0.30),
        },
      ],
      payments,
      advocateCertification: {
        advocateName: 'Advocate A.K. Saravanan (M.E. Energy, LLB)',
        enrollmentNo: 'MS/1245/2005',
        office: 'Chamber No. 12, District Court Complex, Coimbatore',
      },
    };
  }
}

export const billingService = new BillingService();

