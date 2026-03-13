ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ISSUE_RESIDENT_INVITE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVOKE_RESIDENT_INVITE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONSUME_RESIDENT_INVITE';

CREATE TABLE "resident_invites" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "consumedIp" TEXT,
    "consumedUserAgent" TEXT,
    "userId" TEXT,
    "residentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resident_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resident_invites_tokenHash_key" ON "resident_invites"("tokenHash");
CREATE UNIQUE INDEX "resident_invites_userId_key" ON "resident_invites"("userId");
CREATE UNIQUE INDEX "resident_invites_residentId_key" ON "resident_invites"("residentId");
CREATE INDEX "resident_invites_issuerId_createdAt_idx" ON "resident_invites"("issuerId", "createdAt");
CREATE INDEX "resident_invites_buildingId_createdAt_idx" ON "resident_invites"("buildingId", "createdAt");
CREATE INDEX "resident_invites_unitId_createdAt_idx" ON "resident_invites"("unitId", "createdAt");
CREATE INDEX "resident_invites_recipientEmail_idx" ON "resident_invites"("recipientEmail");
CREATE INDEX "resident_invites_expiresAt_idx" ON "resident_invites"("expiresAt");

ALTER TABLE "resident_invites"
    ADD CONSTRAINT "resident_invites_issuerId_fkey"
    FOREIGN KEY ("issuerId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resident_invites"
    ADD CONSTRAINT "resident_invites_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "buildings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resident_invites"
    ADD CONSTRAINT "resident_invites_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resident_invites"
    ADD CONSTRAINT "resident_invites_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resident_invites"
    ADD CONSTRAINT "resident_invites_residentId_fkey"
    FOREIGN KEY ("residentId") REFERENCES "residents"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "residents_active_primary_per_unit_idx"
ON "residents"("unitId")
WHERE "isPrimary" = true
  AND "isActive" = true
  AND "deletedAt" IS NULL;
