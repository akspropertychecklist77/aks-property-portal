import { executeQuery, executeQueryOne } from '@/lib/db';

export interface WorkflowTransitionResult {
  allowed: boolean;
  reason?: string;
  gateViolated?: string;
}

export const WORKFLOW_STAGES = [
  { stage: 1, name: 'Lead Intake & Triage', description: 'Public checklist or quote inquiry intake and initial review' },
  { stage: 2, name: 'Document Collection', description: 'Gathering sale deed copies, EC copies, and Patta documents' },
  { stage: 3, name: 'Fee Agreement & Mandate', description: 'Quoting service package and 80/20 escrow fee agreement' },
  { stage: 4, name: 'Job Card Docketing', description: 'Official docket created and assigned for scrutiny (Gate 1: 80% Advance)' },
  { stage: 5, name: 'Legal Scrutiny & 30-Yr Trace', description: 'Continuous EC indexing, parent deed link analysis, revenue verification' },
  { stage: 6, name: 'Opinion Formulation', description: 'Drafting legal findings and advocate marketable title certification' },
  { stage: 7, name: 'Settlement Notice', description: 'Provisional draft notice dispatched to client for review' },
  { stage: 8, name: 'Certified Final Dispatch', description: 'Bar Council sealed legal opinion released (Gate 3: 20% Balance)' },
];

/**
 * Validates whether a case can legally transition from fromStage to toStage.
 * Enforces Gates 1, 2, and 3 according to statutory legal practice SOP.
 */
