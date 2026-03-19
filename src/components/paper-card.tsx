"use client";

import { useState } from "react";
import { BookmarkIcon, EyeIcon, XCircleIcon, LightbulbIcon } from "lucide-react";

interface Paper {
  id: string;
  title: string;
  authors: string[];
  journal?: string | null;
  year?: number | null;
  doi?: string | null;
  pdfUrl?: string | null;
  summaryJa?: string | null;
  shortSummaryJa?: string | null;
  abstract?: string | null;
  sources: { source: string; url?: string | null }[];
}

interface PaperCardProps {
  paper: Paper;
  rank?: number;
  reasonTemplate?: string | null;
  initialActions?: string[];
  showReason?: boolean;
}

export function PaperCard({
  paper,
  rank,
  reasonTemplate,
  initialActions = [],
  showReason = true,
}: PaperCardProps) {
  const [actions, setActions] = useState<Set<string>>(new Set(initialActions));
  const [loading, setLoading] = useState<string | null>(null);

  const toggleAction = async (action: string) => {
    setLoading(action);
    try {
      const hasAction = actions.has(action);
      const method = hasAction ? "DELETE" : "POST";

      await fetch("/api/actions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: paper.id, action }),
      });

      setActions(prev => {
        const next = new Set(prev);
        if (hasAction) {
          next.delete(action);
        } else {
          next.add(action);
        }
        return next;
      });
    } finally {
      setLoading(null);
    }
  };

  const authors = paper.authors.slice(0, 3).join(", ") +
    (paper.authors.length > 3 ? ` et al.` : "");

  const sourceUrl = paper.sources[0]?.url || (paper.doi ? `https://doi.org/${paper.doi}` : undefined);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {rank && (
            <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 rounded px-2 py-0.5 mb-2">
              #{rank}
            </span>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {paper.sources.map(s => (
              <span
                key={s.source}
                className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5"
              >
                {s.source}
              </span>
            ))}
            {paper.year && (
              <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                {paper.year}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1">
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">
                {paper.title}
              </a>
            ) : paper.title}
          </h3>

          {authors && (
            <p className="text-sm text-gray-500 mb-1">{authors}</p>
          )}

          {paper.journal && (
            <p className="text-sm text-gray-400 mb-2">{paper.journal}</p>
          )}

          {showReason && reasonTemplate && (
            <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-3">
              <span className="shrink-0 mt-0.5">📌</span>
              <span>{reasonTemplate}</span>
            </div>
          )}

          {paper.shortSummaryJa && (
            <p className="text-sm font-medium text-gray-800 mb-2">{paper.shortSummaryJa}</p>
          )}

          {paper.summaryJa && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{paper.summaryJa}</p>
          )}

          {!paper.summaryJa && paper.abstract && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{paper.abstract}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
            {paper.doi && (
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600"
              >
                DOI: {paper.doi}
              </a>
            )}
            {paper.pdfUrl && (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                PDF
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <ActionButton
          icon={EyeIcon}
          label="既読"
          active={actions.has("READ")}
          loading={loading === "READ"}
          onClick={() => toggleAction("READ")}
          activeClass="text-green-700 bg-green-50"
        />
        <ActionButton
          icon={BookmarkIcon}
          label="ブックマーク"
          active={actions.has("BOOKMARKED")}
          loading={loading === "BOOKMARKED"}
          onClick={() => toggleAction("BOOKMARKED")}
          activeClass="text-blue-700 bg-blue-50"
        />
        <ActionButton
          icon={XCircleIcon}
          label="興味なし"
          active={actions.has("NOT_INTERESTED")}
          loading={loading === "NOT_INTERESTED"}
          onClick={() => toggleAction("NOT_INTERESTED")}
          activeClass="text-red-700 bg-red-50"
        />
        <ActionButton
          icon={LightbulbIcon}
          label="アイデアにつながった"
          active={actions.has("IDEA_GENERATED")}
          loading={loading === "IDEA_GENERATED"}
          onClick={() => toggleAction("IDEA_GENERATED")}
          activeClass="text-yellow-700 bg-yellow-50"
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active,
  loading,
  onClick,
  activeClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  loading: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
        active
          ? `${activeClass} border-current`
          : "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
      } disabled:opacity-50`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:block">{label}</span>
    </button>
  );
}
