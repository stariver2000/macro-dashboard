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
  macro:       { label: "매크로",   icon: "📈", color: "#3b82f6", bgColor: "rgba(59,130,246,0.15)" },
  earnings:    { label: "실적",     icon: "💰", color: "#10b981", bgColor: "rgba(16,185,129,0.15)" },
  political:   { label: "정치",     icon: "🗳️", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.15)" },
  options:     { label: "옵션·수급", icon: "📉", color: "#f97316", bgColor: "rgba(249,115,22,0.15)" },
  geopolitical:{ label: "지정학",   icon: "⚠️", color: "#ef4444", bgColor: "rgba(239,68,68,0.15)" },
  seasonal:    { label: "계절성",   icon: "📅", color: "#6b7280", bgColor: "rgba(107,114,128,0.15)" },
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
    start: addDays(MIDTERM_DATE, -180),
    end:   addDays(MIDTERM_DATE, -91),
    label: "선거 D-180~D-90",
    description: "정치 이슈 서서히 반영, 시장 주목도 증가 구간",
    multiplier: 1.1,
    color: "#8b5cf6",
  },
  {
    start: addDays(MIDTERM_DATE, -90),
    end:   addDays(MIDTERM_DATE, -31),
    label: "선거 D-90~D-30",
    description: "불확실성 증가 구간, 정책 방향성 불투명",
    multiplier: 1.3,
    color: "#7c3aed",
  },
  {
    start: addDays(MIDTERM_DATE, -30),
    end:   MIDTERM_DATE,
    label: "선거 D-30 고위험",
    description: "직전 불확실성 최고조, 성장주·금리민감주 변동성 확대",
    multiplier: 1.5,
    color: "#6d28d9",
  },
  {
    start: addDays(MIDTERM_DATE, 1),
    end:   addDays(MIDTERM_DATE, 14),
    label: "선거 직후 결과 불확실",
    description: "개표·재검표 가능성, 의회 구성 변화에 따른 정책 재평가",
    multiplier: 1.2,
    color: "#5b21b6",
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

  // Weekly context for multipliers
  const { mon, sun } = getWeekBounds(dateStr);
  const weekEvents = allEvents.filter((e) => e.date >= mon && e.date <= sun);
  const weekHasCPI    = weekEvents.some((e) => e.id.startsWith("cpi_"));
  const weekHasFOMC   = weekEvents.some((e) => e.id.startsWith("fomc_"));
  const weekHasEarnings = weekEvents.some((e) => e.category === "earnings");

  const multiplierReasons: string[] = [];
  let multiplier = 1.0;

  if (weekHasCPI && weekHasFOMC) {
    multiplier = Math.max(multiplier, 1.3);
    multiplierReasons.push("CPI + FOMC 같은 주 ×1.3");
  }
  if (weekHasFOMC && weekHasEarnings) {
    const m = multiplier === 1.3 ? 1.3 * 1.2 : 1.2;
    if (m > multiplier) { multiplier = m; }
    multiplierReasons.push("FOMC + 실적 같은 주 ×1.2");
  }

  // Election multiplier (only when political events present today)
  const electionWindow = getElectionWindow(dateStr);
  const hasPolitical = dayEvents.some((e) => e.category === "political");
  if (electionWindow && hasPolitical) {
    if (electionWindow.multiplier > multiplier) {
      multiplier = electionWindow.multiplier;
    }
    multiplierReasons.push(`${electionWindow.label} ×${electionWindow.multiplier}`);
  }

  const adjustedScore = Math.round(rawScore * multiplier);

  return {
    baseScore, seasonalBonus, multiplier,
    adjustedScore,
    grade: getRiskGrade(adjustedScore),
    multiplierReasons, electionWindow, seasonalPeriods,
  };
}

// ─── AI comment generator ─────────────────────────────────────────────────────

