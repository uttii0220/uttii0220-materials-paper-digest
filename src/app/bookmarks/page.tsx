import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { PaperCard } from "@/components/paper-card";

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bookmarks = await prisma.userPaperAction.findMany({
    where: { userId: session.user.id, action: "BOOKMARKED" },
    include: {
      paper: { include: { sources: true } },
    },
    orderBy: { createdAt: "desc" },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          ブックマーク ({bookmarks.length}件)
        </h1>

        {bookmarks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">🔖</div>
            <p className="text-gray-500">ブックマークした論文がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map(({ paper }) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                initialActions={actionsByPaper[paper.id] || []}
                showReason={false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
