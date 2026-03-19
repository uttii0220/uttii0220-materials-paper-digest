import { prisma } from '../prisma';

async function main() {
  console.log('[run-retrain] Starting weekly retrain...');

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
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        include: { paper: true },
      });

      const positiveActions = actions.filter(
        a => a.action === 'IDEA_GENERATED' || a.action === 'BOOKMARKED'
      );
      const negativeActions = actions.filter(a => a.action === 'NOT_INTERESTED');

      for (const kw of user.keywords) {
        let delta = 0;
        const terms = [kw.term, ...(kw.synonyms || [])].map(t => t.toLowerCase());

        for (const action of positiveActions) {
          const text = `${action.paper.title} ${action.paper.abstract || ''}`.toLowerCase();
          if (terms.some(t => text.includes(t))) delta += 0.05;
        }

        for (const action of negativeActions) {
          const text = `${action.paper.title} ${action.paper.abstract || ''}`.toLowerCase();
          if (terms.some(t => text.includes(t))) delta -= 0.02;
        }

        if (delta !== 0) {
          const newWeight = Math.max(0.1, Math.min(1.0, kw.weight + delta));
          await prisma.userKeyword.update({
            where: { id: kw.id },
            data: { weight: newWeight },
          });
          console.log(`[run-retrain] Updated "${kw.term}" weight: ${kw.weight.toFixed(2)} → ${newWeight.toFixed(2)}`);
        }
      }
    }

    await prisma.recommendationRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    console.log('[run-retrain] Done!');
  } catch (err) {
    await prisma.recommendationRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: String(err), completedAt: new Date() },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[run-retrain] Fatal:', err);
  process.exit(1);
});
