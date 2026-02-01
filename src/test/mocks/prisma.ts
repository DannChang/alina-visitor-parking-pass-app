/**
 * Prisma Mock Factories
 * Test data factories for database entities
 */

import type { ParkingRule, Vehicle, ParkingPass, Building, Unit } from '@prisma/client';

/**
 * Create mock parking rules with sensible defaults
 */
export function createMockParkingRule(overrides?: Partial<ParkingRule>): ParkingRule {
  return {
    id: 'rule-1',
    buildingId: 'building-1',
    maxVehiclesPerUnit: 2,
    maxConsecutiveHours: 24,
    cooldownHours: 2,
    maxExtensions: 1,
    extensionMaxHours: 4,
    requireUnitConfirmation: false,
    operatingStartHour: null,
    operatingEndHour: null,
    allowedDurations: [2, 4, 8, 12, 24],
    gracePeriodMinutes: 15,
    allowEmergencyOverride: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock vehicle with sensible defaults
 */
export function createMockVehicle(overrides?: Partial<Vehicle>): Vehicle {
  return {
    id: 'vehicle-1',
    licensePlate: 'ABC123',
    normalizedPlate: 'ABC123',
    make: 'Toyota',
    model: 'Camry',
    color: 'Silver',
    state: 'NY',
    isBlacklisted: false,
    blacklistReason: null,
    blacklistedAt: null,
    blacklistedBy: null,
    violationCount: 0,
    riskScore: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock parking pass with sensible defaults
 */
export function createMockPass(overrides?: Partial<ParkingPass>): ParkingPass {
  const now = new Date();
  const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

  return {
    id: 'pass-1',
    vehicleId: 'vehicle-1',
    unitId: 'unit-1',
    parkingZoneId: null,
    startTime: now,
    endTime,
    duration: 4,
    originalEndTime: endTime,
    extensionCount: 0,
    lastExtendedAt: null,
    status: 'ACTIVE',
    visitorName: 'John Doe',
    visitorPhone: '555-1234',
    visitorEmail: 'john@example.com',
    passType: 'VISITOR',
    isEmergency: false,
    priorityLevel: 0,
    isRecurring: false,
    recurringDays: [],
    recurringEndDate: null,
    parentPassId: null,
    confirmationCode: 'ABC12345',
    registeredVia: 'WEB_FORM',
    ipAddress: null,
    userAgent: null,
    deviceInfo: null,
    confirmationSent: false,
    confirmationSentAt: null,
    expirationWarningSent: false,
    requiresApproval: false,
    approvedBy: null,
    approvedAt: null,
    approvalNotes: null,
    viewCount: 0,
    lastViewedAt: null,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create mock building
 */
export function createMockBuilding(overrides?: Partial<Building>): Building {
  return {
    id: 'building-1',
    name: 'Alina Hospital',
    slug: 'alina-hospital',
    address: '123 Hospital Way',
    contactEmail: 'contact@alina.com',
    contactPhone: '555-0100',
    emergencyPhone: '555-0911',
    timezone: 'America/New_York',
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock unit
 */
export function createMockUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: 'unit-1',
    buildingId: 'building-1',
    unitNumber: '101',
    floor: 1,
    section: 'A',
    primaryPhone: '555-1234',
    primaryEmail: 'unit101@example.com',
    isOccupied: true,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a series of mock passes for consecutive hours testing
 */
export function createConsecutivePasses(
  count: number,
  durationHours: number = 4,
  gapMinutes: number = 0
): Array<{ startTime: Date; endTime: Date }> {
  const passes: Array<{ startTime: Date; endTime: Date }> = [];
  let currentTime = new Date();

  for (let i = 0; i < count; i++) {
    const startTime = new Date(currentTime);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    passes.push({ startTime, endTime });

    // Next pass starts after gap
    currentTime = new Date(endTime.getTime() + gapMinutes * 60 * 1000);
  }

  return passes;
}
