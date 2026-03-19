"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { PaperCard } from "@/components/paper-card";
import { Search } from "lucide-react";

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

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      if (year) params.set("year", year);
      if (source) params.set("source", source);

      const res = await fetch(`/api/papers?${params}`);
      const data = await res.json();
      setPapers(data.papers || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [query, year, source, page]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">論文一覧・検索</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="キーワードで検索..."
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={year}
              onChange={e => { setYear(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">年度: すべて</option>
              {years.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select
              value={source}
              onChange={e => { setSource(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ソース: すべて</option>
              <option value="ARXIV">arXiv</option>
              <option value="CROSSREF">Crossref</option>
              <option value="PUBMED">PubMed</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">{total}件の論文</p>

        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : papers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">論文が見つかりません</div>
        ) : (
          <>
            <div className="space-y-4">
              {papers.map(paper => (
                <PaperCard key={paper.id} paper={paper} showReason={false} />
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {page > 1 && (
                <button
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  前のページ
                </button>
              )}
              {papers.length === 20 && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  次のページ
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
