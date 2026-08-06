import { NextRequest, NextResponse } from "next/server";
import { loadChartData, type ChartRange } from "@/lib/chart-data";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id") || "";
  const symbol = searchParams.get("symbol") || "";
  const range = (searchParams.get("range") || "7d") as ChartRange;

  if (!id && !symbol) {
    return NextResponse.json({ error: "missing id/symbol" }, { status: 400 });
  }

  const result = await loadChartData(id, symbol, range);

  return NextResponse.json(
    {
      candles: result.candles,
      source: result.source,
      pair: result.pair,
      error: result.error ?? null,
      count: result.candles.length,
      ms: result.ms ?? null,
    },
    {
      headers: {
        // CDN/browser cache ngắn – chart không cần no-store
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
