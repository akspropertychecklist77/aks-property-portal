import { NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billingService';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-aks-signature') ||
      request.headers.get('x-razorpay-signature') ||
      request.headers.get('x-webhook-signature');

    if (!signature) {
      return problemResponse({
        status: 401,
        type: 'https://api.akspropertychecklist.in/errors/MISSING_WEBHOOK_SIGNATURE',
        title: 'Missing Webhook Signature',
        detail: 'The x-aks-signature header is mandatory for authenticating payment webhooks.',
        req: request,
      });
    }

    // 1. Edge-Native HMAC-SHA256 Signature Verification
    const isValid = await billingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return problemResponse({
        status: 403,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_WEBHOOK_SIGNATURE',
        title: 'Invalid Webhook Signature',
        detail: 'Cryptographic signature verification failed. The payload may have been tampered with.',
        req: request,
      });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    // Supported webhook events: 'payment.captured' or 'payment.settled'
    if (event === 'payment.captured' || event === 'payment.settled') {
      const caseId = data.caseId || data.notes?.caseId;
      const amount = data.amount;
      const paymentStage = data.paymentStage || (data.notes?.stage === '8' ? 'STAGE_8_BALANCE' : 'STAGE_1_3_ADVANCE');
      const transactionRef = data.id || data.paymentId || data.transactionRef;
      const paymentMode = data.method || 'GATEWAY_UPI';

      if (!caseId || !amount) {
        return problemResponse({
          status: 400,
          type: 'https://api.akspropertychecklist.in/errors/INVALID_WEBHOOK_PAYLOAD',
          title: 'Missing Required Payment Data',
          detail: 'Webhook payload missing caseId or amount.',
          req: request,
        });
      }

      const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
      const result = await billingService.recordPayment({
        caseId,
        paymentStage,
        amount: Number(amount),
        paymentMode,
        transactionRef,
        verifiedBy: 'GATEWAY_WEBHOOK',
        ipAddress: clientIp,
      });

      return successResponse(
        {
          processed: true,
          paymentId: result.payment.id,
          isDuplicate: result.isDuplicate,
          unlockedGates: result.unlockedGates,
        },
        { webhookEvent: event, caseId }
      );
    }

    return successResponse({ processed: false, reason: `Ignored unhandled event: ${event}` });
  } catch (error: any) {
    console.error('Payment Webhook Error:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/WEBHOOK_PROCESSING_FAILURE',
      title: 'Payment Webhook Processing Failed',
      detail: error.message || 'An error occurred during webhook processing.',
      req: request,
    });
  }
}
