import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const paper = await prisma.paper.findUnique({
    where: { id },
    include: { sources: true },
  });

  if (!paper) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userActions = await prisma.userPaperAction.findMany({
    where: { userId: session.user.id, paperId: id },
  });

  return NextResponse.json({ paper, userActions });
}
