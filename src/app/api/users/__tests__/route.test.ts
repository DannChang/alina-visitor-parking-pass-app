import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockGetRequest,
  createMockPostRequest,
  createMockRequest,
} from '@/test/mocks/next-request';

vi.mock('@/lib/api-auth', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
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
    count: ReturnType<typeof vi.fn>;
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

const superAdminAuthResult = {
  authorized: true as const,
  request: {
    userId: 'super-admin-1',
    role: 'SUPER_ADMIN',
    auth: {} as never,
  },
};

describe('Users API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(adminAuthResult);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it('excludes resident accounts from the list query', async () => {
    const response = await GET(createMockGetRequest('http://localhost:3000/api/users'));

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

  it('allows super admins to create super admin accounts', async () => {
    mockRequirePermission.mockResolvedValue(superAdminAuthResult);
    mockPrisma.user.create.mockResolvedValue({
      id: 'super-admin-2',
      email: 'new-super-admin@example.com',
      name: null,
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: new Date(),
    });

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/users', {
        email: 'new-super-admin@example.com',
        password: 'Admin@123!',
        role: 'SUPER_ADMIN',
      })
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'SUPER_ADMIN',
        }),
      })
    );
  });

  it('prevents admins from creating peer or upstream accounts', async () => {
    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/users', {
        email: 'peer-admin@example.com',
        password: 'Admin@123!',
        role: 'ADMIN',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('roles below your own');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('allows admins to create downstream accounts', async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: 'manager-1',
      email: 'manager@example.com',
      name: null,
      role: 'MANAGER',
      isActive: true,
      createdAt: new Date(),
    });

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/users', {
        email: 'manager@example.com',
        password: 'Admin@123!',
        role: 'MANAGER',
      })
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'MANAGER',
        }),
      })
    );
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

  it('prevents admins from modifying peer accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: 'ADMIN',
      email: 'peer-admin@example.com',
    });

    const response = await PATCH(
      createMockRequest('http://localhost:3000/api/users?id=admin-2', {
        method: 'PATCH',
        body: { name: 'Updated Admin' },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('roles below your own');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents admins from promoting downstream accounts to peer roles', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'manager-1',
      role: 'MANAGER',
      email: 'manager@example.com',
    });

    const response = await PATCH(
      createMockRequest('http://localhost:3000/api/users?id=manager-1', {
        method: 'PATCH',
        body: { role: 'ADMIN' },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('roles below your own');
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

  it('prevents admins from deleting peer accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: 'ADMIN',
      email: 'peer-admin@example.com',
    });

    const response = await DELETE(
      createMockRequest('http://localhost:3000/api/users?id=admin-2', {
        method: 'DELETE',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('roles below your own');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
