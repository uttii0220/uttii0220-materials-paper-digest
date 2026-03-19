import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const KeywordSchema = z.object({
  term: z.string().min(1).max(100),
  type: z.enum(['CORE', 'SUBFIELD', 'EXCLUDE']).default('CORE'),
  weight: z.number().min(0).max(1).default(1.0),
  synonyms: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keywords = await prisma.userKeyword.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: 'asc' }, { term: 'asc' }],
  });

  return NextResponse.json({ keywords });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = KeywordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
  }

  const keyword = await prisma.userKeyword.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json({ keyword }, { status: 201 });
}
