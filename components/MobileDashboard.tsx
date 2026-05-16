"use client";
import { useState, useEffect } from "react";
import { AVAILABLE_INDICATORS, DEFAULT_INDICATORS, Indicator } from "@/lib/indicators";
import IndicatorChart from "./IndicatorChart";
import AddIndicatorModal from "./AddIndicatorModal";
import AddStockModal from "./AddStockModal";
import Clock from "./Clock";
import NavBar from "./NavBar";

const STORAGE_IDS_KEY = "macro-dashboard-indicators";
const STORAGE_STOCKS_KEY = "macro-dashboard-stocks";

const STOCK_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ec4899",
  "#14b8a6", "#f97316", "#a855f7", "#22c55e",
  "#3b82f6", "#84cc16",
];

function makeStockIndicator(ticker: string, colorIndex: number): Indicator {
  return {
    id: `stock:${ticker}`,
    name: ticker,
    description: `${ticker} (Yahoo Finance)`,
    yahooSymbol: ticker,
    unit: "USD",
    category: "market",
    chartType: "line",
    color: STOCK_COLORS[colorIndex % STOCK_COLORS.length],
  };
}

export default function MobileDashboard() {
  const [indicatorIds, setIndicatorIds] = useState<string[]>(DEFAULT_INDICATORS);
  const [stockTickers, setStockTickers] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_IDS_KEY);
      if (saved) setIndicatorIds(JSON.parse(saved));
      const savedStocks = localStorage.getItem(STORAGE_STOCKS_KEY);
      if (savedStocks) {
        const stocks = JSON.parse(savedStocks) as string[];
        if (Array.isArray(stocks)) setStockTickers(stocks);
      }
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

  const addStock = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t || stockTickers.includes(t)) return;
    const newTickers = [...stockTickers, t];
    setStockTickers(newTickers);
    localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(newTickers));
    setShowStockModal(false);
  };

  const removeStock = (ticker: string) => {
    const newTickers = stockTickers.filter((t) => t !== ticker);
    setStockTickers(newTickers);
    localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(newTickers));
  };

  const indicators = indicatorIds
    .map((id) => AVAILABLE_INDICATORS.find((ind) => ind.id === id))
    .filter(Boolean) as typeof AVAILABLE_INDICATORS;

  const stockIndicators = stockTickers.map((ticker, i) => makeStockIndicator(ticker, i));

  type CardItem =
    | { kind: "indicator"; indicator: Indicator }
    | { kind: "stock"; indicator: Indicator; ticker: string };

  const allItems: CardItem[] = [
    ...indicators.map((ind) => ({ kind: "indicator" as const, indicator: ind })),
    ...stockIndicators.map((ind, i) => ({
      kind: "stock" as const,
      indicator: ind,
      ticker: stockTickers[i],
    })),
  ];

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowStockModal(true)}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg font-medium"
            >
              + 종목
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg font-medium"
            >
              + 지표
            </button>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <Clock />
          <NavBar mobile />
        </div>
      </header>

      <main className="p-3 flex flex-col gap-3">
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-gray-500 text-sm">표시할 지표가 없습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStockModal(true)}
                className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                종목 추가
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                지표 추가
              </button>
            </div>
          </div>
        ) : (
          allItems.map(({ indicator: ind, kind, ...rest }) => {
            const ticker = kind === "stock" ? (rest as { ticker: string }).ticker : "";
            return (
              <div
                key={ind.id}
                className={`bg-gray-900 border rounded-xl p-3 flex flex-col ${
                  kind === "stock" ? "border-gray-700" : "border-gray-800"
                }`}
                style={{ height: 220 }}
              >
                <div className="flex justify-between items-center mb-1 flex-shrink-0">
                  {kind === "stock" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-500 border border-emerald-800/50 leading-none">
                      주식
                    </span>
                  )}
                  {kind === "indicator" && <span />}
                  <button
                    onClick={() =>
                      kind === "stock" ? removeStock(ticker) : removeIndicator(ind.id)
                    }
                    className="text-gray-600 hover:text-gray-300 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <IndicatorChart indicator={ind} />
              </div>
            );
          })
        )}
      </main>

      {showModal && (
        <AddIndicatorModal
          activeIds={indicatorIds}
          onAdd={addIndicator}
          onClose={() => setShowModal(false)}
        />
      )}

      {showStockModal && (
        <AddStockModal
          activeTickers={stockTickers}
          onAdd={addStock}
          onClose={() => setShowStockModal(false)}
        />
      )}
    </div>
  );
}