export function generateAIComment(events: RiskEvent[], result: DayRiskResult): string {
  const { adjustedScore, electionWindow, seasonalPeriods } = result;
  const hasFOMC     = events.some((e) => e.id.startsWith("fomc_"));
  const hasCPI      = events.some((e) => e.id.startsWith("cpi_"));
  const hasNFP      = events.some((e) => e.id.startsWith("nfp_"));
  const hasQuad     = events.some((e) => e.id.startsWith("quad_"));
  const hasElection = events.some((e) => e.id === "midterm_2026");
  const hasShutdown = events.some((e) => e.id === "govt_shutdown");
  const hasJackson  = events.some((e) => e.id === "jackson_hole");
  const hasOpec     = events.some((e) => e.id.startsWith("opec_"));
  const earnings    = events.filter((e) => e.category === "earnings");

  let parts: string[] = [];

  if (hasFOMC && hasCPI) {
    parts.push("CPI 발표와 FOMC 금리 결정이 같은 날 겹치는 극고위험 구간입니다. 물가 데이터가 연준 결정에 직접 영향을 미쳐 채권·주식·달러 전반의 복합적 재평가가 예상됩니다.");
  } else if (hasFOMC) {
    parts.push("연준 금리 결정일입니다. 매파·비둘기파 서프라이즈 발생 시 성장주와 금리민감주 전반에 급격한 재평가가 이루어지며, 채권 금리 변동을 통한 연쇄 효과에 주목하세요.");
  } else if (hasCPI) {
    parts.push("소비자물가지수 발표일입니다. 헤드라인·근원 CPI의 컨센서스 편차가 향후 연준 행보를 결정짓는 핵심 변수로 작용하며, 금리 민감 섹터의 단기 변동성이 확대될 수 있습니다.");
  } else if (hasNFP) {
    parts.push("비농업 고용지표 발표일입니다. 노동시장 과열·냉각 여부가 연준의 다음 행보를 결정짓는 핵심 지표이며, 예상치 대비 큰 편차 발생 시 채권·성장주가 동시에 크게 움직일 수 있습니다.");
  } else if (hasQuad) {
    parts.push("분기 옵션·선물 동시 만기일(Quad Witching)입니다. 수급 주도형 변동성이 장 중 급격히 나타나며, 특히 시가·종가 근처에서 급등락이 발생할 수 있습니다. 만기 이후 수급 공백에 따른 방향 전환도 주요 관찰 포인트입니다.");
  } else if (hasElection) {
    parts.push("미국 중간선거일입니다. 의회 통제권 변화에 따라 재정·규제·에너지·방산 정책이 대폭 재편될 수 있으며, 결과 확정까지 수일간의 불확실성 구간이 지속됩니다.");
  } else if (hasShutdown) {
    parts.push("연방정부 재정 지출 기한 마감일입니다. 의회 합의 실패 시 셧다운이 발생하며, 경제지표 발표 지연·연방 계약 중단·시장 불확실성 확대가 우려됩니다.");
  } else if (hasJackson) {
    parts.push("잭슨홀 연례 심포지엄 연설일입니다. 연준 의장이 중장기 통화정책 방향성 힌트를 제공하며, 2013년 테이퍼링 예고 등 역사적으로 시장에 큰 충격을 준 이벤트입니다.");
  } else if (hasOpec) {
    parts.push("OPEC+ 회의 일정입니다. 원유 생산량 조정 결정이 에너지 섹터, 항공·운송·화학주, 그리고 글로벌 인플레이션 전망에 파급 효과를 미칩니다.");
  }

  if (earnings.length >= 2) {
    const names = earnings.slice(0, 3).map((e) => e.shortTitle).join(", ");
    parts.push(`${names} 등 주요 실적 발표가 집중됩니다. 가이던스 품질에 따라 섹터 전반의 단기 재평가가 이루어질 수 있으며, 발표 전후 IV crush 관리에 유의하세요.`);
  } else if (earnings.length === 1) {
    parts.push(`${earnings[0].shortTitle} 실적 발표가 예정되어 있습니다. 컨센서스 대비 실적 및 다음 분기 가이던스에 따라 관련 섹터 변동성이 확대될 수 있습니다.`);
  }

  if (electionWindow && !hasElection && !parts.length) {
    parts.push(`현재 ${electionWindow.label} 구간으로, 정치 리스크가 시장 변수로 서서히 부상하고 있습니다. ${electionWindow.description}`);
  }

  const hasSep = seasonalPeriods.some((p) => p.label.includes("9월"));
  const hasOct = seasonalPeriods.some((p) => p.label.includes("10월"));
  if (hasSep && !parts.length) {
    parts.push("역사적으로 9월은 미국 주식시장에서 평균 수익률이 가장 낮은 달입니다. 기관의 3분기 포트폴리오 조정이 집중되는 시기로 낙폭 확대에 유의하세요.");
  } else if (hasOct && !parts.length) {
    parts.push("10월은 역사적으로 시장 변동성이 높은 달로, 1987·2008 주요 폭락이 이 시기에 발생했습니다. 방어적 포지션 유지와 손절선 재확인을 권장합니다.");
  }

  if (!parts.length) {
    if (adjustedScore === 0) return "시장 주요 이벤트가 없는 조용한 날입니다. 장기 계획에 따른 운용을 유지하세요.";
    parts.push("시장 주요 이벤트가 예정된 날입니다. 발표 전후 단기 변동성 확대 가능성을 인지하고 모니터링을 유지하세요.");
  }

  return parts.join(" ");
}

export function getInvestmentCaution(score: number): string {
  if (score >= 17) return "신규 레버리지 진입 지양. 포지션 축소·헷지(풋 옵션, VIX 콜) 전략 적극 검토 권장. 현금 비중 확보 고려.";
  if (score >= 13) return "변동성 확대 구간. 손절선 재확인 및 포지션 규모 조정 권장. 레버리지 ETF 보유자는 배수 효과에 각별히 유의.";
  if (score >= 9)  return "주의 구간. 주요 이벤트 전후 급변동 가능성을 사전에 인지하고, 과도한 레버리지 사용을 삼가세요.";
  if (score >= 5)  return "모니터링 유지. 이벤트 결과에 따른 단기 변동이 가능하나 장기 포지션에 큰 영향을 줄 가능성은 낮습니다.";
  return "상대적으로 안정적인 구간입니다. 장기 계획에 따른 운용을 유지하세요.";
}

// ─── Portfolio sector map ─────────────────────────────────────────────────────

export const PORTFOLIO_MAP: Record<string, {
  name: string;
  sectors: string[];
  sensitiveCategories: EventCategory[];
  sensitiveIds: string[];
}> = {
  NVDA:  { name: "NVIDIA",           sectors: ["반도체","AI","데이터센터"], sensitiveCategories: ["macro","earnings"], sensitiveIds: ["nvda_","fomc_","cpi_"] },
  AMD:   { name: "AMD",              sectors: ["반도체","CPU"],            sensitiveCategories: ["macro","earnings"], sensitiveIds: ["fomc_","nvda_"] },
  SOXL:  { name: "반도체 3x ETF",    sectors: ["반도체","레버리지"],        sensitiveCategories: ["macro","earnings","options"], sensitiveIds: ["fomc_","nvda_","quad_","opex_"] },
  ASTS:  { name: "AST SpaceMobile",  sectors: ["우주","통신","소형주"],     sensitiveCategories: ["macro","political"], sensitiveIds: ["fomc_","cpi_"] },
  ETHU:  { name: "이더리움 ETF",      sectors: ["암호화폐","위험자산"],      sensitiveCategories: ["macro","political"], sensitiveIds: ["fomc_","cpi_","political"] },
  AAPL:  { name: "Apple",            sectors: ["테크","소비자","서비스"],   sensitiveCategories: ["macro","earnings"], sensitiveIds: ["aapl_","retail_","cpi_"] },
  MSFT:  { name: "Microsoft",        sectors: ["클라우드","AI","SW"],       sensitiveCategories: ["macro","earnings"], sensitiveIds: ["msft_","fomc_"] },
  TSLA:  { name: "Tesla",            sectors: ["전기차","성장주"],          sensitiveCategories: ["macro","earnings","geopolitical"], sensitiveIds: ["tsla_","fomc_"] },
  META:  { name: "Meta",             sectors: ["광고","AI","소셜"],         sensitiveCategories: ["macro","earnings","political"], sensitiveIds: ["meta_","fomc_"] },
  GOOGL: { name: "Alphabet",         sectors: ["광고","클라우드","AI"],     sensitiveCategories: ["macro","earnings","political"], sensitiveIds: ["googl_","fomc_"] },
  AMZN:  { name: "Amazon",           sectors: ["이커머스","클라우드"],      sensitiveCategories: ["macro","earnings"], sensitiveIds: ["amzn_","retail_"] },
  SPY:   { name: "S&P 500 ETF",      sectors: ["전체 시장"],               sensitiveCategories: ["macro","political","options"], sensitiveIds: ["fomc_","cpi_","nfp_","quad_"] },
  QQQ:   { name: "Nasdaq ETF",       sectors: ["기술주","성장주"],          sensitiveCategories: ["macro","earnings","options"], sensitiveIds: ["fomc_","nvda_","quad_"] },
  TLT:   { name: "장기채 ETF",        sectors: ["채권","금리민감"],          sensitiveCategories: ["macro"], sensitiveIds: ["fomc_","cpi_","pce_","nfp_"] },
  GLD:   { name: "금 ETF",           sectors: ["안전자산","원자재"],        sensitiveCategories: ["macro","geopolitical"], sensitiveIds: ["fomc_","cpi_","opec_"] },
  XLE:   { name: "에너지 ETF",        sectors: ["에너지","석유"],            sensitiveCategories: ["geopolitical"], sensitiveIds: ["opec_"] },
  "005930.KS": { name: "삼성전자",    sectors: ["반도체","가전"],           sensitiveCategories: ["macro","earnings","geopolitical"], sensitiveIds: ["nvda_","fomc_"] },
  "000660.KS": { name: "SK하이닉스", sectors: ["반도체","메모리"],          sensitiveCategories: ["macro","earnings"], sensitiveIds: ["nvda_","fomc_"] },
};

