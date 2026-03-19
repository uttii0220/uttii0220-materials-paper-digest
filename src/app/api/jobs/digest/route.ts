import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDigestEmail } from '@/lib/digest-sender';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    include: { profile: true },
  });

  const results = [];

  for (const user of users) {
    if (!user.email) continue;

    const recommendations = await prisma.recommendation.findMany({
      where: { userId: user.id, date: today },
      include: { paper: true },
      orderBy: { rank: 'asc' },
      take: 10,
    });

    if (recommendations.length === 0) {
      results.push({ userId: user.id, status: 'skipped', reason: 'no recommendations' });
      continue;
    }

    const digest = await prisma.dailyDigest.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: { userId: user.id, date: today, status: 'PENDING', emailTo: user.email, paperCount: recommendations.length },
      update: { paperCount: recommendations.length },
    });

    const sent = await sendDigestEmail({
      to: user.email,
      userName: user.name || 'ユーザー',
      date: today,
      recommendations,
    });

    await prisma.dailyDigest.update({
      where: { id: digest.id },
      data: {
        status: sent ? 'SENT' : 'FAILED',
        emailSentAt: sent ? new Date() : undefined,
      },
    });

    results.push({ userId: user.id, status: sent ? 'sent' : 'failed' });
  }

  return NextResponse.json({ results });
}
