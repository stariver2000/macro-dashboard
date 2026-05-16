import { NextResponse } from "next/server";

const FRED_KEY = process.env.FRED_API_KEY!;
const FRED_BASE = "https://api.stlouisfed.org/fred";

// ─── FRED release templates ───────────────────────────────────────────────────

const FRED_RELEASES = [
  {
    id: 10, idPrefix: "cpi", baseScore: 5, icon: "📈",
    titleFn: (mo: string) => `CPI (${mo})`, shortTitle: "CPI",
    description: "소비자물가지수. 헤드라인·근원 CPI가 연준 통화정책 경로를 결정짓는 핵심 지표.",
    sectors: ["전체 시장", "채권", "성장주"], time: "08:30 ET",
  },
  {
    id: 50, idPrefix: "nfp", baseScore: 5, icon: "📈",
    titleFn: (mo: string) => `비농업 고용 (${mo})`, shortTitle: "NFP",
    description: "비농업 고용자수·실업률·평균임금 동시 발표. 노동시장 동향이 연준 행보를 결정.",
    sectors: ["전체 시장", "채권"], time: "08:30 ET",
  },
  {
    id: 54, idPrefix: "pce", baseScore: 3, icon: "📈",
    titleFn: (mo: string) => `PCE 물가 (${mo})`, shortTitle: "PCE",
    description: "연준이 가장 중시하는 인플레이션 지표. 근원 PCE 전년비가 금리 결정의 기준.",
    sectors: ["채권", "성장주"], time: "08:30 ET",
  },
  {
    id: 14, idPrefix: "ppi", baseScore: 3, icon: "📈",
    titleFn: (mo: string) => `PPI (${mo})`, shortTitle: "PPI",
    description: "생산자물가지수. CPI 선행 지표로 향후 소비자 인플레이션 방향을 시사.",
    sectors: ["소재", "에너지"], time: "08:30 ET",
  },
  {
    id: 9, idPrefix: "retail", baseScore: 2, icon: "📈",
    titleFn: (mo: string) => `소매판매 (${mo})`, shortTitle: "소매판매",
    description: "소비 지출 동향. 소비자 경제 건전성을 나타내는 핵심 지표.",
    sectors: ["소비재", "이커머스"], time: "08:30 ET",
  },
  {
    id: 15, idPrefix: "gdp", baseScore: 3, icon: "📈",
    titleFn: (mo: string) => `GDP (${mo})`, shortTitle: "GDP",
    description: "국내총생산 발표. 전분기 경제 성장률 종합 평가.",
    sectors: ["전체 시장"], time: "08:30 ET",
  },
  {
    id: 266, idPrefix: "jolts", baseScore: 2, icon: "📈",
    titleFn: (mo: string) => `JOLTS (${mo})`, shortTitle: "JOLTS",
    description: "구인 건수·이직률·자발적 퇴직률 발표. 노동시장 수급 동향 파악.",
    sectors: ["전체 시장"], time: "10:00 ET",
  },
] as const;

// ─── Earnings templates ───────────────────────────────────────────────────────

const EARNINGS_TICKERS = [
  { ticker: "NVDA",  name: "엔비디아",     shortTitle: "NVDA 실적", baseScore: 5, sectors: ["반도체", "AI", "데이터센터"] },
  { ticker: "AAPL",  name: "애플",         shortTitle: "AAPL 실적", baseScore: 4, sectors: ["테크", "소비자가전"] },
  { ticker: "MSFT",  name: "마이크로소프트",  shortTitle: "MSFT 실적", baseScore: 4, sectors: ["클라우드", "AI"] },
  { ticker: "META",  name: "메타",         shortTitle: "META 실적", baseScore: 4, sectors: ["광고", "AI"] },
  { ticker: "AMZN",  name: "아마존",        shortTitle: "AMZN 실적", baseScore: 4, sectors: ["클라우드", "이커머스"] },
  { ticker: "GOOGL", name: "알파벳",        shortTitle: "GOOGL 실적", baseScore: 4, sectors: ["광고", "클라우드"] },
  { ticker: "TSLA",  name: "테슬라",        shortTitle: "TSLA 실적", baseScore: 3, sectors: ["전기차", "성장주"] },
  { ticker: "JPM",   name: "JP모건",        shortTitle: "JPM 실적",  baseScore: 3, sectors: ["금융", "은행"] },
];

// ─── FOMC parser ──────────────────────────────────────────────────────────────

const MONTH_NUM: Record<string, number> = {
  January:1, February:2, March:3, April:4, May:5, June:6,
  July:7, August:8, September:9, October:10, November:11, December:12,
};

