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
  ClipboardList,
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
  | 'Settings'
  | 'ClipboardList';

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
  ClipboardList,
};

/**
 * Navigation item definition.
 */
export interface NavItem {
  href: string;
  label: string;
  labelKey: string;
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
    labelKey: 'overview',
    iconName: 'LayoutDashboard',
    permissions: ['passes:view_all'], // Staff/security only — residents go straight to passes
  },
  {
    href: '/dashboard/passes',
    label: 'Active Passes',
    labelKey: 'activePasses',
    iconName: 'Car',
    permissions: ['passes:view_all', 'passes:view_own'],
  },
  {
    href: '/dashboard/violations',
    label: 'Violations',
    labelKey: 'violations',
    iconName: 'AlertTriangle',
    permissions: ['violations:view'],
  },
  {
    href: '/dashboard/patrol-log',
    label: 'Patrol Log',
    labelKey: 'patrolLog',
    iconName: 'ClipboardList',
    permissions: ['passes:view_all'],
  },
  {
    href: '/dashboard/vehicles',
    label: 'Vehicles',
    labelKey: 'vehicles',
    iconName: 'Car',
    permissions: ['vehicles:view'],
  },
  {
    href: '/dashboard/units',
    label: 'Units',
    labelKey: 'units',
    iconName: 'Home',
    permissions: ['units:view'],
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    labelKey: 'analytics',
    iconName: 'BarChart3',
    permissions: ['analytics:view'],
  },
  {
    href: '/dashboard/health',
    label: 'System Health',
    labelKey: 'systemHealth',
    iconName: 'Activity',
    permissions: ['health:view'],
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    labelKey: 'users',
    iconName: 'Users',
    permissions: ['users:view'],
  },
  {
    href: '/dashboard/registration-passes',
    label: 'Registration Passes',
    labelKey: 'registrationPasses',
    iconName: 'ClipboardList',
    permissions: ['resident_invites:manage'],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    labelKey: 'settings',
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
