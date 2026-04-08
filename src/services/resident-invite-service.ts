import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Prisma, UserRole } from '@prisma/client';
import { getBaseUrl } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { normalizeLicensePlate, validateLicensePlate } from '@/lib/utils/license-plate';
import {
  getAssignedStallValidationError,
  getPasswordValidationError,
  getStrataLotValidationError,
} from '@/lib/validation';
import { sendResidentInviteEmail } from '@/services/notification-service';

type ScopedClient = Prisma.TransactionClient | typeof prisma;

export type ResidentInviteStatus = 'PENDING' | 'EXPIRED' | 'REVOKED' | 'CONSUMED';

export interface ResidentInviteSummary {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  status: ResidentInviteStatus;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  consumedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  building: {
    id: string;
    name: string;
    slug: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
  issuer: {
    id: string;
    name: string | null;
    email: string;
  };
  resident: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  user: {
    id: string;
    email: string;
  } | null;
}

export interface ResidentInviteBuildingOption {
  id: string;
  name: string;
  slug: string;
}

export interface ResidentInviteUnitOption {
  id: string;
  buildingId: string;
  buildingName: string;
  unitNumber: string;
  hasPrimaryResident: boolean;
  hasPendingInvite: boolean;
  isAvailableForInvite: boolean;
}

export interface ResidentInvitePreview {
  id: string;
  status: ResidentInviteStatus;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  expiresAt: string;
  createdAt: string;
  revokeReason: string | null;
  building: {
    id: string;
    name: string;
    slug: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
}

export interface ResidentInviteListResult {
  invites: ResidentInviteSummary[];
  buildings: ResidentInviteBuildingOption[];
  units: ResidentInviteUnitOption[];
}

export interface ResidentInviteMutationResult {
  invite: ResidentInviteSummary;
  registrationUrl: string;
  emailSent: boolean;
}

interface CreateResidentInviteInput {
  issuerId: string;
  issuerRole: UserRole;
  buildingId: string;
  unitId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string | undefined;
}

interface RevokeResidentInviteInput {
  issuerId: string;
  issuerRole: UserRole;
  inviteId: string;
  reason: string;
}

interface ReissueResidentInviteInput {
  issuerId: string;
  issuerRole: UserRole;
  inviteId: string;
}

interface ConsumeResidentInviteInput {
  token: string;
  password: string;
  hasVehicle: boolean;
  strataLotNumber: string;
  assignedStallNumbers: string[];
  personalLicensePlates: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class ResidentInviteError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ResidentInviteError';
  }
}

export function getResidentInviteStatus(invite: {
  consumedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): ResidentInviteStatus {
  if (invite.consumedAt) {
    return 'CONSUMED';
  }
  if (invite.revokedAt) {
    return 'REVOKED';
  }
  if (invite.expiresAt <= new Date()) {
    return 'EXPIRED';
  }
  return 'PENDING';
}

export function hashResidentInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createResidentInviteToken(): string {
  return randomBytes(32).toString('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildRegistrationUrl(token: string): string {
  return new URL(`/register/resident/${token}`, getBaseUrl()).toString();
}

async function getAccessibleBuildings(
  client: ScopedClient,
  userId: string,
  role: UserRole,
  activeOnly = false
): Promise<ResidentInviteBuildingOption[]> {
  if (role === 'SUPER_ADMIN') {
    return client.building.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  if (role !== 'MANAGER') {
    return [];
  }

  const buildingManagers = await client.buildingManager.findMany({
    where: {
      userId,
      isActive: true,
      deletedAt: null,
      building: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
    },
    select: {
      building: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      building: {
        name: 'asc',
      },
    },
  });

  return buildingManagers.map(({ building }) => building);
}

async function getAccessibleBuildingIds(
  client: ScopedClient,
  userId: string,
  role: UserRole,
  activeOnly = false
): Promise<string[]> {
  const buildings = await getAccessibleBuildings(client, userId, role, activeOnly);
  return buildings.map((building) => building.id);
}

async function requireInviteScope(
  client: ScopedClient,
  userId: string,
  role: UserRole,
  buildingId: string
): Promise<void> {
  const accessibleBuildingIds = await getAccessibleBuildingIds(client, userId, role);
  if (!accessibleBuildingIds.includes(buildingId)) {
    throw new ResidentInviteError(
      'You do not have access to this building',
      403,
      'BUILDING_SCOPE_FORBIDDEN'
    );
  }
}

async function assertInviteEligibility(
  client: ScopedClient,
  buildingId: string,
  unitId: string,
  recipientEmail: string,
  ignoreInviteId?: string
) {
  const now = new Date();

  const [building, unit, activePrimaryResident, existingUser, existingResident, existingInvite] =
    await Promise.all([
      client.building.findFirst({
        where: {
          id: buildingId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      client.unit.findFirst({
        where: {
          id: unitId,
          buildingId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          unitNumber: true,
          buildingId: true,
        },
      }),
      client.resident.findFirst({
        where: {
          unitId,
          isPrimary: true,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      }),
      client.user.findFirst({
        where: {
          email: recipientEmail,
          deletedAt: null,
        },
        select: { id: true },
      }),
      client.resident.findFirst({
        where: {
          email: recipientEmail,
          deletedAt: null,
        },
        select: { id: true },
      }),
      client.residentInvite.findFirst({
        where: {
          ...(ignoreInviteId ? { id: { not: ignoreInviteId } } : {}),
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
          OR: [{ unitId }, { recipientEmail }],
        },
        select: {
          id: true,
          unitId: true,
          recipientEmail: true,
        },
      }),
    ]);

  if (!building) {
    throw new ResidentInviteError('Building not found', 404, 'BUILDING_NOT_FOUND');
  }

  if (!unit) {
    throw new ResidentInviteError('Unit not found', 404, 'UNIT_NOT_FOUND');
  }

  if (activePrimaryResident) {
    throw new ResidentInviteError(
      'This unit already has an active primary resident',
      400,
      'UNIT_ALREADY_ASSIGNED'
    );
  }

  if (existingUser || existingResident) {
    throw new ResidentInviteError(
      'An account with this email already exists',
      400,
      'EMAIL_ALREADY_IN_USE'
    );
  }

  if (existingInvite) {
    if (existingInvite.unitId === unitId) {
      throw new ResidentInviteError(
        'This unit already has a pending registration pass',
        400,
        'UNIT_ALREADY_INVITED'
      );
    }

    throw new ResidentInviteError(
      'This email already has a pending registration pass',
      400,
      'EMAIL_ALREADY_INVITED'
    );
  }

  return { building, unit };
}

function formatResidentInvite(invite: {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  createdAt: Date;
  expiresAt: Date;
  sentAt: Date | null;
  consumedAt: Date | null;
  revokedAt: Date | null;
  revokeReason: string | null;
  building: {
    id: string;
    name: string;
    slug: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
  issuer: {
    id: string;
    name: string | null;
    email: string;
  };
  resident?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  user?: {
    id: string;
    email: string;
  } | null;
}): ResidentInviteSummary {
  return {
    id: invite.id,
    recipientName: invite.recipientName,
    recipientEmail: invite.recipientEmail,
    recipientPhone: invite.recipientPhone,
    status: getResidentInviteStatus(invite),
    createdAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    sentAt: invite.sentAt?.toISOString() ?? null,
    consumedAt: invite.consumedAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    revokeReason: invite.revokeReason,
    building: invite.building,
    unit: invite.unit,
    issuer: invite.issuer,
    resident: invite.resident ?? null,
    user: invite.user ?? null,
  };
}

export async function listResidentInvites(params: {
  userId: string;
  role: UserRole;
  search?: string | null;
  buildingId?: string | null;
  status?: ResidentInviteStatus | null;
}): Promise<ResidentInviteListResult> {
  const { userId, role, search, buildingId, status } = params;

  const accessibleBuildingIds = await getAccessibleBuildingIds(prisma, userId, role);
  if (buildingId) {
    await requireInviteScope(prisma, userId, role, buildingId);
  }

  const activeBuildings = await getAccessibleBuildings(prisma, userId, role, true);
  const activeBuildingIds = activeBuildings.map((building) => building.id);
  const now = new Date();

  const [rawInvites, rawUnits] = await Promise.all([
    accessibleBuildingIds.length === 0
      ? Promise.resolve([])
      : prisma.residentInvite.findMany({
          where: {
            buildingId: {
              in: buildingId ? [buildingId] : accessibleBuildingIds,
            },
            ...(search
              ? {
                  OR: [
                    { recipientName: { contains: search, mode: 'insensitive' } },
                    { recipientEmail: { contains: search, mode: 'insensitive' } },
                    { unit: { unitNumber: { contains: search, mode: 'insensitive' } } },
                    { building: { name: { contains: search, mode: 'insensitive' } } },
                  ],
                }
              : {}),
          },
          include: {
            building: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
              },
            },
            issuer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            resident: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
    activeBuildingIds.length === 0
      ? Promise.resolve([])
      : prisma.unit.findMany({
          where: {
            buildingId: { in: activeBuildingIds },
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            buildingId: true,
            unitNumber: true,
            building: {
              select: {
                name: true,
              },
            },
            residents: {
              where: {
                isPrimary: true,
                isActive: true,
                deletedAt: null,
              },
              select: { id: true },
              take: 1,
            },
            residentInvites: {
              where: {
                consumedAt: null,
                revokedAt: null,
                expiresAt: { gt: now },
              },
              select: { id: true },
              take: 1,
            },
          },
          orderBy: [{ building: { name: 'asc' } }, { unitNumber: 'asc' }],
        }),
  ]);

  const invites = rawInvites
    .map((invite) => formatResidentInvite(invite))
    .filter((invite) => (status ? invite.status === status : true));

  const units: ResidentInviteUnitOption[] = rawUnits.map((unit) => {
    const hasPrimaryResident = unit.residents.length > 0;
    const hasPendingInvite = unit.residentInvites.length > 0;

    return {
      id: unit.id,
      buildingId: unit.buildingId,
      buildingName: unit.building.name,
      unitNumber: unit.unitNumber,
      hasPrimaryResident,
      hasPendingInvite,
      isAvailableForInvite: !hasPrimaryResident && !hasPendingInvite,
    };
  });

  return {
    invites,
    buildings: activeBuildings,
    units,
  };
}

export async function createResidentInvite(
  input: CreateResidentInviteInput
): Promise<ResidentInviteMutationResult> {
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const recipientName = input.recipientName.trim();
  const recipientPhone = input.recipientPhone?.trim() || null;
  const token = createResidentInviteToken();
  const tokenHash = hashResidentInviteToken(token);

  const invite = await prisma.$transaction(async (tx) => {
    await requireInviteScope(tx, input.issuerId, input.issuerRole, input.buildingId);
    const { building, unit } = await assertInviteEligibility(
      tx,
      input.buildingId,
      input.unitId,
      recipientEmail
    );

    const createdInvite = await tx.residentInvite.create({
      data: {
        issuerId: input.issuerId,
        buildingId: input.buildingId,
        unitId: input.unitId,
        recipientName,
        recipientEmail,
        recipientPhone,
        tokenHash,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        issuer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'ISSUE_RESIDENT_INVITE',
        entityType: 'ResidentInvite',
        entityId: createdInvite.id,
        userId: input.issuerId,
        details: {
          buildingId: building.id,
          unitId: unit.id,
          recipientEmail,
        },
      },
    });

    return createdInvite;
  });

  const registrationUrl = buildRegistrationUrl(token);
  const emailSent = await sendResidentInviteEmail({
    inviteId: invite.id,
    recipientEmail,
    recipientName,
    buildingName: invite.building.name,
    unitNumber: invite.unit.unitNumber,
    registrationUrl,
    expiresAt: invite.expiresAt,
  });

  let sentAt = invite.sentAt;
  if (emailSent) {
    sentAt = new Date();
    await prisma.residentInvite.update({
      where: { id: invite.id },
      data: { sentAt },
    });
  }

  return {
    invite: formatResidentInvite({
      ...invite,
      sentAt,
      resident: null,
      user: null,
    }),
    registrationUrl,
    emailSent,
  };
}

async function getScopedInviteForMutation(
  client: ScopedClient,
  inviteId: string,
  userId: string,
  role: UserRole
) {
  const invite = await client.residentInvite.findUnique({
    where: { id: inviteId },
    include: {
      building: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      unit: {
        select: {
          id: true,
          unitNumber: true,
        },
      },
      issuer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resident: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!invite) {
    throw new ResidentInviteError('Registration pass not found', 404, 'INVITE_NOT_FOUND');
  }

  await requireInviteScope(client, userId, role, invite.building.id);

  return invite;
}

export async function revokeResidentInvite(
  input: RevokeResidentInviteInput
): Promise<ResidentInviteSummary> {
  const reason = input.reason.trim();

  const invite = await prisma.$transaction(async (tx) => {
    const currentInvite = await getScopedInviteForMutation(
      tx,
      input.inviteId,
      input.issuerId,
      input.issuerRole
    );

    if (getResidentInviteStatus(currentInvite) !== 'PENDING') {
      throw new ResidentInviteError(
        'Only pending registration passes can be revoked',
        400,
        'INVITE_NOT_PENDING'
      );
    }

    const revokedInvite = await tx.residentInvite.update({
      where: { id: input.inviteId },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        issuer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'REVOKE_RESIDENT_INVITE',
        entityType: 'ResidentInvite',
        entityId: revokedInvite.id,
        userId: input.issuerId,
        details: {
          reason,
        },
      },
    });

    return revokedInvite;
  });

  return formatResidentInvite(invite);
}

export async function reissueResidentInvite(
  input: ReissueResidentInviteInput
): Promise<ResidentInviteMutationResult> {
  const token = createResidentInviteToken();
  const tokenHash = hashResidentInviteToken(token);

  const invite = await prisma.$transaction(async (tx) => {
    const currentInvite = await getScopedInviteForMutation(
      tx,
      input.inviteId,
      input.issuerId,
      input.issuerRole
    );
    const currentStatus = getResidentInviteStatus(currentInvite);

    if (currentStatus === 'CONSUMED') {
      throw new ResidentInviteError(
        'Consumed registration passes cannot be reissued',
        400,
        'INVITE_ALREADY_CONSUMED'
      );
    }

    if (currentStatus === 'PENDING') {
      await tx.residentInvite.update({
        where: { id: currentInvite.id },
        data: {
          revokedAt: new Date(),
          revokeReason: 'Reissued by an authorized user',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'REVOKE_RESIDENT_INVITE',
          entityType: 'ResidentInvite',
          entityId: currentInvite.id,
          userId: input.issuerId,
          details: {
            reason: 'Reissued by an authorized user',
          },
        },
      });
    }

    await assertInviteEligibility(
      tx,
      currentInvite.building.id,
      currentInvite.unit.id,
      currentInvite.recipientEmail,
      currentInvite.id
    );

    const createdInvite = await tx.residentInvite.create({
      data: {
        issuerId: input.issuerId,
        buildingId: currentInvite.building.id,
        unitId: currentInvite.unit.id,
        recipientName: currentInvite.recipientName,
        recipientEmail: currentInvite.recipientEmail,
        recipientPhone: currentInvite.recipientPhone,
        tokenHash,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        issuer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'ISSUE_RESIDENT_INVITE',
        entityType: 'ResidentInvite',
        entityId: createdInvite.id,
        userId: input.issuerId,
        details: {
          reissuedFromInviteId: currentInvite.id,
          recipientEmail: currentInvite.recipientEmail,
        },
      },
    });

    return createdInvite;
  });

  const registrationUrl = buildRegistrationUrl(token);
  const emailSent = await sendResidentInviteEmail({
    inviteId: invite.id,
    recipientEmail: invite.recipientEmail,
    recipientName: invite.recipientName,
    buildingName: invite.building.name,
    unitNumber: invite.unit.unitNumber,
    registrationUrl,
    expiresAt: invite.expiresAt,
  });

  let sentAt = invite.sentAt;
  if (emailSent) {
    sentAt = new Date();
    await prisma.residentInvite.update({
      where: { id: invite.id },
      data: { sentAt },
    });
  }

  return {
    invite: formatResidentInvite({
      ...invite,
      sentAt,
      resident: null,
      user: null,
    }),
    registrationUrl,
    emailSent,
  };
}

export async function getResidentInvitePreviewByToken(
  token: string
): Promise<ResidentInvitePreview | null> {
  const invite = await prisma.residentInvite.findUnique({
    where: { tokenHash: hashResidentInviteToken(token) },
    select: {
      id: true,
      recipientName: true,
      recipientEmail: true,
      recipientPhone: true,
      createdAt: true,
      expiresAt: true,
      consumedAt: true,
      revokedAt: true,
      revokeReason: true,
      building: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      unit: {
        select: {
          id: true,
          unitNumber: true,
        },
      },
    },
  });

  if (!invite) {
    return null;
  }

  return {
    id: invite.id,
    status: getResidentInviteStatus(invite),
    recipientName: invite.recipientName,
    recipientEmail: invite.recipientEmail,
    recipientPhone: invite.recipientPhone,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
    revokeReason: invite.revokeReason,
    building: invite.building,
    unit: invite.unit,
  };
}

export async function consumeResidentInvite(input: ConsumeResidentInviteInput): Promise<{
  buildingSlug: string;
  unitNumber: string;
}> {
  const strataLotNumber = input.strataLotNumber.trim();
  const assignedStallNumbers = input.assignedStallNumbers
    .map((stallNumber) => stallNumber.trim())
    .filter(Boolean);
  const personalLicensePlates = input.hasVehicle
    ? input.personalLicensePlates.map((licensePlate) => licensePlate.trim()).filter(Boolean)
    : [];

  const strataLotError = getStrataLotValidationError(strataLotNumber);
  if (strataLotError) {
    throw new ResidentInviteError(strataLotError.replace(/\.$/, ''), 400, 'STRATA_LOT_REQUIRED');
  }

  if (assignedStallNumbers.length === 0) {
    throw new ResidentInviteError(
      'At least one assigned stall number is required',
      400,
      'STALL_REQUIRED'
    );
  }

  const invalidAssignedStallNumber = assignedStallNumbers.find(
    (stallNumber) => getAssignedStallValidationError(stallNumber) !== null
  );

  if (invalidAssignedStallNumber) {
    throw new ResidentInviteError(
      getAssignedStallValidationError(invalidAssignedStallNumber)?.replace(/\.$/, '') ??
        'Assigned stall number is invalid',
      400,
      'STALL_INVALID'
    );
  }

  if (input.hasVehicle && personalLicensePlates.length === 0) {
    throw new ResidentInviteError(
      'At least one personal license plate is required',
      400,
      'LICENSE_PLATE_REQUIRED'
    );
  }

  if (
    !input.hasVehicle &&
    input.personalLicensePlates.some((licensePlate) => licensePlate.trim())
  ) {
    throw new ResidentInviteError(
      'Personal license plates must be empty when no vehicle is selected',
      400,
      'LICENSE_PLATE_NOT_ALLOWED'
    );
  }

  const passwordError = getPasswordValidationError(input.password);
  if (passwordError) {
    throw new ResidentInviteError(passwordError.replace(/\.$/, ''), 400, 'PASSWORD_INVALID');
  }

  const uniqueAssignedStallNumbers = Array.from(new Set(assignedStallNumbers));
  const normalizedLicensePlates = personalLicensePlates.map((licensePlate) => ({
    raw: licensePlate.toUpperCase(),
    normalized: normalizeLicensePlate(licensePlate),
  }));
  const uniqueNormalizedLicensePlates = Array.from(
    new Map(
      normalizedLicensePlates.map((licensePlate) => [licensePlate.normalized, licensePlate])
    ).values()
  );

  if (uniqueNormalizedLicensePlates.length !== normalizedLicensePlates.length) {
    throw new ResidentInviteError(
      'Duplicate personal license plates are not allowed',
      400,
      'DUPLICATE_LICENSE_PLATES'
    );
  }

  const invalidLicensePlate = uniqueNormalizedLicensePlates.find(
    (licensePlate) => !validateLicensePlate(licensePlate.raw).isValid
  );

  if (invalidLicensePlate) {
    throw new ResidentInviteError(
      `License plate ${invalidLicensePlate.raw} is invalid`,
      400,
      'INVALID_LICENSE_PLATE'
    );
  }

  const tokenHash = hashResidentInviteToken(input.token);
  const invite = await prisma.residentInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      buildingId: true,
      unitId: true,
      recipientName: true,
      recipientEmail: true,
      recipientPhone: true,
      expiresAt: true,
      consumedAt: true,
      revokedAt: true,
      building: {
        select: {
          slug: true,
        },
      },
      unit: {
        select: {
          unitNumber: true,
        },
      },
    },
  });

  if (!invite) {
    throw new ResidentInviteError('This registration link is invalid', 404, 'INVITE_NOT_FOUND');
  }

  const inviteStatus = getResidentInviteStatus(invite);
  if (inviteStatus === 'CONSUMED') {
    throw new ResidentInviteError(
      'This registration link has already been used',
      400,
      'INVITE_ALREADY_CONSUMED'
    );
  }
  if (inviteStatus === 'REVOKED') {
    throw new ResidentInviteError('This registration link has been revoked', 400, 'INVITE_REVOKED');
  }
  if (inviteStatus === 'EXPIRED') {
    throw new ResidentInviteError('This registration link has expired', 400, 'INVITE_EXPIRED');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const currentInvite = await tx.residentInvite.findUnique({
        where: { id: invite.id },
        select: {
          id: true,
          buildingId: true,
          unitId: true,
          recipientName: true,
          recipientEmail: true,
          recipientPhone: true,
          expiresAt: true,
          consumedAt: true,
          revokedAt: true,
        },
      });

      if (!currentInvite) {
        throw new ResidentInviteError('This registration link is invalid', 404, 'INVITE_NOT_FOUND');
      }

      const currentStatus = getResidentInviteStatus(currentInvite);
      if (currentStatus !== 'PENDING') {
        throw new ResidentInviteError(
          'This registration link is no longer available',
          400,
          'INVITE_NOT_PENDING'
        );
      }

      await assertInviteEligibility(
        tx,
        currentInvite.buildingId,
        currentInvite.unitId,
        currentInvite.recipientEmail,
        currentInvite.id
      );

      const existingVehicles = await tx.vehicle.findMany({
        where: {
          normalizedPlate: {
            in: uniqueNormalizedLicensePlates.map((licensePlate) => licensePlate.normalized),
          },
        },
        select: {
          id: true,
          licensePlate: true,
          normalizedPlate: true,
          residentId: true,
        },
      });

      const conflictingVehicle = existingVehicles.find((vehicle) => vehicle.residentId !== null);

      if (conflictingVehicle) {
        throw new ResidentInviteError(
          `License plate ${conflictingVehicle.licensePlate} is already registered to another resident`,
          409,
          'LICENSE_PLATE_ALREADY_ASSIGNED'
        );
      }

      const user = await tx.user.create({
        data: {
          email: currentInvite.recipientEmail,
          name: currentInvite.recipientName,
          passwordHash: null,
          role: 'RESIDENT',
          emailVerified: new Date(),
          isActive: true,
        },
      });

      const resident = await tx.resident.create({
        data: {
          name: currentInvite.recipientName,
          email: currentInvite.recipientEmail,
          phone: currentInvite.recipientPhone,
          strataLotNumber,
          assignedStallNumbers: uniqueAssignedStallNumbers,
          unitId: currentInvite.unitId,
          userId: user.id,
          passwordHash,
          isPrimary: true,
          isActive: true,
        },
      });

      await Promise.all(
        uniqueNormalizedLicensePlates.map((licensePlate) => {
          const existingVehicle = existingVehicles.find(
            (vehicle) => vehicle.normalizedPlate === licensePlate.normalized
          );

          if (existingVehicle) {
            return tx.vehicle.update({
              where: { id: existingVehicle.id },
              data: {
                residentId: resident.id,
                isResidentVehicle: true,
                licensePlate: licensePlate.raw,
              },
            });
          }

          return tx.vehicle.create({
            data: {
              licensePlate: licensePlate.raw,
              normalizedPlate: licensePlate.normalized,
              isResidentVehicle: true,
              residentId: resident.id,
            },
          });
        })
      );

      await tx.residentInvite.update({
        where: { id: currentInvite.id },
        data: {
          consumedAt: new Date(),
          consumedIp: input.ipAddress ?? null,
          consumedUserAgent: input.userAgent ?? null,
          userId: user.id,
          residentId: resident.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CONSUME_RESIDENT_INVITE',
          entityType: 'ResidentInvite',
          entityId: currentInvite.id,
          userId: user.id,
          details: {
            residentId: resident.id,
            unitId: currentInvite.unitId,
            buildingId: currentInvite.buildingId,
            hasVehicle: input.hasVehicle,
            strataLotNumber,
            assignedStallNumbers: uniqueAssignedStallNumbers,
            personalLicensePlates: uniqueNormalizedLicensePlates.map(
              (licensePlate) => licensePlate.raw
            ),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof ResidentInviteError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ResidentInviteError(
        'This registration link has already been processed',
        409,
        'INVITE_RACE_CONDITION'
      );
    }

    throw error;
  }

  return {
    buildingSlug: invite.building.slug,
    unitNumber: invite.unit.unitNumber,
  };
}
