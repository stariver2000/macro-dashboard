export type ChartType = "line" | "area" | "bar";

export interface Indicator {
  id: string;
  name: string;
  description: string;
  fredSeries?: string;    // FRED series ID
  shillerKey?: string;    // Shiller dataset field name (e.g. "cape")
  yahooSymbol?: string;   // Yahoo Finance ticker (e.g. "HG=F")
  unit: string;
  category: "market" | "credit" | "macro" | "commodity";
  chartType: ChartType;
  color: string;
  invertAxis?: boolean;
}

export const AVAILABLE_INDICATORS: Indicator[] = [
  {
    id: "cape",
    name: "CAPE Ratio (Shiller P/E)",
    description: "주식시장 사이클 조정 주가수익비율 - 10년 평균 실질이익 기준",
    shillerKey: "cape",
    unit: "배",
    category: "market",
    chartType: "line",
    color: "#6366f1",
  },
  {
    id: "hy_spread",
    name: "HY 신용스프레드",
    description: "ICE BofA 미국 하이일드 옵션조정 스프레드",
    fredSeries: "BAMLH0A0HYM2",
    unit: "%",
    category: "credit",
    chartType: "area",
    color: "#ef4444",
  },
  {
    id: "ig_spread",
    name: "IG 신용스프레드",
    description: "ICE BofA 미국 투자등급 옵션조정 스프레드",
    fredSeries: "BAMLC0A0CM",
    unit: "%",
    category: "credit",
    chartType: "area",
    color: "#f97316",
  },
  {
    id: "treasury_10y",
    name: "미국 10년 국채금리",
    description: "미국 10년 만기 국채 수익률",
    fredSeries: "DGS10",
    unit: "%",
    category: "macro",
    chartType: "line",
    color: "#3b82f6",
  },
  {
    id: "treasury_2y",
    name: "미국 2년 국채금리",
    description: "미국 2년 만기 국채 수익률",
    fredSeries: "DGS2",
    unit: "%",
    category: "macro",
    chartType: "line",
    color: "#22c55e",
  },
  {
    id: "yield_curve",
    name: "장단기 금리차 (10Y-2Y)",
    description: "10년물 - 2년물 스프레드, 음수면 역전",
    fredSeries: "T10Y2Y",
    unit: "%",
    category: "macro",
    chartType: "area",
    color: "#a855f7",
  },
  {
    id: "fed_rate",
    name: "연방기금금리",
    description: "미국 연방준비제도 기준금리 (실효)",
    fredSeries: "FEDFUNDS",
    unit: "%",
    category: "macro",
    chartType: "line",
    color: "#14b8a6",
  },
  {
    id: "cpi",
    name: "미국 CPI (전년비)",
    description: "소비자물가지수 전년 동기 대비 변화율",
    fredSeries: "CPIAUCSL",
    unit: "%",
    category: "macro",
    chartType: "bar",
    color: "#f59e0b",
  },
  {
    id: "unemployment",
    name: "미국 실업률",
    description: "미국 실업률",
    fredSeries: "UNRATE",
    unit: "%",
    category: "macro",
    chartType: "line",
    color: "#ec4899",
  },
  {
    id: "copper",
    name: "구리 가격 (선물)",
    description: "글로벌 경기 선행 지표 - 구리 선물 (HG=F, 일별)",
    yahooSymbol: "HG=F",
    unit: "USD/lb",
    category: "commodity",
    chartType: "line",
    color: "#b45309",
  },
  {
    id: "m2",
    name: "M2 통화량",
    description: "미국 M2 통화 공급량",
    fredSeries: "M2SL",
    unit: "십억달러",
    category: "macro",
    chartType: "area",
    color: "#0891b2",
  },
  {
    id: "vix",
    name: "VIX (공포지수)",
    description: "CBOE 변동성지수 - 시장 불안 심리 지표",
    fredSeries: "VIXCLS",
    unit: "pt",
    category: "market",
    chartType: "area",
    color: "#dc2626",
  },
];

export const CATEGORY_LABELS: Record<Indicator["category"], string> = {
  market: "시장",
  credit: "신용",
  macro: "거시경제",
  commodity: "원자재",
};

export const DEFAULT_INDICATORS = ["cape", "hy_spread", "yield_curve", "fed_rate", "copper", "vix"];
