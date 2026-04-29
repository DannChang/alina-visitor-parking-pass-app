import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockGetRequest, createMockPostRequest } from '@/test/mocks/next-request';
import {
  createMockBuilding,
  createMockPass,
  createMockParkingRule,
  createMockUnit,
  createMockVehicle,
} from '@/test/mocks/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    unit: {
      findUnique: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    parkingPass: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/services/validation-service', () => ({
  validatePassRequest: vi.fn(),
}));

vi.mock('@/services/notification-service', () => ({
  sendPassConfirmationNotifications: vi.fn().mockResolvedValue(0),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { validatePassRequest } from '@/services/validation-service';
import { GET, POST } from '../route';

const mockPrisma = prisma as unknown as {
  unit: { findUnique: ReturnType<typeof vi.fn> };
  vehicle: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  parkingPass: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockValidatePassRequest = validatePassRequest as ReturnType<typeof vi.fn>;

describe('Resident passes API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
      },
      residentId: 'resident-1',
      unitId: 'unit-1',
    });
  });

  it('filters the initial resident pass list to active passes', async () => {
    const unit = {
      ...createMockUnit(),
      building: {
        ...createMockBuilding(),
        parkingRules: createMockParkingRule(),
      },
    };

    mockPrisma.unit.findUnique.mockResolvedValue(unit);
    mockPrisma.parkingPass.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ duration: 4 }]);
    mockPrisma.parkingPass.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const request = createMockGetRequest('http://localhost:3000/api/resident/passes', {
      scope: 'active',
      limit: '100',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.parkingPass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          unitId: 'unit-1',
          deletedAt: null,
          status: { in: ['ACTIVE', 'EXTENDED'] },
          endTime: { gt: expect.any(Date) },
        }),
      })
    );
  });

  it('filters resident pass history to expired passes only', async () => {
    const unit = {
      ...createMockUnit(),
      building: {
        ...createMockBuilding(),
        parkingRules: createMockParkingRule(),
      },
    };

    mockPrisma.unit.findUnique.mockResolvedValue(unit);
    mockPrisma.parkingPass.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ duration: 4 }]);
    mockPrisma.parkingPass.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const request = createMockGetRequest('http://localhost:3000/api/resident/passes', {
      scope: 'expired',
      limit: '100',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.parkingPass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          unitId: 'unit-1',
          deletedAt: null,
          status: { in: ['ACTIVE', 'EXPIRED', 'EXTENDED'] },
          endTime: { lte: expect.any(Date) },
        }),
      })
    );
  });

  it('rejects a visitor pass for the current resident vehicle', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(
      createMockVehicle({
        residentId: 'resident-1',
        isResidentVehicle: true,
      })
    );

    const request = createMockPostRequest('http://localhost:3000/api/resident/passes', {
      licensePlate: 'ABC123',
      duration: 4,
      visitorPhone: '555-123-4567',
      visitorEmail: 'guest@example.com',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleYear: 2024,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.errors).toContainEqual(
      expect.objectContaining({
        code: 'RESIDENT_SELF_PLATE',
        field: 'licensePlate',
      })
    );
    expect(mockPrisma.unit.findUnique).not.toHaveBeenCalled();
    expect(mockValidatePassRequest).not.toHaveBeenCalled();
  });

  it('creates a visitor pass for a non-resident plate', async () => {
    const unit = {
      ...createMockUnit(),
      building: {
        ...createMockBuilding(),
        parkingRules: createMockParkingRule(),
      },
    };
    const vehicle = createMockVehicle({
      residentId: null,
      isResidentVehicle: false,
    });
    const pass = {
      ...createMockPass(),
      vehicle,
      unit,
    };

    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(vehicle);
    mockPrisma.unit.findUnique.mockResolvedValue(unit);
    mockValidatePassRequest.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    mockPrisma.vehicle.update.mockResolvedValue(vehicle);
    mockPrisma.parkingPass.create.mockResolvedValue(pass);

    const request = createMockPostRequest('http://localhost:3000/api/resident/passes', {
      licensePlate: 'ABC123',
      duration: 4,
      visitorPhone: '555-123-4567',
      visitorEmail: 'guest@example.com',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleYear: 2024,
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockValidatePassRequest).toHaveBeenCalled();
    expect(mockPrisma.vehicle.update).toHaveBeenCalled();
    expect(mockPrisma.parkingPass.create).toHaveBeenCalled();
  });
});
