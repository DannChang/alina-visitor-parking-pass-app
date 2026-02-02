import { UserRole } from '@prisma/client';
import {
  Car,
  LayoutDashboard,
  AlertTriangle,
  Settings,
  Users,
  Home,
  Activity,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import { Permission, hasAnyPermission } from '@/lib/authorization';

/**
 * Navigation item definition.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permissions: Permission[]; // Empty array = all authenticated users
}

/**
 * All navigation items with their required permissions.
 * Order matters - items are displayed in this order.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    permissions: [], // All authenticated users
  },
  {
    href: '/dashboard/passes',
    label: 'Active Passes',
    icon: Car,
    permissions: ['passes:view_all', 'passes:view_own'],
  },
  {
    href: '/dashboard/violations',
    label: 'Violations',
    icon: AlertTriangle,
    permissions: ['violations:view'],
  },
  {
    href: '/dashboard/units',
    label: 'Units',
    icon: Home,
    permissions: ['units:view'],
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
    permissions: ['analytics:view'],
  },
  {
    href: '/dashboard/health',
    label: 'System Health',
    icon: Activity,
    permissions: ['health:view'],
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: Users,
    permissions: ['users:view'],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    permissions: ['settings:view'],
  },
];

/**
 * Get navigation items accessible to a specific role.
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.permissions.length === 0) {
      return true; // Accessible to all authenticated users
    }
    return hasAnyPermission(role, item.permissions);
  });
}
