import { NextRequest, NextResponse } from "next/server";

const SHILLER_URL =
  "https://posix4e.github.io/shiller_wrapper_data/data/stock_market_data.json";

interface ShillerEntry {
  date?: number;
  date_string?: string;
  year?: number;
  month?: number;
  [key: string]: unknown;
}

// decimal date (e.g. 1871.01) → "YYYY-MM-DD"
function decimalDateToString(d: number): string {
  const year = Math.floor(d);
  // fractional part encodes month: 1871.01 = Jan, 1871.1 = ~Feb 등
  // Shiller 데이터는 월말 기준. date * 12 - floor(d) * 12 ≈ month - 1
  const monthFrac = Math.round((d - year) * 12);
  const month = monthFrac === 0 ? 1 : monthFrac;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") ?? "cape";
  const limit = parseInt(searchParams.get("limit") ?? "260", 10);

  try {
    const res = await fetch(SHILLER_URL, { next: { revalidate: 86400 } }); // 24h 캐시
    if (!res.ok) throw new Error(`Shiller fetch error: ${res.status}`);

    const json = await res.json();
    const raw: ShillerEntry[] = json.data ?? [];

    const observations = raw
      .filter((row) => row[key] != null && row[key] !== "")
      .map((row) => {
        // 날짜 변환: date_string 우선, 없으면 decimal date 계산
        let dateStr: string;
        if (row.date_string && typeof row.date_string === "string") {
          dateStr = row.date_string;
        } else if (typeof row.date === "number") {
          dateStr = decimalDateToString(row.date);
        } else {
          dateStr = `${row.year ?? 1900}-${String(row.month ?? 1).padStart(2, "0")}-01`;
        }
        return { date: dateStr, value: parseFloat(String(row[key])) };
      })
      .filter((o) => !isNaN(o.value))
      .slice(-limit); // 최신 N개

    return NextResponse.json({ observations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
