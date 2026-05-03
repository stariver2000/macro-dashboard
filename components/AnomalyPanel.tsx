"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Indicator } from "@/lib/indicators";
import { runAnomalyDetection, alignSeries, AnomalyReport, CausalEdge, AlignMode, LatestScore } from "@/lib/isolationForest";

interface Props {
  selectedIds:    string[];
  allIndicators:  Indicator[];
  onAnomalyDates: (dates: Set<string>) => void;
  onSelectAnomaly: (date: string | null) => void;
  onClose: () => void;
}

interface Obs { date: string; value: number }

const PERIODS = [
  { label: "1Y",  years: 1  },
  { label: "3Y",  years: 3  },
  { label: "5Y",  years: 5  },
  { label: "10Y", years: 10 },
  { label: "20Y", years: 20 },
];

const TABS = ["이상탐지", "SHAP·인과", "정상화 방안", "패턴 매칭"] as const;
type Tab = typeof TABS[number];

function startOf(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function fetchInd(ind: Indicator, start: string): Promise<{ observations: Obs[] }> {
  if (ind.yahooSymbol) return fetch(`/api/yahoo?symbol=${encodeURIComponent(ind.yahooSymbol)}&start=${start}&raw=true`).then(r => r.json());
  if (ind.shillerKey)  return fetch(`/api/shiller?start=${start}`).then(r => r.json());
  return fetch(`/api/fred?series=${ind.fredSeries}&start=${start}&raw=true`).then(r => r.json());
}

// ── Strength bar helper ──────────────────────────────────────────────────────
function StrengthBar({ value, color = "#ef4444" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  );
}

// ── Causal graph section ─────────────────────────────────────────────────────
function CausalSection({ edges, names }: { edges: CausalEdge[]; names: string[] }) {
  if (edges.length === 0)
    return <p className="text-xs text-gray-600">유의미한 인과 관계를 찾지 못했습니다.</p>;

  // Compute out-degree sum per node
  const outScore = new Map<string, number>();
  const inScore  = new Map<string, number>();
  names.forEach(n => { outScore.set(n, 0); inScore.set(n, 0); });
  edges.forEach(e => {
    outScore.set(e.from, (outScore.get(e.from) ?? 0) + e.strength);
    inScore.set(e.to,   (inScore.get(e.to)   ?? 0) + e.strength);
  });
  const topCause  = [...outScore.entries()].sort((a, b) => b[1] - a[1])[0];
  const topEffect = [...inScore.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-xs">
        <div className="bg-blue-950/60 border border-blue-800/50 rounded-lg px-3 py-1.5 flex-1 min-w-0">
          <p className="text-blue-400 text-xs mb-0.5">최대 원인 지표</p>
          <p className="text-white truncate font-medium">{topCause?.[0] ?? "—"}</p>
        </div>
        <div className="bg-orange-950/60 border border-orange-800/50 rounded-lg px-3 py-1.5 flex-1 min-w-0">
          <p className="text-orange-400 text-xs mb-0.5">최대 영향 지표</p>
          <p className="text-white truncate font-medium">{topEffect?.[0] ?? "—"}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">유의 인과 경로 (강도 ≥ 0.25)</p>
      <div className="space-y-1">
        {edges.slice(0, 8).map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-gray-800 rounded-lg px-3 py-1.5">
            <span className="text-blue-300 truncate flex-1 min-w-0">{e.from}</span>
            <span className="text-gray-500 flex-shrink-0">→</span>
            <span className="text-orange-300 truncate flex-1 min-w-0">{e.to}</span>
            <StrengthBar value={e.strength} color="#a78bfa" />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600">Granger 인과성 (F-통계량 기반) · 양방향 화살표는 상호 인과</p>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AnomalyPanel({ selectedIds, allIndicators, onAnomalyDates, onSelectAnomaly, onClose }: Props) {
  const [periodIdx, setPeriodIdx] = useState(3);
  const [alignMode, setAlignMode] = useState<AlignMode>("monthly");
  const [useCustom, setUseCustom] = useState(false);
  const [customStart, setCustomStart] = useState(() => startOf(10));
  const [customEnd,   setCustomEnd]   = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport]       = useState<AnomalyReport | null>(null);
  const [selIdx, setSelIdx]       = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [alignedCount, setAlignedCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("이상탐지");

  const today = new Date().toISOString().slice(0, 10);
  const selectedInds = allIndicators.filter(ind => selectedIds.includes(ind.id));
  const start = useCustom ? customStart : startOf(PERIODS[periodIdx].years);
  const end   = useCustom ? customEnd   : today;

  const { data: multiData, isLoading } = useQuery({
    queryKey: ["anomaly-data", [...selectedIds].sort(), start, end],
    queryFn:  () => Promise.all(selectedInds.map(ind => fetchInd(ind, start))),
    enabled:  selectedIds.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const runAnalysis = () => {
    if (!multiData) return;
    setIsRunning(true);
    setTimeout(() => {
      const series = selectedInds.map((ind, i) => ({
        name: ind.name,
        // 커스텀 종료일 적용: end 이후 데이터 제외
        observations: (multiData[i]?.observations ?? []).filter(o => o.date <= end),
      }));
      const aligned = alignSeries(series, alignMode);
      setAlignedCount(aligned.length);
      if (aligned.length < 10) { setIsRunning(false); return; }

      const result = runAnomalyDetection(aligned, selectedInds.map(i => i.name), { alignMode });
      setReport(result);
      setSelIdx(0);
      setActiveTab("이상탐지");
      onAnomalyDates(new Set(result.anomalies.map(a => a.date)));
      if (result.anomalies.length > 0) onSelectAnomaly(result.anomalies[0].date);
      setIsRunning(false);
    }, 50);
  };

  const fmtDate  = (d: string) => { const p = d.split("-"); return `${p[0]}.${p[1]}`; };
  const anomaly  = report?.anomalies[selIdx] ?? null;

  const scoreChartData = report?.dates.map((date, i) => ({
    date, score: +report.scores[i].toFixed(3),
  })) ?? [];

  const shapData = anomaly
    ? report!.featureLabels
        .map((name, i) => ({ name, value: +anomaly.shap[i].toFixed(4) }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    : [];

  return (
    <div className="fixed right-0 top-0 h-full w-[26rem] bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-white">이상탐지 분석</p>
          <p className="text-xs text-gray-500">IF · SHAP · Recourse · Granger · Pattern</p>
        </div>
        <button onClick={() => { onSelectAnomaly(null); onClose(); }} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
      </div>

      {/* 설정 + 실행 */}
      <div className="px-4 py-3 border-b border-gray-800 space-y-3 flex-shrink-0">
        {/* 선택된 지표 */}
        {selectedIds.length < 2 ? (
          <p className="text-xs text-gray-600">대시보드 카드에서 2개 이상 선택하세요</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedInds.map(ind => (
              <span key={ind.id} className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: ind.color, color: ind.color, backgroundColor: `${ind.color}18` }}>
                {ind.name}
              </span>
            ))}
          </div>
        )}

        {/* 분석 단위 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">분석 단위</p>
          <div className="flex gap-1">
            {(["monthly", "daily"] as AlignMode[]).map(m => (
              <button key={m}
                onClick={() => { setAlignMode(m); setReport(null); setAlignedCount(null); }}
                className={`flex-1 text-xs py-1 rounded transition-colors ${alignMode === m ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {m === "monthly" ? "월별 (Downsample)" : "일별 (Forward Fill)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {alignMode === "monthly"
              ? "일별 지표를 월별로 다운샘플 · 거시 흐름 분석에 적합"
              : "월별 지표를 앞값으로 채워 일별 격자에 맞춤 · 단기 급변 감지에 적합"}
          </p>
        </div>

        {/* 기간 선택 */}
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map((p, i) => (
              <button key={p.label}
                onClick={() => { setUseCustom(false); setPeriodIdx(i); setReport(null); setAlignedCount(null); }}
                className={`text-xs px-2 py-1 rounded transition-colors ${!useCustom && i === periodIdx ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                {p.label}
              </button>
            ))}
            <button
              onClick={() => { setUseCustom(true); setReport(null); setAlignedCount(null); }}
              className={`text-xs px-2 py-1 rounded transition-colors ${useCustom ? "bg-indigo-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              직접 설정
            </button>
          </div>

          {useCustom && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={e => { setCustomStart(e.target.value); setReport(null); setAlignedCount(null); }}
                className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 [color-scheme:dark]"
              />
              <span className="text-gray-600 text-xs flex-shrink-0">~</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today}
                onChange={e => { setCustomEnd(e.target.value); setReport(null); setAlignedCount(null); }}
                className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* 분석 버튼 */}
        <button onClick={runAnalysis}
          disabled={selectedIds.length < 2 || isLoading || isRunning || (useCustom && customStart >= customEnd)}
          className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed">
          {isRunning ? "분석 중..." : isLoading ? "로딩 중..." : "분석 시작"}
        </button>

        {alignedCount !== null && alignedCount < 10 && (
          <p className="text-xs text-amber-400">공통 날짜 {alignedCount}개 — 기간을 늘려보세요.</p>
        )}
        {alignedCount !== null && alignedCount >= 10 && !isRunning && report && (
          <p className="text-xs text-gray-600">
            {report.resampledTo === "monthly" ? "월별" : "일별"} · {alignedCount}개 포인트
            {" "}· Walk-Forward CV {Math.round(report.cvCoverage * 100)}% 적용
          </p>
        )}
      </div>

      {/* 탭 바 */}
      {report && (
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs py-2 transition-colors ${
                activeTab === tab
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!report && !isRunning && (
          <p className="text-xs text-gray-600 text-center mt-8">지표를 선택하고 분석을 시작하세요</p>
        )}

        {/* ── 탭 1: 이상탐지 ──────────────────────────────────────── */}
        {report && activeTab === "이상탐지" && (
          <div className="space-y-4">
            {/* 최근 날짜 이상 점수 — 항상 상단 고정 */}
            <div className={`rounded-lg px-3 py-2.5 border ${
              report.latestScore.isAnomaly
                ? "bg-red-950/50 border-red-700/60"
                : "bg-gray-800 border-gray-700"
            }`}>
              <p className="text-xs text-gray-400 mb-1">최근 분석 시점</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-200">{report.latestScore.date}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(report.latestScore.score * 100, 100)}%`,
                        backgroundColor: report.latestScore.isAnomaly ? "#ef4444" : "#6b7280",
                      }} />
                  </div>
                  <span className={`text-xs font-mono w-12 text-right ${report.latestScore.isAnomaly ? "text-red-400" : "text-gray-400"}`}>
                    {report.latestScore.score.toFixed(3)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    report.latestScore.isAnomaly
                      ? "bg-red-800/70 text-red-300"
                      : "bg-gray-700 text-gray-400"
                  }`}>
                    {report.latestScore.isAnomaly ? "이상" : "정상"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">이상 점수 추이</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} interval="preserveStartEnd" minTickGap={50} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} axisLine={false} width={26} />
                    <ReferenceLine y={0.6} stroke="#ef444455" strokeDasharray="3 2" />
                    {report.anomalies.map(a => (
                      <ReferenceLine key={a.date} x={a.date} stroke="rgba(239,68,68,0.3)" strokeWidth={1} />
                    ))}
                    <Area type="monotone" dataKey="score" stroke="#ef4444" fill="url(#ag)" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">점선(0.6) 이상 = 이상 판정</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">이상 탐지 결과 ({report.anomalies.length}건) — 클릭하면 다른 탭에서 상세 분석</p>
              <div className="space-y-1">
                {report.anomalies.map((a, i) => (
                  <button key={a.date} onClick={() => { setSelIdx(i); setActiveTab("SHAP·인과"); onSelectAnomaly(a.date); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                      selIdx === i ? "bg-red-950/60 border border-red-800/60" : "bg-gray-800 hover:bg-gray-750 border border-transparent"
                    }`}>
                    <span className="text-gray-200 font-mono">{a.date}</span>
                    <StrengthBar value={a.score} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 2: SHAP · 인과 ───────────────────────────────────── */}
        {report && activeTab === "SHAP·인과" && (
          <div className="space-y-5">
            {/* 이상 포인트 선택 */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">분석 포인트 선택</p>
              <div className="flex flex-wrap gap-1">
                {report.anomalies.map((a, i) => (
                  <button key={a.date} onClick={() => { setSelIdx(i); onSelectAnomaly(a.date); }}
                    className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${
                      selIdx === i ? "bg-red-800 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}>
                    {a.date}
                  </button>
                ))}
              </div>
            </div>

            {/* SHAP */}
            {anomaly && shapData.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">
                  SHAP 기여도 <span className="text-gray-600">— {anomaly.date}</span>
                </p>
                <p className="text-xs text-gray-600 mb-2">빨강(+) 이상 점수를 높임 · 초록(-) 낮춤</p>
                <div style={{ height: shapData.length * 30 + 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shapData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={100} />
                      <ReferenceLine x={0} stroke="#374151" />
                      <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false} barSize={14}>
                        {shapData.map((e, i) => <Cell key={i} fill={e.value >= 0 ? "#ef4444" : "#22c55e"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Causal */}
            <div>
              <p className="text-xs text-gray-400 mb-2">인과 관계 분석 (Granger Causality)</p>
              <CausalSection edges={report.causalEdges} names={report.featureLabels} />
            </div>
          </div>
        )}

        {/* ── 탭 3: 정상화 방안 (Actionable Recourse) ─────────────── */}
        {report && activeTab === "정상화 방안" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">분석 포인트 선택</p>
              <div className="flex flex-wrap gap-1">
                {report.anomalies.map((a, i) => (
                  <button key={a.date} onClick={() => { setSelIdx(i); onSelectAnomaly(a.date); }}
                    className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${
                      selIdx === i ? "bg-red-800 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}>
                    {a.date}
                  </button>
                ))}
              </div>
            </div>

            {anomaly && (
              <>
                <p className="text-xs text-gray-400">
                  <span className="font-mono text-red-300">{anomaly.date}</span> 이상 점수{" "}
                  <span className="text-red-400">{anomaly.score.toFixed(3)}</span> →{" "}
                  아래 지표 중 하나를 변화시키면 정상화 예상
                </p>
                {anomaly.recourse.length === 0 ? (
                  <p className="text-xs text-gray-600">단일 지표 변화로 정상화가 어렵습니다. 복합 이상 패턴입니다.</p>
                ) : (
                  <div className="space-y-2">
                    {anomaly.recourse.map((r, i) => {
                      const isPositive = r.delta > 0;
                      return (
                        <div key={i} className="bg-gray-800 rounded-lg px-3 py-2.5 space-y-1">
                          <p className="text-xs font-medium text-gray-200">{r.featureName}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 font-mono">{r.currentValue.toFixed(2)}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-emerald-400 font-mono">{r.targetValue.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-mono ${isPositive ? "text-red-400" : "text-emerald-400"}`}>
                              {isPositive ? "+" : ""}{r.delta.toFixed(3)}
                            </span>
                            <span className="text-gray-600 text-xs">
                              ({isPositive ? "+" : ""}{r.deltaPercent.toFixed(1)}%)
                            </span>
                            <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(Math.abs(r.deltaPercent) / 20 * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  각 지표를 개별적으로 변화시켰을 때 이상 점수가 0.6 미만으로 떨어지는 최소 변화량.<br/>
                  실제 시장에서 복합 변화가 일어나면 더 작은 변화로도 정상화 가능.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── 탭 4: 패턴 매칭 (Mechanistic Interpretability) ─────── */}
        {report && activeTab === "패턴 매칭" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">분석 포인트 선택</p>
              <div className="flex flex-wrap gap-1">
                {report.anomalies.map((a, i) => (
                  <button key={a.date} onClick={() => { setSelIdx(i); onSelectAnomaly(a.date); }}
                    className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${
                      selIdx === i ? "bg-red-800 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}>
                    {a.date}
                  </button>
                ))}
              </div>
            </div>

            {anomaly && (
              <>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">
                    <span className="font-mono text-red-300">{anomaly.date}</span> 의 이상 패턴
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    SHAP 벡터 코사인 유사도 기준 — 가장 닮은 과거 이상 시점
                  </p>

                  {anomaly.similarPatterns.length === 0 ? (
                    <p className="text-xs text-gray-600">비교할 다른 이상 시점이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {anomaly.similarPatterns.map((p, i) => (
                        <div key={i} className="bg-gray-800 rounded-lg px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono text-gray-200">#{i + 1}  {p.date}</span>
                            <span className="text-xs font-mono text-violet-400">{(p.similarity * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500"
                              style={{ width: `${Math.max(0, p.similarity * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 현재 이상의 SHAP 지문 */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">이상 패턴 지문 (SHAP 프로파일)</p>
                  <div className="space-y-1">
                    {report.featureLabels.map((name, j) => {
                      const v = anomaly.shap[j];
                      return (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 truncate" style={{ width: 100 }}>{name}</span>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{
                                width: `${Math.min(Math.abs(v) * 500, 100)}%`,
                                backgroundColor: v >= 0 ? "#ef4444" : "#22c55e",
                                marginLeft: v >= 0 ? "50%" : `${50 - Math.min(Math.abs(v) * 500, 50)}%`,
                              }} />
                          </div>
                          <span className="font-mono text-gray-500 w-14 text-right">{v.toFixed(4)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    유사도가 높을수록 두 이상 사건의 발생 메커니즘이 비슷함을 의미합니다.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
