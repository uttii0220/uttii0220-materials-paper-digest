import { prisma } from '@/lib/prisma';
import { ArxivCollector } from '@/lib/collectors/arxiv';
import { CrossrefCollector } from '@/lib/collectors/crossref';
import { PubMedCollector } from '@/lib/collectors/pubmed';
import { WebOfScienceCollector, ScopusCollector } from '@/lib/collectors/mock';
import { deduplicatePapers } from '@/lib/deduplicator';
import { rankPapers, DEFAULT_WEIGHTS } from '@/lib/ranker';
import { generateJapaneseSummary } from '@/lib/summarizer';
import { CollectedPaper } from '@/lib/collectors/types';

export async function runDailyCollectAndRecommend(): Promise<void> {
  const run = await prisma.recommendationRun.create({
    data: { type: 'DAILY_COLLECT', status: 'RUNNING' },
  });

  let log = '';
  const logLine = (msg: string) => {
    console.log(msg);
    log += msg + '\n';
  };

  try {
    logLine('[Job] Starting daily collect & recommend');

    const users = await prisma.user.findMany({
      include: {
        keywords: { where: { isActive: true } },
        profile: true,
      },
    });

    logLine(`[Job] Processing ${users.length} users`);

    for (const user of users) {
      const keywords = user.keywords;
      if (keywords.length === 0) {
        logLine(`[Job] User ${user.id} has no keywords, skipping`);
        continue;
      }

      const keywordTerms = keywords
        .filter(k => k.type !== 'EXCLUDE')
        .map(k => k.term);

      logLine(
        `[Job] Collecting papers for user ${user.email} with ${keywordTerms.length} keywords`
      );

      const collectors = [
        new ArxivCollector(),
        new CrossrefCollector(),
        new PubMedCollector(),
        new WebOfScienceCollector(),
        new ScopusCollector(),
      ];

      const allCollected: CollectedPaper[] = [];

      for (const collector of collectors) {
        try {
          logLine(`[Job] Collecting from ${collector.name}...`);
          const papers = await collector.collect(keywordTerms);
          logLine(`[Job] ${collector.name}: ${papers.length} papers`);
          allCollected.push(...papers);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logLine(`[Job] ${collector.name} failed: ${msg}`);
        }
      }

      const deduped = deduplicatePapers(allCollected);
      logLine(
        `[Job] Deduped: ${allCollected.length} -> ${deduped.length} papers`
      );

      const savedPapers: string[] = [];

      for (const group of deduped) {
        try {
          const primary = group.primary;
          const titleNorm = primary.title
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

          let paper = primary.doi
            ? await prisma.paper.findUnique({ where: { doi: primary.doi } })
            : await prisma.paper.findFirst({ where: { titleNorm } });

          if (!paper) {
            paper = await prisma.paper.create({
              data: {
                doi: primary.doi,
                title: primary.title,
                titleNorm,
                authors: primary.authors,
                abstract: primary.abstract,
                journal: primary.journal,
                publishedAt: primary.publishedAt,
                year: primary.year,
                pdfUrl: primary.pdfUrl,
                sourceCount: group.duplicates.length + 1,
              },
            });

            if (primary.abstract && process.env.OPENAI_API_KEY) {
              try {
                const { summary, shortSummary } =
                  await generateJapaneseSummary(
                    primary.title,
                    primary.abstract
                  );
                await prisma.paper.update({
                  where: { id: paper.id },
                  data: {
                    summaryJa: summary,
                    shortSummaryJa: shortSummary,
                  },
                });
              } catch {
                logLine(
                  `[Job] Summary generation failed for paper ${paper.id}`
                );
              }
            }
          }

          const allSources = [primary, ...group.duplicates];
          for (const src of allSources) {
            await prisma.paperSource.upsert({
              where: {
                source_externalId: {
                  source: src.source,
                  externalId: src.externalId,
                },
              },
              create: {
                paperId: paper.id,
                source: src.source,
                externalId: src.externalId,
                url: src.url,
              },
              update: { url: src.url },
            });
          }

          savedPapers.push(paper.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logLine(`[Job] Error saving paper: ${msg}`);
        }
      }

      logLine(`[Job] Saved ${savedPapers.length} papers`);

      const papers = await prisma.paper.findMany({
        where: { id: { in: savedPapers } },
        select: {
          id: true,
          title: true,
          abstract: true,
          publishedAt: true,
        },
      });

      const userActions = await prisma.userPaperAction.findMany({
        where: { userId: user.id },
        select: { paperId: true, action: true },
      });

      const ranked = rankPapers(
        papers,
        keywords,
        userActions,
        DEFAULT_WEIGHTS,
        10
      );

      logLine(
        `[Job] Ranked ${ranked.length} papers for user ${user.email}`
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < ranked.length; i++) {
        const score = ranked[i];
        await prisma.recommendation.upsert({
          where: {
            userId_paperId_date: {
              userId: user.id,
              paperId: score.paperId,
              date: today,
            },
          },
          create: {
            userId: user.id,
            paperId: score.paperId,
            runId: run.id,
            date: today,
            rank: i + 1,
            keywordMatchScore: score.keywordMatchScore,
            recencyScore: score.recencyScore,
            feedbackScore: score.feedbackScore,
            ideaSignalScore: score.ideaSignalScore,
            totalScore: score.totalScore,
            matchedKeywords: score.matchedKeywords,
            reasonTemplate: score.reasonTemplate,
          },
          update: {
            rank: i + 1,
            totalScore: score.totalScore,
            reasonTemplate: score.reasonTemplate,
          },
        });
      }
    }

    await prisma.recommendationRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        log,
      },
    });

    logLine('[Job] Done!');
  } catch (error) {
    logLine(`[Job] Fatal error: ${error}`);
    await prisma.recommendationRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: String(error),
        log,
      },
    });
    throw error;
  }
}
