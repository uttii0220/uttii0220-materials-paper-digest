import { prisma } from '../prisma';
import { sendDigestEmail } from '../digest-sender';

async function main() {
  console.log('[run-digest] Starting...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    include: { profile: true },
  });

  for (const user of users) {
    if (!user.email) continue;

    const recommendations = await prisma.recommendation.findMany({
      where: { userId: user.id, date: today },
      include: { paper: true },
      orderBy: { rank: 'asc' },
      take: 10,
    });

    if (recommendations.length === 0) {
      console.log(`[run-digest] No recommendations for ${user.email}`);
      continue;
    }

    const sent = await sendDigestEmail({
      to: user.email,
      userName: user.name || 'ユーザー',
      date: today,
      recommendations,
    });

    await prisma.dailyDigest.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: {
        userId: user.id,
        date: today,
        status: sent ? 'SENT' : 'FAILED',
        emailTo: user.email,
        paperCount: recommendations.length,
        emailSentAt: sent ? new Date() : undefined,
      },
      update: {
        status: sent ? 'SENT' : 'FAILED',
        emailSentAt: sent ? new Date() : undefined,
      },
    });

    console.log(`[run-digest] ${sent ? 'Sent' : 'Failed'} digest to ${user.email}`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[run-digest] Fatal:', err);
  process.exit(1);
});
