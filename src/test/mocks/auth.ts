/**
 * Auth Mock Utilities
 * Mock session and authentication for testing
 */

import type { Session } from 'next-auth';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SECURITY' | 'VIEWER';
  buildingIds: string[];
}

/**
 * Create a mock session for authenticated tests
 */
export function createMockSession(overrides?: Partial<MockUser>): Session {
  const user: MockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'MANAGER',
    buildingIds: ['building-1'],
    ...overrides,
  };

  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create an admin session
 */
export function createMockAdminSession(): Session {
  return createMockSession({
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    buildingIds: [],
  });
}

/**
 * Create a manager session
 */
export function createMockManagerSession(buildingIds: string[] = ['building-1']): Session {
  return createMockSession({
    id: 'manager-1',
    email: 'manager@example.com',
    name: 'Manager User',
    role: 'MANAGER',
    buildingIds,
  });
}
