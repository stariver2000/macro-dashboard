import { NextRequest, NextResponse } from "next/server";

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const result = Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
  result[result.length - 1] = arr[arr.length - 1]; // 최신 포인트 항상 포함
  return result;
}

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseDate(raw: string): string | null {
  const m = raw.trim().match(/^(\w{3})\s+(\d+),\s+(\d{4})$/);
  if (!m) return null;
  const mm = MONTH_MAP[m[1]];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[2].padStart(2, "0")}`;
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");

  try {
    const res = await fetch("https://www.multpl.com/shiller-pe/table/by-month", {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400, tags: ["macro-data"] },
    });
    if (!res.ok) throw new Error(`multpl fetch error: ${res.status}`);

    const html = await res.text();
    const observations: { date: string; value: number }[] = [];

    for (const rowMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (m) => stripTags(m[1])
      );
      if (cells.length < 2) continue;
      const date = parseDate(cells[0]);
      const value = parseFloat(cells[1]);
      if (!date || isNaN(value)) continue;
      if (start && date < start) continue;
      observations.push({ date, value });
    }

    observations.sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ observations: downsample(observations, 1200) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
