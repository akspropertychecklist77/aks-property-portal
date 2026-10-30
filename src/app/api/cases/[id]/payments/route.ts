import { NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billingService';
import { billingRepository } from '@/lib/repositories/billingRepository';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check: requires at least case viewing permissions
    const { user, response } = await authenticateRequest(
      request,
      'cases:read_own'
    );
    if (response) return response;

    const summary = await billingRepository.getBillingSummary(caseId);
    if (!summary) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/CASE_NOT_FOUND',
        title: 'Case Docket Not Found',
        detail: `Case with ID ${caseId} does not exist.`,
        req: request,
      });
    }

    const payments = await billingRepository.findByCaseId(caseId);

    return successResponse(
      {
        summary,
        payments,
      },
      {
        caseId: caseId.toUpperCase(),
        queriedBy: user?.username,
      }
    );
  } catch (error: any) {
    console.error('Get Billing Ledger Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/BILLING_FETCH_FAILURE',
      title: 'Failed to Retrieve Billing Ledger',
      detail: error.message || 'An error occurred while fetching billing details.',
      req: request,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check: requires 'billing:record_payment'
    const { user, response } = await authenticateRequest(
      request,
      'billing:record_payment'
    );
    if (response) return response;

    const body = await request.json();
    const { paymentStage, amount, paymentMode, transactionRef } = body;

    if (!paymentStage || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_PAYMENT_PAYLOAD',
        title: 'Invalid Payment Data',
        detail: 'Valid paymentStage (STAGE_1_3_ADVANCE or STAGE_8_BALANCE) and a positive amount are required.',
        req: request,
      });
    }

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await billingService.recordPayment({
      caseId,
      paymentStage,
      amount: Number(amount),
      paymentMode: paymentMode || 'UPI',
      transactionRef,
      verifiedBy: user?.username || 'ACCOUNTS_CLERK',
      ipAddress: clientIp,
    });

    return successResponse(
      result,
      {
        caseId: caseId.toUpperCase(),
        recordedBy: user?.username,
      },
      result.isDuplicate ? 200 : 201
    );
  } catch (error: any) {
    console.error('Record Payment Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/PAYMENT_RECORD_FAILURE',
      title: 'Failed to Record Payment',
      detail: error.message || 'An error occurred while recording payment transaction.',
      req: request,
    });
  }
}

