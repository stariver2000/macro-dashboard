"use client";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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

function fetchFred(series: string, start: string) {
  return fetch(`/api/fred?series=${series}&start=${start}`).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json() as Promise<{ observations: Observation[] }>;
  });
}

function fetchShiller(key: string, start: string) {
  return fetch(`/api/shiller?key=${key}&start=${start}`).then((r) => {
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

export default function IndicatorChart({ indicator }: Props) {
  const [periodIdx, setPeriodIdx] = React.useState(5); // 기본 50Y
  const start = startDateOf(PERIOD_OPTIONS[periodIdx].years);

  const source = indicator.yahooSymbol ? "yahoo" : indicator.shillerKey ? "shiller" : "fred";
  const { data, isLoading, isError } = useQuery({
    queryKey: [source, indicator.yahooSymbol ?? indicator.shillerKey ?? indicator.fredSeries, start],
    queryFn:
      source === "yahoo"
        ? () => fetchYahoo(indicator.yahooSymbol!, start)
        : source === "shiller"
        ? () => fetchShiller(indicator.shillerKey!, start)
        : () => fetchFred(indicator.fredSeries!, start),
    enabled: !!(indicator.yahooSymbol ?? indicator.shillerKey ?? indicator.fredSeries),
  });

  const observations = data?.observations ?? [];
  const latest = observations[observations.length - 1];

  // x축 날짜 포맷 (데이터 간격에 따라)
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };

  const sharedProps = {
    data: observations,
    margin: { top: 4, right: 8, left: 0, bottom: 0 },
  };

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
        width={45}
      />
      <Tooltip
        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 6, fontSize: 12 }}
        labelStyle={{ color: "#d1d5db" }}
        itemStyle={{ color: indicator.color }}
        formatter={(v) => {
          const num = typeof v === "number" ? v : parseFloat(String(v));
          return [`${num.toFixed(2)} ${indicator.unit}`, indicator.name];
        }}
        labelFormatter={(l) => `날짜: ${l}`}
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
          <Area
            type="monotone"
            dataKey="value"
            stroke={indicator.color}
            fill={`url(#grad-${indicator.id})`}
            strokeWidth={1.5}
            dot={false}
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
          <Bar dataKey="value" fill={indicator.color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      );
    }
    return (
      <LineChart {...sharedProps}>
        {axis}
        <Line
          type="monotone"
          dataKey="value"
          stroke={indicator.color}
          strokeWidth={1.5}
          dot={false}
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
          {latest && <p className="text-xs text-gray-500">{latest.date}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {PERIOD_OPTIONS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`text-xs px-1.5 py-0.5 rounded ${
                i === periodIdx
                  ? "bg-gray-600 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            로딩 중...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">
            데이터 로드 실패
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// React import (RSC 아님)
import React from "react";
