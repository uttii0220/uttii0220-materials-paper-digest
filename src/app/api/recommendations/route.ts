import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  const targetDate = dateParam ? new Date(dateParam) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const recommendations = await prisma.recommendation.findMany({
    where: {
      userId: session.user.id,
      date: targetDate,
    },
    include: {
      paper: {
        include: { sources: true },
      },
    },
    orderBy: { rank: 'asc' },
  });

  return NextResponse.json({ recommendations });
}
