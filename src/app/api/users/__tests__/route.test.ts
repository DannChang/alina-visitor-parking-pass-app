import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockGetRequest, createMockPostRequest, createMockRequest } from '@/test/mocks/next-request';

vi.mock('@/lib/api-auth', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

import { requirePermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { DELETE, GET, PATCH, POST } from '../route';

const mockRequirePermission = requirePermission as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  user: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
};

const adminAuthResult = {
  authorized: true as const,
  request: {
    userId: 'admin-1',
    role: 'ADMIN',
    auth: {} as never,
  },
};

describe('Users API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(adminAuthResult);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it('excludes resident accounts from the list query', async () => {
    const response = await GET(
      createMockGetRequest('http://localhost:3000/api/users')
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { not: 'RESIDENT' },
        }),
      })
    );
  });

  it('rejects resident role creation through the generic users endpoint', async () => {
    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/users', {
        email: 'resident@example.com',
        password: 'Resident@123!',
        role: 'RESIDENT',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it('blocks resident account updates through the generic users endpoint', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'resident-user-1',
      role: 'RESIDENT',
      email: 'resident@example.com',
    });

    const response = await PATCH(
      createMockRequest('http://localhost:3000/api/users?id=resident-user-1', {
        method: 'PATCH',
        body: { name: 'Updated Resident' },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('registration passes');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks resident account deletes through the generic users endpoint', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'resident-user-1',
      role: 'RESIDENT',
      email: 'resident@example.com',
    });

    const response = await DELETE(
      createMockRequest('http://localhost:3000/api/users?id=resident-user-1', {
        method: 'DELETE',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('registration passes');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
