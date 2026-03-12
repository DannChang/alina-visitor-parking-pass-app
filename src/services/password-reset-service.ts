import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { APP_CONFIG } from '@/lib/constants';
import { getBaseUrl } from '@/lib/utils';
import {
  sendPasswordChangedConfirmationEmail,
  sendPasswordResetEmail,
} from '@/services/notification-service';

const PASSWORD_RESET_PREFIX = 'password-reset';
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const IS_PASSWORD_RESET_DEBUG_ENABLED = process.env.NODE_ENV !== 'production';

export type PasswordResetAccountType = 'staff' | 'resident';

export interface PasswordResetRequestInput {
  accountType: PasswordResetAccountType;
  email: string;
  buildingSlug?: string;
  unitNumber?: string;
}

export interface PasswordResetPreview {
  status: 'valid' | 'expired' | 'invalid';
  accountType?: PasswordResetAccountType;
  expiresAt?: string;
  loginPath?: '/login' | '/resident/login';
  recipientEmail?: string;
  recipientName?: string;
  buildingName?: string;
  unitNumber?: string;
}

interface PasswordResetTarget {
  accountType: PasswordResetAccountType;
  identifier: string;
  recipientEmail: string;
  recipientName?: string;
  buildingName?: string;
  unitNumber?: string;
}

export class PasswordResetError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildIdentifier(accountType: PasswordResetAccountType, id: string) {
  return `${PASSWORD_RESET_PREFIX}:${accountType}:${id}`;
}

