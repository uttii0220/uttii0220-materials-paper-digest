import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const year = searchParams.get('year');
  const source = searchParams.get('source');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { abstract: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (year) {
    where.year = parseInt(year);
  }

  if (source) {
    where.sources = { some: { source } };
  }

  const [papers, total] = await Promise.all([
    prisma.paper.findMany({
      where,
      include: { sources: true },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.paper.count({ where }),
  ]);

  return NextResponse.json({ papers, total, page, limit });
}
