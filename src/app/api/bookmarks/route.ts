import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookmarks = await prisma.userPaperAction.findMany({
    where: {
      userId: session.user.id,
      action: 'BOOKMARKED',
    },
    include: {
      paper: { include: { sources: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ bookmarks });
}
