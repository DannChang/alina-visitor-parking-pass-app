-- CreateEnum
CREATE TYPE "PassStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'EXTENDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PassType" AS ENUM ('VISITOR', 'RECURRING', 'TEMPORARY_RESIDENT', 'SERVICE_PROVIDER', 'MEDICAL_STAFF', 'EMERGENCY', 'VENDOR');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('OVERSTAY', 'UNREGISTERED', 'IMPROPER_PARKING', 'BLOCKING', 'RESERVED_SPOT', 'EXPIRED_PASS', 'FRAUDULENT_REGISTRATION', 'EMERGENCY_LANE_VIOLATION', 'HANDICAP_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'WARNING', 'FORMAL_LETTER', 'TOW_NOTICE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SECURITY', 'RESIDENT');

-- CreateEnum
CREATE TYPE "PatrolEntryType" AS ENUM ('ENTRY', 'EXIT', 'SPOT_CHECK', 'NOTE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'EXTEND_PASS', 'CANCEL_PASS', 'LOG_VIOLATION', 'RESOLVE_VIOLATION', 'BLACKLIST_VEHICLE', 'EXPORT_DATA', 'SETTING_CHANGE', 'EMERGENCY_ACCESS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'CRITICAL');

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "emergencyPhone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "floor" INTEGER,
    "section" TEXT,
    "primaryPhone" TEXT,
    "primaryEmail" TEXT,
    "accessCode" TEXT,
    "accessCodeHash" TEXT,
    "isOccupied" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "passwordHash" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnVisitorRegistration" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnViolation" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "totalSpots" INTEGER NOT NULL DEFAULT 0,
    "isEmergencyZone" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeUrl" TEXT,
    "qrCodeLastGenerated" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_rules" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "maxVehiclesPerUnit" INTEGER NOT NULL DEFAULT 2,
    "maxConsecutiveHours" INTEGER NOT NULL DEFAULT 24,
    "cooldownHours" INTEGER NOT NULL DEFAULT 2,
    "maxExtensions" INTEGER NOT NULL DEFAULT 1,
    "extensionMaxHours" INTEGER NOT NULL DEFAULT 4,
    "requireUnitConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 3,
    "consecutiveDayCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "autoExtensionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoExtensionThresholdHours" INTEGER NOT NULL DEFAULT 6,
    "autoExtensionDurationHours" INTEGER NOT NULL DEFAULT 25,
    "inOutPrivileges" BOOLEAN NOT NULL DEFAULT true,
    "operatingStartHour" INTEGER,
    "operatingEndHour" INTEGER,
    "allowedDurations" INTEGER[] DEFAULT ARRAY[2, 4, 8, 12, 24]::INTEGER[],
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "allowEmergencyOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "normalizedPlate" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "state" TEXT,
    "isResidentVehicle" BOOLEAN NOT NULL DEFAULT false,
    "residentId" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "blacklistedAt" TIMESTAMP(3),
    "blacklistedBy" TEXT,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_passes" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "parkingZoneId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "originalEndTime" TIMESTAMP(3) NOT NULL,
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExtendedAt" TIMESTAMP(3),
    "isInOutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastExitTime" TIMESTAMP(3),
    "lastEntryTime" TIMESTAMP(3),
    "reactivatedAt" TIMESTAMP(3),
    "status" "PassStatus" NOT NULL DEFAULT 'ACTIVE',
    "visitorName" TEXT,
    "visitorPhone" TEXT,
    "visitorEmail" TEXT,
    "passType" "PassType" NOT NULL DEFAULT 'VISITOR',
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "priorityLevel" INTEGER NOT NULL DEFAULT 0,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDays" INTEGER[],
    "recurringEndDate" TIMESTAMP(3),
    "parentPassId" TEXT,
    "confirmationCode" TEXT NOT NULL,
    "registeredVia" TEXT NOT NULL DEFAULT 'QR_SCAN',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "createdByResidentId" TEXT,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmationSentAt" TIMESTAMP(3),
    "expirationWarningSent" BOOLEAN NOT NULL DEFAULT false,
    "smsNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNotes" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "ViolationType" NOT NULL,
    "description" TEXT,
    "severity" "ViolationSeverity" NOT NULL DEFAULT 'MEDIUM',
    "escalationLevel" "EscalationLevel" NOT NULL DEFAULT 'NONE',
    "warningIssuedAt" TIMESTAMP(3),
    "formalLetterIssuedAt" TIMESTAMP(3),
    "towNoticeIssuedAt" TIMESTAMP(3),
    "parentViolationId" TEXT,
    "location" TEXT,
    "parkingZoneId" TEXT,
    "photoUrls" TEXT[],
    "evidenceNotes" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "citationNumber" TEXT,
    "fineAmount" DECIMAL(10,2),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "loggedById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_managers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "canManageUnits" BOOLEAN NOT NULL DEFAULT false,
    "canManageViolations" BOOLEAN NOT NULL DEFAULT true,
    "canManageSettings" BOOLEAN NOT NULL DEFAULT false,
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "building_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "authorized_guests" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "licensePlate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authorized_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrol_log_entries" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "licensePlate" TEXT NOT NULL,
    "normalizedPlate" TEXT NOT NULL,
    "entryType" "PatrolEntryType" NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "photoUrls" TEXT[],
    "patrollerId" TEXT NOT NULL,
    "buildingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrol_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "dataAccessed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_code_scans" (
    "id" TEXT NOT NULL,
    "parkingZoneId" TEXT,
    "buildingId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "resultedInPass" BOOLEAN NOT NULL DEFAULT false,
    "passId" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_code_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health" (
    "id" TEXT NOT NULL,
    "activePassCount" INTEGER NOT NULL,
    "expiringSoonCount" INTEGER NOT NULL,
    "violationCount" INTEGER NOT NULL,
    "avgResponseTime" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "dbConnectionCount" INTEGER,
    "overallStatus" "HealthStatus" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_key_idx" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_slug_key" ON "buildings"("slug");

-- CreateIndex
CREATE INDEX "buildings_slug_idx" ON "buildings"("slug");

-- CreateIndex
CREATE INDEX "buildings_isActive_idx" ON "buildings"("isActive");

-- CreateIndex
CREATE INDEX "units_buildingId_idx" ON "units"("buildingId");

-- CreateIndex
CREATE INDEX "units_isActive_idx" ON "units"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "units_buildingId_unitNumber_key" ON "units"("buildingId", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "residents_userId_key" ON "residents"("userId");

-- CreateIndex
CREATE INDEX "residents_unitId_idx" ON "residents"("unitId");

-- CreateIndex
CREATE INDEX "residents_email_idx" ON "residents"("email");

-- CreateIndex
CREATE INDEX "parking_zones_buildingId_idx" ON "parking_zones"("buildingId");

-- CreateIndex
CREATE INDEX "parking_zones_isActive_idx" ON "parking_zones"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "parking_zones_buildingId_code_key" ON "parking_zones"("buildingId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "parking_rules_buildingId_key" ON "parking_rules"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_normalizedPlate_key" ON "vehicles"("normalizedPlate");

-- CreateIndex
CREATE INDEX "vehicles_normalizedPlate_idx" ON "vehicles"("normalizedPlate");

-- CreateIndex
CREATE INDEX "vehicles_isBlacklisted_idx" ON "vehicles"("isBlacklisted");

-- CreateIndex
CREATE INDEX "vehicles_riskScore_idx" ON "vehicles"("riskScore");

-- CreateIndex
CREATE INDEX "vehicles_residentId_idx" ON "vehicles"("residentId");

-- CreateIndex
CREATE UNIQUE INDEX "parking_passes_confirmationCode_key" ON "parking_passes"("confirmationCode");

-- CreateIndex
CREATE INDEX "parking_passes_vehicleId_idx" ON "parking_passes"("vehicleId");

-- CreateIndex
CREATE INDEX "parking_passes_unitId_idx" ON "parking_passes"("unitId");

-- CreateIndex
CREATE INDEX "parking_passes_status_idx" ON "parking_passes"("status");

-- CreateIndex
CREATE INDEX "parking_passes_startTime_endTime_idx" ON "parking_passes"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "parking_passes_confirmationCode_idx" ON "parking_passes"("confirmationCode");

-- CreateIndex
CREATE INDEX "parking_passes_isEmergency_idx" ON "parking_passes"("isEmergency");

-- CreateIndex
CREATE INDEX "parking_passes_createdAt_idx" ON "parking_passes"("createdAt");

-- CreateIndex
CREATE INDEX "parking_passes_createdByResidentId_idx" ON "parking_passes"("createdByResidentId");

-- CreateIndex
CREATE UNIQUE INDEX "violations_citationNumber_key" ON "violations"("citationNumber");

-- CreateIndex
CREATE INDEX "violations_vehicleId_idx" ON "violations"("vehicleId");

-- CreateIndex
CREATE INDEX "violations_type_idx" ON "violations"("type");

-- CreateIndex
CREATE INDEX "violations_severity_idx" ON "violations"("severity");

-- CreateIndex
CREATE INDEX "violations_isResolved_idx" ON "violations"("isResolved");

-- CreateIndex
CREATE INDEX "violations_createdAt_idx" ON "violations"("createdAt");

-- CreateIndex
CREATE INDEX "violations_escalationLevel_idx" ON "violations"("escalationLevel");

-- CreateIndex
CREATE INDEX "violations_parentViolationId_idx" ON "violations"("parentViolationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");


-- CreateIndex
CREATE INDEX "building_managers_buildingId_idx" ON "building_managers"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "building_managers_userId_buildingId_key" ON "building_managers"("userId", "buildingId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "authorized_guests_residentId_idx" ON "authorized_guests"("residentId");

-- CreateIndex
CREATE INDEX "patrol_log_entries_normalizedPlate_idx" ON "patrol_log_entries"("normalizedPlate");

-- CreateIndex
CREATE INDEX "patrol_log_entries_patrollerId_idx" ON "patrol_log_entries"("patrollerId");

-- CreateIndex
CREATE INDEX "patrol_log_entries_createdAt_idx" ON "patrol_log_entries"("createdAt");

-- CreateIndex
CREATE INDEX "patrol_log_entries_buildingId_idx" ON "patrol_log_entries"("buildingId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "qr_code_scans_parkingZoneId_idx" ON "qr_code_scans"("parkingZoneId");

-- CreateIndex
CREATE INDEX "qr_code_scans_buildingId_idx" ON "qr_code_scans"("buildingId");

-- CreateIndex
CREATE INDEX "qr_code_scans_createdAt_idx" ON "qr_code_scans"("createdAt");

-- CreateIndex
CREATE INDEX "notification_queue_status_idx" ON "notification_queue"("status");

-- CreateIndex
CREATE INDEX "notification_queue_scheduledFor_idx" ON "notification_queue"("scheduledFor");

-- CreateIndex
CREATE INDEX "notification_queue_type_idx" ON "notification_queue"("type");

-- CreateIndex
CREATE INDEX "system_health_checkedAt_idx" ON "system_health"("checkedAt");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_zones" ADD CONSTRAINT "parking_zones_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_rules" ADD CONSTRAINT "parking_rules_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_passes" ADD CONSTRAINT "parking_passes_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_passes" ADD CONSTRAINT "parking_passes_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_passes" ADD CONSTRAINT "parking_passes_parkingZoneId_fkey" FOREIGN KEY ("parkingZoneId") REFERENCES "parking_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_passes" ADD CONSTRAINT "parking_passes_createdByResidentId_fkey" FOREIGN KEY ("createdByResidentId") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "building_managers" ADD CONSTRAINT "building_managers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_managers" ADD CONSTRAINT "building_managers_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_guests" ADD CONSTRAINT "authorized_guests_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_log_entries" ADD CONSTRAINT "patrol_log_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrol_log_entries" ADD CONSTRAINT "patrol_log_entries_patrollerId_fkey" FOREIGN KEY ("patrollerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code_scans" ADD CONSTRAINT "qr_code_scans_parkingZoneId_fkey" FOREIGN KEY ("parkingZoneId") REFERENCES "parking_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

