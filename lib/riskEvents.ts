// ─── Types ────────────────────────────────────────────────────────────────────

export type EventCategory =
  | "macro"
  | "earnings"
  | "political"
  | "options"
  | "geopolitical"
  | "seasonal";

export interface RiskEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  shortTitle: string;
  category: EventCategory;
  baseScore: number;
  description: string;
  sectors: string[];
  icon: string;
  time?: string;
  isEstimate?: boolean;
  source?: "fred" | "fed" | "yahoo" | "static";
}

export interface SeasonalPeriod {
  start: string;
  end: string;
  label: string;
  description: string;
  scoreBonus: number;
  icon: string;
}

// ─── Category metadata ────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  macro:       { label: "매크로",    icon: "📈", color: "#3b82f6", bgColor: "rgba(59,130,246,0.15)" },
  earnings:    { label: "실적",      icon: "💰", color: "#10b981", bgColor: "rgba(16,185,129,0.15)" },
  political:   { label: "정치",      icon: "🗳️", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.15)" },
  options:     { label: "옵션·수급", icon: "📉", color: "#f97316", bgColor: "rgba(249,115,22,0.15)" },
  geopolitical:{ label: "지정학",    icon: "⚠️", color: "#ef4444", bgColor: "rgba(239,68,68,0.15)" },
  seasonal:    { label: "계절성",    icon: "📅", color: "#6b7280", bgColor: "rgba(107,114,128,0.15)" },
};

// ─── Risk grades ──────────────────────────────────────────────────────────────

export const RISK_GRADES = {
  none:    { label: "없음",      min: 0,  max: 0,   color: "#374151", textColor: "#6b7280" },
  low:     { label: "낮음",      min: 1,  max: 4,   color: "#22c55e", textColor: "#22c55e" },
  moderate:{ label: "보통",      min: 5,  max: 8,   color: "#eab308", textColor: "#eab308" },
  caution: { label: "주의",      min: 9,  max: 12,  color: "#f97316", textColor: "#f97316" },
  high:    { label: "위험",      min: 13, max: 16,  color: "#ef4444", textColor: "#ef4444" },
  extreme: { label: "매우 위험", min: 17, max: 999, color: "#b91c1c", textColor: "#fca5a5" },
};

export type RiskGradeKey = keyof typeof RISK_GRADES;

export function getRiskGrade(score: number): typeof RISK_GRADES[RiskGradeKey] {
  if (score <= 0)  return RISK_GRADES.none;
  if (score <= 4)  return RISK_GRADES.low;
  if (score <= 8)  return RISK_GRADES.moderate;
  if (score <= 12) return RISK_GRADES.caution;
  if (score <= 16) return RISK_GRADES.high;
  return RISK_GRADES.extreme;
}

export function getHeatmapBg(score: number): string {
  if (score <= 0)  return "transparent";
  if (score <= 4)  return `rgba(34,197,94,${Math.min(0.05 + score * 0.04, 0.20)})`;
  if (score <= 8)  return `rgba(234,179,8,${0.08 + (score - 4) * 0.05})`;
  if (score <= 12) return `rgba(249,115,22,${0.12 + (score - 8) * 0.05})`;
  if (score <= 16) return `rgba(239,68,68,${0.18 + (score - 12) * 0.04})`;
  return `rgba(185,28,28,${Math.min(0.35 + (score - 16) * 0.03, 0.60)})`;
}

// ─── Election windows (2026 Midterm: Nov 3) ───────────────────────────────────

export const MIDTERM_DATE = "2026-11-03";

