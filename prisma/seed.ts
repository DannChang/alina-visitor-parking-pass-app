/**
 * Database Seed Script
 * Creates initial data for Alina Visitor Parking system
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. CREATE BUILDING
  // ============================================

  console.log('📍 Creating building...');

  const building = await prisma.building.upsert({
    where: { slug: 'alina-visitor-parking' },
    update: {},
    create: {
      name: 'Alina Visitor Parking',
      slug: 'alina-visitor-parking',
      address: '123 Hospital Drive, Healthcare City, HC 12345',
      contactEmail: 'parking@alinahospital.com',
      contactPhone: '(555) 123-4567',
      emergencyPhone: '(555) 911-0000',
      timezone: 'America/New_York',
      isActive: true,
    },
  });

  console.log(`✅ Created building: ${building.name} (${building.id})\n`);

  // ============================================
  // 2. CREATE PARKING RULES
  // ============================================

  console.log('📋 Creating parking rules...');

  const parkingRules = await prisma.parkingRule.upsert({
    where: { buildingId: building.id },
    update: {},
    create: {
      buildingId: building.id,
      maxVehiclesPerUnit: 2,
      maxConsecutiveHours: 24,
      cooldownHours: 2,
      maxExtensions: 1,
      extensionMaxHours: 4,
      requireUnitConfirmation: false,
      operatingStartHour: null, // 24/7 for hospital
      operatingEndHour: null,
      allowedDurations: [2, 4, 8, 12, 24, 48, 72],
      gracePeriodMinutes: 15,
      allowEmergencyOverride: true,
    },
  });

  console.log(`✅ Created parking rules (${parkingRules.id})\n`);

  // ============================================
  // 3. CREATE PARKING ZONES
  // ============================================

  console.log('🅿️  Creating parking zones...');

  const zones = await Promise.all([
    prisma.parkingZone.upsert({
      where: { buildingId_code: { buildingId: building.id, code: 'MAIN' } },
      update: {},
      create: {
        buildingId: building.id,
        name: 'Main Visitor Lot',
        code: 'MAIN',
        description: 'Primary visitor parking area',
        totalSpots: 50,
        isEmergencyZone: false,
        requiresApproval: false,
        isActive: true,
      },
    }),
    prisma.parkingZone.upsert({
      where: { buildingId_code: { buildingId: building.id, code: 'EMERG' } },
      update: {},
      create: {
        buildingId: building.id,
        name: 'Emergency Parking',
        code: 'EMERG',
        description: 'Emergency vehicle parking only',
        totalSpots: 10,
        isEmergencyZone: true,
        requiresApproval: false,
        isActive: true,
      },
    }),
    prisma.parkingZone.upsert({
      where: { buildingId_code: { buildingId: building.id, code: 'NORTH' } },
      update: {},
      create: {
        buildingId: building.id,
        name: 'North Wing Visitor Parking',
        code: 'NORTH',
        description: 'Visitor parking for North Wing',
        totalSpots: 30,
        isEmergencyZone: false,
        requiresApproval: false,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${zones.length} parking zones\n`);

  // ============================================
  // 4. CREATE SAMPLE UNITS
  // ============================================

  console.log('🏠 Creating sample units...');

  const sampleUnits = [];

  // Create units 101-110, 201-210, 301-310
  for (const floor of [1, 2, 3]) {
    for (let num = 1; num <= 10; num++) {
      const unitNumber = `${floor}${num.toString().padStart(2, '0')}`;

      const unit = await prisma.unit.upsert({
        where: { buildingId_unitNumber: { buildingId: building.id, unitNumber } },
        update: {},
        create: {
          buildingId: building.id,
          unitNumber,
          floor,
          section: floor === 1 ? 'Ground' : floor === 2 ? 'Second' : 'Third',
          isOccupied: true,
          isActive: true,
        },
      });

      sampleUnits.push(unit);
    }
  }

  console.log(`✅ Created ${sampleUnits.length} units\n`);

  // ============================================
  // 5. CREATE ADMIN USER
  // ============================================

  console.log('👤 Creating admin user...');

  const hashedPassword = await bcrypt.hash('Admin@123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@alinahospital.com' },
    update: {},
    create: {
      email: 'admin@alinahospital.com',
      name: 'System Administrator',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);
  console.log(`   Password: Admin@123! (CHANGE THIS IN PRODUCTION!)\n`);

  // ============================================
  // 6. CREATE MANAGER USER
  // ============================================

  console.log('👤 Creating manager user...');

  const managerPassword = await bcrypt.hash('Manager@123!', 10);

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@alinahospital.com' },
    update: {},
    create: {
      email: 'manager@alinahospital.com',
      name: 'Parking Manager',
      passwordHash: managerPassword,
      role: 'MANAGER',
      emailVerified: new Date(),
      isActive: true,
    },
  });

  // Link manager to building
  await prisma.buildingManager.upsert({
    where: { userId_buildingId: { userId: managerUser.id, buildingId: building.id } },
    update: {},
    create: {
      userId: managerUser.id,
      buildingId: building.id,
      canManageUnits: true,
      canManageViolations: true,
      canManageSettings: false,
      canExportData: true,
      isActive: true,
    },
  });

  console.log(`✅ Created manager user: ${managerUser.email}`);
  console.log(`   Password: Manager@123! (CHANGE THIS IN PRODUCTION!)\n`);

  // ============================================
  // 7. CREATE SAMPLE RESIDENT
  // ============================================

  console.log('👤 Creating sample resident...');

  const residentPassword = await bcrypt.hash('Resident@123!', 10);

  const residentUser = await prisma.user.upsert({
    where: { email: 'resident@example.com' },
    update: {},
    create: {
      email: 'resident@example.com',
      name: 'John Doe',
      passwordHash: residentPassword,
      role: 'RESIDENT',
      emailVerified: new Date(),
      isActive: true,
    },
  });

  // Link resident to unit 101
  const unit101 = sampleUnits.find((u) => u.unitNumber === '101');
  if (unit101) {
    await prisma.resident.upsert({
      where: { userId: residentUser.id },
      update: {},
      create: {
        name: 'John Doe',
        email: 'resident@example.com',
        phone: '(555) 234-5678',
        unitId: unit101.id,
        userId: residentUser.id,
        isPrimary: true,
        isActive: true,
      },
    });

    console.log(`✅ Created resident: ${residentUser.email} (Unit ${unit101.unitNumber})`);
    console.log(`   Password: Resident@123!\n`);
  }

  // ============================================
  // 8. CREATE SAMPLE VEHICLES & PASSES
  // ============================================

  console.log('🚗 Creating sample vehicles and passes...');

  const now = new Date();
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  // Create a sample active pass
  const vehicle1 = await prisma.vehicle.create({
    data: {
      licensePlate: 'ABC 123',
      normalizedPlate: 'ABC123',
      make: 'Toyota',
      model: 'Camry',
      color: 'Silver',
      state: 'NY',
    },
  });

  if (unit101) {
    await prisma.parkingPass.create({
      data: {
        vehicleId: vehicle1.id,
        unitId: unit101.id,
        parkingZoneId: zones[0]?.id,
        startTime: now,
        endTime: fourHoursFromNow,
        originalEndTime: fourHoursFromNow,
        duration: 4,
        status: 'ACTIVE',
        visitorName: 'Jane Smith',
        visitorPhone: '(555) 345-6789',
        passType: 'VISITOR',
        registeredVia: 'QR_SCAN',
        confirmationSent: true,
      },
    });

    console.log(`✅ Created active pass for ${vehicle1.licensePlate} (Unit ${unit101.unitNumber})\n`);
  }

  // ============================================
  // SUMMARY
  // ============================================

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Database seed completed successfully!');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('📊 Summary:');
  console.log(`   • Building: ${building.name}`);
  console.log(`   • Parking Zones: ${zones.length}`);
  console.log(`   • Units: ${sampleUnits.length}`);
  console.log(`   • Admin User: admin@alinahospital.com`);
  console.log(`   • Manager User: manager@alinahospital.com`);
  console.log(`   • Resident User: resident@example.com`);
  console.log(`   • Sample Passes: 1 active pass\n`);

  console.log('🔗 Next Steps:');
  console.log('   1. Run: pnpm dev');
  console.log('   2. Visit: http://localhost:3000');
  console.log('   3. Register URL: http://localhost:3000/register/alina-visitor-parking');
  console.log('   4. Admin Login: http://localhost:3000/login');
  console.log('      Email: admin@alinahospital.com');
  console.log('      Password: Admin@123!\n');

  console.log('⚠️  IMPORTANT: Change default passwords in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
