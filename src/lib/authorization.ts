import { UserRole } from '@prisma/client';

/**
 * Fine-grained permissions for the hospital visitor parking pass application.
 * Following the principle of least privilege.
 */
export type Permission =
  // Passes
  | 'passes:view_all'
  | 'passes:view_own'
  | 'passes:create'
  | 'passes:update'
  | 'passes:delete'
  | 'passes:extend'
  // Violations
  | 'violations:view'
  | 'violations:create'
  | 'violations:update'
  | 'violations:resolve'
  // Units
  | 'units:view'
  | 'units:manage'
  // Vehicles
  | 'vehicles:view'
  | 'vehicles:blacklist'
  // Users
  | 'users:view'
  | 'users:manage'
  // Settings
  | 'settings:view'
  | 'settings:manage'
  // Analytics & Reports
  | 'analytics:view'
  | 'reports:export'
  | 'audit_logs:view'
  // System
  | 'health:view'
  | 'system:admin';

/**
 * Role-to-permissions mapping.
 * SUPER_ADMIN and ADMIN have full access.
 * MANAGER has operational access without system administration.
 * SECURITY has limited view/log access for day-to-day operations.
 * RESIDENT can only view/manage their own passes.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'passes:view_all',
    'passes:view_own',
    'passes:create',
    'passes:update',
    'passes:delete',
    'passes:extend',
    'violations:view',
    'violations:create',
    'violations:update',
    'violations:resolve',
    'units:view',
    'units:manage',
    'vehicles:view',
    'vehicles:blacklist',
    'users:view',
    'users:manage',
    'settings:view',
    'settings:manage',
    'analytics:view',
    'reports:export',
    'audit_logs:view',
    'health:view',
    'system:admin',
  ],
  ADMIN: [
    'passes:view_all',
    'passes:view_own',
    'passes:create',
    'passes:update',
    'passes:delete',
    'passes:extend',
    'violations:view',
    'violations:create',
    'violations:update',
    'violations:resolve',
    'units:view',
    'units:manage',
    'vehicles:view',
    'vehicles:blacklist',
    'users:view',
    'users:manage',
    'settings:view',
    'settings:manage',
    'analytics:view',
    'reports:export',
    'audit_logs:view',
    'health:view',
  ],
  MANAGER: [
    'passes:view_all',
    'passes:view_own',
    'passes:create',
    'passes:update',
    'passes:delete',
    'passes:extend',
    'violations:view',
    'violations:create',
    'violations:update',
    'violations:resolve',
    'units:view',
    'units:manage',
    'vehicles:view',
    'vehicles:blacklist',
    'analytics:view',
    'reports:export',
  ],
  SECURITY: [
    'passes:view_all',
    'passes:view_own',
    'violations:view',
    'violations:create',
    'vehicles:view',
  ],
  RESIDENT: [
    'passes:view_own',
    'passes:create', // For pre-registration
    'passes:extend', // Own passes only - enforced at data level
  ],
};

/**
 * Route-to-permission mapping for middleware.
 * Empty array means any authenticated user can access.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': [], // Base dashboard accessible to all authenticated
  '/dashboard/passes': ['passes:view_all', 'passes:view_own'],
  '/dashboard/violations': ['violations:view'],
  '/dashboard/units': ['units:view'],
  '/dashboard/analytics': ['analytics:view'],
  '/dashboard/health': ['health:view'],
  '/dashboard/users': ['users:view'],
  '/dashboard/settings': ['settings:view'],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions.
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions.
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check route access for middleware.
 * Uses the most specific matching route.
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Find the most specific matching route
  const matchingRoutes = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname === route || pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length);

  const route = matchingRoutes[0];

  if (!route) {
    // If no route matches, check if it's a dashboard sub-route
    // Default to deny for unknown routes
    if (pathname.startsWith('/dashboard')) {
      return false;
    }
    return true; // Non-dashboard routes handled elsewhere
  }

  const requiredPermissions = ROUTE_PERMISSIONS[route];

  // If route not in permissions map or empty array, any authenticated user can access
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return hasAnyPermission(role, requiredPermissions);
}

/**
 * Authorization context for API routes.
 */
export interface AuthorizationContext {
  userId: string;
  role: UserRole;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isOwner: (resourceUserId: string | null | undefined) => boolean;
}

/**
 * Create an authorization context for a user.
 */
export function createAuthContext(
  userId: string,
  role: UserRole
): AuthorizationContext {
  return {
    userId,
    role,
    hasPermission: (permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(role, permissions),
    isOwner: (resourceUserId) => resourceUserId === userId,
  };
}
