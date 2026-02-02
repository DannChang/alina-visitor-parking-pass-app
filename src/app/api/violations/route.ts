import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import { ViolationType, ViolationSeverity } from '@prisma/client';

const createViolationSchema = z.object({
  licensePlate: z.string().min(2).max(10),
  type: z.nativeEnum(ViolationType),
  severity: z.nativeEnum(ViolationSeverity).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  parkingZoneId: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  evidenceNotes: z.string().optional(),
  fineAmount: z.number().optional(),
});

const updateViolationSchema = z.object({
  isResolved: z.boolean().optional(),
  resolution: z.string().optional(),
  isPaid: z.boolean().optional(),
  severity: z.nativeEnum(ViolationSeverity).optional(),
});

// GET /api/violations - List violations (requires violations:view permission)
export async function GET(request: NextRequest) {
  const authResult = await requirePermission('violations:view');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const resolved = searchParams.get('resolved');
  const type = searchParams.get('type') as ViolationType | null;
  const severity = searchParams.get('severity') as ViolationSeverity | null;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (resolved === 'true') {
    where.isResolved = true;
  } else if (resolved === 'false') {
    where.isResolved = false;
  }

  if (type) {
    where.type = type;
  }

  if (severity) {
    where.severity = severity;
  }

  try {
    const [violations, total] = await Promise.all([
      prisma.violation.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              color: true,
              isBlacklisted: true,
            },
          },
          loggedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.violation.count({ where }),
    ]);

    return NextResponse.json({
      violations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 });
  }
}

// POST /api/violations - Log a new violation (requires violations:create permission)
export async function POST(request: NextRequest) {
  const authResult = await requirePermission('violations:create');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId } = authResult.request;

  try {
    const body = await request.json();
    const parsed = createViolationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPlate = normalizeLicensePlate(data.licensePlate);

    // Find or create the vehicle
    let vehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
    });

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          licensePlate: data.licensePlate.toUpperCase(),
          normalizedPlate,
        },
      });
    }

    // Create the violation
    const violation = await prisma.violation.create({
      data: {
        vehicleId: vehicle.id,
        type: data.type,
        severity: data.severity ?? ViolationSeverity.MEDIUM,
        description: data.description ?? null,
        location: data.location ?? null,
        parkingZoneId: data.parkingZoneId ?? null,
        photoUrls: data.photoUrls ?? [],
        evidenceNotes: data.evidenceNotes ?? null,
        fineAmount: data.fineAmount ?? null,
        loggedById: userId,
      },
      include: {
        vehicle: true,
        loggedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update vehicle violation count and risk score
    const severityScore = data.severity ?? ViolationSeverity.MEDIUM;
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        violationCount: { increment: 1 },
        riskScore: {
          increment:
            severityScore === ViolationSeverity.CRITICAL
              ? 25
              : severityScore === ViolationSeverity.HIGH
                ? 15
                : severityScore === ViolationSeverity.MEDIUM
                  ? 10
                  : 5,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LOG_VIOLATION',
        entityType: 'Violation',
        entityId: violation.id,
        userId: userId,
        details: {
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          type: data.type,
          severity: severityScore,
        },
      },
    });

    return NextResponse.json({ violation }, { status: 201 });
  } catch (error) {
    console.error('Error creating violation:', error);
    return NextResponse.json({ error: 'Failed to create violation' }, { status: 500 });
  }
}

// PATCH /api/violations - Update a violation (requires violations:update or violations:resolve permission)
export async function PATCH(request: NextRequest) {
  const authResult = await requirePermission(['violations:update', 'violations:resolve']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId } = authResult.request;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Violation ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateViolationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingViolation = await prisma.violation.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingViolation) {
      return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.isResolved !== undefined) {
      updateData.isResolved = parsed.data.isResolved;
      if (parsed.data.isResolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = userId;
      }
    }

    if (parsed.data.resolution !== undefined) {
      updateData.resolution = parsed.data.resolution;
    }

    if (parsed.data.isPaid !== undefined) {
      updateData.isPaid = parsed.data.isPaid;
    }

    if (parsed.data.severity !== undefined) {
      updateData.severity = parsed.data.severity;
    }

    const violation = await prisma.violation.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: true,
        loggedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: parsed.data.isResolved ? 'RESOLVE_VIOLATION' : 'UPDATE',
        entityType: 'Violation',
        entityId: id,
        userId: userId,
        details: { changes: parsed.data },
      },
    });

    return NextResponse.json({ violation });
  } catch (error) {
    console.error('Error updating violation:', error);
    return NextResponse.json({ error: 'Failed to update violation' }, { status: 500 });
  }
}
