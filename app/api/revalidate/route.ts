import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// Vercel Cron Jobs가 GET 요청으로 호출 (Authorization: Bearer <CRON_SECRET>)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("macro-data", "max");

  return NextResponse.json({
    revalidated: true,
    timestamp: new Date().toISOString(),
  });
}
