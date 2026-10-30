import { NextResponse } from 'next/server';

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface ProblemDetailParams {
  status: number;
  type: string;
  title: string;
  detail: string;
  instance?: string;
  invalidParams?: InvalidParam[];
  req?: Request;
  headers?: Record<string, string>;
}

/**
 * Standard RFC 7807 Problem Details Response Generator
 */
export function problemResponse({
  status,
  type,
  title,
  detail,
  instance,
  invalidParams,
  req,
  headers = {},
}: ProblemDetailParams): NextResponse {
  const urlInstance = instance || (req ? new URL(req.url).pathname : undefined);
  const requestId =
    (req && req.headers.get('x-request-id')) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const body: Record<string, any> = {
    success: false,
    type,
    title,
    status,
    detail,
    instance: urlInstance,
    requestId,
    timestamp: new Date().toISOString(),
  };

  if (invalidParams && invalidParams.length > 0) {
    body.invalidParams = invalidParams;
  }

  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
      'X-Request-Id': requestId,
      ...headers,
    },
  });
}

/**
 * Standard Success Response Envelope Generator
 */
export function successResponse<T = any>(
  data: T,
  meta: Record<string, any> = {},
  status = 200,
  headers: Record<string, string> = {}
): NextResponse {
  const requestId =
    meta.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return NextResponse.json(
    {
      success: true,
      statusCode: status,
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...headers,
      },
    }
  );
}

