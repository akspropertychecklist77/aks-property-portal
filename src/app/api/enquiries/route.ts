import { NextResponse } from 'next/server';
import { enquiryService } from '@/lib/services/enquiryService';
import { problemResponse, successResponse } from '@/lib/api/errors';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const searchTerm = searchParams.get('q') || searchParams.get('search') || undefined;

    const data = await enquiryService.getTriageDeskData({ status, searchTerm });

    return successResponse(
      data.enquiries,
      {
        metrics: data.metrics,
        count: data.enquiries.length,
      },
      200,
      corsHeaders
    );
  } catch (error: any) {
    console.error('Error in GET /api/enquiries:', error);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/QUERY_ERROR',
      title: 'Failed to Query Enquiries',
      detail: error.message || 'An unexpected error occurred while fetching enquiries.',
      req: request,
      headers: corsHeaders,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const result = await enquiryService.registerInbound(body);

    return successResponse(
      {
        id: result.id,
        client_name: body.client_name,
        client_phone: body.client_phone,
        status: 'new',
        isDuplicate: result.isDuplicate,
        duplicateOf: result.duplicateOf,
      },
      {
        enquiryId: result.id,
        message: result.isDuplicate
          ? 'Enquiry with identical contact details was recently received. Staging buffer updated.'
          : 'Enquiry successfully registered in intake staging buffer.',
      },
      result.isDuplicate ? 200 : 201,
      corsHeaders
    );
  } catch (error: any) {
    console.error('Error in POST /api/enquiries:', error);
    return problemResponse({
      status: error.message?.includes('required') ? 400 : 500,
      type: 'https://api.akspropertychecklist.in/errors/INTAKE_ERROR',
      title: 'Enquiry Registration Failed',
      detail: error.message || 'An unexpected error occurred during lead registration.',
      req: request,
      headers: corsHeaders,
    });
  }
}
