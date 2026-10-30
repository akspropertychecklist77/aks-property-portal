import { NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billingService';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    // 1. Authorization check
    const { user, response } = await authenticateRequest(
      request,
      'cases:read_own'
    );
    if (response) return response;

    const invoice = await billingService.getInvoiceDetails(caseId);

    return successResponse(invoice, {
      caseId: caseId.toUpperCase(),
      invoiceNumber: invoice.invoiceNumber,
      generatedAt: new Date().toISOString(),
      requestedBy: user?.username,
    });
  } catch (error: any) {
    console.error('Get Invoice API Error:', error);
    return problemResponse({
      status: error.message?.includes('not found') ? 404 : 500,
      type: 'https://api.akspropertychecklist.in/errors/INVOICE_GENERATION_FAILURE',
      title: 'Invoice Retrieval Failed',
      detail: error.message || 'An error occurred while generating invoice breakdown.',
      req: request,
    });
  }
}
