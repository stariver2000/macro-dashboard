"use client";
import {
  RiskEvent,
  DayRiskResult,
  CATEGORY_META,
  RISK_GRADES,
  generateAIComment,
  getInvestmentCaution,
  getPortfolioImpact,
  EventCategory,
} from "@/lib/riskEvents";

interface Props {
  date: string;
  events: RiskEvent[];
  result: DayRiskResult;
  holdings: string[];
  onClose: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const max = 20;
  const pct = Math.min((score / max) * 100, 100);
  const color = score >= 17 ? "#b91c1c" : score >= 13 ? "#ef4444" : score >= 9 ? "#f97316" : score >= 5 ? "#eab308" : "#22c55e";
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function EventRow({ event }: { event: RiskEvent }) {
  const meta = CATEGORY_META[event.category];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <span className="text-base leading-none mt-0.5 flex-shrink-0">{event.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{event.title}</span>
          {event.isEstimate && (
            <span className="text-[10px] text-gray-600 border border-gray-700 px-1 rounded">추정</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.description}</p>
        {event.time && <p className="text-[11px] text-gray-600 mt-0.5">{event.time}</p>}
        {event.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {event.sectors.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-sm font-bold" style={{ color: meta.color }}>
          +{event.baseScore}
        </span>
        <div className="text-[10px] text-gray-600 mt-0.5"
          style={{ backgroundColor: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </div>
      </div>
    </div>
  );
}

export default function DayRiskPanel({ date, events, result, holdings, onClose }: Props) {
  const { adjustedScore, baseScore, seasonalBonus, multiplier, multiplierReasons, grade, electionWindow, seasonalPeriods } = result;
  const aiComment = generateAIComment(events, result);
  const caution = getInvestmentCaution(adjustedScore);
  const portfolioImpact = getPortfolioImpact(events, holdings);

  // all sectors from today's events
  const allSectors = [...new Set(events.flatMap((e) => e.sectors))].slice(0, 8);

  const gradeColor = grade === RISK_GRADES.none ? "#6b7280" : grade.color;

  const categoryBreakdown = (Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
    const catEvents = events.filter((e) => e.category === cat);
    const catScore = catEvents.reduce((s, e) => s + e.baseScore, 0);
    return { cat, catEvents, catScore };
  }).filter((x) => x.catScore > 0);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-500">{date}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-bold" style={{ color: gradeColor }}>
                {adjustedScore}점
              </span>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: gradeColor + "22", color: gradeColor }}>
                {grade.label}
              </span>
              {multiplier > 1 && (
                <span className="text-xs text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">
                  ×{multiplier.toFixed(1)} 배수 적용
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xl leading-none">×</button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Score breakdown */}
        <div>
          <ScoreBar score={adjustedScore} />
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-500">
            <span>0점 (낮음)</span>
            <span>10점 (주의)</span>
            <span>17점+ (매우 위험)</span>
          </div>
          {(multiplierReasons.length > 0 || seasonalBonus > 0) && (
            <div className="mt-2 space-y-1">
              {seasonalBonus > 0 && (
                <div className="text-[11px] text-gray-500">
                  기본 점수 {baseScore}pt + 계절성 +{seasonalBonus}pt → {multiplier > 1 ? `×${multiplier.toFixed(1)} 배수 → ` : ""}최종 {adjustedScore}점
                </div>
              )}
              {multiplierReasons.map((r) => (
                <div key={r} className="text-[11px] text-orange-400 flex items-center gap-1">
                  <span>⚡</span>{r}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">카테고리별 기여도</p>
            <div className="flex flex-wrap gap-2">
              {categoryBreakdown.map(({ cat, catScore }) => {
                const meta = CATEGORY_META[cat];
                return (
                  <div key={cat} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                    style={{ backgroundColor: meta.bgColor }}>
                    <span>{meta.icon}</span>
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    <span className="font-bold" style={{ color: meta.color }}>+{catScore}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events list */}
        {events.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">이벤트 목록</p>
            <div className="divide-y divide-gray-800">
              {events.map((ev) => <EventRow key={ev.id} event={ev} />)}
            </div>
          </div>
        )}

        {/* Related sectors */}
        {allSectors.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">관련 섹터</p>
            <div className="flex flex-wrap gap-1.5">
              {allSectors.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Election window */}
        {electionWindow && (
          <div className="p-3 rounded-lg border" style={{ borderColor: electionWindow.color + "44", backgroundColor: electionWindow.color + "11" }}>
            <div className="flex items-center gap-2 mb-1">
              <span>🗳️</span>
              <span className="text-xs font-medium" style={{ color: electionWindow.color }}>
                {electionWindow.label}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">{electionWindow.description}</p>
          </div>
        )}

        {/* Seasonal context */}
        {seasonalPeriods.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">계절성 컨텍스트</p>
            {seasonalPeriods.map((p) => (
              <div key={p.label} className="flex items-start gap-2 text-xs text-gray-500 mb-1">
                <span>{p.icon}</span>
                <div>
                  <span className="text-gray-400 font-medium">{p.label}:</span> {p.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Portfolio impact */}
        {portfolioImpact.length > 0 && (
          <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-lg">
            <p className="text-xs font-medium text-indigo-400 mb-2">📊 포트폴리오 영향</p>
            {portfolioImpact.map(({ ticker, name, affectedBy }) => (
              <div key={ticker} className="mb-1.5">
                <span className="text-xs font-semibold text-white">{ticker}</span>
                <span className="text-xs text-gray-500 ml-1.5">{name}</span>
                <p className="text-[11px] text-indigo-300 mt-0.5">
                  영향 이벤트: {affectedBy.join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* AI Comment */}
        {aiComment && (
          <div className="p-3 bg-gray-800/60 border border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-400 mb-1.5">💬 리스크 코멘트</p>
            <p className="text-xs text-gray-300 leading-relaxed">{aiComment}</p>
          </div>
        )}

        {/* Investment caution */}
        {adjustedScore > 0 && (
          <div className="p-3 rounded-lg border border-yellow-800/40 bg-yellow-950/20">
            <p className="text-xs font-medium text-yellow-500 mb-1">⚠️ 투자 주의</p>
            <p className="text-xs text-yellow-200/70 leading-relaxed">{caution}</p>
            <p className="text-[10px] text-gray-600 mt-2">
              이 정보는 매수·매도 추천이 아닌 리스크 인식 도구입니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
