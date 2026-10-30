import { executeQuery, executeQueryOne, executeRun } from '@/lib/db';

export interface PaymentRecord {
  id: string;
  case_id: string;
  payment_stage: string; // 'STAGE_1_3_ADVANCE' | 'STAGE_8_BALANCE' | 'FULL_PAYMENT'
  amount: number;
  payment_mode: string; // 'UPI' | 'NEFT' | 'IMPS' | 'CASH' | 'GATEWAY'
  transaction_ref: string | null;
  verified_by: string | null;
  paid_at: string;
}

export interface CreatePaymentInput {
  id?: string;
  case_id: string;
  payment_stage: string;
  amount: number;
  payment_mode: string;
  transaction_ref?: string | null;
  verified_by?: string | null;
}

export interface CaseBillingSummary {
  caseId: string;
  clientName: string;
  clientPhone: string;
  servicePackage: string;
  totalFee: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  currentStage: number;
  totalPaid: number;
  isAdvanceCleared: boolean;
  isBalanceCleared: boolean;
  canAdvanceToStage4: boolean;
  canAdvanceToStage8: boolean;
}

export class BillingRepository {
  /**
   * Retrieves all payments recorded for a case docket.
   */
  async findByCaseId(caseId: string): Promise<PaymentRecord[]> {
    return await executeQuery<PaymentRecord>(
      `SELECT * FROM payments WHERE UPPER(case_id) = ? ORDER BY paid_at ASC;`,
      [caseId.trim().toUpperCase()]
    );
  }

  /**
   * Retrieves a payment by its unique transaction reference (Idempotency check).
   */
  async findByTransactionRef(ref: string): Promise<PaymentRecord | null> {
    if (!ref || !ref.trim()) return null;
    return await executeQueryOne<PaymentRecord>(
      `SELECT * FROM payments WHERE transaction_ref = ?;`,
      [ref.trim()]
    );
  }

  /**
   * Retrieves a single payment by ID.
   */
  async findById(id: string): Promise<PaymentRecord | null> {
    return await executeQueryOne<PaymentRecord>(
      `SELECT * FROM payments WHERE id = ?;`,
      [id.trim()]
    );
  }

  /**
   * Creates a payment record in D1.
   */
  async create(input: CreatePaymentInput): Promise<PaymentRecord> {
    const id = input.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanCaseId = input.case_id.trim().toUpperCase();

    await executeRun(
      `INSERT INTO payments (
         id, case_id, payment_stage, amount, payment_mode, transaction_ref, verified_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        cleanCaseId,
        input.payment_stage.trim(),
        input.amount,
        input.payment_mode.trim().toUpperCase(),
        input.transaction_ref?.trim() || null,
        input.verified_by?.trim() || null,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve created payment record with id: ${id}`);
    }
    return created;
  }

  /**
   * Fetches comprehensive billing summary and gate readiness for a case.
   */
  async getBillingSummary(caseId: string): Promise<CaseBillingSummary | null> {
    const cleanCaseId = caseId.trim().toUpperCase();
    const caseRecord = await executeQueryOne<{
      id: string;
      client_name: string;
      client_phone: string;
      service_package: string;
      total_fee: number;
      advance_amount: number;
      balance_amount: number;
      payment_status: string;
      current_stage: number;
    }>(
      `SELECT id, client_name, client_phone, service_package, total_fee, advance_amount, balance_amount, payment_status, current_stage
       FROM cases WHERE UPPER(id) = ?;`,
      [cleanCaseId]
    );

    if (!caseRecord) return null;

    const payments = await this.findByCaseId(cleanCaseId);
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const isAdvanceCleared = totalPaid >= caseRecord.advance_amount || caseRecord.payment_status === 'advance_paid' || caseRecord.payment_status === 'fully_paid';
    const isBalanceCleared = totalPaid >= caseRecord.total_fee || caseRecord.payment_status === 'fully_paid' || caseRecord.balance_amount <= 0;

    return {
      caseId: cleanCaseId,
      clientName: caseRecord.client_name,
      clientPhone: caseRecord.client_phone,
      servicePackage: caseRecord.service_package,
      totalFee: Number(caseRecord.total_fee),
      advanceAmount: Number(caseRecord.advance_amount),
      balanceAmount: Number(caseRecord.balance_amount),
      paymentStatus: caseRecord.payment_status,
      currentStage: caseRecord.current_stage,
      totalPaid,
      isAdvanceCleared,
      isBalanceCleared,
      canAdvanceToStage4: isAdvanceCleared,
      canAdvanceToStage8: isBalanceCleared,
    };
  }

  /**
   * Updates case balance, advance, and overall payment status.
   */
  async updateCaseEscrow(
    caseId: string,
    paymentStatus: string,
    balanceAmount: number
  ): Promise<boolean> {
    const cleanCaseId = caseId.trim().toUpperCase();
    return await executeRun(
      `UPDATE cases 
       SET payment_status = ?, balance_amount = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE UPPER(id) = ?;`,
      [paymentStatus, balanceAmount, cleanCaseId]
    );
  }
}

export const billingRepository = new BillingRepository();
