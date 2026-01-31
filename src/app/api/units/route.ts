import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/units - Get units for a building (public for registration form)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buildingSlug = searchParams.get('buildingSlug');

  if (!buildingSlug) {
    return NextResponse.json({ error: 'Building slug is required' }, { status: 400 });
  }

  try {
    const building = await prisma.building.findUnique({
      where: { slug: buildingSlug, isActive: true, deletedAt: null },
    });

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    const units = await prisma.unit.findMany({
      where: {
        buildingId: building.id,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        unitNumber: true,
        floor: true,
        section: true,
      },
      orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
    });

    return NextResponse.json({ units, building: { id: building.id, name: building.name } });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}
