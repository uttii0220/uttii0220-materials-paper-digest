export function KpiPanel({ kpiMap }: { kpiMap: Record<string, number> }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">KPIサマリ</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          emoji="💡"
          label="アイデアにつながった"
          value={kpiMap["IDEA_GENERATED"] || 0}
          accent="yellow"
        />
        <StatCard
          emoji="🔖"
          label="ブックマーク"
          value={kpiMap["BOOKMARKED"] || 0}
          accent="blue"
        />
        <StatCard
          emoji="✅"
          label="既読"
          value={kpiMap["READ"] || 0}
          accent="green"
        />
        <StatCard
          emoji="❌"
          label="興味なし"
          value={kpiMap["NOT_INTERESTED"] || 0}
          accent="red"
        />
      </div>
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  accent,
}: {
  emoji: string;
  label: string;
  value: number;
  accent: string;
}) {
  const bg: Record<string, string> = {
    yellow: "bg-yellow-50 border-yellow-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
  };
  const text: Record<string, string> = {
    yellow: "text-yellow-700",
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
  };

  return (
    <div className={`border rounded-xl p-4 text-center ${bg[accent]}`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className={`text-2xl font-bold ${text[accent]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
