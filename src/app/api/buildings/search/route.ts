import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/buildings/search?q=<query> - Public building name search
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ buildings: [] });
  }

  try {
    const buildings = await prisma.building.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return NextResponse.json({ buildings });
  } catch (error) {
    console.error('Building search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
