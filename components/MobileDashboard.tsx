"use client";
import { useState, useEffect } from "react";
import { AVAILABLE_INDICATORS, DEFAULT_INDICATORS } from "@/lib/indicators";
import IndicatorChart from "./IndicatorChart";
import AddIndicatorModal from "./AddIndicatorModal";
import Clock from "./Clock";

const STORAGE_IDS_KEY = "macro-dashboard-indicators";

export default function MobileDashboard() {
  const [indicatorIds, setIndicatorIds] = useState<string[]>(DEFAULT_INDICATORS);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_IDS_KEY);
      if (saved) setIndicatorIds(JSON.parse(saved));
    } catch {}
    setMounted(true);
  }, []);

  const addIndicator = (id: string) => {
    const newIds = [...indicatorIds, id];
    setIndicatorIds(newIds);
    localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(newIds));
    setShowModal(false);
  };

  const removeIndicator = (id: string) => {
    const newIds = indicatorIds.filter((i) => i !== id);
    setIndicatorIds(newIds);
    localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(newIds));
  };

  const indicators = indicatorIds
    .map((id) => AVAILABLE_INDICATORS.find((ind) => ind.id === id))
    .filter(Boolean) as typeof AVAILABLE_INDICATORS;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold tracking-tight">Macro Dashboard</h1>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            + 지표 추가
          </button>
        </div>
        <div className="mt-1">
          <Clock />
        </div>
      </header>

      <main className="p-3 flex flex-col gap-3">
        {indicators.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-gray-500 text-sm">표시할 지표가 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              지표 추가하기
            </button>
          </div>
        ) : (
          indicators.map((ind) => (
            <div
              key={ind.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col"
              style={{ height: 220 }}
            >
              <div className="flex justify-end mb-1 flex-shrink-0">
                <button
                  onClick={() => removeIndicator(ind.id)}
                  className="text-gray-600 hover:text-gray-300 text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <IndicatorChart indicator={ind} />
            </div>
          ))
        )}
      </main>

      {showModal && (
        <AddIndicatorModal
          activeIds={indicatorIds}
          onAdd={addIndicator}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
