"use client";
import { useState, useCallback, useEffect } from "react";
import { GridLayout, LayoutItem, Layout, verticalCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { AVAILABLE_INDICATORS, DEFAULT_INDICATORS } from "@/lib/indicators";
import IndicatorChart from "./IndicatorChart";
import AddIndicatorModal from "./AddIndicatorModal";
import Clock from "./Clock";

const COLS = 12;
const ITEM_W = 4;
const ITEM_H = 7;
const COLS_PER_ROW = COLS / ITEM_W; // 3
const ROW_HEIGHT = 30;

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

/** 현재 레이아웃에서 다음 슬롯 위치를 계산 (행 우선 순서) */
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

export default function Dashboard() {
  // 서버/클라이언트 hydration 불일치를 막기 위해 localStorage는 useEffect에서만 읽음
  const [indicatorIds, setIndicatorIds] = useState<string[]>(DEFAULT_INDICATORS);
  const [layout, setLayout] = useState<LayoutItem[]>(makeDefaultLayout(DEFAULT_INDICATORS));
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [syncMode, setSyncMode] = useState(false);
  const [syncDate, setSyncDate] = useState<string | null>(null);

  // localStorage에서 저장된 상태 복원 (클라이언트 전용)
  useEffect(() => {
    try {
      const savedIds = localStorage.getItem(STORAGE_IDS_KEY);
      const savedLayout = localStorage.getItem(STORAGE_KEY);
      if (savedIds) {
        const ids = JSON.parse(savedIds) as string[];
        setIndicatorIds(ids);
        setLayout(savedLayout ? JSON.parse(savedLayout) : makeDefaultLayout(ids));
      }
    } catch {
      // 파싱 실패시 기본값 유지
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const update = () => setContainerWidth(window.innerWidth - 48);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mounted]);

  const handleSyncDate = useCallback((date: string | null) => {
    setSyncDate(date);
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
    const mutable = [...newLayout] as LayoutItem[];
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
      {/* 네비 */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold tracking-tight">Macro Dashboard</h1>
          <p className="text-xs text-gray-500">드래그로 위젯 배치 · 우상단 × 로 제거</p>
        </div>
        <div className="flex items-center gap-4">
          <Clock />
          <div className="flex gap-2">
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
              onClick={() => setShowModal(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              + 지표 추가
            </button>
          </div>
        </div>
      </header>

      {/* 그리드 */}
      <main className="p-6">
        {indicators.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-gray-500">표시할 지표가 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              지표 추가하기
            </button>
          </div>
        ) : (
          /* 드래그앤드롭 그리드: 행 우선으로 슬롯이 채워짐 */
          <GridLayout
            layout={layout}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT }}
            dragConfig={{ handle: ".drag-handle" }}
            compactor={verticalCompactor}
            width={containerWidth}
            onLayoutChange={saveLayout}
          >
            {indicators.map((ind) => (
              <div
                key={ind.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col overflow-hidden"
              >
                <div className="drag-handle flex items-center justify-between cursor-grab active:cursor-grabbing mb-1 flex-shrink-0">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-0.5 h-3 bg-gray-600 rounded" />
                    ))}
                  </div>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => removeIndicator(ind.id)}
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
                />
              </div>
            ))}
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
    </div>
  );
}
