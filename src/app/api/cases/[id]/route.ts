import { NextResponse } from 'next/server';
import { executeQuery, executeQueryOne, executeBatch } from '@/lib/db';
import { recordChainedAuditLog } from '@/lib/security/auditSigner';
import { validateStageTransition } from '@/lib/workflow/stateMachine';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim().toUpperCase();

    // Query case details
    const caseItem = await executeQueryOne<any>(
      `SELECT * FROM cases WHERE UPPER(id) = ? OR client_phone = ?;`,
      [cleanId, cleanId]
    );

    if (!caseItem) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/CASE_NOT_FOUND',
        title: 'Case Docket Not Found',
        detail: `Legal case docket "${cleanId}" was not found in database.`,
        req: request,
      });
    }

    // Query associated EC records
    const ecRecords = await executeQuery(
      `SELECT * FROM ec_records WHERE case_id = ? ORDER BY serial_no ASC;`,
      [caseItem.id]
    );

    // Query associated Parent deeds
    const parentDocs = await executeQuery(
      `SELECT * FROM parent_documents WHERE case_id = ? ORDER BY sequence_order ASC;`,
      [caseItem.id]
    );

    // Query revenue records
    const revenueRecord = await executeQueryOne(
      `SELECT * FROM revenue_records WHERE case_id = ?;`,
      [caseItem.id]
    );

    // Query legal opinion
    const legalOpinion = await executeQueryOne(
      `SELECT * FROM legal_opinions WHERE case_id = ?;`,
      [caseItem.id]
    );

    // Query milestone logs
    const milestoneLogs = await executeQuery(
      `SELECT * FROM case_milestone_logs WHERE case_id = ? ORDER BY logged_at DESC;`,
      [caseItem.id]
    );

    // Query cryptographically chained audit logs (Merkle Chain)
    const auditLogs = await executeQuery(
      `SELECT * FROM case_audit_logs WHERE case_id = ? ORDER BY timestamp DESC;`,
      [caseItem.id]
    );

    return successResponse(
      {
        ...caseItem,
        ecRecords,
        parentDocs,
        revenueRecord,
        legalOpinion,
        milestoneLogs,
        auditLogs,
      },
      {
        caseId: caseItem.id,
        stage: caseItem.current_stage,
      }
    );
  } catch (error: any) {
    console.error('Database Error in GET /api/cases/[id]:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/DATABASE_ERROR',
      title: 'Database Query Failed',
      detail: error.message || 'An unexpected error occurred while retrieving case docket.',
      req: request,
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim().toUpperCase();

    // 1. Authenticate user (allow advocate role or demo mode)
    const { user } = await authenticateRequest(request);
    const userRole = user?.role || 'ADVOCATE_ADMIN';
    const actorName = user?.fullName || 'Advocate A.K. Saravanan';

    const body = await request.json().catch(() => ({}));
    const { targetStage, notes, triggeredBy, isRollback, rollbackReason } = body;

    const caseItem = await executeQueryOne<any>(
      `SELECT * FROM cases WHERE UPPER(id) = ?;`,
      [cleanId]
    );

    if (!caseItem) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/CASE_NOT_FOUND',
        title: 'Case Not Found',
        detail: `Cannot advance stage. Case "${cleanId}" does not exist.`,
        req: request,
      });
    }

    const fromStage = caseItem.current_stage;
    const toStage = targetStage !== undefined ? Number(targetStage) : fromStage + 1;

    // 2. Validate Stage Transition against 8-Stage Legal SOP & Gates 1, 2, 3
    const validation = await validateStageTransition({
      caseItem,
      toStage,
      userRole,
      isRollback: Boolean(isRollback || toStage < fromStage),
      rollbackReason: rollbackReason || notes,
    });

    if (!validation.allowed) {
      return problemResponse({
        status: 403,
        type: `https://api.akspropertychecklist.in/errors/${validation.gateViolated || 'WORKFLOW_GATE_VIOLATION'}`,
        title: 'Workflow Stage Advance Rejected',
        detail: validation.reason || 'The requested stage transition does not satisfy statutory legal workflow prerequisites.',
        req: request,
      });
    }

    // 3. Atomic D1 Batch Transaction: Update Case Stage and Insert Milestone Log
    const logActionNotes =
      notes ||
      (toStage < fromStage
        ? `Backward rollback from Stage ${fromStage} to Stage ${toStage}. Reason: ${rollbackReason || 'Correction requested'}`
        : `Stage advanced from Stage ${fromStage} to Stage ${toStage}`);

    const statements = [
      {
        sql: `UPDATE cases SET current_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE UPPER(id) = ?;`,
        params: [toStage, cleanId],
      },
      {
        sql: `INSERT INTO case_milestone_logs (id, case_id, from_stage, to_stage, action_notes, triggered_by)
              VALUES (?, ?, ?, ?, ?, ?);`,
        params: [
          `log_${Date.now()}`,
          cleanId,
          fromStage,
          toStage,
          logActionNotes,
          triggeredBy || actorName,
        ],
      },
    ];

    const batchSuccess = await executeBatch(statements);
    if (!batchSuccess) {
      throw new Error('Database transaction failed during stage advance.');
    }

    // 4. Record Tamper-Proof Cryptographically Chained Audit Log (Merkle Chain)
    try {
      await recordChainedAuditLog({
        caseId: cleanId,
        action: `WORKFLOW_STAGE_TRANSITION`,
        previousState: `Stage ${fromStage}`,
        newState: `Stage ${toStage}`,
        performedBy: triggeredBy || actorName,
      });
    } catch (auditErr) {
      console.warn('Merkle audit log warning:', auditErr);
    }

    return successResponse(
      {
        caseId: cleanId,
        fromStage,
        toStage,
        message: `Case ${cleanId} successfully advanced to Stage ${toStage}.`,
      },
      {
        caseId: cleanId,
        fromStage,
        toStage,
      }
    );
  } catch (error: any) {
    console.error('Database Error in PATCH /api/cases/[id]:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/STAGE_UPDATE_FAILED',
      title: 'Stage Update Failed',
      detail: error.message || 'An unexpected database error occurred.',
      req: request,
    });
  }
}
