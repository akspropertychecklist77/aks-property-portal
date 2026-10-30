import { NextResponse } from 'next/server';
import { executeQuery, executeQueryOne, executeRun } from '@/lib/db';
import { recordChainedAuditLog } from '@/lib/security/auditSigner';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim().toUpperCase();

    // Query case details
    const caseItem = await executeQueryOne(
      `SELECT * FROM cases WHERE UPPER(id) = ? OR client_phone = ?;`,
      [cleanId, cleanId]
    );

    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: 'Case not found in database' },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: {
        ...caseItem,
        ecRecords,
        parentDocs,
        revenueRecord,
        legalOpinion,
        milestoneLogs,
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Database Error in GET /api/cases/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim().toUpperCase();
    const body = await request.json();
    const { targetStage, notes, triggeredBy } = body;

    const currentCase = await executeQueryOne(
      `SELECT current_stage FROM cases WHERE UPPER(id) = ?;`,
      [cleanId]
    );

    if (!currentCase) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const fromStage = currentCase.current_stage;
    const toStage = targetStage !== undefined ? targetStage : fromStage + 1;

    // Update case stage in database
    await executeRun(
      `UPDATE cases SET current_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE UPPER(id) = ?;`,
      [toStage, cleanId]
    );

    // Record milestone audit log entry
    await executeRun(
      `INSERT INTO case_milestone_logs (id, case_id, from_stage, to_stage, action_notes, triggered_by)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        `log_${Date.now()}`,
        cleanId,
        fromStage,
        toStage,
        notes || `Stage updated to Step ${toStage}`,
        triggeredBy || 'advocate',
      ]
    );

    // Record tamper-proof chained audit log entry (Merkle Chain)
    await recordChainedAuditLog({
      caseId: cleanId,
      action: `WORKFLOW_STAGE_TRANSITION`,
      previousState: `Stage ${fromStage}`,
      newState: `Stage ${toStage}`,
      performedBy: triggeredBy || 'Advocate A.K. Saravanan',
    });

    return NextResponse.json({
      success: true,
      message: `Case ${cleanId} successfully updated to Stage ${toStage}`,
      fromStage,
      toStage,
    });
  } catch (error: any) {
    console.error('Database Error in PATCH /api/cases/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

