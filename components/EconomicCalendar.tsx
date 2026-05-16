"use client";
import { useState, useMemo } from "react";
import {
  ECONOMIC_EVENTS,
  EconomicEvent,
  EventImpact,
  IMPACT_COLORS,
  IMPACT_LABELS,
  CATEGORY_LABELS,
  getEventsByDate,
} from "@/lib/economicEvents";
import NavBar from "./NavBar";
import Clock from "./Clock";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatMonthTitle(year: number, month: number): string {
  return `${year}년 ${month + 1}월`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ImpactDotProps {
  impact: EventImpact;
}
function ImpactDot({ impact }: ImpactDotProps) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: IMPACT_COLORS[impact] }}
    />
  );
}

interface EventBadgeProps {
  event: EconomicEvent;
  onClick: () => void;
}
function EventBadge({ event, onClick }: EventBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate transition-colors hover:opacity-80"
      style={{
        backgroundColor: IMPACT_COLORS[event.impact] + "22",
        color: IMPACT_COLORS[event.impact],
        borderLeft: `2px solid ${IMPACT_COLORS[event.impact]}`,
      }}
    >
      {event.title}
    </button>
  );
}

interface EventDetailProps {
  event: EconomicEvent;
  onClose: () => void;
}
function EventDetail({ event, onClose }: EventDetailProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ImpactDot impact={event.impact} />
          <span className="text-xs font-medium" style={{ color: IMPACT_COLORS[event.impact] }}>
            {IMPACT_LABELS[event.impact]}
          </span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {CATEGORY_LABELS[event.category]}
          </span>
          {event.isEstimate && (
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">추정</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none ml-2">
          ×
        </button>
      </div>
      <h3 className="font-semibold text-white text-sm mb-1">{event.title}</h3>
      <p className="text-xs text-gray-400 mb-2">{event.description}</p>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{event.date}</span>
        {event.time && <span>{event.time}</span>}
      </div>
    </div>
  );
}

// 해당 월의 이벤트 중 날짜별 impact 최고 등급을 반환
function useMonthEventMap(year: number, month: number) {
  return useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const map = new Map<string, EconomicEvent[]>();
    for (const ev of ECONOMIC_EVENTS) {
      if (!ev.date.startsWith(prefix)) continue;
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [year, month]);
}

// 앞으로 30일 이내 이벤트 목록
function useUpcomingEvents() {
  return useMemo(() => {
    const today = todayStr();
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const futureStr = future.toISOString().slice(0, 10);
    return ECONOMIC_EVENTS.filter((e) => e.date >= today && e.date <= futureStr).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, []);
}

export default function EconomicCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);

  const eventMap = useMonthEventMap(viewYear, viewMonth);
  const upcomingEvents = useUpcomingEvents();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);
  const todayDate = todayStr();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayDate);
  };

  const selectedEvents = selectedDate ? getEventsByDate(selectedDate) : [];

  const impactOrder: EventImpact[] = ["critical", "high", "medium", "low"];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-base font-bold tracking-tight">경제 캘린더</h1>
              <p className="text-xs text-gray-500">주식 변동성 리스크 일정</p>
            </div>
            <NavBar />
          </div>
          <Clock />
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-6 p-6">
        {/* 캘린더 메인 */}
        <div className="flex-1 min-w-0">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                ‹
              </button>
              <h2 className="text-base font-semibold text-white min-w-[120px] text-center">
                {formatMonthTitle(viewYear, viewMonth)}
              </h2>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                ›
              </button>
              <button
                onClick={goToday}
                className="ml-2 text-xs text-gray-400 hover:text-white border border-gray-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                오늘
              </button>
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {(Object.keys(IMPACT_LABELS) as EventImpact[]).map((imp) => (
                <div key={imp} className="flex items-center gap-1.5">
                  <ImpactDot impact={imp} />
                  <span className="text-xs text-gray-400">{IMPACT_LABELS[imp]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs py-1.5 font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px bg-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="bg-gray-950 min-h-[80px]" />;
              }
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const events = eventMap.get(dateStr) ?? [];
              const isToday = dateStr === todayDate;
              const isSelected = dateStr === selectedDate;
              const dow = (firstDow + day - 1) % 7;

              const topEvents = [...events].sort(
                (a, b) => impactOrder.indexOf(a.impact) - impactOrder.indexOf(b.impact)
              );

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : dateStr);
                    setSelectedEvent(null);
                  }}
                  className={`bg-gray-950 min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-gray-900 flex flex-col gap-0.5 ${
                    isSelected ? "ring-1 ring-inset ring-indigo-500" : ""
                  }`}
                >
                  {/* 날짜 숫자 */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-indigo-600 text-white"
                          : dow === 0
                          ? "text-red-400"
                          : dow === 6
                          ? "text-blue-400"
                          : "text-gray-400"
                      }`}
                    >
                      {day}
                    </span>
                    {events.length > 0 && (
                      <div className="flex gap-0.5">
                        {topEvents.slice(0, 3).map((ev, i) => (
                          <ImpactDot key={i} impact={ev.impact} />
                        ))}
                        {events.length > 3 && (
                          <span className="text-[10px] text-gray-600">+{events.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 이벤트 배지 (최대 2개) */}
                  <div className="flex flex-col gap-0.5">
                    {topEvents.slice(0, 2).map((ev) => (
                      <EventBadge
                        key={ev.title + ev.date}
                        event={ev}
                        onClick={() => setSelectedEvent(ev)}
                      />
                    ))}
                    {events.length > 2 && (
                      <span className="text-[10px] text-gray-600 pl-1">+{events.length - 2}개</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 선택한 날짜 이벤트 */}
          {selectedDate && selectedEvents.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                {selectedDate} 이벤트
              </h3>
              <div className="flex flex-col gap-2">
                {selectedEvents.map((ev) =>
                  selectedEvent?.title === ev.title && selectedEvent.date === ev.date ? (
                    <EventDetail
                      key={ev.title + ev.date}
                      event={ev}
                      onClose={() => setSelectedEvent(null)}
                    />
                  ) : (
                    <button
                      key={ev.title + ev.date}
                      onClick={() => setSelectedEvent(ev)}
                      className="text-left bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ImpactDot impact={ev.impact} />
                        <span className="text-xs" style={{ color: IMPACT_COLORS[ev.impact] }}>
                          {IMPACT_LABELS[ev.impact]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {CATEGORY_LABELS[ev.category]}
                        </span>
                        {ev.time && <span className="text-xs text-gray-600">{ev.time}</span>}
                      </div>
                      <p className="text-sm font-medium text-white">{ev.title}</p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          {selectedDate && selectedEvents.length === 0 && (
            <p className="mt-3 text-xs text-gray-600">{selectedDate}: 등록된 이벤트 없음</p>
          )}
        </div>

        {/* 사이드바: 앞으로 60일 이벤트 */}
        <div className="xl:w-72 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-300 mb-3">다가오는 주요 일정</h3>
          <div className="flex flex-col gap-2">
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-gray-600">60일 이내 이벤트 없음</p>
            )}
            {upcomingEvents.map((ev) => (
              <button
                key={ev.title + ev.date}
                onClick={() => {
                  const d = new Date(ev.date);
                  setViewYear(d.getFullYear());
                  setViewMonth(d.getMonth());
                  setSelectedDate(ev.date);
                  setSelectedEvent(ev);
                }}
                className="text-left bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ImpactDot impact={ev.impact} />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: IMPACT_COLORS[ev.impact] }}
                  >
                    {ev.impact === "critical" ? "D-" + Math.max(0, Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000)) : IMPACT_LABELS[ev.impact]}
                  </span>
                  <span className="text-[11px] text-gray-500">{CATEGORY_LABELS[ev.category]}</span>
                </div>
                <p className="text-xs font-medium text-white leading-tight">{ev.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {ev.date} {ev.time ?? ""}
                </p>
              </button>
            ))}
          </div>

          {/* 범례 상세 */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">범례</h3>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
              {(Object.keys(IMPACT_LABELS) as EventImpact[]).map((imp) => (
                <div key={imp} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: IMPACT_COLORS[imp] }}
                  />
                  <div>
                    <span className="text-xs text-white">{IMPACT_LABELS[imp]}</span>
                    <span className="text-[11px] text-gray-500 ml-2">
                      {imp === "critical" && "FOMC · CPI · NFP"}
                      {imp === "high" && "GDP · PCE · 대형주 실적"}
                      {imp === "medium" && "PPI · 소매판매 · JOLTS"}
                      {imp === "low" && "기타 경제 지표"}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-600 pt-1 border-t border-gray-800 mt-1">
                * 표시 날짜는 공식 발표 전 추정치입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
