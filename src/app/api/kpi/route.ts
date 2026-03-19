import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [totalIdeas, totalBookmarks, totalRead, recentIdeas] = await Promise.all([
    prisma.userPaperAction.count({
      where: { userId: session.user.id, action: 'IDEA_GENERATED' },
    }),
    prisma.userPaperAction.count({
      where: { userId: session.user.id, action: 'BOOKMARKED' },
    }),
    prisma.userPaperAction.count({
      where: { userId: session.user.id, action: 'READ' },
    }),
    prisma.userPaperAction.findMany({
      where: { userId: session.user.id, action: 'IDEA_GENERATED' },
      include: { paper: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    kpi: {
      totalIdeas,
      totalBookmarks,
      totalRead,
    },
    recentIdeas,
  });
}