function parseIdentifier(identifier: string): {
  accountType: PasswordResetAccountType;
  id: string;
} | null {
  const [prefix, accountType, id] = identifier.split(':');
  if (prefix !== PASSWORD_RESET_PREFIX || !id) {
    return null;
  }

  if (accountType !== 'staff' && accountType !== 'resident') {
    return null;
  }

  return { accountType, id };
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getLoginPathForAccountType(
  accountType: PasswordResetAccountType
): '/login' | '/resident/login' {
  return accountType === 'resident' ? '/resident/login' : '/login';
}

function buildResetUrl(token: string): string {
  return new URL(`/reset-password/${token}`, getBaseUrl()).toString();
}

async function findPasswordResetTarget(
  input: PasswordResetRequestInput
): Promise<PasswordResetTarget | null> {
  const email = normalizeEmail(input.email);
  const buildingSlug =
    input.buildingSlug ?? APP_CONFIG.resident.defaultBuildingSlug;

  if (input.accountType === 'staff') {
    const user = await prisma.user.findFirst({
      where: {
        email,
        role: { not: 'RESIDENT' },
        isActive: true,
        isSuspended: false,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      accountType: 'staff',
      identifier: buildIdentifier('staff', user.id),
      recipientEmail: user.email,
      ...(user.name ? { recipientName: user.name } : {}),
    };
  }

  if (!input.unitNumber) {
    return null;
  }

  const resident = await prisma.resident.findFirst({
    where: {
      email,
      isPrimary: true,
      isActive: true,
      deletedAt: null,
      unit: {
        unitNumber: input.unitNumber,
        isActive: true,
        deletedAt: null,
        building: {
          slug: buildingSlug,
          isActive: true,
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      user: {
        select: {
          isActive: true,
          isSuspended: true,
        },
      },
      unit: {
        select: {
          unitNumber: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!resident?.email) {
    return null;
  }

  if (resident.user && (!resident.user.isActive || resident.user.isSuspended)) {
    return null;
  }

  return {
    accountType: 'resident',
    identifier: buildIdentifier('resident', resident.id),
    recipientEmail: resident.email,
    recipientName: resident.name,
    buildingName: resident.unit.building.name,
    unitNumber: resident.unit.unitNumber,
  };
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput
): Promise<void> {
  const buildingSlug =
    input.buildingSlug ?? APP_CONFIG.resident.defaultBuildingSlug;
  const target = await findPasswordResetTarget(input);
  if (!target) {
    if (IS_PASSWORD_RESET_DEBUG_ENABLED) {
      const normalizedEmail = normalizeEmail(input.email);

      if (input.accountType === 'staff') {
        const resident = await prisma.resident.findFirst({
          where: {
            email: normalizedEmail,
            isPrimary: true,
            isActive: true,
            deletedAt: null,
          },
          select: {
            unit: {
              select: {
                unitNumber: true,
                building: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        });

        if (resident) {
          console.info(
            `[password-reset] No eligible staff account matched "${normalizedEmail}". A resident account exists instead for ${resident.unit.building.slug}/${resident.unit.unitNumber}.`
          );
        } else {
          console.info(
            `[password-reset] No eligible staff account matched "${normalizedEmail}".`
          );
        }
      } else {
        console.info(
          `[password-reset] No eligible resident account matched "${normalizedEmail}" for building "${buildingSlug}" and unit "${input.unitNumber ?? 'unknown'}".`
        );
      }
    }

    return;
  }

  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier: target.identifier },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: target.identifier,
      token: hashedToken,
      expires: expiresAt,
    },
  });

  const emailSent = await sendPasswordResetEmail({
    recipientEmail: target.recipientEmail,
    resetUrl: buildResetUrl(rawToken),
    expiresAt,
    accountType: target.accountType,
    ...(target.recipientName ? { recipientName: target.recipientName } : {}),
    ...(target.buildingName ? { buildingName: target.buildingName } : {}),
    ...(target.unitNumber ? { unitNumber: target.unitNumber } : {}),
  });

  if (IS_PASSWORD_RESET_DEBUG_ENABLED) {
    if (emailSent) {
      console.info(
        `[password-reset] Reset email queued and sent to "${target.recipientEmail}" for ${target.accountType}.`
      );
    } else {
      console.warn(
        `[password-reset] Reset email was created for "${target.recipientEmail}", but delivery failed. Check notification_queue and Resend configuration.`
      );
    }
  }
}

export async function getPasswordResetPreview(
  token: string
): Promise<PasswordResetPreview> {
  const hashedToken = hashResetToken(token);
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!verificationToken) {
    return { status: 'invalid' };
  }

  const parsed = parseIdentifier(verificationToken.identifier);

  if (verificationToken.expires <= new Date()) {
    await prisma.verificationToken.delete({
      where: { token: hashedToken },
    }).catch(() => {
      // Ignore cleanup errors for expired tokens.
    });
    return parsed
      ? {
          status: 'expired',
          accountType: parsed.accountType,
          loginPath: getLoginPathForAccountType(parsed.accountType),
        }
      : { status: 'expired' };
  }

  if (!parsed) {
    return { status: 'invalid' };
  }

  if (parsed.accountType === 'staff') {
    const user = await prisma.user.findFirst({
      where: {
        id: parsed.id,
        role: { not: 'RESIDENT' },
        isActive: true,
        isSuspended: false,
        deletedAt: null,
      },
      select: {
        email: true,
        name: true,
      },
    });

    if (!user) {
      return { status: 'invalid' };
    }

    return {
      status: 'valid',
      accountType: 'staff',
      expiresAt: verificationToken.expires.toISOString(),
      loginPath: getLoginPathForAccountType('staff'),
      recipientEmail: user.email,
      ...(user.name ? { recipientName: user.name } : {}),
    };
  }

  const resident = await prisma.resident.findFirst({
    where: {
      id: parsed.id,
      isPrimary: true,
      isActive: true,
      deletedAt: null,
    },
    select: {
      email: true,
      name: true,
      unit: {
        select: {
          unitNumber: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!resident?.email) {
    return { status: 'invalid' };
  }

  return {
    status: 'valid',
    accountType: 'resident',
    expiresAt: verificationToken.expires.toISOString(),
    loginPath: getLoginPathForAccountType('resident'),
    recipientEmail: resident.email,
    recipientName: resident.name,
    buildingName: resident.unit.building.name,
    unitNumber: resident.unit.unitNumber,
  };
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ loginPath: '/login' | '/resident/login' }> {
  const hashedToken = hashResetToken(input.token);
  const passwordHash = await bcrypt.hash(input.password, 12);

  let confirmationEmail:
    | {
        recipientEmail: string;
        recipientName?: string;
        accountType: PasswordResetAccountType;
      }
    | undefined;
  let loginPath: '/login' | '/resident/login' = '/login';

  await prisma.$transaction(async (tx) => {
    const verificationToken = await tx.verificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      throw new PasswordResetError(
        'This password reset link is invalid.',
        400,
        'RESET_TOKEN_INVALID'
      );
    }

    if (verificationToken.expires <= new Date()) {
      await tx.verificationToken.delete({
        where: { token: hashedToken },
      });

      throw new PasswordResetError(
        'This password reset link has expired.',
        400,
        'RESET_TOKEN_EXPIRED'
      );
    }

    const parsed = parseIdentifier(verificationToken.identifier);
    if (!parsed) {
      throw new PasswordResetError(
        'This password reset link is invalid.',
        400,
        'RESET_TOKEN_INVALID'
      );
    }

    if (parsed.accountType === 'staff') {
      const user = await tx.user.findFirst({
        where: {
          id: parsed.id,
          role: { not: 'RESIDENT' },
          isActive: true,
          isSuspended: false,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        throw new PasswordResetError(
          'This password reset link is invalid.',
          400,
          'RESET_TARGET_INVALID'
        );
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          details: { reason: 'PASSWORD_RESET' },
        },
      });

      confirmationEmail = {
        recipientEmail: user.email,
        accountType: 'staff',
        ...(user.name ? { recipientName: user.name } : {}),
      };
      loginPath = '/login';
    } else {
      const resident = await tx.resident.findFirst({
        where: {
          id: parsed.id,
          isPrimary: true,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          userId: true,
        },
      });

      if (!resident?.email) {
        throw new PasswordResetError(
          'This password reset link is invalid.',
          400,
          'RESET_TARGET_INVALID'
        );
      }

      await tx.resident.update({
        where: { id: resident.id },
        data: { passwordHash },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Resident',
          entityId: resident.id,
          userId: resident.userId ?? null,
          details: { reason: 'PASSWORD_RESET' },
        },
      });

      confirmationEmail = {
        recipientEmail: resident.email,
        recipientName: resident.name,
        accountType: 'resident',
      };
      loginPath = '/resident/login';
    }

    await tx.verificationToken.deleteMany({
      where: { identifier: verificationToken.identifier },
    });
  });

  if (confirmationEmail) {
    await sendPasswordChangedConfirmationEmail(confirmationEmail);
  }

  return { loginPath };
}
