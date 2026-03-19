import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ActionSchema = z.object({
  paperId: z.string(),
  action: z.enum(['READ', 'NOT_INTERESTED', 'BOOKMARKED', 'IDEA_GENERATED']),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { paperId, action } = parsed.data;

  const result = await prisma.userPaperAction.upsert({
    where: {
      userId_paperId_action: {
        userId: session.user.id,
        paperId,
        action,
      },
    },
    create: {
      userId: session.user.id,
      paperId,
      action,
    },
    update: {},
  });

  return NextResponse.json({ action: result });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { paperId, action } = parsed.data;

  await prisma.userPaperAction.deleteMany({
    where: {
      userId: session.user.id,
      paperId,
      action,
    },
  });

  return NextResponse.json({ success: true });
}
