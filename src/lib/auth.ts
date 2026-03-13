import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { APP_CONFIG } from '@/lib/constants';
import type { UserRole } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const residentLoginSchema = z.object({
  buildingSlug: z.string().min(1).default(APP_CONFIG.resident.defaultBuildingSlug),
  unitNumber: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      id: 'staff-credentials',
      name: 'Staff Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            isActive: true,
            isSuspended: true,
            image: true,
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.role === 'RESIDENT') {
          return null;
        }

        if (!user.isActive || user.isSuspended) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          // Track failed login attempt
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: { increment: 1 },
              lastFailedLoginAt: new Date(),
            },
          });
          return null;
        }

        // Reset failed login attempts and update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          loginType: 'staff' as const,
        };
      },
    }),
    Credentials({
      id: 'resident-credentials',
      name: 'Resident Login',
      credentials: {
        unitNumber: { label: 'Unit Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = residentLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { buildingSlug, unitNumber, password } = parsed.data;

        // Find building + unit
        const unit = await prisma.unit.findFirst({
          where: {
            building: { slug: buildingSlug, isActive: true, deletedAt: null },
            unitNumber,
            isActive: true,
            deletedAt: null,
          },
          include: {
            building: true,
            residents: {
              where: { isPrimary: true, isActive: true, deletedAt: null },
              take: 1,
              select: {
                id: true,
                userId: true,
                email: true,
                name: true,
                passwordHash: true,
                user: {
                  select: {
                    id: true,
                    isActive: true,
                    isSuspended: true,
                  },
                },
              },
            },
          },
        });

        if (!unit || unit.residents.length === 0) return null;

        const resident = unit.residents[0]!;
        if (!resident.passwordHash) return null;

        if (resident.user && (!resident.user.isActive || resident.user.isSuspended)) {
          return null;
        }

        const isValid = await bcrypt.compare(password, resident.passwordHash);
        if (!isValid) return null;

        return {
          id: resident.userId ?? resident.id,
          email: resident.email ?? '',
          name: resident.name,
          role: 'RESIDENT' as UserRole,
          loginType: 'resident' as const,
          unitId: unit.id,
          residentId: resident.id,
          buildingSlug: unit.building.slug,
          unitNumber: unit.unitNumber,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role as UserRole;
        const loginType = (user as Record<string, unknown>).loginType as string | undefined;
        const unitId = (user as Record<string, unknown>).unitId as string | undefined;
        const residentId = (user as Record<string, unknown>).residentId as string | undefined;
        const buildingSlug = (user as Record<string, unknown>).buildingSlug as string | undefined;
        const unitNumber = (user as Record<string, unknown>).unitNumber as string | undefined;
        if (loginType !== undefined) token.loginType = loginType;
        if (unitId !== undefined) token.unitId = unitId;
        if (residentId !== undefined) token.residentId = residentId;
        if (buildingSlug !== undefined) token.buildingSlug = buildingSlug;
        if (unitNumber !== undefined) token.unitNumber = unitNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        if (token.loginType !== undefined) (session as unknown as Record<string, unknown>).loginType = token.loginType;
        if (token.unitId !== undefined) (session as unknown as Record<string, unknown>).unitId = token.unitId;
        if (token.residentId !== undefined) (session as unknown as Record<string, unknown>).residentId = token.residentId;
        if (token.buildingSlug !== undefined) (session as unknown as Record<string, unknown>).buildingSlug = token.buildingSlug;
        if (token.unitNumber !== undefined) (session as unknown as Record<string, unknown>).unitNumber = token.unitNumber;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await prisma.auditLog.create({
          data: {
            action: 'LOGIN',
            entityType: 'User',
            entityId: user.id,
            userId: user.id,
          },
        }).catch(() => {
          // Resident users may not have a User record, skip audit log
        });
      }
    },
    async signOut(message) {
      // signOut receives either { session } or { token } depending on strategy
      if ('token' in message && message.token?.id) {
        const userId = message.token.id as string;
        // Fire-and-forget: don't await to avoid connection closed errors during sign-out
        prisma.auditLog.create({
          data: {
            action: 'LOGOUT',
            entityType: 'User',
            entityId: userId,
            userId: userId,
          },
        }).catch(() => {
          // Connection may be closed or resident users may not have a User record
        });
      }
    },
  },
});

// Type augmentation for next-auth
declare module 'next-auth' {
  interface User {
    role?: UserRole;
    loginType?: 'staff' | 'resident';
    unitId?: string;
    residentId?: string;
    buildingSlug?: string;
    unitNumber?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
    loginType?: 'staff' | 'resident';
    unitId?: string;
    residentId?: string;
    buildingSlug?: string;
    unitNumber?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    loginType?: string;
    unitId?: string;
    residentId?: string;
    buildingSlug?: string;
    unitNumber?: string;
  }
}
