"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  EventCategory,
  CATEGORY_META,
  RISK_GRADES,
  DayRiskResult,
  RiskEvent,
  getRiskGrade,
  getHeatmapBg,
  getEventsByDate,
  getUpcomingEvents,
  buildMonthRiskMap,
  getElectionWindow,
  ELECTION_WINDOWS,
  calculateDayRisk,
  STATIC_RISK_EVENTS,
} from "@/lib/riskEvents";
import DayRiskPanel from "./DayRiskPanel";
import NavBar from "./NavBar";
import Clock from "./Clock";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const PORTFOLIO_KEY = "macro-dashboard-portfolio";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDow(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
const ALL_CATEGORIES = Object.keys(CATEGORY_META) as EventCategory[];

function FilterBar({
  active,
  onChange,
}: {
  active: Set<EventCategory> | null;
  onChange: (v: Set<EventCategory> | null) => void;
}) {
  const isAll = active === null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          isAll ? "bg-gray-700 border-gray-600 text-white" : "border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
        }`}
      >
        전체
      </button>
      {ALL_CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const isOn = !isAll && active!.has(cat);
        return (
          <button
            key={cat}
            onClick={() => {
              if (isAll) {
                onChange(new Set([cat]));
              } else {
                const next = new Set(active!);
                if (isOn) {
                  next.delete(cat);
                  onChange(next.size ? next : null);
                } else {
                  next.add(cat);
                  onChange(next);
                }
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={
              isOn
                ? { backgroundColor: meta.bgColor, borderColor: meta.color, color: meta.color }
                : { borderColor: "#374151", color: "#9ca3af" }
            }
          >
            {meta.icon} {meta.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Calendar cell ────────────────────────────────────────────────────────────
interface CellProps {
  dateStr: string;
  day: number;
  isToday: boolean;
  isSelected: boolean;
  dow: number;
  events: RiskEvent[];
  result: DayRiskResult;
  onClick: () => void;
}
function CalendarCell({ dateStr, day, isToday, isSelected, dow, events, result, onClick }: CellProps) {
  const { adjustedScore, grade } = result;
  const bg = getHeatmapBg(adjustedScore);

  // Up to 3 unique category icons
  const catIcons = [...new Set(events.map((e) => e.category))]
    .slice(0, 3)
    .map((cat) => CATEGORY_META[cat].icon);

  return (
    <div
      onClick={onClick}
      className={`min-h-[88px] p-1.5 cursor-pointer flex flex-col gap-0.5 transition-all relative ${
        isSelected ? "ring-2 ring-inset ring-indigo-500 z-10" : ""
      }`}
      style={{ backgroundColor: bg || "transparent" }}
    >
      {/* Date number + score badge */}
      <div className="flex items-start justify-between">
        <span
          className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
            isToday ? "bg-indigo-600 text-white" : ""
          } ${!isToday && dow === 0 ? "text-red-400" : !isToday && dow === 6 ? "text-blue-400" : !isToday ? "text-gray-400" : ""}`}
        >
          {day}
        </span>
        {adjustedScore > 0 && (
          <span
            className="text-[10px] font-bold px-1 rounded leading-tight"
            style={{ color: grade.color, backgroundColor: grade.color + "22" }}
          >
            {adjustedScore}
          </span>
        )}
      </div>

      {/* Category icons */}
      {catIcons.length > 0 && (
        <div className="flex gap-0.5">
          {catIcons.map((icon, i) => (
            <span key={i} className="text-[13px] leading-none">{icon}</span>
          ))}
          {events.length > catIcons.length && (
            <span className="text-[10px] text-gray-600 self-center">+{events.length - catIcons.length}</span>
          )}
        </div>
      )}

      {/* First event label */}
      {events.length > 0 && (
        <div
          className="text-[10px] leading-tight truncate px-0.5"
          style={{ color: CATEGORY_META[events[0].category].color }}
        >
          {events[0].shortTitle}
        </div>
      )}
    </div>
  );
}

