import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPostRequest } from '@/test/mocks/next-request';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    patrolLogEntry: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/services/violation-detection-service', () => ({
  detectAndCreateViolation: vi.fn(),
}));

import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { detectAndCreateViolation } from '@/services/violation-detection-service';

const mockPrisma = prisma as unknown as {
  vehicle: { findUnique: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  patrolLogEntry: { create: ReturnType<typeof vi.fn> };
};

const mockRequirePermission = requirePermission as ReturnType<typeof vi.fn>;
const mockDetectAndCreateViolation = detectAndCreateViolation as ReturnType<typeof vi.fn>;

describe('POST /api/patrol/lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({
      authorized: true,
      request: { userId: 'user-1' },
    });
  });

  it('does not auto-create a violation when the plate is not found', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(null);
    mockPrisma.patrolLogEntry.create.mockResolvedValue({});

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/patrol/lookup', {
        licensePlate: 'ABC123',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'NOT_FOUND',
      vehicle: null,
      violations: [],
    });
    expect(mockDetectAndCreateViolation).not.toHaveBeenCalled();
    expect(mockPrisma.patrolLogEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        licensePlate: 'ABC123',
        normalizedPlate: 'ABC123',
        notes: expect.stringContaining('Patrol lookup: NOT FOUND.'),
      }),
    });
  });

  it('prepends an auto-created violation to the lookup response', async () => {
    const now = new Date('2026-04-02T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      licensePlate: 'ABC123',
      normalizedPlate: 'ABC123',
      make: 'Toyota',
      model: 'Camry',
      color: 'Silver',
      stallNumber: '42',
      isBlacklisted: false,
      blacklistReason: null,
      isResidentVehicle: false,
      violationCount: 1,
      riskScore: 10,
      parkingPasses: [],
      violations: [],
    });
    mockDetectAndCreateViolation.mockResolvedValue({
      violated: true,
      violation: {
        id: 'violation-1',
        type: 'UNREGISTERED',
        severity: 'MEDIUM',
        createdAt: now,
        location: null,
      },
    });
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.patrolLogEntry.create.mockResolvedValue({});

    const response = await POST(
      createMockPostRequest('http://localhost:3000/api/patrol/lookup', {
        licensePlate: 'ABC123',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'UNREGISTERED',
      autoCreatedViolation: {
        id: 'violation-1',
        type: 'UNREGISTERED',
        severity: 'MEDIUM',
        isNew: true,
      },
      violations: [
        {
          id: 'violation-1',
          type: 'UNREGISTERED',
          severity: 'MEDIUM',
          isResolved: false,
          location: null,
        },
      ],
    });
    expect(mockPrisma.patrolLogEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        licensePlate: 'ABC123',
        normalizedPlate: 'ABC123',
        location: 'Stall 42',
        notes: expect.stringContaining('Patrol lookup: UNREGISTERED.'),
      }),
    });

    vi.useRealTimers();
  });
});
