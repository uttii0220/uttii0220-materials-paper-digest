import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { KeywordManager } from "@/components/keyword-manager";
import { KpiPanel } from "@/components/kpi-panel";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const keywords = await prisma.userKeyword.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { term: "asc" }],
  });

  const kpi = await prisma.userPaperAction.groupBy({
    by: ["action"],
    where: { userId: session.user.id },
    _count: true,
  });

  const kpiMap = Object.fromEntries(kpi.map(k => [k.action, k._count]));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

        <div className="grid gap-6">
          <KpiPanel kpiMap={kpiMap} />
          <KeywordManager initialKeywords={keywords} />
        </div>
      </main>
    </div>
  );
}
