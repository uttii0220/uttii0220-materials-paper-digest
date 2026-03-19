import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { PaperCard } from "@/components/paper-card";
import { seedKeywordsForUser } from "@/lib/jobs/seed-keywords";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Auto-seed keywords for new users
  const keywordCount = await prisma.userKeyword.count({
    where: { userId: session.user.id },
  });
  if (keywordCount === 0) {
    await seedKeywordsForUser(session.user.id);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recommendations = await prisma.recommendation.findMany({
    where: { userId: session.user.id, date: today },
    include: {
      paper: { include: { sources: true } },
    },
    orderBy: { rank: "asc" },
    take: 10,
  });

  const userActions = await prisma.userPaperAction.findMany({
    where: { userId: session.user.id },
    select: { paperId: true, action: true },
  });

  const actionsByPaper = userActions.reduce(
    (acc, a) => {
      if (!acc[a.paperId]) acc[a.paperId] = [];
      acc[a.paperId].push(a.action);
      return acc;
    },
    {} as Record<string, string[]>
  );

  // KPI
  const ideaCount = await prisma.userPaperAction.count({
    where: { userId: session.user.id, action: "IDEA_GENERATED" },
  });

  const dateStr = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(today);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              本日の推薦論文
            </h1>
            <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-600">{ideaCount}</div>
            <div className="text-xs text-gray-500">アイデア件数（KPI）</div>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              本日の推薦論文がまだありません
            </h2>
            <p className="text-sm text-gray-500">
              論文収集ジョブが実行されると推薦が表示されます。
              <br />
              手動で実行する場合は以下のコマンドを使用してください：
              <br />
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                npm run job:collect
              </code>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <PaperCard
                key={rec.id}
                paper={rec.paper}
                rank={rec.rank}
                reasonTemplate={rec.reasonTemplate}
                initialActions={actionsByPaper[rec.paper.id] || []}
                showReason
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
