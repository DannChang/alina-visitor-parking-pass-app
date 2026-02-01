/**
 * Passes API Route Integration Tests
 * CRITICAL: These routes handle visitor parking registration for hospital patients
 * Target coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createMockPostRequest, createMockGetRequest } from '@/test/mocks/next-request';
import { createMockManagerSession } from '@/test/mocks/auth';
import {
  createMockBuilding,
  createMockUnit,
  createMockVehicle,
  createMockPass,
  createMockParkingRule,
} from '@/test/mocks/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    building: {
      findUnique: vi.fn(),
    },
    unit: {
      findFirst: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    parkingPass: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    parkingZone: {
      findFirst: vi.fn(),
    },
    qRCodeScan: {
      create: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock validation service
vi.mock('@/services/validation-service', () => ({
  validatePassRequest: vi.fn(),
}));

// Import after mocks
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { validatePassRequest } from '@/services/validation-service';

const mockPrisma = prisma as unknown as {
  building: { findUnique: ReturnType<typeof vi.fn> };
  unit: { findFirst: ReturnType<typeof vi.fn> };
  vehicle: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  parkingPass: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  parkingZone: { findFirst: ReturnType<typeof vi.fn> };
  qRCodeScan: { create: ReturnType<typeof vi.fn> };
};

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockValidatePassRequest = validatePassRequest as ReturnType<typeof vi.fn>;

describe('Passes API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // POST /api/passes - Create Pass (Public)
  // ============================================
  describe('POST /api/passes', () => {
    const validPassData = {
      licensePlate: 'ABC123',
      unitNumber: '101',
      buildingSlug: 'alina-hospital',
      duration: 4,
      visitorName: 'John Doe',
      visitorPhone: '555-1234',
    };

    const mockBuilding = {
      ...createMockBuilding(),
      parkingRules: [createMockParkingRule()],
    };

    const mockUnit = createMockUnit();
    const mockVehicle = createMockVehicle();

    it('should create a pass with valid data', async () => {
      // Setup mocks
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockValidatePassRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockResolvedValue(mockVehicle);
      mockPrisma.parkingPass.create.mockResolvedValue({
        ...createMockPass(),
        vehicle: mockVehicle,
        unit: { ...mockUnit, building: mockBuilding },
        parkingZone: null,
      });

      const request = createMockPostRequest(
        'http://localhost:3000/api/passes',
        validPassData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.pass).toBeDefined();
      expect(data.confirmationCode).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        licensePlate: 'ABC123',
        // Missing other required fields
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for invalid license plate length', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        licensePlate: 'A', // Too short
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid duration', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        duration: 25, // Exceeds max of 24
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 404 for non-existent building', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);

      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        buildingSlug: 'non-existent',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Building not found');
    });

    it('should return 404 for non-existent unit', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(null);

      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        unitNumber: '999',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Unit not found');
    });

    it('should return 400 for blacklisted vehicle', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockValidatePassRequest.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'ERR_4000', message: 'Vehicle is blacklisted' }],
        warnings: [],
      });

      const request = createMockPostRequest(
        'http://localhost:3000/api/passes',
        validPassData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'ERR_4000' })
      );
    });

    it('should return 400 for consecutive hours exceeded', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockValidatePassRequest.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'ERR_4002', message: 'Consecutive hours limit exceeded' }],
        warnings: [],
      });

      const request = createMockPostRequest(
        'http://localhost:3000/api/passes',
        validPassData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'ERR_4002' })
      );
    });

    it('should return 400 for vehicle during cooldown', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockValidatePassRequest.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'ERR_4003', message: 'Vehicle is in cooldown period' }],
        warnings: [],
      });

      const request = createMockPostRequest(
        'http://localhost:3000/api/passes',
        validPassData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'ERR_4003' })
      );
    });

    it('should return warnings with successful creation', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockValidatePassRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [{ code: 'LONG_DURATION', message: 'Pass duration exceeds 12 hours' }],
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrisma.parkingPass.create.mockResolvedValue({
        ...createMockPass({ duration: 24 }),
        vehicle: mockVehicle,
        unit: { ...mockUnit, building: mockBuilding },
        parkingZone: null,
      });

      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        duration: 24,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.warnings).toContainEqual(
        expect.objectContaining({ code: 'LONG_DURATION' })
      );
    });

    it('should update existing vehicle details if provided', async () => {
      const existingVehicle = createMockVehicle({ id: 'existing-vehicle' });
      const updatedVehicle = {
        ...existingVehicle,
        make: 'Honda',
        model: 'Civic',
        color: 'Blue',
      };

      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockValidatePassRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue(existingVehicle);
      mockPrisma.vehicle.update.mockResolvedValue(updatedVehicle);
      mockPrisma.parkingPass.create.mockResolvedValue({
        ...createMockPass(),
        vehicle: updatedVehicle,
        unit: { ...mockUnit, building: mockBuilding },
        parkingZone: null,
      });

      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        vehicleColor: 'Blue',
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.vehicle.update).toHaveBeenCalled();
    });

    it('should create QR scan log when parking zone is specified', async () => {
      const mockParkingZone = {
        id: 'zone-1',
        buildingId: 'building-1',
        code: 'ZONE-A',
        name: 'Zone A',
        isActive: true,
        deletedAt: null,
      };

      mockPrisma.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrisma.unit.findFirst.mockResolvedValue(mockUnit);
      mockPrisma.parkingZone.findFirst.mockResolvedValue(mockParkingZone);
      mockValidatePassRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockResolvedValue(mockVehicle);
      mockPrisma.parkingPass.create.mockResolvedValue({
        ...createMockPass(),
        vehicle: mockVehicle,
        unit: { ...mockUnit, building: mockBuilding },
        parkingZone: mockParkingZone,
      });
      mockPrisma.qRCodeScan.create.mockResolvedValue({});

      const request = createMockPostRequest('http://localhost:3000/api/passes', {
        ...validPassData,
        parkingZoneCode: 'ZONE-A',
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.qRCodeScan.create).toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      mockPrisma.building.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockPostRequest(
        'http://localhost:3000/api/passes',
        validPassData
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create pass');
    });
  });

  // ============================================
  // GET /api/passes - List Passes (Auth Required)
  // ============================================
  describe('GET /api/passes', () => {
    const mockPasses = [
      {
        ...createMockPass({ id: 'pass-1' }),
        vehicle: createMockVehicle(),
        unit: {
          ...createMockUnit(),
          building: createMockBuilding(),
        },
        parkingZone: null,
      },
      {
        ...createMockPass({ id: 'pass-2', confirmationCode: 'XYZ78901' }),
        vehicle: createMockVehicle({ id: 'vehicle-2', licensePlate: 'XYZ789' }),
        unit: {
          ...createMockUnit(),
          building: createMockBuilding(),
        },
        parkingZone: null,
      },
    ];

    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockGetRequest('http://localhost:3000/api/passes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return passes for authenticated user', async () => {
      mockAuth.mockResolvedValue(createMockManagerSession());
      mockPrisma.parkingPass.findMany.mockResolvedValue(mockPasses);
      mockPrisma.parkingPass.count.mockResolvedValue(2);

      const request = createMockGetRequest('http://localhost:3000/api/passes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.passes).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockAuth.mockResolvedValue(createMockManagerSession());
      mockPrisma.parkingPass.findMany.mockResolvedValue([mockPasses[0]!]);
      mockPrisma.parkingPass.count.mockResolvedValue(1);

      const request = createMockGetRequest('http://localhost:3000/api/passes', {
        status: 'ACTIVE',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.passes).toHaveLength(1);
      expect(mockPrisma.parkingPass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should filter by building ID', async () => {
      mockAuth.mockResolvedValue(createMockManagerSession());
      mockPrisma.parkingPass.findMany.mockResolvedValue(mockPasses);
      mockPrisma.parkingPass.count.mockResolvedValue(2);

      const request = createMockGetRequest('http://localhost:3000/api/passes', {
        buildingId: 'building-1',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.parkingPass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unit: { buildingId: 'building-1' } }),
        })
      );
    });

    it('should search by license plate', async () => {
      mockAuth.mockResolvedValue(createMockManagerSession());
      mockPrisma.parkingPass.findMany.mockResolvedValue([mockPasses[0]!]);
      mockPrisma.parkingPass.count.mockResolvedValue(1);

      const request = createMockGetRequest('http://localhost:3000/api/passes', {
        search: 'ABC',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.parkingPass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                vehicle: { normalizedPlate: { contains: 'ABC' } },
              }),
            ]),
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      mockAuth.mockResolvedValue(createMockManagerSession());
      mockPrisma.parkingPass.findMany.mockResolvedValue([mockPasses[1]!]);
      mockPrisma.parkingPass.count.mockResolvedValue(2);

      const request = createMockGetRequest('http://localhost:3000/api/passes', {
        page: '2',
        limit: '1',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(1);
      expect(data.pagination.totalPages).toBe(2);
      expect(mockPrisma.parkingPass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockAuth.mockResolvedValue(createMockManagerSession());
      mockPrisma.parkingPass.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockGetRequest('http://localhost:3000/api/passes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch passes');
    });
  });
});
