import { AuthenticatedUser, extractSessionToken, validateSession } from '@/lib/security/session';
import { problemResponse } from '@/lib/api/errors';
import { NextResponse } from 'next/server';

export type RoleCode =
  | 'SUPER_ADMIN'
  | 'ADVOCATE_PARTNER'
  | 'ADVOCATE_ADMIN'
  | 'LEGAL_SCRUTINIZER'
  | 'RESEARCH_STAFF'
  | 'INTAKE_CLERK'
  | 'CLIENT_BUYER'
  | 'CLIENT';

// Master Permission Matrix defined in Enterprise Architecture Specification
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'users:manage',
    'meta:configure',
    'enquiries:read',
    'enquiries:accept',
    'cases:create',
    'cases:read_all',
    'cases:read_own',
    'stage:advance_1_to_3',
    'stage:advance_to_4',
    'stage:advance_to_5',
    'stage:advance_to_6',
    'stage:advance_to_7',
    'stage:advance_to_8',
    'ec:create_edit',
    'ec:delete',
    'parent_deeds:edit',
    'revenue:verify',
    'documents:upload',
    'documents:delete',
    'documents:view_unwatermarked',
    'documents:view_watermarked',
    'billing:record_payment',
    'billing:reconcile',
    'audit:view_chain',
  ],

  ADVOCATE_PARTNER: [
    'enquiries:read',
    'enquiries:accept',
    'cases:create',
    'cases:read_all',
    'cases:read_own',
    'stage:advance_1_to_3',
    'stage:advance_to_4',
    'stage:advance_to_5',
    'stage:advance_to_6',
    'stage:sign_opinion',
    'stage:advance_to_7',
    'stage:advance_to_8',
    'ec:create_edit',
    'ec:delete',
    'parent_deeds:edit',
    'revenue:verify',
    'documents:upload',
    'documents:delete',
    'documents:view_unwatermarked',
    'documents:view_watermarked',
    'billing:record_payment',
    'billing:reconcile',
    'audit:view_chain',
  ],

  // Alias for backward compatibility with database seed
  ADVOCATE_ADMIN: [
    'enquiries:read',
    'enquiries:accept',
    'cases:create',
    'cases:read_all',
    'cases:read_own',
    'stage:advance_1_to_3',
    'stage:advance_to_4',
    'stage:advance_to_5',
    'stage:advance_to_6',
    'stage:sign_opinion',
    'stage:advance_to_7',
    'stage:advance_to_8',
    'ec:create_edit',
    'ec:delete',
    'parent_deeds:edit',
    'revenue:verify',
    'documents:upload',
    'documents:delete',
    'documents:view_unwatermarked',
    'documents:view_watermarked',
    'billing:record_payment',
    'billing:reconcile',
    'audit:view_chain',
  ],

  LEGAL_SCRUTINIZER: [
    'enquiries:read',
    'cases:read_all',
    'cases:read_own',
    'stage:advance_1_to_3',
    'stage:advance_to_5',
    'stage:advance_to_6',
    'ec:create_edit',
    'parent_deeds:edit',
    'revenue:verify',
    'documents:upload',
    'documents:delete',
    'documents:view_unwatermarked',
    'documents:view_watermarked',
  ],

  // Alias for backward compatibility with database seed
  RESEARCH_STAFF: [
    'enquiries:read',
    'cases:read_all',
    'cases:read_own',
    'stage:advance_1_to_3',
    'stage:advance_to_5',
    'stage:advance_to_6',
    'ec:create_edit',
    'parent_deeds:edit',
    'revenue:verify',
    'documents:upload',
    'documents:delete',
    'documents:view_unwatermarked',
    'documents:view_watermarked',
  ],

  INTAKE_CLERK: [
    'enquiries:read',
    'enquiries:accept',
    'cases:create',
    'cases:read_all',
    'cases:read_own',
    'stage:advance_1_to_3',
    'stage:advance_to_4',
    'stage:advance_to_7',
    'stage:advance_to_8',
    'documents:upload',
    'documents:view_watermarked',
    'billing:record_payment',
  ],

  CLIENT_BUYER: [
    'cases:read_own',
    'documents:upload',
    'documents:view_watermarked',
  ],

  // Alias for client role
  CLIENT: [
    'cases:read_own',
    'documents:upload',
    'documents:view_watermarked',
  ],
};

/**
 * Evaluates whether a role possesses a specific permission capability.
 */
export function hasPermission(role: string, permission: string): boolean {
  const normalizedRole = role.toUpperCase();
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes(permission);
}

/**
 * Attribute-Based Access Control (ABAC):
 * Validates whether a user is authorized to read or modify a specific case docket.
 */
export function canAccessCase(
  user: AuthenticatedUser,
  caseItem: { id: string; client_phone?: string; client_email?: string; assigned_handler_id?: string }
): boolean {
  // Staff with cases:read_all can view any case
  if (hasPermission(user.role, 'cases:read_all')) {
    return true;
  }

  // Client role can only access their own case
  if (user.role === 'CLIENT_BUYER' || user.role === 'CLIENT') {
    if (user.phone && caseItem.client_phone && user.phone === caseItem.client_phone) {
      return true;
    }
    if (user.email && caseItem.client_email && user.email.toLowerCase() === caseItem.client_email.toLowerCase()) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Server-side authentication and authorization gatekeeper for Next.js Route Handlers.
 */
export async function authenticateRequest(
  request: Request,
  requiredPermission?: string
): Promise<{
  user: AuthenticatedUser | null;
  response?: NextResponse;
}> {
  const token = extractSessionToken(request);

  if (!token) {
    return {
      user: null,
      response: problemResponse({
        status: 401,
        type: 'https://api.akspropertychecklist.in/errors/AUTHENTICATION_REQUIRED',
        title: 'Authentication Required',
        detail: 'A valid active session token or cookie must be provided to access this resource.',
        req: request,
      }),
    };
  }

  const user = await validateSession(token);

  if (!user) {
    return {
      user: null,
      response: problemResponse({
        status: 401,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_SESSION',
        title: 'Invalid or Expired Session',
        detail: 'The provided session token is expired, revoked, or invalid. Please re-authenticate.',
        req: request,
      }),
    };
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return {
      user,
      response: problemResponse({
        status: 403,
        type: 'https://api.akspropertychecklist.in/errors/INSUFFICIENT_PERMISSIONS',
        title: 'Forbidden Access',
        detail: `Your role (${user.role}) lacks the required permission capability [${requiredPermission}].`,
        req: request,
      }),
    };
  }

  return { user };
}

