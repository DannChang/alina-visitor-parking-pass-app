/**
 * Validation Service Tests
 * MISSION CRITICAL: Enforces all business rules for hospital parking
 * Target coverage: 95%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePassRequest, validatePassExtension } from '../validation-service';
import {
  createMockParkingRule,
  createMockVehicle,
  createMockPass,
} from '@/test/mocks/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    parkingRule: {
      findUnique: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
    },
    parkingPass: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Import mocked prisma
import prisma from '@/lib/prisma';

const mockPrisma = vi.mocked(prisma);

describe('Validation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // validatePassRequest - CRITICAL
  // ============================================
  describe('validatePassRequest', () => {
    const defaultRequest = {
      buildingId: 'building-1',
      licensePlate: 'ABC123',
      unitId: 'unit-1',
      durationHours: 4,
    };

    const setupDefaultMocks = () => {
      mockPrisma.parkingRule.findUnique.mockResolvedValue(createMockParkingRule());
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);
      mockPrisma.parkingPass.count.mockResolvedValue(0);
      mockPrisma.parkingPass.findMany.mockResolvedValue([]);
    };

    // ============================================
    // Rule 1: BLACKLIST CHECK (SECURITY CRITICAL)
    // ============================================
    describe('Rule 1: Blacklist Check', () => {
      it('should reject blacklisted vehicle with ERR_4000', async () => {
        setupDefaultMocks();
        const blacklistedVehicle = createMockVehicle({
          isBlacklisted: true,
          blacklistReason: 'Multiple violations',
          blacklistedAt: new Date(),
          blacklistedBy: 'admin-1',
        });
        mockPrisma.vehicle.findUnique.mockResolvedValue(blacklistedVehicle);

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('ERR_4000');
        expect(result.errors[0]?.field).toBe('licensePlate');
        expect(result.errors[0]?.metadata).toHaveProperty('blacklistedAt');
      });

      it('should allow non-blacklisted vehicle', async () => {
        setupDefaultMocks();
        const cleanVehicle = createMockVehicle({ isBlacklisted: false });
        mockPrisma.vehicle.findUnique.mockResolvedValue(cleanVehicle);

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(true);
        expect(result.errors.filter((e) => e.code === 'ERR_4000')).toHaveLength(0);
      });

      it('should allow new vehicle (not in database)', async () => {
        setupDefaultMocks();
        // vehicle.findUnique returns null for new vehicles

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(true);
      });
    });

    // ============================================
    // Rule 2: MAXIMUM VEHICLES PER UNIT
    // ============================================
    describe('Rule 2: Maximum Vehicles Per Unit', () => {
      it('should reject when unit has max vehicles (ERR_4001)', async () => {
        setupDefaultMocks();
        mockPrisma.parkingPass.count.mockResolvedValue(2); // At limit

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'ERR_4001');
        expect(error).toBeDefined();
        expect(error?.field).toBe('unitNumber');
        expect(error?.metadata).toEqual({
          maxAllowed: 2,
          currentCount: 2,
        });
      });

      it('should allow when under vehicle limit', async () => {
        setupDefaultMocks();
        mockPrisma.parkingPass.count.mockResolvedValue(1);

        const result = await validatePassRequest(defaultRequest);

        expect(result.errors.filter((e) => e.code === 'ERR_4001')).toHaveLength(0);
      });

      it('should warn when approaching vehicle limit', async () => {
        setupDefaultMocks();
        mockPrisma.parkingPass.count.mockResolvedValue(1); // 1 of 2, will be 2nd

        const result = await validatePassRequest(defaultRequest);

        const warning = result.warnings.find((w) => w.code === 'APPROACHING_VEHICLE_LIMIT');
        expect(warning).toBeDefined();
      });
    });

    // ============================================
    // Rule 3: CONSECUTIVE HOURS LIMIT
    // ============================================
    describe('Rule 3: Consecutive Hours Limit', () => {
      it('should reject when consecutive hours would exceed limit (ERR_4002)', async () => {
        setupDefaultMocks();
        const now = new Date();
        // Create passes that total 22 hours, requesting 4 more would exceed 24
        const recentPasses = [
          {
            startTime: new Date(now.getTime() - 22 * 60 * 60 * 1000),
            endTime: now,
            duration: 22,
          },
        ];
        mockPrisma.parkingPass.findMany.mockResolvedValue(recentPasses);

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'ERR_4002');
        expect(error).toBeDefined();
        expect(error?.field).toBe('duration');
      });

      it('should allow when within consecutive hours limit', async () => {
        setupDefaultMocks();
        const now = new Date();
        const recentPasses = [
          {
            startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
            endTime: now,
            duration: 4,
          },
        ];
        mockPrisma.parkingPass.findMany.mockResolvedValue(recentPasses);

        const result = await validatePassRequest(defaultRequest);

        expect(result.errors.filter((e) => e.code === 'ERR_4002')).toHaveLength(0);
      });
    });

    // ============================================
    // Rule 4: COOLDOWN PERIOD
    // ============================================
    describe('Rule 4: Cooldown Period', () => {
      it('should reject when still in cooldown period (ERR_4003)', async () => {
        setupDefaultMocks();
        // Pass ended 1 hour ago, cooldown is 2 hours
        const recentPass = {
          startTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          duration: 4,
        };
        mockPrisma.parkingPass.findMany.mockResolvedValue([recentPass]);

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'ERR_4003');
        expect(error).toBeDefined();
        expect(error?.field).toBe('licensePlate');
        expect(error?.metadata).toHaveProperty('cooldownHours');
        expect(error?.metadata).toHaveProperty('hoursRemaining');
      });

      it('should allow when cooldown period has passed', async () => {
        setupDefaultMocks();
        // Pass ended 3 hours ago, cooldown is 2 hours
        const recentPass = {
          startTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          duration: 4,
        };
        mockPrisma.parkingPass.findMany.mockResolvedValue([recentPass]);

        const result = await validatePassRequest(defaultRequest);

        expect(result.errors.filter((e) => e.code === 'ERR_4003')).toHaveLength(0);
      });
    });

    // ============================================
    // Rule 5: DURATION VALIDATION
    // ============================================
    describe('Rule 5: Duration Validation', () => {
      it('should reject invalid duration (ERR_4004)', async () => {
        setupDefaultMocks();

        const result = await validatePassRequest({
          ...defaultRequest,
          durationHours: 5, // Not in [2, 4, 8, 12, 24]
        });

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'ERR_4004');
        expect(error).toBeDefined();
        expect(error?.field).toBe('duration');
        expect(error?.metadata).toEqual({
          requestedDuration: 5,
          allowedDurations: [2, 4, 8, 12, 24],
        });
      });

      it('should accept valid duration', async () => {
        setupDefaultMocks();

        const result = await validatePassRequest({
          ...defaultRequest,
          durationHours: 8,
        });

        expect(result.errors.filter((e) => e.code === 'ERR_4004')).toHaveLength(0);
      });

      it('should respect building-specific allowed durations', async () => {
        setupDefaultMocks();
        mockPrisma.parkingRule.findUnique.mockResolvedValue(
          createMockParkingRule({
            allowedDurations: [1, 2, 3], // Custom durations
          })
        );

        const result = await validatePassRequest({
          ...defaultRequest,
          durationHours: 4, // Not in custom [1, 2, 3]
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.find((e) => e.code === 'ERR_4004')).toBeDefined();
      });
    });

    // ============================================
    // Rule 6: OPERATING HOURS
    // ============================================
    describe('Rule 6: Operating Hours', () => {
      it('should reject outside operating hours (ERR_4005)', async () => {
        setupDefaultMocks();
        // Set operating hours 8:00 - 18:00
        mockPrisma.parkingRule.findUnique.mockResolvedValue(
          createMockParkingRule({
            operatingStartHour: 8,
            operatingEndHour: 18,
          })
        );

        // Mock current time to be 20:00 (outside hours)
        const mockDate = new Date();
        mockDate.setHours(20, 0, 0, 0);
        vi.setSystemTime(mockDate);

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'ERR_4005');
        expect(error).toBeDefined();

        vi.useRealTimers();
      });

      it('should allow within operating hours', async () => {
        setupDefaultMocks();
        mockPrisma.parkingRule.findUnique.mockResolvedValue(
          createMockParkingRule({
            operatingStartHour: 8,
            operatingEndHour: 18,
          })
        );

        // Mock current time to be 12:00 (within hours)
        const mockDate = new Date();
        mockDate.setHours(12, 0, 0, 0);
        vi.setSystemTime(mockDate);

        const result = await validatePassRequest(defaultRequest);

        expect(result.errors.filter((e) => e.code === 'ERR_4005')).toHaveLength(0);

        vi.useRealTimers();
      });

      it('should allow any time when operating hours are null (24/7)', async () => {
        setupDefaultMocks();
        mockPrisma.parkingRule.findUnique.mockResolvedValue(
          createMockParkingRule({
            operatingStartHour: null,
            operatingEndHour: null,
          })
        );

        const mockDate = new Date();
        mockDate.setHours(3, 0, 0, 0); // 3 AM
        vi.setSystemTime(mockDate);

        const result = await validatePassRequest(defaultRequest);

        expect(result.errors.filter((e) => e.code === 'ERR_4005')).toHaveLength(0);

        vi.useRealTimers();
      });
    });

    // ============================================
    // EMERGENCY OVERRIDE
    // ============================================
    describe('Emergency Override', () => {
      it('should bypass rules with emergency flag', async () => {
        setupDefaultMocks();
        // Set up conditions that would normally fail
        const blacklistedVehicle = createMockVehicle({ isBlacklisted: true });
        mockPrisma.vehicle.findUnique.mockResolvedValue(blacklistedVehicle);
        mockPrisma.parkingPass.count.mockResolvedValue(5); // Over limit

        const result = await validatePassRequest({
          ...defaultRequest,
          isEmergency: true,
        });

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            code: 'EMERGENCY_OVERRIDE',
          })
        );
      });

      it('should not bypass when allowEmergencyOverride is false', async () => {
        setupDefaultMocks();
        mockPrisma.parkingRule.findUnique.mockResolvedValue(
          createMockParkingRule({
            allowEmergencyOverride: false,
          })
        );
        const blacklistedVehicle = createMockVehicle({ isBlacklisted: true });
        mockPrisma.vehicle.findUnique.mockResolvedValue(blacklistedVehicle);

        const result = await validatePassRequest({
          ...defaultRequest,
          isEmergency: true,
        });

        expect(result.isValid).toBe(false);
      });
    });

    // ============================================
    // WARNINGS
    // ============================================
    describe('Warnings', () => {
      it('should warn for long duration (24+ hours)', async () => {
        setupDefaultMocks();
        mockPrisma.parkingRule.findUnique.mockResolvedValue(
          createMockParkingRule({
            allowedDurations: [2, 4, 8, 12, 24, 48],
          })
        );

        const result = await validatePassRequest({
          ...defaultRequest,
          durationHours: 24,
        });

        const warning = result.warnings.find((w) => w.code === 'LONG_DURATION');
        expect(warning).toBeDefined();
        expect(warning?.metadata).toEqual({ durationHours: 24 });
      });

      it('should warn for vehicle with violation history', async () => {
        setupDefaultMocks();
        const vehicleWithViolations = createMockVehicle({
          violationCount: 3,
          riskScore: 30,
        });
        mockPrisma.vehicle.findUnique.mockResolvedValue(vehicleWithViolations);

        const result = await validatePassRequest(defaultRequest);

        const warning = result.warnings.find((w) => w.code === 'VIOLATION_HISTORY');
        expect(warning).toBeDefined();
        expect(warning?.metadata).toEqual({
          violationCount: 3,
          riskScore: 30,
        });
      });

      it('should warn for high risk score (>=50)', async () => {
        setupDefaultMocks();
        const highRiskVehicle = createMockVehicle({
          violationCount: 0,
          riskScore: 75,
        });
        mockPrisma.vehicle.findUnique.mockResolvedValue(highRiskVehicle);

        const result = await validatePassRequest(defaultRequest);

        const warning = result.warnings.find((w) => w.code === 'HIGH_RISK_VEHICLE');
        expect(warning).toBeDefined();
        expect(warning?.metadata).toEqual({ riskScore: 75 });
      });
    });

    // ============================================
    // ERROR HANDLING
    // ============================================
    describe('Error Handling', () => {
      it('should return internal error on database failure', async () => {
        mockPrisma.parkingRule.findUnique.mockRejectedValue(
          new Error('Database connection failed')
        );

        const result = await validatePassRequest(defaultRequest);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('ERR_5100');
        expect(result.errors[0]?.message).toContain('error occurred');
      });

      it('should use default rules when building rules not found', async () => {
        mockPrisma.parkingRule.findUnique.mockResolvedValue(null);
        mockPrisma.vehicle.findUnique.mockResolvedValue(null);
        mockPrisma.parkingPass.count.mockResolvedValue(0);
        mockPrisma.parkingPass.findMany.mockResolvedValue([]);

        const result = await validatePassRequest(defaultRequest);

        // Should succeed with default rules
        expect(result.isValid).toBe(true);
      });
    });
  });

  // ============================================
  // validatePassExtension
  // ============================================
  describe('validatePassExtension', () => {
    const setupExtensionMocks = (passOverrides = {}, rulesOverrides = {}) => {
      const rules = createMockParkingRule(rulesOverrides);
      const pass = createMockPass({
        ...passOverrides,
        unit: {
          id: 'unit-1',
          buildingId: 'building-1',
          building: {
            id: 'building-1',
            name: 'Test Building',
            parkingRules: rules,
          },
        },
      });

      mockPrisma.parkingPass.findUnique.mockResolvedValue({
        ...pass,
        unit: {
          id: 'unit-1',
          buildingId: 'building-1',
          unitNumber: '101',
          floor: 1,
          section: 'A',
          primaryPhone: null,
          primaryEmail: null,
          isOccupied: true,
          isActive: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          building: {
            id: 'building-1',
            name: 'Test Building',
            slug: 'test-building',
            address: '123 Test St',
            contactEmail: null,
            contactPhone: null,
            emergencyPhone: null,
            timezone: 'America/New_York',
            isActive: true,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            parkingRules: rules,
          },
        },
      });

      return { pass, rules };
    };

    // ============================================
    // Extension Count Validation
    // ============================================
    describe('Extension Count', () => {
      it('should reject when max extensions exceeded', async () => {
        setupExtensionMocks(
          { extensionCount: 1 }, // Already extended once
          { maxExtensions: 1 }
        );

        const result = await validatePassExtension('pass-1', 2);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'MAX_EXTENSIONS_EXCEEDED');
        expect(error).toBeDefined();
        expect(error?.metadata).toEqual({
          currentExtensions: 1,
          maxAllowed: 1,
        });
      });

      it('should allow when under extension limit', async () => {
        setupExtensionMocks(
          { extensionCount: 0 },
          { maxExtensions: 2 }
        );

        const result = await validatePassExtension('pass-1', 2);

        expect(result.errors.filter((e) => e.code === 'MAX_EXTENSIONS_EXCEEDED')).toHaveLength(0);
      });
    });

    // ============================================
    // Extension Hours Validation
    // ============================================
    describe('Extension Hours', () => {
      it('should reject when extension hours exceed max', async () => {
        setupExtensionMocks({}, { extensionMaxHours: 4 });

        const result = await validatePassExtension('pass-1', 6); // Requesting 6, max is 4

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'EXTENSION_TOO_LONG');
        expect(error).toBeDefined();
        expect(error?.metadata).toEqual({
          requestedHours: 6,
          maxAllowed: 4,
        });
      });

      it('should allow when within extension hours limit', async () => {
        setupExtensionMocks({}, { extensionMaxHours: 4 });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.errors.filter((e) => e.code === 'EXTENSION_TOO_LONG')).toHaveLength(0);
      });
    });

    // ============================================
    // Grace Period Validation
    // ============================================
    describe('Grace Period', () => {
      it('should reject when pass expired beyond grace period', async () => {
        const expiredTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
        setupExtensionMocks(
          { endTime: expiredTime },
          { gracePeriodMinutes: 15 }
        );

        const result = await validatePassExtension('pass-1', 2);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'PASS_EXPIRED');
        expect(error).toBeDefined();
      });

      it('should allow when within grace period', async () => {
        const recentExpiry = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
        setupExtensionMocks(
          { endTime: recentExpiry },
          { gracePeriodMinutes: 15 }
        );

        const result = await validatePassExtension('pass-1', 2);

        expect(result.errors.filter((e) => e.code === 'PASS_EXPIRED')).toHaveLength(0);
      });

      it('should allow when pass is still active', async () => {
        const futureExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        setupExtensionMocks({ endTime: futureExpiry });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.errors.filter((e) => e.code === 'PASS_EXPIRED')).toHaveLength(0);
      });
    });

    // ============================================
    // Status Validation
    // ============================================
    describe('Status Validation', () => {
      it('should reject cancelled pass', async () => {
        const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
        setupExtensionMocks({
          status: 'CANCELLED',
          endTime: futureExpiry,
        });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'INVALID_STATUS');
        expect(error).toBeDefined();
        expect(error?.metadata).toEqual({ status: 'CANCELLED' });
      });

      it('should reject suspended pass', async () => {
        const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
        setupExtensionMocks({
          status: 'SUSPENDED',
          endTime: futureExpiry,
        });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'INVALID_STATUS');
        expect(error).toBeDefined();
      });

      it('should allow active pass', async () => {
        const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
        setupExtensionMocks({
          status: 'ACTIVE',
          endTime: futureExpiry,
        });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.errors.filter((e) => e.code === 'INVALID_STATUS')).toHaveLength(0);
      });

      it('should allow extended pass', async () => {
        const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
        setupExtensionMocks({
          status: 'EXTENDED',
          endTime: futureExpiry,
          extensionCount: 0,
        });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.errors.filter((e) => e.code === 'INVALID_STATUS')).toHaveLength(0);
      });
    });

    // ============================================
    // Not Found
    // ============================================
    describe('Pass Not Found', () => {
      it('should return error when pass not found', async () => {
        mockPrisma.parkingPass.findUnique.mockResolvedValue(null);

        const result = await validatePassExtension('non-existent', 2);

        expect(result.isValid).toBe(false);
        const error = result.errors.find((e) => e.code === 'ERR_5001');
        expect(error).toBeDefined();
        expect(error?.message).toContain('not found');
      });
    });

    // ============================================
    // Valid Extension
    // ============================================
    describe('Valid Extension', () => {
      it('should validate successful extension request', async () => {
        const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
        setupExtensionMocks({
          status: 'ACTIVE',
          extensionCount: 0,
          endTime: futureExpiry,
        }, {
          maxExtensions: 2,
          extensionMaxHours: 4,
          gracePeriodMinutes: 15,
        });

        const result = await validatePassExtension('pass-1', 2);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    // ============================================
    // Error Handling
    // ============================================
    describe('Error Handling', () => {
      it('should return internal error on database failure', async () => {
        mockPrisma.parkingPass.findUnique.mockRejectedValue(
          new Error('Database error')
        );

        const result = await validatePassExtension('pass-1', 2);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('ERR_5100');
      });
    });
  });
});
