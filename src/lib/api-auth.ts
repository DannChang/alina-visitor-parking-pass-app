import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  Permission,
  hasPermission,
  createAuthContext,
  AuthorizationContext,
} from '@/lib/authorization';
import { UserRole } from '@prisma/client';

/**
 * Authorized request context provided to API handlers.
 */
export interface AuthorizedRequest {
  userId: string;
  role: UserRole;
  auth: AuthorizationContext;
}

type AuthResult =
  | { authorized: true; request: AuthorizedRequest }
  | { authorized: false; response: NextResponse };

/**
 * Require authentication only.
 * Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    authorized: true,
    request: {
      userId: session.user.id,
      role: session.user.role,
      auth: createAuthContext(session.user.id, session.user.role),
    },
  };
}

/**
 * Require specific permission(s).
 * Returns 401 if not authenticated, 403 if lacking permission.
 * If multiple permissions provided, user needs ANY of them (OR logic).
 */
export async function requirePermission(
  permission: Permission | Permission[]
): Promise<AuthResult> {
  const authResult = await requireAuth();

  if (!authResult.authorized) {
    return authResult;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasRequiredPermission = permissions.some((p) =>
    hasPermission(authResult.request.role, p)
  );

  if (!hasRequiredPermission) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return authResult;
}

/**
 * Require ALL of the specified permissions (AND logic).
 * Returns 401 if not authenticated, 403 if lacking any permission.
 */
export async function requireAllPermissions(
  permissions: Permission[]
): Promise<AuthResult> {
  const authResult = await requireAuth();

  if (!authResult.authorized) {
    return authResult;
  }

  const hasAllRequired = permissions.every((p) =>
    hasPermission(authResult.request.role, p)
  );

  if (!hasAllRequired) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return authResult;
}

/**
 * Require specific role(s).
 * Returns 401 if not authenticated, 403 if not in allowed roles.
 */
export async function requireRole(
  roles: UserRole | UserRole[]
): Promise<AuthResult> {
  const authResult = await requireAuth();

  if (!authResult.authorized) {
    return authResult;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(authResult.request.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return authResult;
}

/**
 * Helper for ownership checks.
 * Use when a resource can be accessed by either the owner OR someone with a fallback permission.
 * Example: RESIDENT can view own passes, but MANAGER can view all passes.
 */
export function requireOwnershipOr(
  authRequest: AuthorizedRequest,
  resourceUserId: string | null | undefined,
  fallbackPermission: Permission
): boolean {
  if (authRequest.auth.isOwner(resourceUserId)) {
    return true;
  }
  return authRequest.auth.hasPermission(fallbackPermission);
}

/**
 * Check if the user is an admin (ADMIN or SUPER_ADMIN).
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * Check if the user is a super admin.
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}