function parseFOMC(html: string, year: number): { date: string; hasSEP: boolean }[] {
  const results: { date: string; hasSEP: boolean }[] = [];
  const seen = new Set<string>();

  // Isolate the year section to avoid grabbing wrong year meetings
  const yrStr = String(year);
  const yrIdx = html.indexOf(yrStr);
  if (yrIdx === -1) return results;
  const nextYrIdx = html.indexOf(String(year + 1), yrIdx + 4);
  const section = nextYrIdx > -1 ? html.slice(yrIdx, nextYrIdx) : html.slice(yrIdx, yrIdx + 15000);

  // Match "January 27-28" / "March 17&#8211;18" / "June 9–10"
  const months = Object.keys(MONTH_NUM).join("|");
  const re = new RegExp(`(${months})\\s+(\\d{1,2})(?:[\\-–—]|&#82(?:11|12);)(\\d{1,2})`, "g");
  let m;
  while ((m = re.exec(section)) !== null) {
    const mo = MONTH_NUM[m[1]];
    const endDay = m[3].padStart(2, "0");
    const dateStr = `${year}-${String(mo).padStart(2, "0")}-${endDay}`;
    if (!seen.has(dateStr)) {
      seen.add(dateStr);
      const hasSEP = [3, 6, 9, 12].includes(mo);
      results.push({ date: dateStr, hasSEP });
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(dateStr: string): string {
  const m = parseInt(dateStr.slice(5, 7));
  return `${m}월`;
}

function filterToWindow(dates: string[], start: string, end: string): string[] {
  return dates.filter((d) => d >= start && d <= end);
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

async function fetchFREDDates(releaseId: number): Promise<string[]> {
  if (!FRED_KEY) return [];
  try {
    const url = `${FRED_BASE}/release/dates?release_id=${releaseId}&api_key=${FRED_KEY}&file_type=json&sort_order=asc&limit=200`;
    const res = await fetch(url, { next: { revalidate: 86400, tags: ["calendar"] } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.release_dates || []).map((d: { date: string }) => d.date) as string[];
  } catch {
    return [];
  }
}

async function fetchFOMC(year: number): Promise<{ date: string; hasSEP: boolean }[]> {
  try {
    const res = await fetch(
      "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400, tags: ["calendar"] } }
    );
    if (!res.ok) return [];
    const html = await res.text();
    return parseFOMC(html, year);
  } catch {
    return [];
  }
}

async function fetchEarningsDate(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=calendarEvents`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400, tags: ["calendar"] } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const dates: { raw: number }[] | undefined =
      data?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate;
    if (!dates?.length) return null;
    const now = Date.now();
    const next = dates
      .map((d) => d.raw * 1000)
      .filter((ts) => ts > now)
      .sort((a, b) => a - b)[0];
    if (!next) return null;
    return new Date(next).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - 2);
  const windowEnd = new Date(now);
  windowEnd.setMonth(windowEnd.getMonth() + 14);
  const start = windowStart.toISOString().slice(0, 10);
  const end = windowEnd.toISOString().slice(0, 10);
  const year = now.getFullYear();

  const events: object[] = [];

  // 1. FRED economic release dates (in parallel)
  const fredResults = await Promise.all(
    FRED_RELEASES.map(async (tpl) => {
      const dates = await fetchFREDDates(tpl.id);
      return { tpl, dates: filterToWindow(dates, start, end) };
    })
  );

  for (const { tpl, dates } of fredResults) {
    for (const date of dates) {
      events.push({
        id: `${tpl.idPrefix}_${date.replaceAll("-", "")}`,
        date,
        title: tpl.titleFn(monthLabel(date)),
        shortTitle: tpl.shortTitle,
        category: "macro",
        baseScore: tpl.baseScore,
        description: tpl.description,
        sectors: tpl.sectors,
        icon: tpl.icon,
        time: tpl.time,
        source: "fred",
      });
    }
  }

  // 2. FOMC dates from Federal Reserve website
  const fomcDates = await fetchFOMC(year);
  // Also try next year if we're near year end
  const fomcDatesNext = now.getMonth() >= 10 ? await fetchFOMC(year + 1) : [];
  const allFOMC = [...fomcDates, ...fomcDatesNext].filter(
    ({ date }) => date >= start && date <= end
  );

  for (const { date, hasSEP } of allFOMC) {
    events.push({
      id: `fomc_${date.replaceAll("-", "")}`,
      date,
      title: hasSEP ? "FOMC 금리 결정 + SEP" : "FOMC 금리 결정",
      shortTitle: hasSEP ? "FOMC+SEP" : "FOMC",
      category: "macro",
      baseScore: 7,
      description: hasSEP
        ? "분기별 경제전망요약(SEP)·점도표 포함. 연간 금리 경로 제시로 시장 영향 극대화."
        : "연방공개시장위원회 금리 결정 및 성명 발표. 매파·비둘기파 서프라이즈에 시장 민감 반응.",
      sectors: ["전체 시장", "채권", "성장주", "금융"],
      icon: "🏦",
      time: "14:00 ET",
      source: "fed",
    });
  }

  // 3. Earnings dates from Yahoo Finance (in parallel, best-effort)
  const earningsResults = await Promise.all(
    EARNINGS_TICKERS.map(async (t) => ({
      ...t,
      date: await fetchEarningsDate(t.ticker),
    }))
  );

  for (const { ticker, name, shortTitle, baseScore, sectors, date } of earningsResults) {
    if (!date || date < start || date > end) continue;
    events.push({
      id: `earnings_${ticker.toLowerCase()}_${date.replaceAll("-", "")}`,
      date,
      title: `${name} 실적 발표`,
      shortTitle,
      category: "earnings",
      baseScore,
      description: `${name}(${ticker}) 분기 실적 발표. 매출·이익·가이던스에 따라 관련 섹터 변동성 확대 가능.`,
      sectors,
      icon: "💰",
      time: "장 마감 후",
      source: "yahoo",
    });
  }

  return NextResponse.json({ events }, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