function addDays(base: string, d: number): string {
  const dt = new Date(base + "T12:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10);
}

export const ELECTION_WINDOWS = [
  {
    start: addDays(MIDTERM_DATE, -180), end: addDays(MIDTERM_DATE, -91),
    label: "선거 D-180~D-90",
    description: "정치 이슈 서서히 반영, 시장 주목도 증가 구간",
    multiplier: 1.1, color: "#8b5cf6",
  },
  {
    start: addDays(MIDTERM_DATE, -90), end: addDays(MIDTERM_DATE, -31),
    label: "선거 D-90~D-30",
    description: "불확실성 증가 구간, 정책 방향성 불투명",
    multiplier: 1.3, color: "#7c3aed",
  },
  {
    start: addDays(MIDTERM_DATE, -30), end: MIDTERM_DATE,
    label: "선거 D-30 고위험",
    description: "직전 불확실성 최고조, 성장주·금리민감주 변동성 확대",
    multiplier: 1.5, color: "#6d28d9",
  },
  {
    start: addDays(MIDTERM_DATE, 1), end: addDays(MIDTERM_DATE, 14),
    label: "선거 직후 결과 불확실",
    description: "개표·재검표 가능성, 의회 구성 변화에 따른 정책 재평가",
    multiplier: 1.2, color: "#5b21b6",
  },
];

export function getElectionWindow(dateStr: string) {
  return ELECTION_WINDOWS.find((w) => dateStr >= w.start && dateStr <= w.end) ?? null;
}

// ─── Seasonal periods ─────────────────────────────────────────────────────────

export const SEASONAL_PERIODS: SeasonalPeriod[] = [
  {
    start: "2026-05-01", end: "2026-10-31",
    label: "Sell in May 구간",
    description: "역사적으로 5~10월은 11~4월 대비 주식 수익률이 낮은 계절성 구간",
    scoreBonus: 0, icon: "📅",
  },
  {
    start: "2026-09-01", end: "2026-09-30",
    label: "9월 계절적 약세",
    description: "S&P 500 기준 연간 평균 수익률이 가장 낮은 달. 기관의 3분기 포트폴리오 조정 집중",
    scoreBonus: 1, icon: "📉",
  },
  {
    start: "2026-10-01", end: "2026-10-31",
    label: "10월 변동성 구간",
    description: "1987 블랙먼데이, 2008 금융위기 급락이 10월에 발생. 역사적으로 VIX 평균치 상승",
    scoreBonus: 1, icon: "⚡",
  },
  {
    start: "2026-11-15", end: "2026-12-31",
    label: "세금 손실 매도",
    description: "연말 절세 목적 손실 종목 매도 집중. 실적 부진 중소형주 하락 압력",
    scoreBonus: 0, icon: "🧾",
  },
  {
    start: "2026-12-15", end: "2026-12-31",
    label: "연말 수급 조정",
    description: "기관 윈도드레싱·리밸런싱과 산타랠리 기대가 공존하는 변동성 구간",
    scoreBonus: 0, icon: "🎄",
  },
];

export function getSeasonalPeriods(dateStr: string): SeasonalPeriod[] {
  return SEASONAL_PERIODS.filter((p) => dateStr >= p.start && dateStr <= p.end);
}

// ─── Confirmed static events (계산 가능하거나 공식 확정된 것만) ────────────────
// 매크로·실적 데이터는 /api/calendar 에서 공식 소스(FRED, 연준, Yahoo Finance)로 취득

export const STATIC_RISK_EVENTS: RiskEvent[] = [
  // ── 월간 옵션 만기 (3번째 금요일, 확정) ──────────────────────────────────────
  { id:"opex_2026_01", date:"2026-01-16", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"1월 월간 옵션 만기일. 감마 헷지 해소에 따른 수급 변동성 유발.", sectors:["전체 시장"] },
  { id:"opex_2026_02", date:"2026-02-20", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"2월 월간 옵션 만기일.", sectors:["전체 시장"] },
  { id:"opex_2026_04", date:"2026-04-17", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"4월 월간 옵션 만기일.", sectors:["전체 시장"] },
  { id:"opex_2026_05", date:"2026-05-15", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"5월 월간 옵션 만기일.", sectors:["전체 시장"] },
  { id:"opex_2026_07", date:"2026-07-17", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"7월 월간 옵션 만기일.", sectors:["전체 시장"] },
  { id:"opex_2026_08", date:"2026-08-21", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"8월 월간 옵션 만기일.", sectors:["전체 시장"] },
  { id:"opex_2026_10", date:"2026-10-16", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"10월 월간 옵션 만기일.", sectors:["전체 시장"] },
  { id:"opex_2026_11", date:"2026-11-20", title:"월간 옵션 만기",      shortTitle:"OpEx", category:"options", baseScore:3, icon:"📉", description:"11월 월간 옵션 만기일.", sectors:["전체 시장"] },

  // ── Quad Witching (분기 3월/6월/9월/12월 세 번째 금요일, 확정) ─────────────
  { id:"quad_2026_03", date:"2026-03-20", title:"Quad Witching (Q1)", shortTitle:"쿼드위칭", category:"options", baseScore:6, icon:"📉", description:"주식·ETF·주가지수 선물·옵션 동시 만기. 수급 충격이 가장 큰 이벤트 중 하나.", sectors:["전체 시장"] },
  { id:"quad_2026_06", date:"2026-06-19", title:"Quad Witching (Q2)", shortTitle:"쿼드위칭", category:"options", baseScore:6, icon:"📉", description:"2분기 선물·옵션 동시 만기.", sectors:["전체 시장"] },
  { id:"quad_2026_09", date:"2026-09-18", title:"Quad Witching (Q3)", shortTitle:"쿼드위칭", category:"options", baseScore:6, icon:"📉", description:"3분기 선물·옵션 동시 만기. FOMC 직후 발생 가능성으로 변동성 극대화.", sectors:["전체 시장"] },
  { id:"quad_2026_12", date:"2026-12-18", title:"Quad Witching (Q4)", shortTitle:"쿼드위칭", category:"options", baseScore:6, icon:"📉", description:"연간 마지막 Quad Witching. 연말 세금 손실 매도와 복합 작용.", sectors:["전체 시장"] },

  // ── 분기말 리밸런싱 (확정) ────────────────────────────────────────────────────
  { id:"qtr_end_q1", date:"2026-03-31", title:"Q1 분기말 리밸런싱", shortTitle:"Q1 리밸런싱", category:"options", baseScore:3, icon:"📉", description:"기관 포트폴리오의 1분기 리밸런싱 집중. 대형주·채권 수급 변동 유발.", sectors:["전체 시장"] },
  { id:"qtr_end_q2", date:"2026-06-30", title:"Q2 분기말 리밸런싱", shortTitle:"Q2 리밸런싱", category:"options", baseScore:3, icon:"📉", description:"기관 반기 리밸런싱 집중. 대규모 자금 이동 발생.", sectors:["전체 시장"] },
  { id:"qtr_end_q3", date:"2026-09-30", title:"Q3 분기말 리밸런싱", shortTitle:"Q3 리밸런싱", category:"options", baseScore:3, icon:"📉", description:"기관 3분기 리밸런싱 집중.", sectors:["전체 시장"] },
  { id:"qtr_end_q4", date:"2026-12-31", title:"Q4·연말 리밸런싱",  shortTitle:"연말 리밸런싱", category:"options", baseScore:3, icon:"📉", description:"연말 기관 포트폴리오 최종 조정. 세금 손실 매도 마감.", sectors:["전체 시장"] },

  // ── Russell 2000 리밸런싱 (6월 마지막 금요일, 확정) ──────────────────────────
  { id:"russell_rebal", date:"2026-06-26", title:"Russell 2000 리밸런싱", shortTitle:"러셀 리밸런싱", category:"options", baseScore:4, icon:"📉", description:"Russell 지수 연간 구성 종목 재조정. 편입·편출 종목 중심 수급 충격 발생.", sectors:["소형주","ETF"] },

  // ── 정치 이벤트 (확정) ────────────────────────────────────────────────────────
  { id:"midterm_2026",  date:"2026-11-03", title:"미국 중간선거",            shortTitle:"중간선거",   category:"political", baseScore:9, icon:"🗳️", description:"상원·하원 선거. 의회 통제권 변화에 따라 재정·규제·방산·에너지 섹터 재편 가능. 결과 확정까지 수일간 불확실성 지속.", sectors:["전체 시장","방산","에너지","금융","성장주"] },
  { id:"govt_shutdown", date:"2026-09-30", title:"정부 셧다운 마감 기한",     shortTitle:"셧다운 위험", category:"political", baseScore:7, icon:"🗳️", description:"연방정부 회계연도 종료. 의회 합의 미달 시 셧다운 발생. 경제지표 발표 중단·시장 불확실성 급증.", sectors:["전체 시장","방산","정부계약"] },

  // ── 확정된 실적 발표 (사용자 확인) ───────────────────────────────────────────
  { id:"nvda_q1_fy27",  date:"2026-05-20", title:"엔비디아 실적 (Q1 FY2027)", shortTitle:"NVDA 실적", category:"earnings",  baseScore:5, icon:"💰", time:"장 마감 후", description:"AI GPU 수요, Blackwell 공급 현황, 데이터센터 매출 성장률이 AI 테마 전체 방향을 좌우.", sectors:["반도체","AI","데이터센터"] },
];

// ─── Multiplier & score calculation ───────────────────────────────────────────

function getWeekBounds(dateStr: string): { mon: string; sun: string } {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = d.getUTCDay();
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { mon: mon.toISOString().slice(0, 10), sun: sun.toISOString().slice(0, 10) };
}

export interface DayRiskResult {
  baseScore: number;
  seasonalBonus: number;
  multiplier: number;
  adjustedScore: number;
  grade: typeof RISK_GRADES[RiskGradeKey];
  multiplierReasons: string[];
  electionWindow: typeof ELECTION_WINDOWS[0] | null;
  seasonalPeriods: SeasonalPeriod[];
}

export function calculateDayRisk(
  dateStr: string,
  dayEvents: RiskEvent[],
  allEvents: RiskEvent[]
): DayRiskResult {
  const baseScore = dayEvents.reduce((s, e) => s + e.baseScore, 0);
  const seasonalPeriods = getSeasonalPeriods(dateStr);
  const seasonalBonus = seasonalPeriods.reduce((s, p) => s + p.scoreBonus, 0);
  const rawScore = baseScore + seasonalBonus;

  const { mon, sun } = getWeekBounds(dateStr);
  const weekEvents = allEvents.filter((e) => e.date >= mon && e.date <= sun);
  const weekHasCPI     = weekEvents.some((e) => e.id.startsWith("cpi_"));
  const weekHasFOMC    = weekEvents.some((e) => e.id.startsWith("fomc_"));
  const weekHasEarnings= weekEvents.some((e) => e.category === "earnings");

  const multiplierReasons: string[] = [];
  let multiplier = 1.0;

  if (weekHasCPI && weekHasFOMC) {
    multiplier = Math.max(multiplier, 1.3);
    multiplierReasons.push("CPI + FOMC 같은 주 ×1.3");
  }
  if (weekHasFOMC && weekHasEarnings) {
    const m = multiplier >= 1.3 ? multiplier * 1.2 : 1.2;
    if (m > multiplier) multiplier = m;
    multiplierReasons.push("FOMC + 실적 같은 주 ×1.2");
  }

  const electionWindow = getElectionWindow(dateStr);
  const hasPolitical = dayEvents.some((e) => e.category === "political");
  if (electionWindow && hasPolitical) {
    if (electionWindow.multiplier > multiplier) multiplier = electionWindow.multiplier;
    multiplierReasons.push(`${electionWindow.label} ×${electionWindow.multiplier}`);
  }

  const adjustedScore = Math.round(rawScore * multiplier);

  return {
    baseScore, seasonalBonus, multiplier, adjustedScore,
    grade: getRiskGrade(adjustedScore),
    multiplierReasons, electionWindow, seasonalPeriods,
  };
}

// ─── AI comment ───────────────────────────────────────────────────────────────

export function generateAIComment(events: RiskEvent[], result: DayRiskResult): string {
  const { adjustedScore, electionWindow, seasonalPeriods } = result;
  const hasFOMC     = events.some((e) => e.id.startsWith("fomc_"));
  const hasCPI      = events.some((e) => e.id.startsWith("cpi_"));
  const hasNFP      = events.some((e) => e.id.startsWith("nfp_"));
  const hasQuad     = events.some((e) => e.id.startsWith("quad_"));
  const hasElection = events.some((e) => e.id === "midterm_2026");
  const hasShutdown = events.some((e) => e.id === "govt_shutdown");
  const earnings    = events.filter((e) => e.category === "earnings");

  const parts: string[] = [];

  if (hasFOMC && hasCPI) {
    parts.push("CPI 발표와 FOMC 금리 결정이 같은 날 겹치는 극고위험 구간입니다. 물가 데이터가 연준 결정에 직접 영향을 미쳐 채권·주식·달러 전반의 복합적 재평가가 예상됩니다.");
  } else if (hasFOMC) {
    parts.push("연준 금리 결정일입니다. 매파·비둘기파 서프라이즈 발생 시 성장주와 금리민감주 전반에 급격한 재평가가 이루어집니다.");
  } else if (hasCPI) {
    parts.push("소비자물가지수 발표일입니다. 헤드라인·근원 CPI의 컨센서스 편차가 향후 연준 행보를 결정짓는 핵심 변수입니다.");
  } else if (hasNFP) {
    parts.push("비농업 고용지표 발표일입니다. 예상치 대비 큰 편차 발생 시 채권·성장주가 동시에 크게 움직일 수 있습니다.");
  } else if (hasQuad) {
    parts.push("분기 옵션·선물 동시 만기일(Quad Witching)입니다. 수급 주도형 변동성이 장 중 급격히 나타나며 만기 이후 방향 전환도 주요 관찰 포인트입니다.");
  } else if (hasElection) {
    parts.push("미국 중간선거일입니다. 의회 통제권 변화에 따라 재정·규제·에너지·방산 정책이 대폭 재편될 수 있으며, 결과 확정까지 수일간의 불확실성이 지속됩니다.");
  } else if (hasShutdown) {
    parts.push("연방정부 재정 지출 기한 마감일입니다. 의회 합의 실패 시 셧다운이 발생하며 경제지표 발표 지연·시장 불확실성 확대가 우려됩니다.");
  }

  if (earnings.length >= 2) {
    parts.push(`${earnings.slice(0,3).map(e => e.shortTitle).join(", ")} 등 주요 실적 발표 집중. 가이던스 품질에 따라 섹터 전반의 단기 재평가가 이루어질 수 있습니다.`);
  } else if (earnings.length === 1) {
    parts.push(`${earnings[0].shortTitle} 실적 발표 예정. 컨센서스 대비 실적 및 가이던스에 따라 관련 섹터 변동성이 확대될 수 있습니다.`);
  }

  if (electionWindow && !hasElection && !parts.length) {
    parts.push(`현재 ${electionWindow.label} 구간으로 정치 리스크가 시장 변수로 부상하고 있습니다. ${electionWindow.description}`);
  }

  const hasSep = seasonalPeriods.some(p => p.label.includes("9월"));
  const hasOct = seasonalPeriods.some(p => p.label.includes("10월"));
  if (hasSep && !parts.length) parts.push("역사적으로 9월은 미국 주식시장에서 평균 수익률이 가장 낮은 달입니다. 기관의 3분기 포트폴리오 조정이 집중됩니다.");
  else if (hasOct && !parts.length) parts.push("10월은 역사적으로 시장 변동성이 높은 달입니다. 방어적 포지션 유지와 손절선 재확인을 권장합니다.");

  if (!parts.length) {
    if (adjustedScore === 0) return "시장 주요 이벤트가 없는 조용한 날입니다.";
    parts.push("시장 주요 이벤트가 예정된 날입니다. 발표 전후 단기 변동성 확대 가능성을 인지하고 모니터링을 유지하세요.");
  }
  return parts.join(" ");
}

export function getInvestmentCaution(score: number): string {
  if (score >= 17) return "신규 레버리지 진입 지양. 포지션 축소·헷지(풋 옵션, VIX 콜) 전략 적극 검토 권장.";
  if (score >= 13) return "변동성 확대 구간. 손절선 재확인 및 포지션 규모 조정 권장.";
  if (score >= 9)  return "주의 구간. 주요 이벤트 전후 급변동 가능성을 사전에 인지하세요.";
  if (score >= 5)  return "모니터링 유지. 이벤트 결과에 따른 단기 변동이 가능합니다.";
  return "상대적으로 안정적인 구간입니다.";
}

// ─── Portfolio sector map ─────────────────────────────────────────────────────

export const PORTFOLIO_MAP: Record<string, {
  name: string;
  sectors: string[];
  sensitiveCategories: EventCategory[];
  sensitiveIds: string[];
}> = {
  NVDA:  { name: "NVIDIA",          sectors: ["반도체","AI","데이터센터"], sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_","cpi_","earnings_nvda"] },
  AMD:   { name: "AMD",             sectors: ["반도체","CPU"],            sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_"] },
  SOXL:  { name: "반도체 3x ETF",   sectors: ["반도체","레버리지"],        sensitiveCategories: ["macro","earnings","options"], sensitiveIds: ["fomc_","quad_","opex_"] },
  ASTS:  { name: "AST SpaceMobile", sectors: ["우주","통신","소형주"],     sensitiveCategories: ["macro","political"], sensitiveIds: ["fomc_","cpi_"] },
  ETHU:  { name: "이더리움 ETF",     sectors: ["암호화폐","위험자산"],      sensitiveCategories: ["macro","political"], sensitiveIds: ["fomc_","cpi_"] },
  AAPL:  { name: "Apple",           sectors: ["테크","소비자","서비스"],   sensitiveCategories: ["macro","earnings"], sensitiveIds: ["retail_","cpi_","earnings_aapl"] },
  MSFT:  { name: "Microsoft",       sectors: ["클라우드","AI","SW"],       sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_","earnings_msft"] },
  TSLA:  { name: "Tesla",           sectors: ["전기차","성장주"],          sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_","earnings_tsla"] },
  META:  { name: "Meta",            sectors: ["광고","AI","소셜"],         sensitiveCategories: ["macro","earnings","political"], sensitiveIds: ["fomc_","earnings_meta"] },
  GOOGL: { name: "Alphabet",        sectors: ["광고","클라우드","AI"],     sensitiveCategories: ["macro","earnings","political"], sensitiveIds: ["fomc_","earnings_googl"] },
  AMZN:  { name: "Amazon",          sectors: ["이커머스","클라우드"],      sensitiveCategories: ["macro","earnings"], sensitiveIds: ["retail_","earnings_amzn"] },
  SPY:   { name: "S&P 500 ETF",     sectors: ["전체 시장"],               sensitiveCategories: ["macro","political","options"], sensitiveIds: ["fomc_","cpi_","nfp_","quad_"] },
  QQQ:   { name: "Nasdaq ETF",      sectors: ["기술주","성장주"],          sensitiveCategories: ["macro","earnings","options"], sensitiveIds: ["fomc_","quad_"] },
  TLT:   { name: "장기채 ETF",       sectors: ["채권","금리민감"],          sensitiveCategories: ["macro"], sensitiveIds: ["fomc_","cpi_","pce_","nfp_"] },
  GLD:   { name: "금 ETF",          sectors: ["안전자산","원자재"],        sensitiveCategories: ["macro"], sensitiveIds: ["fomc_","cpi_"] },
  "005930.KS": { name: "삼성전자",   sectors: ["반도체","가전"],           sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_"] },
  "000660.KS": { name: "SK하이닉스",sectors: ["반도체","메모리"],          sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_"] },
};

export function getPortfolioImpact(events: RiskEvent[], holdings: string[]): {
  ticker: string; name: string; affectedBy: string[];
}[] {
  return holdings.flatMap((ticker) => {
    const info = PORTFOLIO_MAP[ticker.toUpperCase()];
    if (!info) return [];
    const affectedBy = events
      .filter(e =>
        info.sensitiveCategories.includes(e.category) ||
        info.sensitiveIds.some(prefix => e.id.startsWith(prefix))
      )
      .map(e => e.shortTitle);
    if (!affectedBy.length) return [];
    return [{ ticker: ticker.toUpperCase(), name: info.name, affectedBy }];
  });
}

// ─── Lookup helpers (accepts merged event list) ───────────────────────────────

export function getEventsByDate(date: string, allEvents: RiskEvent[] = STATIC_RISK_EVENTS): RiskEvent[] {
  return allEvents.filter(e => e.date === date);
}

function getSeasonalDatesInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const n = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= n; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

export function buildMonthRiskMap(
  year: number,
  month: number,
  activeCategories: Set<EventCategory> | null,
  allEvents: RiskEvent[] = STATIC_RISK_EVENTS
): Map<string, { events: RiskEvent[]; result: DayRiskResult }> {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = allEvents.filter(e => e.date.startsWith(prefix));
  const map = new Map<string, { events: RiskEvent[]; result: DayRiskResult }>();

  const dateSet = new Set(monthEvents.map(e => e.date));
  for (const dateStr of dateSet) {
    const allDay = monthEvents.filter(e => e.date === dateStr);
    const visible = activeCategories === null ? allDay : allDay.filter(e => activeCategories.has(e.category));
    map.set(dateStr, { events: visible, result: calculateDayRisk(dateStr, allDay, allEvents) });
  }

  // Add days that have seasonal bonuses but no events
  for (const dateStr of getSeasonalDatesInMonth(year, month)) {
    if (!map.has(dateStr)) {
      const result = calculateDayRisk(dateStr, [], allEvents);
      if (result.seasonalBonus > 0) {
        map.set(dateStr, { events: [], result });
      }
    }
  }

  return map;
}

export function getUpcomingEvents(days = 60, allEvents: RiskEvent[] = STATIC_RISK_EVENTS): RiskEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureStr = future.toISOString().slice(0, 10);
  return allEvents
    .filter(e => e.date >= today && e.date <= futureStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// RISK_EVENTS alias kept for backward compat
export const RISK_EVENTS = STATIC_RISK_EVENTS;
