"use client";
import { useState, useCallback, useEffect } from "react";
import { GridLayout, LayoutItem, Layout, verticalCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { AVAILABLE_INDICATORS, DEFAULT_INDICATORS } from "@/lib/indicators";
import IndicatorChart from "./IndicatorChart";
import AddIndicatorModal from "./AddIndicatorModal";

const COLS = 12;
const ROW_HEIGHT = 30;

function makeDefaultLayout(ids: string[]): LayoutItem[] {
  return ids.map((id, i) => ({
    i: id,
    x: (i % 3) * 4,
    y: Math.floor(i / 3) * 7,
    w: 4,
    h: 7,
    minW: 3,
    minH: 5,
  }));
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
    const updateWidth = () => setContainerWidth(window.innerWidth - 48);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [mounted]);

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

      const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      const newLayout: LayoutItem[] = [
        ...layout,
        { i: id, x: 0, y: maxY, w: 4, h: 7, minW: 3, minH: 5 },
      ];
      setLayout(newLayout);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      setShowModal(false);
    },
    [indicatorIds, layout]
  );

  const removeIndicator = useCallback(
    (id: string) => {
      const newIds = indicatorIds.filter((i) => i !== id);
      const newLayout = layout.filter((l) => l.i !== id);
      setIndicatorIds(newIds);
      setLayout(newLayout);
      localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(newIds));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    },
    [indicatorIds, layout]
  );

  const resetLayout = useCallback(() => {
    const defaultLayout = makeDefaultLayout(indicatorIds);
    setLayout(defaultLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLayout));
  }, [indicatorIds]);

  const indicators = indicatorIds
    .map((id) => AVAILABLE_INDICATORS.find((ind) => ind.id === id))
    .filter(Boolean) as typeof AVAILABLE_INDICATORS;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 네비 */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Macro Dashboard</h1>
          <p className="text-xs text-gray-500">드래그로 위젯 배치 · 우상단 × 로 제거</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetLayout}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            레이아웃 초기화
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            + 지표 추가
          </button>
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
                {/* 드래그 핸들 + 삭제 */}
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
                <IndicatorChart indicator={ind} />
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
