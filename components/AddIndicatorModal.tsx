"use client";
import { useState } from "react";
import { AVAILABLE_INDICATORS, CATEGORY_LABELS, Indicator } from "@/lib/indicators";

interface Props {
  activeIds: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}

export default function AddIndicatorModal({ activeIds, onAdd, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Indicator["category"] | "all">("all");

  const filtered = AVAILABLE_INDICATORS.filter((ind) => {
    const matchSearch =
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "all" || ind.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const categories: Array<Indicator["category"] | "all"> = ["all", "market", "credit", "macro", "commodity"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">지표 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-3">
          <input
            type="text"
            placeholder="지표 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
            autoFocus
          />

          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedCategory === cat
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {cat === "all" ? "전체" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto max-h-80 px-4 pb-4 space-y-2">
          {filtered.map((ind) => {
            const isActive = activeIds.includes(ind.id);
            return (
              <div
                key={ind.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isActive
                    ? "border-gray-700 opacity-50 cursor-not-allowed"
                    : "border-gray-700 hover:border-gray-500 cursor-pointer hover:bg-gray-800"
                }`}
                onClick={() => !isActive && onAdd(ind.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ind.color }} />
                  <div>
                    <p className="text-sm text-white">{ind.name}</p>
                    <p className="text-xs text-gray-400">{ind.description}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {isActive ? "추가됨" : CATEGORY_LABELS[ind.category]}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
