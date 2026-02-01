/**
 * Extend Pass API Route Integration Tests
 * CRITICAL: Pass extensions allow visitors to stay longer during emergencies
 * Target coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPostRequest } from '@/test/mocks/next-request';
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
    parkingPass: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock validation service
vi.mock('@/services/validation-service', () => ({
  validatePassExtension: vi.fn(),
}));

// Import after mocks
import { POST } from '../extend/route';
import { prisma } from '@/lib/prisma';
import { validatePassExtension } from '@/services/validation-service';

const mockPrisma = prisma as unknown as {
  parkingPass: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

const mockValidatePassExtension = validatePassExtension as ReturnType<typeof vi.fn>;

describe('Extend Pass API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBuilding = {
    ...createMockBuilding(),
    parkingRules: [createMockParkingRule()],
  };

  const mockUnit = {
    ...createMockUnit(),
    building: mockBuilding,
  };

  const mockVehicle = createMockVehicle();

  const mockPass = {
    ...createMockPass(),
    unit: mockUnit,
    vehicle: mockVehicle,
  };

  describe('POST /api/passes/extend', () => {
    it('should extend a valid pass', async () => {
      const now = new Date();
      const originalEndTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const passWithEndTime = {
        ...mockPass,
        endTime: originalEndTime,
      };

      mockPrisma.parkingPass.findUnique.mockResolvedValue(passWithEndTime);
      mockValidatePassExtension.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockPrisma.parkingPass.update.mockResolvedValue({
        ...passWithEndTime,
        endTime: new Date(originalEndTime.getTime() + 2 * 60 * 60 * 1000),
        extensionCount: 1,
        status: 'EXTENDED',
        parkingZone: null,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pass).toBeDefined();
      expect(data.previousEndTime).toBeDefined();
      expect(data.newEndTime).toBeDefined();
    });

    it('should return 400 for missing passId', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for missing additionalHours', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid additionalHours (too low)', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 0,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid additionalHours (too high)', async () => {
      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 5, // Max is 4
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 404 for non-existent pass', async () => {
      mockPrisma.parkingPass.findUnique.mockResolvedValue(null);

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'non-existent',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Pass not found');
    });

    it('should return 400 when max extensions exceeded', async () => {
      mockPrisma.parkingPass.findUnique.mockResolvedValue(mockPass);
      mockValidatePassExtension.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'MAX_EXTENSIONS_EXCEEDED', message: 'Maximum extensions reached' }],
        warnings: [],
      });

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Extension validation failed');
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'MAX_EXTENSIONS_EXCEEDED' })
      );
    });

    it('should return 400 when extension hours exceed limit', async () => {
      mockPrisma.parkingPass.findUnique.mockResolvedValue(mockPass);
      mockValidatePassExtension.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'EXTENSION_TOO_LONG', message: 'Extension hours exceed maximum' }],
        warnings: [],
      });

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 4,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'EXTENSION_TOO_LONG' })
      );
    });

    it('should return 400 when pass is expired beyond grace period', async () => {
      mockPrisma.parkingPass.findUnique.mockResolvedValue(mockPass);
      mockValidatePassExtension.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'PASS_EXPIRED', message: 'Pass has expired beyond grace period' }],
        warnings: [],
      });

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'PASS_EXPIRED' })
      );
    });

    it('should return 400 for cancelled pass', async () => {
      mockPrisma.parkingPass.findUnique.mockResolvedValue({
        ...mockPass,
        status: 'CANCELLED',
      });
      mockValidatePassExtension.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'INVALID_STATUS', message: 'Pass cannot be extended in current status' }],
        warnings: [],
      });

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_STATUS' })
      );
    });

    it('should return warnings with successful extension', async () => {
      const originalEndTime = new Date();
      const passWithEndTime = {
        ...mockPass,
        endTime: originalEndTime,
      };

      mockPrisma.parkingPass.findUnique.mockResolvedValue(passWithEndTime);
      mockValidatePassExtension.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [{ code: 'FINAL_EXTENSION', message: 'This is the final allowed extension' }],
      });
      mockPrisma.parkingPass.update.mockResolvedValue({
        ...passWithEndTime,
        extensionCount: 1,
        status: 'EXTENDED',
        parkingZone: null,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.warnings).toContainEqual(
        expect.objectContaining({ code: 'FINAL_EXTENSION' })
      );
    });

    it('should create audit log entry for extension', async () => {
      const originalEndTime = new Date();
      const passWithEndTime = {
        ...mockPass,
        endTime: originalEndTime,
      };

      mockPrisma.parkingPass.findUnique.mockResolvedValue(passWithEndTime);
      mockValidatePassExtension.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockPrisma.parkingPass.update.mockResolvedValue({
        ...passWithEndTime,
        extensionCount: 1,
        status: 'EXTENDED',
        parkingZone: null,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      await POST(request);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'EXTEND_PASS',
            entityType: 'ParkingPass',
            entityId: 'pass-1',
          }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockPrisma.parkingPass.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockPostRequest('http://localhost:3000/api/passes/extend', {
        passId: 'pass-1',
        additionalHours: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to extend pass');
    });
  });
});
