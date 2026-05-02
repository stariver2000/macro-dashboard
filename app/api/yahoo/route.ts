import { NextRequest, NextResponse } from "next/server";

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const result = Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
  result[result.length - 1] = arr[arr.length - 1]; // 최신 포인트 항상 포함
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const start = searchParams.get("start"); // YYYY-MM-DD

  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const period1 = start
    ? Math.floor(new Date(start).getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 5 * 365 * 24 * 3600; // 기본 5년
  const period2 = Math.floor(Date.now() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400, tags: ["macro-data"] }, // 24시간 캐시
    });
    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No data returned");

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const all = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        value: closes[i],
      }))
      .filter((o): o is { date: string; value: number } => o.value != null && !isNaN(o.value));

    // 최대 1200포인트로 다운샘플링 (50년치 일별 ≈ 12500개 → 렌더 성능 확보)
    const observations = downsample(all, 1200);

    return NextResponse.json({ observations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
