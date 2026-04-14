import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPostRequest } from '@/test/mocks/next-request';
import { createMockVehicle } from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  requirePermission: vi.fn(),
}));

import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';

const mockPrisma = prisma as unknown as {
  vehicle: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockRequirePermission = requirePermission as ReturnType<typeof vi.fn>;

describe('POST /api/patrol/vehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      authorized: true,
      request: { userId: 'user-1' },
    });
  });

  it('creates a new patrol vehicle record', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(null);
    mockPrisma.vehicle.create.mockResolvedValue(
      createMockVehicle({
        licensePlate: 'ABC 1234',
        normalizedPlate: 'ABC1234',
        state: 'BC',
      })
    );
    mockPrisma.auditLog.create.mockResolvedValue({});

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/patrol/vehicles', {
        licensePlate: 'abc 1234',
        state: 'BC',
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      created: true,
      restored: false,
      vehicle: {
        licensePlate: 'ABC 1234',
        normalizedPlate: 'ABC1234',
      },
    });
    expect(mockPrisma.vehicle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        licensePlate: 'ABC 1234',
        normalizedPlate: 'ABC1234',
        state: 'BC',
      }),
    });
  });

  it('returns an existing active vehicle without creating a duplicate', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(
      createMockVehicle({
        id: 'vehicle-9',
        licensePlate: 'XYZ123',
        normalizedPlate: 'XYZ123',
      })
    );

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/patrol/vehicles', {
        licensePlate: 'xyz123',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      created: false,
      restored: false,
      vehicle: {
        id: 'vehicle-9',
        licensePlate: 'XYZ123',
      },
    });
    expect(mockPrisma.vehicle.create).not.toHaveBeenCalled();
  });

  it('restores a soft-deleted vehicle record', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(
      createMockVehicle({
        id: 'vehicle-deleted',
        licensePlate: 'OLD123',
        normalizedPlate: 'OLD123',
        deletedAt: new Date('2026-04-01T00:00:00.000Z'),
      })
    );
    mockPrisma.vehicle.update.mockResolvedValue(
      createMockVehicle({
        id: 'vehicle-deleted',
        licensePlate: 'OLD123',
        normalizedPlate: 'OLD123',
        deletedAt: null,
      })
    );
    mockPrisma.auditLog.create.mockResolvedValue({});

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/patrol/vehicles', {
        licensePlate: 'old123',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      created: false,
      restored: true,
      vehicle: {
        id: 'vehicle-deleted',
        deletedAt: null,
      },
    });
    expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
      where: { id: 'vehicle-deleted' },
      data: expect.objectContaining({
        deletedAt: null,
        normalizedPlate: 'OLD123',
      }),
    });
  });
});
