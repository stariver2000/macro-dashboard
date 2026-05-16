"use client";
import { useState, useCallback, useEffect } from "react";
import { GridLayout, LayoutItem, Layout, verticalCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { AVAILABLE_INDICATORS, DEFAULT_INDICATORS, Indicator } from "@/lib/indicators";
import IndicatorChart from "./IndicatorChart";
import AddIndicatorModal from "./AddIndicatorModal";
import AddStockModal from "./AddStockModal";
import AnomalyPanel from "./AnomalyPanel";
import Clock from "./Clock";
import NavBar from "./NavBar";

const COLS = 12;
const ITEM_W = 4;
const ITEM_H = 7;
const COLS_PER_ROW = COLS / ITEM_W; // 3
const ROW_HEIGHT = 30;

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

function makeDefaultLayout(ids: string[]): LayoutItem[] {
  return ids.map((id, i) => ({
    i: id,
    x: (i % COLS_PER_ROW) * ITEM_W,
    y: Math.floor(i / COLS_PER_ROW) * ITEM_H,
    w: ITEM_W,
    h: ITEM_H,
    minW: 3,
    minH: 5,
  }));
}

function nextSlot(layout: LayoutItem[]): { x: number; y: number } {
  if (layout.length === 0) return { x: 0, y: 0 };
  const maxY = Math.max(...layout.map((l) => l.y));
  const itemsInLastRow = layout.filter((l) => l.y === maxY);
  if (itemsInLastRow.length < COLS_PER_ROW) {
    const usedXs = new Set(itemsInLastRow.map((l) => l.x));
    for (let x = 0; x < COLS; x += ITEM_W) {
      if (!usedXs.has(x)) return { x, y: maxY };
    }
  }
  return { x: 0, y: Math.max(...layout.map((l) => l.y + l.h)) };
}

const STORAGE_KEY = "macro-dashboard-layout";
const STORAGE_IDS_KEY = "macro-dashboard-indicators";
const STORAGE_STOCKS_KEY = "macro-dashboard-stocks";

export default function Dashboard() {
  const [indicatorIds, setIndicatorIds] = useState<string[]>(DEFAULT_INDICATORS);
  const [stockTickers, setStockTickers] = useState<string[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>(makeDefaultLayout(DEFAULT_INDICATORS));
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [syncMode, setSyncMode] = useState(false);
  const [syncDate, setSyncDate] = useState<string | null>(null);
  const [anomalyMode, setAnomalyMode] = useState(false);
  const [selectedForAnomaly, setSelectedForAnomaly] = useState<Set<string>>(new Set());
  const [anomalyDates, setAnomalyDates] = useState<Set<string>>(new Set());
  const [selectedAnomalyDate, setSelectedAnomalyDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedIds = localStorage.getItem(STORAGE_IDS_KEY);
      const savedLayout = localStorage.getItem(STORAGE_KEY);
      const savedStocks = localStorage.getItem(STORAGE_STOCKS_KEY);
      if (savedStocks) {
        const stocks = JSON.parse(savedStocks) as string[];
        if (Array.isArray(stocks)) setStockTickers(stocks);
      }
      if (savedIds) {
        const ids = JSON.parse(savedIds) as string[];
        setIndicatorIds(ids);
        if (savedLayout) {
          // minH/minW가 소실된 채 저장된 레이아웃을 복원할 때 최솟값 보장
          const parsed = (JSON.parse(savedLayout) as LayoutItem[]).map((item) => ({
            ...item,
            minW: Math.max(item.minW ?? 0, 3),
            minH: Math.max(item.minH ?? 0, 5),
            h: Math.max(item.h, item.minH ?? 5),
          }));
          setLayout(parsed);
        } else {
          setLayout(makeDefaultLayout(ids));
        }
      }
    } catch {
      // 기본값 유지
    }
    setMounted(true);
  }, []);

  const PANEL_WIDTH = 416;

  useEffect(() => {
    if (!mounted) return;
    const update = () => {
      // 탭 전환 직후 잘못된 innerWidth를 막기 위해 visibilitychange도 구독
      if (typeof window !== "undefined") {
        setContainerWidth(Math.max(300, window.innerWidth - 48 - (anomalyMode ? PANEL_WIDTH : 0)));
      }
    };
    update();
    window.addEventListener("resize", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [mounted, anomalyMode]);

  const handleSyncDate = useCallback((date: string | null) => {
    setSyncDate(date);
  }, []);

  const toggleAnomalyMode = useCallback(() => {
    setAnomalyMode((prev) => {
      if (prev) {
        setSelectedForAnomaly(new Set());
        setAnomalyDates(new Set());
        setSelectedAnomalyDate(null);
      }
      return !prev;
    });
  }, []);

  const toggleAnomalySelect = useCallback((id: string) => {
    setSelectedForAnomaly((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnomalyDates(new Set());
  }, []);

  const toggleSync = useCallback(() => {
    if (!syncMode) {
      if (!indicatorIds.includes("sp500")) {
        const newIds = ["sp500", ...indicatorIds];
        setIndicatorIds(newIds);
        localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(newIds));

        const sp500Item: LayoutItem = { i: "sp500", x: 0, y: 0, w: ITEM_W, h: ITEM_H, minW: 3, minH: 5 };
        const shifted = layout.map((item) => ({ ...item, y: item.y + ITEM_H }));
        const newLayout = [sp500Item, ...shifted];
        setLayout(newLayout);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      }
      setSyncMode(true);
    } else {
      setSyncMode(false);
      setSyncDate(null);
    }
  }, [syncMode, indicatorIds, layout]);

  const saveLayout = useCallback((newLayout: Layout) => {
    // onLayoutChange가 minH/minW를 소실시키는 것을 방지 + 비정상적으로 축소된 h 보정
    const mutable = (newLayout as LayoutItem[]).map((item) => ({
      ...item,
      minW: Math.max(item.minW ?? 0, 3),
      minH: Math.max(item.minH ?? 0, 5),
      h: Math.max(item.h, item.minH ?? 5),
    }));
    setLayout(mutable);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mutable));
  }, []);

  const addIndicator = useCallback(
    (id: string) => {
      const newIds = [...indicatorIds, id];
      setIndicatorIds(newIds);
      localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(newIds));

      const { x, y } = nextSlot(layout);
      const newLayout: LayoutItem[] = [
        ...layout,
        { i: id, x, y, w: ITEM_W, h: ITEM_H, minW: 3, minH: 5 },
      ];
      setLayout(newLayout);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      setShowModal(false);
    },
    [indicatorIds, layout]
  );

  const removeIndicator = useCallback(
    (id: string) => {
      if (id === "sp500") {
        setSyncMode(false);
        setSyncDate(null);
      }
      const newIds = indicatorIds.filter((i) => i !== id);
      const newLayout = layout.filter((l) => l.i !== id);
      setIndicatorIds(newIds);
      setLayout(newLayout);
      localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(newIds));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    },
    [indicatorIds, layout]
  );

  const addStock = useCallback(
    (ticker: string) => {
      const t = ticker.trim().toUpperCase();
      if (!t || stockTickers.includes(t)) return;
      const newTickers = [...stockTickers, t];
      setStockTickers(newTickers);
      localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(newTickers));

      const id = `stock:${t}`;
      const { x, y } = nextSlot(layout);
      const newLayout: LayoutItem[] = [
        ...layout,
        { i: id, x, y, w: ITEM_W, h: ITEM_H, minW: 3, minH: 5 },
      ];
      setLayout(newLayout);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      setShowStockModal(false);
    },
    [stockTickers, layout]
  );

  const removeStock = useCallback(
    (ticker: string) => {
      const id = `stock:${ticker}`;
      const newTickers = stockTickers.filter((t) => t !== ticker);
      const newLayout = layout.filter((l) => l.i !== id);
      setStockTickers(newTickers);
      setLayout(newLayout);
      localStorage.setItem(STORAGE_STOCKS_KEY, JSON.stringify(newTickers));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    },
    [stockTickers, layout]
  );

  const indicators = indicatorIds
    .map((id) => AVAILABLE_INDICATORS.find((ind) => ind.id === id))
    .filter(Boolean) as typeof AVAILABLE_INDICATORS;

  const stockIndicators = stockTickers.map((ticker, i) => makeStockIndicator(ticker, i));

  // 그리드에 표시할 모든 아이템 (거시지표 + 주식 종목)
  type GridItem =
    | { kind: "indicator"; indicator: Indicator }
    | { kind: "stock"; indicator: Indicator; ticker: string };

  const allItems: GridItem[] = [
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
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-bold tracking-tight">Macro Dashboard</h1>
            <p className="text-xs text-gray-500">드래그로 위젯 배치 · 우상단 × 로 제거</p>
          </div>
          <NavBar />
        </div>
        <div className="flex items-center gap-4">
          <Clock />
          <div className="flex gap-2">
            <button
              onClick={toggleAnomalyMode}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                anomalyMode
                  ? "bg-red-800 border-red-700 text-white"
                  : "text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
              }`}
            >
              {anomalyMode
                ? `이상탐지 ON${selectedForAnomaly.size > 0 ? ` (${selectedForAnomaly.size})` : ""}`
                : "이상탐지"}
            </button>
            <button
              onClick={toggleSync}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                syncMode
                  ? "bg-emerald-700 border-emerald-600 text-white"
                  : "text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
              }`}
            >
              {syncMode ? "S&P 동기화 ON" : "S&P 동기화"}
            </button>
            <button
              onClick={() => setShowStockModal(true)}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              + 종목 추가
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              + 지표 추가
            </button>
          </div>
        </div>
      </header>

      <main className={`p-6 transition-[margin] duration-200 ${anomalyMode ? "mr-[26rem]" : ""}`}>
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-gray-500">표시할 지표가 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStockModal(true)}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                종목 추가하기
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                지표 추가하기
              </button>
            </div>
          </div>
        ) : (
          <GridLayout
            layout={layout}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT }}
            dragConfig={{ handle: ".drag-handle" }}
            compactor={verticalCompactor}
            width={containerWidth}
            onLayoutChange={saveLayout}
          >
            {allItems.map(({ indicator: ind, kind, ...rest }) => {
              const ticker = kind === "stock" ? (rest as { ticker: string }).ticker : "";
              return (
                <div
                  key={ind.id}
                  className={`bg-gray-900 border rounded-xl p-4 flex flex-col overflow-hidden transition-colors ${
                    anomalyMode && selectedForAnomaly.has(ind.id)
                      ? "border-red-700/70"
                      : kind === "stock"
                      ? "border-gray-700"
                      : "border-gray-800"
                  }`}
                >
                  <div className="drag-handle flex items-center justify-between cursor-grab active:cursor-grabbing mb-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-0.5 h-3 bg-gray-600 rounded" />
                        ))}
                      </div>
                      {/* 주식 종목 뱃지 */}
                      {kind === "stock" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-500 border border-emerald-800/50 leading-none">
                          주식
                        </span>
                      )}
                      {anomalyMode && (
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => toggleAnomalySelect(ind.id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-all select-none ${
                            selectedForAnomaly.has(ind.id)
                              ? "bg-red-700 border-red-600 text-white"
                              : "bg-gray-800 border-gray-600 text-gray-400 hover:border-red-600 hover:text-red-400"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                              selectedForAnomaly.has(ind.id)
                                ? "bg-white border-white"
                                : "border-gray-500"
                            }`}
                          >
                            {selectedForAnomaly.has(ind.id) && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path
                                  d="M1 4L3.5 6.5L9 1"
                                  stroke="#ef4444"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          탐지
                        </button>
                      )}
                    </div>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() =>
                        kind === "stock" ? removeStock(ticker) : removeIndicator(ind.id)
                      }
                      className="text-gray-600 hover:text-gray-300 text-lg leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <IndicatorChart
                    indicator={ind}
                    isMaster={syncMode && ind.id === "sp500"}
                    syncDate={syncMode ? syncDate : null}
                    onSyncDate={syncMode && ind.id === "sp500" ? handleSyncDate : undefined}
                    anomalyDates={anomalyDates.size > 0 ? anomalyDates : undefined}
                    selectedAnomalyDate={selectedAnomalyDate ?? undefined}
                  />
                </div>
              );
            })}
          </GridLayout>
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

      {anomalyMode && (
        <AnomalyPanel
          selectedIds={[...selectedForAnomaly]}
          allIndicators={[...indicators, ...stockIndicators]}
          onAnomalyDates={setAnomalyDates}
          onSelectAnomaly={setSelectedAnomalyDate}
          onClose={toggleAnomalyMode}
        />
      )}
    </div>
  );
}
