import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const run = await prisma.recommendationRun.create({
    data: { type: 'WEEKLY_RETRAIN', status: 'RUNNING' },
  });

  try {
    const users = await prisma.user.findMany({
      include: { keywords: { where: { isActive: true } } },
    });

    for (const user of users) {
      const actions = await prisma.userPaperAction.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: { paper: true },
      });

      const ideaAndBookmarkPapers = actions
        .filter(a => a.action === 'IDEA_GENERATED' || a.action === 'BOOKMARKED')
        .map(a => a.paper);

      const notInterestedPapers = actions
        .filter(a => a.action === 'NOT_INTERESTED')
        .map(a => a.paper);

      // Boost keywords appearing in idea/bookmark papers; reduce for not-interested papers
      for (const kw of user.keywords) {
        let weightDelta = 0;

        for (const paper of ideaAndBookmarkPapers) {
          const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
          const termsToCheck = [kw.term, ...(kw.synonyms || [])];
          if (termsToCheck.some(t => text.includes(t.toLowerCase()))) {
            weightDelta += 0.05;
          }
        }

        for (const paper of notInterestedPapers) {
          const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
          const termsToCheck = [kw.term, ...(kw.synonyms || [])];
          if (termsToCheck.some(t => text.includes(t.toLowerCase()))) {
            weightDelta -= 0.02;
          }
        }

        if (weightDelta !== 0) {
          const newWeight = Math.max(0.1, Math.min(1.0, kw.weight + weightDelta));
          await prisma.userKeyword.update({
            where: { id: kw.id },
            data: { weight: newWeight },
          });
        }
      }
    }

    await prisma.recommendationRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await prisma.recommendationRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: String(error), completedAt: new Date() },
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
