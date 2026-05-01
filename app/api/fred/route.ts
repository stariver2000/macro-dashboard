import { NextRequest, NextResponse } from "next/server";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const series = searchParams.get("series");
  const limit = searchParams.get("limit") || "260"; // ~5년치 주간데이터

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
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", limit);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } }); // 1시간 캐시
    if (!res.ok) throw new Error(`FRED API error: ${res.status}`);

    const data = await res.json();

    // 날짜 오름차순 정렬 후 반환, '.' 값(결측) 제거
    const observations: { date: string; value: number }[] = (data.observations || [])
      .filter((o: { value: string }) => o.value !== ".")
      .reverse()
      .map((o: { date: string; value: string }) => ({
        date: o.date,
        value: parseFloat(o.value),
      }));

    return NextResponse.json({ observations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
