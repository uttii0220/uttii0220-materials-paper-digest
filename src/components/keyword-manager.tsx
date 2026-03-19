"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface Keyword {
  id: string;
  term: string;
  type: string;
  weight: number;
  synonyms: string[];
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  CORE: "コア",
  SUBFIELD: "サブ分野",
  EXCLUDE: "除外",
};

const TYPE_COLORS: Record<string, string> = {
  CORE: "bg-blue-100 text-blue-700",
  SUBFIELD: "bg-purple-100 text-purple-700",
  EXCLUDE: "bg-red-100 text-red-700",
};

export function KeywordManager({ initialKeywords }: { initialKeywords: Keyword[] }) {
  const [keywords, setKeywords] = useState<Keyword[]>(initialKeywords);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Keyword>>({});
  const [newForm, setNewForm] = useState({ term: "", type: "CORE", weight: 1.0, synonyms: "" });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const startEdit = (kw: Keyword) => {
    setEditingId(kw.id);
    setEditForm({ term: kw.term, type: kw.type, weight: kw.weight, synonyms: kw.synonyms, isActive: kw.isActive });
  };

  const saveEdit = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keywords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, synonyms: editForm.synonyms }),
      });
      const data = await res.json();
      setKeywords(kws => kws.map(k => k.id === id ? { ...k, ...data.keyword } : k));
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteKeyword = async (id: string) => {
    if (!confirm("このキーワードを削除しますか？")) return;
    setLoading(true);
    try {
      await fetch(`/api/keywords/${id}`, { method: "DELETE" });
      setKeywords(kws => kws.filter(k => k.id !== id));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (kw: Keyword) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keywords/${kw.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !kw.isActive }),
      });
      const data = await res.json();
      setKeywords(kws => kws.map(k => k.id === kw.id ? { ...k, ...data.keyword } : k));
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newForm.term.trim()) return;
    setLoading(true);
    try {
      const synonyms = newForm.synonyms.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: newForm.term, type: newForm.type, weight: newForm.weight, synonyms }),
      });
      const data = await res.json();
      if (data.keyword) {
        setKeywords(kws => [...kws, data.keyword]);
        setNewForm({ term: "", type: "CORE", weight: 1.0, synonyms: "" });
        setShowNew(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">キーワード管理</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">新しいキーワード</h3>
          <div className="grid gap-3">
            <input
              type="text"
              placeholder="キーワード（例：格子欠陥）"
              value={newForm.term}
              onChange={e => setNewForm(f => ({ ...f, term: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <select
                value={newForm.type}
                onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CORE">コア</option>
                <option value="SUBFIELD">サブ分野</option>
                <option value="EXCLUDE">除外</option>
              </select>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={newForm.weight}
                onChange={e => setNewForm(f => ({ ...f, weight: parseFloat(e.target.value) }))}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="重み"
              />
            </div>
            <input
              type="text"
              placeholder="同義語（カンマ区切り）: grain boundary, grain boundaries"
              value={newForm.synonyms}
              onChange={e => setNewForm(f => ({ ...f, synonyms: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={addKeyword}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                追加
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {keywords.map(kw => (
          <div
            key={kw.id}
            className={`flex items-center gap-3 p-3 border rounded-xl transition-opacity ${
              kw.isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
            }`}
          >
            {editingId === kw.id ? (
              <div className="flex-1 grid gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.term || ""}
                    onChange={e => setEditForm(f => ({ ...f, term: e.target.value }))}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                  <select
                    value={editForm.type || "CORE"}
                    onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                  >
                    <option value="CORE">コア</option>
                    <option value="SUBFIELD">サブ分野</option>
                    <option value="EXCLUDE">除外</option>
                  </select>
                  <input
                    type="number"
                    min="0" max="1" step="0.1"
                    value={editForm.weight || 1}
                    onChange={e => setEditForm(f => ({ ...f, weight: parseFloat(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(kw.id)} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggleActive(kw)}
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                    kw.isActive ? "bg-blue-500 border-blue-500" : "border-gray-300"
                  }`}
                />
                <span className="flex-1 text-sm font-medium text-gray-800">{kw.term}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[kw.type] || ""}`}>
                  {TYPE_LABELS[kw.type] || kw.type}
                </span>
                <span className="text-xs text-gray-400">重み: {kw.weight.toFixed(1)}</span>
                {kw.synonyms.length > 0 && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    同義語: {kw.synonyms.slice(0, 2).join(", ")}
                    {kw.synonyms.length > 2 ? "..." : ""}
                  </span>
                )}
                <div className="flex gap-1">
                  <button onClick={() => startEdit(kw)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteKeyword(kw.id)} disabled={loading} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