export function getPortfolioImpact(events: RiskEvent[], holdings: string[]): {
  ticker: string; name: string; affectedBy: string[];
}[] {
  return holdings.flatMap((ticker) => {
    const info = PORTFOLIO_MAP[ticker.toUpperCase()];
    if (!info) return [];
    const affectedBy = events
      .filter(
        (e) =>
          info.sensitiveCategories.includes(e.category) ||
          info.sensitiveIds.some((prefix) => e.id.startsWith(prefix))
      )
      .map((e) => e.shortTitle);
    if (!affectedBy.length) return [];
    return [{ ticker: ticker.toUpperCase(), name: info.name, affectedBy }];
  });
}

// ─── 2026 Risk Events ─────────────────────────────────────────────────────────

export const RISK_EVENTS: RiskEvent[] = [
  // ══ JANUARY 2026 ══════════════════════════════════════════════════════════
  { id:"nfp_2026_01",   date:"2026-01-09", title:"비농업 고용 (12월)", shortTitle:"NFP",     category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"12월 비농업부문 고용자수, 실업률, 평균임금 동시 발표. 노동시장 과열·냉각 여부가 연준 행보를 결정.", sectors:["전체 시장","금리민감"], isEstimate:true },
  { id:"jpmorgan_q4",   date:"2026-01-13", title:"JP모건 실적 (Q4 2025)", shortTitle:"JPM 실적", category:"earnings", baseScore:3, icon:"💰", time:"장 시작 전", description:"주요 은행 실적의 시발탄. 순이자마진, 대출 부실률, IB 수수료에 시장 주목.", sectors:["금융","은행"], isEstimate:true },
  { id:"cpi_2026_01",   date:"2026-01-14", title:"CPI (12월)", shortTitle:"CPI",          category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"12월 소비자물가지수 발표. 헤드라인·근원 CPI의 전년비·전월비 모두 주목.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_01",   date:"2026-01-15", title:"PPI (12월)", shortTitle:"PPI",          category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"생산자물가지수. CPI 선행 지표 역할로 향후 소비자 인플레이션 방향 힌트 제공.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_01",date:"2026-01-15", title:"소매판매 (12월)", shortTitle:"소매판매",  category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"12월 소비 지출 동향. 연말 쇼핑 시즌 결과 확인.", sectors:["소비재","이커머스"], isEstimate:true },
  { id:"opex_2026_01",  date:"2026-01-16", title:"월간 옵션 만기", shortTitle:"OpEx",       category:"options",  baseScore:3, icon:"📉", description:"1월 월간 옵션 만기일. 감마 헷지 해소로 인한 수급 변동성 유발.", sectors:["전체 시장"], isEstimate:false },
  { id:"netflix_q4",    date:"2026-01-21", title:"넷플릭스 실적 (Q4 2025)", shortTitle:"NFLX 실적", category:"earnings", baseScore:2, icon:"💰", time:"장 마감 후", description:"4분기 구독자 수, 광고 매출, 가이던스 발표.", sectors:["미디어","스트리밍"], isEstimate:true },
  { id:"msft_q4",       date:"2026-01-28", title:"마이크로소프트 실적 (Q4 2025)", shortTitle:"MSFT 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"Azure 클라우드 성장률, AI 코파일럿 수익화 현황이 핵심.", sectors:["테크","클라우드","AI"], isEstimate:true },
  { id:"meta_q4",       date:"2026-01-28", title:"메타 실적 (Q4 2025)", shortTitle:"META 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"광고 매출 성장률과 AI 인프라 투자 규모에 시장 집중.", sectors:["소셜미디어","광고"], isEstimate:true },
  { id:"fomc_2026_01",  date:"2026-01-28", title:"FOMC 금리 결정", shortTitle:"FOMC",       category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"연방공개시장위원회 금리 결정 및 성명 발표. 향후 금리 경로에 대한 포워드 가이던스 주목.", sectors:["전체 시장","채권","성장주","금융"], isEstimate:true },
  { id:"tsla_q4",       date:"2026-01-29", title:"테슬라 실적 (Q4 2025)", shortTitle:"TSLA 실적", category:"earnings", baseScore:3, icon:"💰", time:"장 마감 후", description:"차량 인도량, 에너지 부문, FSD 수익화 현황 발표.", sectors:["전기차","성장주"], isEstimate:true },
  { id:"aapl_q4",       date:"2026-01-29", title:"애플 실적 (Q4 2025)", shortTitle:"AAPL 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"iPhone 판매량, 서비스 매출, 중국 사업 비중 점검.", sectors:["테크","소비자가전"], isEstimate:true },
  { id:"gdp_q4_2025",   date:"2026-01-29", title:"GDP 속보치 (Q4 2025)", shortTitle:"GDP 속보", category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"2025년 4분기 실질 GDP 성장률 속보치. 연간 경제 성과 종합 확인.", sectors:["전체 시장"], isEstimate:true },
  { id:"pce_2026_01",   date:"2026-01-30", title:"PCE 물가 (12월)", shortTitle:"PCE",       category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"연준이 가장 중시하는 인플레이션 지표. 근원 PCE 전년비가 핵심.", sectors:["채권","성장주"], isEstimate:true },

  // ══ FEBRUARY 2026 ═════════════════════════════════════════════════════════
  { id:"opec_2026_02",  date:"2026-02-01", title:"OPEC+ 회의", shortTitle:"OPEC",           category:"geopolitical", baseScore:4, icon:"🛢️", description:"원유 생산량 조정 결정. 유가 방향성이 에너지·항공·운송·화학 섹터에 파급.", sectors:["에너지","원자재"], isEstimate:true },
  { id:"nfp_2026_02",   date:"2026-02-06", title:"비농업 고용 (1월)", shortTitle:"NFP",      category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"1월 고용 동향. 새해 초 노동시장 방향성 확인.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"amzn_q4",       date:"2026-02-05", title:"아마존 실적 (Q4 2025)", shortTitle:"AMZN 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"AWS 성장률, 광고 수익, 이커머스 마진 개선 여부 주목.", sectors:["클라우드","이커머스"], isEstimate:true },
  { id:"googl_q4",      date:"2026-02-04", title:"알파벳 실적 (Q4 2025)", shortTitle:"GOOGL 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"구글 검색 광고, YouTube, Google Cloud 성장률 점검.", sectors:["광고","클라우드"], isEstimate:true },
  { id:"cpi_2026_02",   date:"2026-02-11", title:"CPI (1월)", shortTitle:"CPI",              category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"1월 소비자물가지수. 새해 가격 책정(January effect) 확인.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_02",   date:"2026-02-12", title:"PPI (1월)", shortTitle:"PPI",              category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"1월 생산자물가지수 발표.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_02",date:"2026-02-13", title:"소매판매 (1월)", shortTitle:"소매판매",     category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"1월 소비 지출 동향.", sectors:["소비재"], isEstimate:true },
  { id:"powell_h1",     date:"2026-02-11", title:"파월 의회 증언 (상반기)", shortTitle:"파월 증언", category:"macro",  baseScore:4, icon:"🏦", description:"연준 의장 반기별 의회 증언. 통화정책 현황 및 경제 전망 공식 보고.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"opex_2026_02",  date:"2026-02-20", title:"월간 옵션 만기", shortTitle:"OpEx",          category:"options",  baseScore:3, icon:"📉", description:"2월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"nvda_q4",       date:"2026-02-26", title:"엔비디아 실적 (Q4 FY2026)", shortTitle:"NVDA 실적", category:"earnings", baseScore:5, icon:"💰", time:"장 마감 후", description:"Blackwell GPU 출하량, 데이터센터 매출, 중국 수출 규제 영향이 핵심 변수.", sectors:["반도체","AI","데이터센터"], isEstimate:true },
  { id:"pce_2026_02",   date:"2026-02-27", title:"PCE 물가 (1월)", shortTitle:"PCE",          category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"1월 PCE 물가 발표.", sectors:["채권","성장주"], isEstimate:true },

  // ══ MARCH 2026 ════════════════════════════════════════════════════════════
  { id:"nfp_2026_03",   date:"2026-03-06", title:"비농업 고용 (2월)", shortTitle:"NFP",        category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"2월 고용 동향. FOMC 전 최종 주요 노동지표.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"cpi_2026_03",   date:"2026-03-11", title:"CPI (2월)", shortTitle:"CPI",                category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"FOMC 1주일 전 발표되는 중요 물가 데이터.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_03",   date:"2026-03-12", title:"PPI (2월)", shortTitle:"PPI",                category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"2월 생산자물가지수 발표.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_03",date:"2026-03-13", title:"소매판매 (2월)", shortTitle:"소매판매",        category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"2월 소비 지출 동향.", sectors:["소비재"], isEstimate:true },
  { id:"fomc_2026_03",  date:"2026-03-18", title:"FOMC 금리 결정 + SEP", shortTitle:"FOMC+SEP", category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"분기별 경제전망요약(SEP)과 점도표 동시 발표. 연간 금리 경로 제시로 시장 영향 극대화.", sectors:["전체 시장","채권","성장주","금융"], isEstimate:true },
  { id:"quad_2026_03",  date:"2026-03-20", title:"Quad Witching (Q1)", shortTitle:"쿼드위칭",    category:"options",  baseScore:6, icon:"📉", description:"주식·ETF·주가지수 선물·옵션 동시 만기. 연간 4회 중 1회차로 수급 충격이 가장 큰 이벤트.", sectors:["전체 시장"], isEstimate:false },
  { id:"pce_2026_03",   date:"2026-03-27", title:"PCE 물가 (2월)", shortTitle:"PCE",            category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"2월 PCE 물가 발표. FOMC 직후 공개되는 연준 선호 물가 지표.", sectors:["채권","성장주"], isEstimate:true },
  { id:"qtr_end_q1",    date:"2026-03-31", title:"Q1 분기말 리밸런싱", shortTitle:"Q1 리밸런싱",  category:"options",  baseScore:3, icon:"📉", description:"기관 포트폴리오의 분기 리밸런싱 집중. 대형주·채권 수급 변동 유발.", sectors:["전체 시장"], isEstimate:false },

  // ══ APRIL 2026 ════════════════════════════════════════════════════════════
  { id:"nfp_2026_04",   date:"2026-04-03", title:"비농업 고용 (3월)", shortTitle:"NFP",          category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"3월 고용 동향. 1분기 노동시장 종합 평가.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"opec_2026_04",  date:"2026-04-04", title:"OPEC+ 회의", shortTitle:"OPEC",                category:"geopolitical", baseScore:4, icon:"🛢️", description:"원유 생산량 조정 결정. 유가 방향성에 영향.", sectors:["에너지","원자재"], isEstimate:true },
  { id:"cpi_2026_04",   date:"2026-04-09", title:"CPI (3월)", shortTitle:"CPI",                  category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"1분기 물가 마무리. FOMC 전 핵심 데이터.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_04",   date:"2026-04-10", title:"PPI (3월)", shortTitle:"PPI",                  category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"3월 생산자물가지수 발표.", sectors:["소재","에너지"], isEstimate:true },
  { id:"jpmorgan_q1",   date:"2026-04-14", title:"JP모건 실적 (Q1 2026)", shortTitle:"JPM 실적",  category:"earnings", baseScore:3, icon:"💰", time:"장 시작 전", description:"1분기 은행 실적 시즌 개막. 순이자마진과 신용 리스크 동향.", sectors:["금융","은행"], isEstimate:true },
  { id:"opex_2026_04",  date:"2026-04-17", title:"월간 옵션 만기", shortTitle:"OpEx",              category:"options",  baseScore:3, icon:"📉", description:"4월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"tsla_q1",       date:"2026-04-22", title:"테슬라 실적 (Q1 2026)", shortTitle:"TSLA 실적",  category:"earnings", baseScore:3, icon:"💰", time:"장 마감 후", description:"1분기 차량 인도량과 에너지 사업 현황. 마진율 개선 여부 핵심.", sectors:["전기차","성장주"], isEstimate:true },
  { id:"pce_2026_04",   date:"2026-04-24", title:"PCE 물가 (3월)", shortTitle:"PCE",              category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"3월 PCE 물가. 1분기 연준 선호 물가 지표 종합.", sectors:["채권","성장주"], isEstimate:true },
  { id:"msft_q1",       date:"2026-04-28", title:"마이크로소프트 실적 (Q1 2026)", shortTitle:"MSFT 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"Azure·AI 성장률, 클라우드 마진율 주목.", sectors:["테크","클라우드"], isEstimate:true },
  { id:"fomc_2026_04",  date:"2026-04-29", title:"FOMC 금리 결정", shortTitle:"FOMC",              category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"4월 FOMC 금리 결정. 전분기 SEP 이후 첫 번째 중간 점검.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"gdp_q1_2026",   date:"2026-04-29", title:"GDP 속보치 (Q1 2026)", shortTitle:"GDP 속보",    category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"1분기 실질 GDP 성장률 속보치. FOMC 당일 발표로 복합 변동성 유발.", sectors:["전체 시장"], isEstimate:true },
  { id:"meta_q1",       date:"2026-04-29", title:"메타 실적 (Q1 2026)", shortTitle:"META 실적",    category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"광고 매출과 AI 투자 현황.", sectors:["광고","AI"], isEstimate:true },
  { id:"aapl_q1",       date:"2026-04-30", title:"애플 실적 (Q1 2026)", shortTitle:"AAPL 실적",    category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"서비스 매출 성장률과 iPhone 판매 동향.", sectors:["테크","소비자가전"], isEstimate:true },

  // ══ MAY 2026 ══════════════════════════════════════════════════════════════
  { id:"nfp_2026_05",   date:"2026-05-01", title:"비농업 고용 (4월)", shortTitle:"NFP",            category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"4월 고용 동향.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"amzn_q1",       date:"2026-05-01", title:"아마존 실적 (Q1 2026)", shortTitle:"AMZN 실적",   category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"AWS 성장률과 이커머스 마진 동향.", sectors:["클라우드","이커머스"], isEstimate:true },
  { id:"googl_q1",      date:"2026-05-05", title:"알파벳 실적 (Q1 2026)", shortTitle:"GOOGL 실적",  category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"검색 광고·YouTube·Google Cloud 성장률.", sectors:["광고","클라우드"], isEstimate:true },
  { id:"cpi_2026_05",   date:"2026-05-13", title:"CPI (4월)", shortTitle:"CPI",                    category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"4월 소비자물가지수.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"opex_2026_05",  date:"2026-05-15", title:"월간 옵션 만기", shortTitle:"OpEx",                category:"options",  baseScore:3, icon:"📉", description:"5월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"nvda_q1",       date:"2026-05-27", title:"엔비디아 실적 (Q1 FY2027)", shortTitle:"NVDA 실적", category:"earnings", baseScore:5, icon:"💰", time:"장 마감 후", description:"AI GPU 수요, Blackwell 공급 현황, 데이터센터 매출 성장률이 AI 테마 전체 방향을 좌우.", sectors:["반도체","AI"], isEstimate:true },
  { id:"pce_2026_05",   date:"2026-05-29", title:"PCE 물가 (4월)", shortTitle:"PCE",                category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"4월 PCE 물가 발표.", sectors:["채권","성장주"], isEstimate:true },

  // ══ JUNE 2026 ══════════════════════════════════════════════════════════════
  { id:"opec_2026_06",  date:"2026-06-06", title:"OPEC+ 회의", shortTitle:"OPEC",                  category:"geopolitical", baseScore:4, icon:"🛢️", description:"원유 생산량 조정 결정. 상반기 마지막 OPEC 회의.", sectors:["에너지","원자재"], isEstimate:true },
  { id:"nfp_2026_06",   date:"2026-06-05", title:"비농업 고용 (5월)", shortTitle:"NFP",              category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"5월 고용 동향. FOMC 전 최종 고용 데이터.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"cpi_2026_06",   date:"2026-06-10", title:"CPI (5월)", shortTitle:"CPI",                    category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"FOMC 당일 발표. 물가 데이터와 금리 결정이 동시에 시장을 흔드는 극고위험 일정.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"fomc_2026_06",  date:"2026-06-10", title:"FOMC 금리 결정 + SEP", shortTitle:"FOMC+SEP",    category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"CPI와 동일 날짜 발표. SEP·점도표 포함. 상반기 통화정책 최종 정리.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_06",   date:"2026-06-11", title:"PPI (5월)", shortTitle:"PPI",                    category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"5월 생산자물가지수 발표.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_06",date:"2026-06-12", title:"소매판매 (5월)", shortTitle:"소매판매",             category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"5월 소비 지출 동향.", sectors:["소비재"], isEstimate:true },
  { id:"quad_2026_06",  date:"2026-06-19", title:"Quad Witching (Q2)", shortTitle:"쿼드위칭",         category:"options",  baseScore:6, icon:"📉", description:"2분기 선물·옵션 동시 만기. 분기 중 수급 충격이 가장 큰 이벤트.", sectors:["전체 시장"], isEstimate:false },
  { id:"pce_2026_06",   date:"2026-06-26", title:"PCE 물가 (5월)", shortTitle:"PCE",                category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"5월 PCE 물가 발표.", sectors:["채권","성장주"], isEstimate:true },
  { id:"russell_rebal", date:"2026-06-26", title:"Russell 2000 리밸런싱", shortTitle:"러셀 리밸런싱",  category:"options",  baseScore:4, icon:"📉", description:"Russell 지수 연간 구성 종목 재조정. 편입·편출 종목 중심의 수급 충격 발생.", sectors:["소형주","ETF"], isEstimate:false },
  { id:"qtr_end_q2",    date:"2026-06-30", title:"Q2 분기말 리밸런싱", shortTitle:"Q2 리밸런싱",       category:"options",  baseScore:3, icon:"📉", description:"기관 반기 리밸런싱 집중. 대규모 자금 이동 발생.", sectors:["전체 시장"], isEstimate:false },

  // ══ JULY 2026 ══════════════════════════════════════════════════════════════
  { id:"nfp_2026_07",   date:"2026-07-10", title:"비농업 고용 (6월)", shortTitle:"NFP",              category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"7/4 연휴로 발표 지연. 6월 고용 동향.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"cpi_2026_07",   date:"2026-07-14", title:"CPI (6월)", shortTitle:"CPI",                    category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"6월 소비자물가지수. 상반기 물가 추세 종합.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"jpmorgan_q2",   date:"2026-07-14", title:"JP모건 실적 (Q2 2026)", shortTitle:"JPM 실적",      category:"earnings", baseScore:3, icon:"💰", time:"장 시작 전", description:"2분기 은행 실적 시즌 개막.", sectors:["금융","은행"], isEstimate:true },
  { id:"ppi_2026_07",   date:"2026-07-15", title:"PPI (6월)", shortTitle:"PPI",                    category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"6월 생산자물가지수 발표.", sectors:["소재","에너지"], isEstimate:true },
  { id:"powell_h2",     date:"2026-07-15", title:"파월 의회 증언 (하반기)", shortTitle:"파월 증언",     category:"macro",    baseScore:4, icon:"🏦", description:"연준 의장 하반기 의회 증언. 금리 정책 방향 재확인.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"opex_2026_07",  date:"2026-07-17", title:"월간 옵션 만기", shortTitle:"OpEx",                 category:"options",  baseScore:3, icon:"📉", description:"7월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"tsla_q2",       date:"2026-07-23", title:"테슬라 실적 (Q2 2026)", shortTitle:"TSLA 실적",      category:"earnings", baseScore:3, icon:"💰", time:"장 마감 후", description:"2분기 차량 인도량과 에너지 사업 현황.", sectors:["전기차","성장주"], isEstimate:true },
  { id:"msft_q2",       date:"2026-07-29", title:"마이크로소프트 실적 (Q2 2026)", shortTitle:"MSFT 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"Azure·AI 성장률 점검.", sectors:["테크","클라우드"], isEstimate:true },
  { id:"fomc_2026_07",  date:"2026-07-29", title:"FOMC 금리 결정", shortTitle:"FOMC",                 category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"7월 FOMC 금리 결정. 실적 시즌 한가운데 발표.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"gdp_q2_2026",   date:"2026-07-30", title:"GDP 속보치 (Q2 2026)", shortTitle:"GDP 속보",        category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"2분기 GDP 속보치. 상반기 경제 성과 종합.", sectors:["전체 시장"], isEstimate:true },
  { id:"meta_q2",       date:"2026-07-30", title:"메타 실적 (Q2 2026)", shortTitle:"META 실적",         category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"2분기 광고 매출과 AI 투자 현황.", sectors:["광고","AI"], isEstimate:true },
  { id:"aapl_q2",       date:"2026-07-31", title:"애플 실적 (Q2 2026)", shortTitle:"AAPL 실적",         category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"서비스 매출과 iPhone 판매 동향.", sectors:["테크","소비자가전"], isEstimate:true },
  { id:"pce_2026_07",   date:"2026-07-31", title:"PCE 물가 (6월)", shortTitle:"PCE",                  category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"6월 PCE 물가. FOMC 직후 발표.", sectors:["채권","성장주"], isEstimate:true },

  // ══ AUGUST 2026 ════════════════════════════════════════════════════════════
  { id:"opec_2026_08",  date:"2026-08-01", title:"OPEC+ 회의", shortTitle:"OPEC",                    category:"geopolitical", baseScore:4, icon:"🛢️", description:"원유 생산량 하반기 방향 결정.", sectors:["에너지","원자재"], isEstimate:true },
  { id:"amzn_q2",       date:"2026-08-01", title:"아마존 실적 (Q2 2026)", shortTitle:"AMZN 실적",      category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"AWS·광고·이커머스 2분기 현황.", sectors:["클라우드","이커머스"], isEstimate:true },
  { id:"googl_q2",      date:"2026-08-04", title:"알파벳 실적 (Q2 2026)", shortTitle:"GOOGL 실적",      category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"검색 광고·클라우드 2분기 성장률.", sectors:["광고","클라우드"], isEstimate:true },
  { id:"nfp_2026_08",   date:"2026-08-07", title:"비농업 고용 (7월)", shortTitle:"NFP",                category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"7월 고용 동향.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"cpi_2026_08",   date:"2026-08-11", title:"CPI (7월)", shortTitle:"CPI",                      category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"7월 소비자물가지수.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_08",   date:"2026-08-12", title:"PPI (7월)", shortTitle:"PPI",                      category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"7월 생산자물가지수.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_08",date:"2026-08-14", title:"소매판매 (7월)", shortTitle:"소매판매",               category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"7월 소비 지출 동향.", sectors:["소비재"], isEstimate:true },
  { id:"opex_2026_08",  date:"2026-08-21", title:"월간 옵션 만기", shortTitle:"OpEx",                   category:"options",  baseScore:3, icon:"📉", description:"8월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"jackson_hole",  date:"2026-08-22", title:"잭슨홀 심포지엄 (파월 연설)", shortTitle:"잭슨홀",     category:"macro",    baseScore:4, icon:"🏦", description:"캔자스시티 연준 연례 심포지엄. 중장기 통화정책 힌트 제공. 2013 테이퍼링, 2022 긴축 예고 등 역사적 충격 이벤트.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"nvda_q2",       date:"2026-08-27", title:"엔비디아 실적 (Q2 FY2027)", shortTitle:"NVDA 실적",   category:"earnings", baseScore:5, icon:"💰", time:"장 마감 후", description:"AI GPU 수요 2분기 현황. 하반기 데이터센터 투자 사이클 확인.", sectors:["반도체","AI"], isEstimate:true },
  { id:"pce_2026_08",   date:"2026-08-28", title:"PCE 물가 (7월)", shortTitle:"PCE",                  category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"7월 PCE 물가 발표.", sectors:["채권","성장주"], isEstimate:true },

  // ══ SEPTEMBER 2026 ═════════════════════════════════════════════════════════
  { id:"nfp_2026_09",   date:"2026-09-04", title:"비농업 고용 (8월)", shortTitle:"NFP",                category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"8월 고용 동향. FOMC 2주 전 발표.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"cpi_2026_09",   date:"2026-09-09", title:"CPI (8월)", shortTitle:"CPI",                      category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"FOMC 1주일 전 발표. 통화정책 결정의 핵심 입력값.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_09",   date:"2026-09-10", title:"PPI (8월)", shortTitle:"PPI",                      category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"8월 생산자물가지수.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_09",date:"2026-09-11", title:"소매판매 (8월)", shortTitle:"소매판매",               category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"8월 소비 지출 동향.", sectors:["소비재"], isEstimate:true },
  { id:"fomc_2026_09",  date:"2026-09-16", title:"FOMC 금리 결정 + SEP", shortTitle:"FOMC+SEP",      category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"3분기 SEP·점도표 발표. 연말까지의 금리 경로 제시.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"quad_2026_09",  date:"2026-09-18", title:"Quad Witching (Q3)", shortTitle:"쿼드위칭",          category:"options",  baseScore:6, icon:"📉", description:"3분기 선물·옵션 동시 만기. FOMC 직후 발생으로 변동성 극대화 가능성.", sectors:["전체 시장"], isEstimate:false },
  { id:"pce_2026_09",   date:"2026-09-25", title:"PCE 물가 (8월)", shortTitle:"PCE",                  category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"8월 PCE 물가 발표.", sectors:["채권","성장주"], isEstimate:true },
  { id:"govt_shutdown", date:"2026-09-30", title:"정부 셧다운 마감 기한", shortTitle:"셧다운 위험",      category:"political",baseScore:7, icon:"🗳️", description:"연방정부 회계연도 종료. 의회 합의 미달 시 셧다운 발생. 경제지표 발표 중단·시장 불확실성 급증.", sectors:["전체 시장","방산","정부계약"], isEstimate:false },
  { id:"qtr_end_q3",    date:"2026-09-30", title:"Q3 분기말 리밸런싱", shortTitle:"Q3 리밸런싱",         category:"options",  baseScore:3, icon:"📉", description:"기관 3분기 리밸런싱 집중.", sectors:["전체 시장"], isEstimate:false },

  // ══ OCTOBER 2026 ═══════════════════════════════════════════════════════════
  { id:"nfp_2026_10",   date:"2026-10-02", title:"비농업 고용 (9월)", shortTitle:"NFP",                category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"3분기 마지막 고용 데이터.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"opec_2026_10",  date:"2026-10-03", title:"OPEC+ 회의", shortTitle:"OPEC",                    category:"geopolitical", baseScore:4, icon:"🛢️", description:"원유 생산량 4분기 방향 결정.", sectors:["에너지","원자재"], isEstimate:true },
  { id:"cpi_2026_10",   date:"2026-10-13", title:"CPI (9월)", shortTitle:"CPI",                      category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"3분기 물가 마무리.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"jpmorgan_q3",   date:"2026-10-13", title:"JP모건 실적 (Q3 2026)", shortTitle:"JPM 실적",       category:"earnings", baseScore:3, icon:"💰", time:"장 시작 전", description:"3분기 은행 실적 시즌 개막.", sectors:["금융","은행"], isEstimate:true },
  { id:"ppi_2026_10",   date:"2026-10-14", title:"PPI (9월)", shortTitle:"PPI",                      category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"9월 생산자물가지수.", sectors:["소재","에너지"], isEstimate:true },
  { id:"opex_2026_10",  date:"2026-10-16", title:"월간 옵션 만기", shortTitle:"OpEx",                   category:"options",  baseScore:3, icon:"📉", description:"10월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"tsla_q3",       date:"2026-10-22", title:"테슬라 실적 (Q3 2026)", shortTitle:"TSLA 실적",       category:"earnings", baseScore:3, icon:"💰", time:"장 마감 후", description:"3분기 차량 인도량과 자율주행 현황.", sectors:["전기차","성장주"], isEstimate:true },
  { id:"googl_q3",      date:"2026-10-27", title:"알파벳 실적 (Q3 2026)", shortTitle:"GOOGL 실적",      category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"3분기 검색 광고·클라우드 성장률.", sectors:["광고","클라우드"], isEstimate:true },
  { id:"msft_q3",       date:"2026-10-28", title:"마이크로소프트 실적 (Q3 2026)", shortTitle:"MSFT 실적", category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"Azure·AI 3분기 성장률.", sectors:["테크","클라우드"], isEstimate:true },
  { id:"fomc_2026_10",  date:"2026-10-28", title:"FOMC 금리 결정", shortTitle:"FOMC",                  category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"실적 시즌 한가운데 FOMC. 선거 1주일 전으로 정치 불확실성 복합.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"gdp_q3_2026",   date:"2026-10-29", title:"GDP 속보치 (Q3 2026)", shortTitle:"GDP 속보",         category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"3분기 GDP 속보치.", sectors:["전체 시장"], isEstimate:true },
  { id:"meta_q3",       date:"2026-10-29", title:"메타 실적 (Q3 2026)", shortTitle:"META 실적",          category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"3분기 광고 매출과 AI 투자 현황.", sectors:["광고","AI"], isEstimate:true },
  { id:"aapl_q3",       date:"2026-10-30", title:"애플 실적 (Q3 2026)", shortTitle:"AAPL 실적",          category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"서비스·iPhone 3분기 동향.", sectors:["테크","소비자가전"], isEstimate:true },
  { id:"pce_2026_10",   date:"2026-10-30", title:"PCE 물가 (9월)", shortTitle:"PCE",                   category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"9월 PCE 물가 발표.", sectors:["채권","성장주"], isEstimate:true },

  // ══ NOVEMBER 2026 ══════════════════════════════════════════════════════════
  { id:"amzn_q3",       date:"2026-10-31", title:"아마존 실적 (Q3 2026)", shortTitle:"AMZN 실적",       category:"earnings", baseScore:4, icon:"💰", time:"장 마감 후", description:"AWS·이커머스 3분기 현황.", sectors:["클라우드","이커머스"], isEstimate:true },
  { id:"midterm_2026",  date:"2026-11-03", title:"미국 중간선거", shortTitle:"중간선거",                  category:"political",baseScore:9, icon:"🗳️", description:"상원·하원 선거. 의회 통제권 변화에 따라 재정정책·규제·방산·에너지 섹터 재편 가능. 결과 확정까지 수일간 불확실성 지속.", sectors:["전체 시장","방산","에너지","금융","성장주"], isEstimate:false },
  { id:"nfp_2026_11",   date:"2026-11-06", title:"비농업 고용 (10월)", shortTitle:"NFP",                category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"10월 고용 동향. 선거 직후 경제 지표 확인.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"cpi_2026_11",   date:"2026-11-12", title:"CPI (10월)", shortTitle:"CPI",                      category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"10월 소비자물가지수. 선거 후 정책 변화 기대와 물가 동향의 상호작용.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_11",   date:"2026-11-13", title:"PPI (10월)", shortTitle:"PPI",                      category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"10월 생산자물가지수.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_11",date:"2026-11-13", title:"소매판매 (10월)", shortTitle:"소매판매",               category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"10월 소비 지출 동향.", sectors:["소비재"], isEstimate:true },
  { id:"nvda_q3",       date:"2026-11-19", title:"엔비디아 실적 (Q3 FY2027)", shortTitle:"NVDA 실적",   category:"earnings", baseScore:5, icon:"💰", time:"장 마감 후", description:"AI GPU 3분기 수요와 연말 수주 현황.", sectors:["반도체","AI"], isEstimate:true },
  { id:"opex_2026_11",  date:"2026-11-20", title:"월간 옵션 만기", shortTitle:"OpEx",                   category:"options",  baseScore:3, icon:"📉", description:"11월 월간 옵션 만기일.", sectors:["전체 시장"], isEstimate:false },
  { id:"pce_2026_11",   date:"2026-11-25", title:"PCE 물가 (10월)", shortTitle:"PCE",                  category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"10월 PCE 물가. 추수감사절 전날 조기 발표.", sectors:["채권","성장주"], isEstimate:true },

  // ══ DECEMBER 2026 ══════════════════════════════════════════════════════════
  { id:"nfp_2026_12",   date:"2026-12-04", title:"비농업 고용 (11월)", shortTitle:"NFP",                category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"11월 고용 동향. 연말 연준 결정의 최종 고용 입력값.", sectors:["전체 시장","채권"], isEstimate:true },
  { id:"opec_2026_12",  date:"2026-12-05", title:"OPEC+ 회의", shortTitle:"OPEC",                    category:"geopolitical", baseScore:4, icon:"🛢️", description:"연말 원유 생산량 결정. 내년도 에너지 방향성 가이드.", sectors:["에너지","원자재"], isEstimate:true },
  { id:"cpi_2026_12",   date:"2026-12-09", title:"CPI (11월)", shortTitle:"CPI",                      category:"macro",    baseScore:5, icon:"📈", time:"08:30 ET", description:"FOMC 당일 발표. 연말 복합 위험 구간.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"fomc_2026_12",  date:"2026-12-09", title:"FOMC 금리 결정 + SEP", shortTitle:"FOMC+SEP",       category:"macro",    baseScore:7, icon:"🏦", time:"14:00 ET", description:"연말 SEP·점도표 발표. CPI와 동일 날짜. 내년도 통화정책 경로 제시로 연말 시장 방향 결정.", sectors:["전체 시장","채권","성장주"], isEstimate:true },
  { id:"ppi_2026_12",   date:"2026-12-10", title:"PPI (11월)", shortTitle:"PPI",                      category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"11월 생산자물가지수.", sectors:["소재","에너지"], isEstimate:true },
  { id:"retail_2026_12",date:"2026-12-11", title:"소매판매 (11월)", shortTitle:"소매판매",               category:"macro",    baseScore:2, icon:"📈", time:"08:30 ET", description:"블랙프라이데이·사이버먼데이 소비 데이터 포함.", sectors:["소비재","이커머스"], isEstimate:true },
  { id:"quad_2026_12",  date:"2026-12-18", title:"Quad Witching (Q4)", shortTitle:"쿼드위칭",           category:"options",  baseScore:6, icon:"📉", description:"연간 마지막 Quad Witching. 연말 세금 손실 매도와 복합 작용.", sectors:["전체 시장"], isEstimate:false },
  { id:"pce_2026_12",   date:"2026-12-23", title:"PCE 물가 (11월)", shortTitle:"PCE",                  category:"macro",    baseScore:3, icon:"📈", time:"08:30 ET", description:"11월 PCE 물가. 크리스마스 직전 발표.", sectors:["채권","성장주"], isEstimate:true },
  { id:"qtr_end_q4",    date:"2026-12-31", title:"Q4·연말 리밸런싱", shortTitle:"연말 리밸런싱",           category:"options",  baseScore:3, icon:"📉", description:"연말 기관 포트폴리오 최종 조정. 세금 손실 매도 마감.", sectors:["전체 시장"], isEstimate:false },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getEventsByDate(date: string): RiskEvent[] {
  return RISK_EVENTS.filter((e) => e.date === date);
}

export function getEventsInMonth(year: number, month: number): RiskEvent[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return RISK_EVENTS.filter((e) => e.date.startsWith(prefix));
}

export function buildMonthRiskMap(
  year: number,
  month: number,
  activeCategories: Set<EventCategory> | null
): Map<string, { events: RiskEvent[]; result: DayRiskResult }> {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = RISK_EVENTS.filter((e) => e.date.startsWith(prefix));
  const map = new Map<string, { events: RiskEvent[]; result: DayRiskResult }>();

  const dateSet = new Set(monthEvents.map((e) => e.date));
  for (const dateStr of dateSet) {
    const allDayEvents = monthEvents.filter((e) => e.date === dateStr);
    const visibleEvents =
      activeCategories === null
        ? allDayEvents
        : allDayEvents.filter((e) => activeCategories.has(e.category));
    const result = calculateDayRisk(dateStr, allDayEvents, RISK_EVENTS); // always use all events for score
    map.set(dateStr, { events: visibleEvents, result });
  }

  // Add dates in seasonal periods that have no events
  const seasonalDates = getSeasonalDatesInMonth(year, month);
  for (const dateStr of seasonalDates) {
    if (!map.has(dateStr)) {
      const result = calculateDayRisk(dateStr, [], RISK_EVENTS);
      if (result.seasonalBonus > 0) {
        map.set(dateStr, { events: [], result });
      }
    }
  }

  return map;
}

function getSeasonalDatesInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

export function getUpcomingEvents(days = 60): RiskEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureStr = future.toISOString().slice(0, 10);
  return RISK_EVENTS.filter((e) => e.date >= today && e.date <= futureStr).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}