// ─── Monthly summary strip ────────────────────────────────────────────────────
function MonthRiskSummary({
  riskMap,
}: {
  riskMap: Map<string, { events: RiskEvent[]; result: DayRiskResult }>;
}) {
  const topDays = [...riskMap.entries()]
    .filter(([, { result }]) => result.adjustedScore > 0)
    .sort((a, b) => b[1].result.adjustedScore - a[1].result.adjustedScore)
    .slice(0, 4);

  if (!topDays.length) return null;

  return (
    <div className="mb-3">
      <p className="text-xs text-gray-500 mb-1.5">이번 달 주요 위험 구간</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {topDays.map(([dateStr, { result, events }]) => {
          const { adjustedScore, grade } = result;
          const icons = [...new Set(events.map((e) => e.category))]
            .slice(0, 2)
            .map((c) => CATEGORY_META[c].icon)
            .join(" ");
          return (
            <div
              key={dateStr}
              className="flex-shrink-0 px-3 py-2 rounded-lg border text-center"
              style={{ borderColor: grade.color + "44", backgroundColor: grade.color + "11" }}
            >
              <p className="text-[11px] text-gray-400">{dateStr.slice(5)}</p>
              <p className="text-base font-bold" style={{ color: grade.color }}>{adjustedScore}점</p>
              <p className="text-[11px]">{icons}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upcoming sidebar ─────────────────────────────────────────────────────────
function UpcomingSidebar({ onSelectDate, allEvents }: { onSelectDate: (d: string) => void; allEvents: RiskEvent[] }) {
  const events = useMemo(() => getUpcomingEvents(60, allEvents), [allEvents]);
  const today = todayStr();

  return (
    <div>
      <p className="text-sm font-medium text-gray-300 mb-2">다가오는 주요 일정</p>
      <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
        {events.length === 0 && <p className="text-xs text-gray-600">60일 이내 이벤트 없음</p>}
        {events.map((ev) => {
          const meta = CATEGORY_META[ev.category];
          const daysLeft = Math.ceil((new Date(ev.date).getTime() - new Date(today).getTime()) / 86400000);
          const result = calculateDayRisk(ev.date, getEventsByDate(ev.date, allEvents), allEvents);
          return (
            <button
              key={ev.id}
              onClick={() => onSelectDate(ev.date)}
              className="text-left p-2.5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">{ev.icon}</span>
                <span className="text-[11px] font-medium" style={{ color: meta.color }}>
                  {ev.baseScore >= 5 ? `D-${daysLeft}` : meta.label}
                </span>
                <span
                  className="ml-auto text-[10px] font-bold px-1 rounded"
                  style={{ color: result.grade.color, backgroundColor: result.grade.color + "22" }}
                >
                  {result.adjustedScore}점
                </span>
              </div>
              <p className="text-xs font-medium text-white leading-tight">{ev.shortTitle}</p>
              <p className="text-[11px] text-gray-500">{ev.date}{ev.time ? ` · ${ev.time}` : ""}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Portfolio input ──────────────────────────────────────────────────────────
function PortfolioSection({
  holdings,
  onChange,
}: {
  holdings: string[];
  onChange: (h: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const add = () => {
    const t = input.trim().toUpperCase();
    if (t && !holdings.includes(t)) onChange([...holdings, t]);
    setInput("");
  };
  return (
    <div>
      <p className="text-sm font-medium text-gray-300 mb-2">📊 보유 종목</p>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2 mb-2">
        <input
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="티커 (예: NVDA)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
        <button type="submit" className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg">추가</button>
      </form>
      {holdings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {holdings.map((t) => (
            <div key={t} className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-lg">
              {t}
              <button onClick={() => onChange(holdings.filter((h) => h !== t))} className="text-gray-600 hover:text-gray-300 ml-0.5">×</button>
            </div>
          ))}
        </div>
      )}
      {holdings.length === 0 && (
        <p className="text-[11px] text-gray-600">보유 종목 입력 시 날짜별 포트폴리오 영향을 분석해드립니다.</p>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  const grades = Object.entries(RISK_GRADES).filter(([k]) => k !== "none");
  return (
    <div>
      <p className="text-sm font-medium text-gray-300 mb-2">위험도 범례</p>
      <div className="space-y-1.5">
        {grades.map(([, g]) => (
          <div key={g.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: g.color }} />
            <span className="text-xs text-gray-300">{g.label}</span>
            <span className="text-xs text-gray-500">({g.min}~{g.max === 999 ? "17+" : g.max}점)</span>
          </div>
        ))}
        <div className="pt-1 border-t border-gray-800 mt-1">
          {Object.entries(CATEGORY_META).map(([, meta]) => (
            <div key={meta.label} className="flex items-center gap-2 mb-1">
              <span className="text-sm">{meta.icon}</span>
              <span className="text-xs text-gray-400">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
      {ELECTION_WINDOWS.length > 0 && (
        <div className="mt-3 p-2 bg-purple-950/30 border border-purple-800/30 rounded-lg">
          <p className="text-[11px] text-purple-400 font-medium mb-1">🗳️ 2026 중간선거 구간</p>
          {ELECTION_WINDOWS.map((w) => (
            <div key={w.label} className="text-[10px] text-gray-500 mb-0.5">
              {w.start.slice(5)} ~ {w.end.slice(5)}: {w.label} (×{w.multiplier})
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-600 mt-3">* 표시 날짜는 추정치입니다. 실제 일정은 공식 발표 기준으로 확인하세요.</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RiskCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory> | null>(null);
  const [holdings, setHoldings] = useState<string[]>([]);
  const todayDate = todayStr();

  // Fetch events from official sources (FRED, Federal Reserve, Yahoo Finance)
  const { data: apiData, isLoading: apiLoading } = useQuery({
    queryKey: ["calendar-api"],
    queryFn: async () => {
      const res = await fetch("/api/calendar");
      if (!res.ok) throw new Error("calendar fetch failed");
      return res.json() as Promise<{ events: RiskEvent[] }>;
    },
    staleTime: 1000 * 60 * 60 * 6, // 6시간
    retry: 1,
  });

  // Merge static confirmed events with API-fetched events (dedup by id)
  const allEvents = useMemo<RiskEvent[]>(() => {
    const fetched: RiskEvent[] = apiData?.events ?? [];
    const staticIds = new Set(STATIC_RISK_EVENTS.map(e => e.id));
    // Static events take precedence; API events only added if no conflict
    const apiOnly = fetched.filter(e => !staticIds.has(e.id));
    return [...STATIC_RISK_EVENTS, ...apiOnly];
  }, [apiData]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PORTFOLIO_KEY);
      if (saved) setHoldings(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHoldings = useCallback((h: string[]) => {
    setHoldings(h);
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(h));
  }, []);

  const riskMap = useMemo(
    () => buildMonthRiskMap(viewYear, viewMonth, activeCategories, allEvents),
    [viewYear, viewMonth, activeCategories, allEvents]
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDow(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayDate);
  };

  const handleSelectDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(dateStr);
  }, []);

  const electionWindow = selectedDate ? getElectionWindow(selectedDate) : null;

  const selectedEntry = selectedDate ? (() => {
    const cached = riskMap.get(selectedDate);
    if (cached) return cached;
    const allDayEvents = getEventsByDate(selectedDate, allEvents);
    const result = calculateDayRisk(selectedDate, allDayEvents, allEvents);
    return { events: allDayEvents, result };
  })() : null;

  // Week-level election window hint in calendar
  const electionHintDates = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const set = new Set<string>();
    for (let d = 1; d <= getDaysInMonth(viewYear, viewMonth); d++) {
      const dateStr = toDateStr(viewYear, viewMonth, d);
      if (getElectionWindow(dateStr)) set.add(dateStr);
    }
    return set;
  }, [viewYear, viewMonth]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-base font-bold tracking-tight">시장 리스크 캘린더</h1>
              <p className="text-xs text-gray-500">날짜별 위험도 · 이벤트 · 섹터 영향</p>
            </div>
            <NavBar />
          </div>
          <Clock />
        </div>
        <FilterBar active={activeCategories} onChange={setActiveCategories} />
      </header>

      <div className="flex flex-col xl:flex-row gap-6 p-4">
        {/* ── Calendar main ── */}
        <div className="flex-1 min-w-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white">‹</button>
              <h2 className="text-base font-semibold min-w-[120px] text-center">
                {viewYear}년 {viewMonth + 1}월
              </h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white">›</button>
              <button onClick={goToday} className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2.5 py-1 rounded-lg ml-1">
                오늘
              </button>
            </div>
          </div>

          {/* Monthly top-risk summary */}
          <MonthRiskSummary riskMap={riskMap} />

          {/* Election window banner */}
          {electionHintDates.size > 0 && (
            <div className="mb-3 px-3 py-2 bg-purple-950/30 border border-purple-800/30 rounded-xl flex items-center gap-2">
              <span>🗳️</span>
              <p className="text-xs text-purple-300">
                이번 달 일부 날짜는 2026 중간선거 리스크 구간에 포함됩니다. 정치 이벤트가 있는 날짜의 위험도에 배수가 적용됩니다.
              </p>
            </div>
          )}

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs py-1 font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} className="bg-gray-950 min-h-[88px]" />;
              }
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const entry = riskMap.get(dateStr);
              const events = entry?.events ?? [];
              const result = entry?.result ?? calculateDayRisk(dateStr, [], allEvents);
              const dow = (firstDow + day - 1) % 7;
              return (
                <CalendarCell
                  key={dateStr}
                  dateStr={dateStr}
                  day={day}
                  isToday={dateStr === todayDate}
                  isSelected={dateStr === selectedDate}
                  dow={dow}
                  events={events}
                  result={result}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                />
              );
            })}
          </div>

          {/* Selected day detail panel */}
          {selectedDate && selectedEntry && (
            <div className="mt-4">
              <DayRiskPanel
                date={selectedDate}
                events={selectedEntry.events}
                result={selectedEntry.result}
                holdings={holdings}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          )}
          {selectedDate && !selectedEntry && (
            <p className="mt-3 text-xs text-gray-600">{selectedDate}: 등록된 이벤트 없음</p>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="xl:w-72 flex-shrink-0 space-y-6">
          <UpcomingSidebar onSelectDate={handleSelectDate} allEvents={allEvents} />
          <PortfolioSection holdings={holdings} onChange={saveHoldings} />
          {/* 데이터 소스 표시 */}
          <div className="text-[11px] text-gray-600 space-y-0.5">
            {apiLoading && <p className="text-indigo-400">📡 FRED·연준·Yahoo Finance에서 데이터 로딩 중...</p>}
            {!apiLoading && apiData && (
              <p className="text-green-600">✓ {apiData.events.length}개 이벤트 (FRED·연준·Yahoo Finance)</p>
            )}
            {!apiLoading && !apiData && (
              <p className="text-yellow-600">⚠ 공식 데이터 불러오기 실패 — 확정 이벤트만 표시</p>
            )}
            <p>확정 이벤트 {STATIC_RISK_EVENTS.length}개 (옵션만기·정치·선물)</p>
          </div>
          <Legend />
        </div>
      </div>
    </div>
  );
}