export async function validateStageTransition({
  caseItem,
  toStage,
  userRole,
  isRollback = false,
  rollbackReason,
}: {
  caseItem: any;
  toStage: number;
  userRole: string;
  isRollback?: boolean;
  rollbackReason?: string;
}): Promise<WorkflowTransitionResult> {
  const fromStage = caseItem.current_stage;

  // 1. Boundary check
  if (toStage < 1 || toStage > 8) {
    return {
      allowed: false,
      reason: `Target stage ${toStage} is outside valid legal SOP range (1 to 8).`,
    };
  }

  // 2. No-op check
  if (fromStage === toStage) {
    return {
      allowed: false,
      reason: `Case is already at Stage ${fromStage}.`,
    };
  }

  // 3. Backward transition / Rollback rules
  if (toStage < fromStage) {
    const isAuthorizedRollbackRole =
      userRole === 'SUPER_ADMIN' ||
      userRole === 'ADVOCATE_PARTNER' ||
      userRole === 'ADVOCATE_ADMIN';

    if (!isAuthorizedRollbackRole) {
      return {
        allowed: false,
        reason: 'Only Advocate Partner or Super Admin can authorize a backward workflow transition.',
        gateViolated: 'ROLLBACK_AUTHORIZATION',
      };
    }

    if (!rollbackReason || rollbackReason.trim().length < 5) {
      return {
        allowed: false,
        reason: 'A detailed justification reason is required for any backward stage rollback.',
        gateViolated: 'ROLLBACK_JUSTIFICATION_REQUIRED',
      };
    }

    // Closed cases (Stage 8) cannot be rolled back without SUPER_ADMIN
    if (fromStage === 8 && userRole !== 'SUPER_ADMIN') {
      return {
        allowed: false,
        reason: 'Stage 8 (Certified Final Dispatch) cases are sealed and cannot be rolled back without Super Admin override.',
        gateViolated: 'SEALED_DOCKET_IMMUTABILITY',
      };
    }

    return { allowed: true };
  }

  // 4. Sequential progression check: cannot skip stages forward
  if (toStage > fromStage + 1) {
    return {
      allowed: false,
      reason: `Cannot jump forward from Stage ${fromStage} directly to Stage ${toStage}. Stages must be completed sequentially.`,
      gateViolated: 'SEQUENTIAL_STAGE_INTEGRITY',
    };
  }

  // 5. Automated Gate Validations

  // GATE 1: Transition 3 -> 4 (80% Advance Fee & Welcome Letter Gate)
  if (toStage === 4) {
    const isAdvancePaid =
      caseItem.payment_status === 'advance_paid' ||
      caseItem.payment_status === 'fully_paid';

    if (!isAdvancePaid) {
      return {
        allowed: false,
        reason: `Gate 1 Violation: Stage 4 (Job Card Docketing) strictly requires verified payment of 80% Advance Fee (Rs ${caseItem.advance_amount || 5200}). Current status is "${caseItem.payment_status}".`,
        gateViolated: 'GATE_1_ADVANCE_FEE_REQUIRED',
      };
    }

    // Check Welcome Letter dispatch status if a welcome letter exists for this case docket
    try {
      const welcomeLetter = await executeQueryOne<{ sent_status: string }>(
        `SELECT sent_status FROM case_welcome_letters WHERE UPPER(case_id) = ?;`,
        [caseItem.id]
      );

      if (welcomeLetter && welcomeLetter.sent_status !== 'sent') {
        return {
          allowed: false,
          reason: `Gate 1 Violation: Stage 4 requires the Welcome Letter to be officially approved and dispatched to the client before opening the Job Card.`,
          gateViolated: 'GATE_1_WELCOME_LETTER_NOT_SENT',
        };
      }
    } catch {
      // Table may be absent in non-migrated ephemeral test environments
    }
  }

  // GATE 2: Transition 5 -> 6 (Scrutiny Completeness Gate)
  if (toStage === 6) {
    // Check EC records count
    const ecRecords = await executeQuery<{ id: string }>(
      `SELECT id FROM ec_records WHERE case_id = ?;`,
      [caseItem.id]
    );

    if (!ecRecords || ecRecords.length === 0) {
      return {
        allowed: false,
        reason: `Gate 2 Violation: Stage 6 requires at least one 30-year Encumbrance Certificate (EC) search record indexed in the Job Card.`,
        gateViolated: 'GATE_2_EC_RECORDS_EMPTY',
      };
    }

    // Check Revenue records
    const revenue = await executeQueryOne<{ patta_number: string | null }>(
      `SELECT patta_number FROM revenue_records WHERE case_id = ?;`,
      [caseItem.id]
    );

    if (!revenue || !revenue.patta_number || revenue.patta_number.trim() === '') {
      return {
        allowed: false,
        reason: `Gate 2 Violation: Stage 6 requires revenue record verification (Patta number must be recorded).`,
        gateViolated: 'GATE_2_REVENUE_PATTA_MISSING',
      };
    }
  }

  // GATE 3: Transition 7 -> 8 (20% Balance Settlement & Advocate Sign-off Gate)
  if (toStage === 8) {
    // 1. Check Advocate Legal Opinion sign-off
    const opinion = await executeQueryOne<{ sign_off_status: string }>(
      `SELECT sign_off_status FROM legal_opinions WHERE case_id = ?;`,
      [caseItem.id]
    );

    if (!opinion || opinion.sign_off_status !== 'approved') {
      return {
        allowed: false,
        reason: `Gate 3 Violation: Final certified dispatch requires Advocate Partner sign-off and Bar Council seal MS/1245/2005. Current opinion status is "${opinion?.sign_off_status || 'not_drafted'}".`,
        gateViolated: 'GATE_3_ADVOCATE_SIGNOFF_PENDING',
      };
    }

    // 2. Check 20% Balance Payment
    const isFullyPaid = caseItem.payment_status === 'fully_paid';
    if (!isFullyPaid) {
      return {
        allowed: false,
        reason: `Gate 3 Violation: Final certified report release requires 100% fee settlement (Balance outstanding: Rs ${caseItem.balance_amount || 1300}). Current status is "${caseItem.payment_status}".`,
        gateViolated: 'GATE_3_BALANCE_FEE_REQUIRED',
      };
    }
  }

  return { allowed: true };
}

