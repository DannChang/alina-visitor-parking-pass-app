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
 * Icon name type for navigation items.
 */
export type NavIconName =
  | 'LayoutDashboard'
  | 'Car'
  | 'AlertTriangle'
  | 'Home'
  | 'BarChart3'
  | 'Activity'
  | 'Users'
  | 'Settings';

/**
 * Map of icon names to components (for use in client components).
 */
export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  LayoutDashboard,
  Car,
  AlertTriangle,
  Home,
  BarChart3,
  Activity,
  Users,
  Settings,
};

/**
 * Navigation item definition.
 */
export interface NavItem {
  href: string;
  label: string;
  iconName: NavIconName;
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
    iconName: 'LayoutDashboard',
    permissions: [], // All authenticated users
  },
  {
    href: '/dashboard/passes',
    label: 'Active Passes',
    iconName: 'Car',
    permissions: ['passes:view_all', 'passes:view_own'],
  },
  {
    href: '/dashboard/violations',
    label: 'Violations',
    iconName: 'AlertTriangle',
    permissions: ['violations:view'],
  },
  {
    href: '/dashboard/units',
    label: 'Units',
    iconName: 'Home',
    permissions: ['units:view'],
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    iconName: 'BarChart3',
    permissions: ['analytics:view'],
  },
  {
    href: '/dashboard/health',
    label: 'System Health',
    iconName: 'Activity',
    permissions: ['health:view'],
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    iconName: 'Users',
    permissions: ['users:view'],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    iconName: 'Settings',
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
