import { NextRequest, NextResponse } from "next/server";

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
}

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const series = searchParams.get("series");
  const start = searchParams.get("start"); // YYYY-MM-DD

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FRED_API_KEY not configured" }, { status: 500 });
  }
  if (!series) {
    return NextResponse.json({ error: "series parameter required" }, { status: 400 });
  }

  try {
    const url = new URL(FRED_BASE);
    url.searchParams.set("series_id", series);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "asc");
    if (start) url.searchParams.set("observation_start", start);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } }); // 1시간 캐시
    if (!res.ok) throw new Error(`FRED API error: ${res.status}`);

    const data = await res.json();

    const observations: { date: string; value: number }[] = (data.observations || [])
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { date: string; value: string }) => ({
        date: o.date,
        value: parseFloat(o.value),
      }));

    return NextResponse.json({ observations: downsample(observations, 1200) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
