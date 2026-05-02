"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Indicator } from "@/lib/indicators";

interface Props {
  indicator: Indicator;
}

interface Observation {
  date: string;
  value: number;
}

function startDateOf(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function formatDateKorean(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
}

function fetchFred(series: string, start: string) {
  return fetch(`/api/fred?series=${series}&start=${start}`).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json() as Promise<{ observations: Observation[] }>;
  });
}

function fetchShiller(start: string) {
  return fetch(`/api/shiller?start=${start}`).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json() as Promise<{ observations: Observation[] }>;
  });
}

function fetchYahoo(symbol: string, start: string) {
  return fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}&start=${start}`).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json() as Promise<{ observations: Observation[] }>;
  });
}

const PERIOD_OPTIONS = [
  { label: "1Y",  years: 1  },
  { label: "3Y",  years: 3  },
  { label: "5Y",  years: 5  },
  { label: "10Y", years: 10 },
  { label: "20Y", years: 20 },
  { label: "50Y", years: 50 },
];

const CHART_MARGIN = { top: 4, right: 8, left: 0, bottom: 0 };
const Y_AXIS_WIDTH = 45;
const LONG_PRESS_MS = 350;

export default function IndicatorChart({ indicator }: Props) {
  const [periodIdx, setPeriodIdx] = React.useState(5);
  const [isMobile, setIsMobile] = useState(false);
  const [activePoint, setActivePoint] = useState<Observation | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  // 모바일: 롱프레스 타이머
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  // 데스크탑: 마우스 클릭 여부
  const isPressing = useRef(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const start = startDateOf(PERIOD_OPTIONS[periodIdx].years);

  const source = indicator.yahooSymbol ? "yahoo" : indicator.shillerKey ? "shiller" : "fred";
  const { data, isLoading, isError } = useQuery({
    queryKey: [source, indicator.yahooSymbol ?? indicator.shillerKey ?? indicator.fredSeries, start],
    queryFn:
      source === "yahoo"
        ? () => fetchYahoo(indicator.yahooSymbol!, start)
        : source === "shiller"
        ? () => fetchShiller(start)
        : () => fetchFred(indicator.fredSeries!, start),
    enabled: !!(indicator.yahooSymbol ?? indicator.shillerKey ?? indicator.fredSeries),
  });

  const observations = data?.observations ?? [];
  const latest = observations[observations.length - 1];

  // x축 시각적 연장 (합성 오늘 포인트)
  const today = new Date().toISOString().slice(0, 10);
  const chartData =
    observations.length > 0 && observations[observations.length - 1].date < today
      ? [...observations, { date: today, value: observations[observations.length - 1].value }]
      : observations;

  // 픽셀 X → 가장 가까운 실제 데이터 포인트 (합성 오늘 포인트 제외)
  const findNearestPoint = useCallback(
    (clientX: number) => {
      if (!chartRef.current || chartData.length === 0) return;
      const rect = chartRef.current.getBoundingClientRect();
      const chartAreaWidth = rect.width - Y_AXIS_WIDTH - CHART_MARGIN.right;
      const relX = clientX - rect.left - Y_AXIS_WIDTH;
      const ratio = Math.max(0, Math.min(relX / chartAreaWidth, 1));
      const idx = Math.round(ratio * (chartData.length - 1));
      const realIdx = Math.min(idx, observations.length - 1);
      setActivePoint(observations[Math.max(0, realIdx)]);
    },
    [chartData, observations]
  );

  // 모바일: passive:false touchmove (스크롤 방지하고 드래그 탐색)
  useEffect(() => {
    const el = chartRef.current;
    if (!el || !isMobile) return;
    const onMove = (e: TouchEvent) => {
      if (!isLongPress.current) return;
      e.preventDefault();
      findNearestPoint(e.touches[0].clientX);
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [isMobile, findNearestPoint]);

  // 모바일 이벤트 핸들러
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const clientX = e.touches[0].clientX;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        findNearestPoint(clientX);
      }, LONG_PRESS_MS);
    },
    [findNearestPoint]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    isLongPress.current = false;
    // activePoint 유지 (손 뗀 후에도 마지막 위치 표시)
  }, []);

  // 데스크탑 이벤트 핸들러 (클릭 후 드래그)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isPressing.current = true;
      findNearestPoint(e.clientX);
    },
    [findNearestPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPressing.current) return;
      findNearestPoint(e.clientX);
    },
    [findNearestPoint]
  );

  const handleMouseUp = useCallback(() => {
    isPressing.current = false;
    // activePoint 유지
  }, []);

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };

  const sharedProps = {
    data: chartData,
    margin: CHART_MARGIN,
  };

  // 눌린 위치 흰색 세로선 (모바일·데스크탑 공통)
  const cursorLine = activePoint ? (
    <ReferenceLine x={activePoint.date} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
  ) : null;

  const axis = (
    <>
      <XAxis
        dataKey="date"
        tickFormatter={fmtDate}
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        interval="preserveStartEnd"
        minTickGap={60}
      />
      <YAxis
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={false}
        width={Y_AXIS_WIDTH}
      />
    </>
  );

  const renderChart = () => {
    if (indicator.chartType === "area") {
      return (
        <AreaChart {...sharedProps}>
          <defs>
            <linearGradient id={`grad-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={indicator.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={indicator.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {axis}
          <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
          {cursorLine}
          <Area
            type="monotone"
            dataKey="value"
            stroke={indicator.color}
            fill={`url(#grad-${indicator.id})`}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      );
    }
    if (indicator.chartType === "bar") {
      return (
        <BarChart {...sharedProps}>
          {axis}
          <ReferenceLine y={0} stroke="#374151" />
          {cursorLine}
          <Bar dataKey="value" fill={indicator.color} radius={[2, 2, 0, 0]} isAnimationActive={false} activeBar={false} />
        </BarChart>
      );
    }
    return (
      <LineChart {...sharedProps}>
        {axis}
        {cursorLine}
        <Line
          type="monotone"
          dataKey="value"
          stroke={indicator.color}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-400 truncate">{indicator.name}</p>
          {latest && (
            <p className="text-xl font-bold" style={{ color: indicator.color }}>
              {latest.value.toFixed(2)}
              <span className="text-xs font-normal text-gray-400 ml-1">{indicator.unit}</span>
            </p>
          )}
          {latest && <p className="text-xs text-gray-500">{formatDateKorean(latest.date)}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {PERIOD_OPTIONS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`text-xs px-1.5 py-0.5 rounded ${
                i === periodIdx ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div
        ref={chartRef}
        className="flex-1 min-h-0 [&_svg]:outline-none [&_*:focus]:outline-none select-none"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onMouseDown={!isMobile ? handleMouseDown : undefined}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseUp={!isMobile ? handleMouseUp : undefined}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">로딩 중...</div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">데이터 로드 실패</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* 하단: 클릭/드래그한 지점의 날짜·수치 (모바일·데스크탑 공통) */}
      <div className="flex-shrink-0 h-5 mt-1 flex items-center justify-center text-xs text-gray-400">
        {activePoint
          ? `${formatDateKorean(activePoint.date)} · ${activePoint.value.toFixed(2)} ${indicator.unit}`
          : "\u00a0"}
      </div>
    </div>
  );
}
