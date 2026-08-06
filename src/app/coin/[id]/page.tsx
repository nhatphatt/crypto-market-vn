import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoinDetailView } from "@/components/CoinDetailView";
import { getPriceBundle, loadChartData } from "@/lib/coin-detail";
import { getCoinDetail } from "@/lib/server-data";
import { getAllPosts } from "@/lib/news";
import { fetchUsdVndRate } from "@/lib/rates";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

/** Build đủ mọi coin trong snapshot (market list link tới 100+ id — trước chỉ 80 → 404). */
export async function generateStaticParams() {
  const ids = new Set<string>();
  try {
    const { loadMarketsSnapshot } = await import("@/lib/snapshot");
    const snap = await loadMarketsSnapshot();
    for (const m of snap?.markets || []) {
      if (m?.id) ids.add(m.id);
    }
    for (const id of Object.keys(snap?.details || {})) {
      if (id) ids.add(id);
    }
  } catch {
    /* fallback below */
  }
  if (ids.size === 0) {
    try {
      const { getTopCoins } = await import("@/lib/server-data");
      const coins = await getTopCoins(120);
      for (const c of coins) ids.add(c.id);
    } catch {
      /* */
    }
  }
  if (ids.size === 0) {
    return [
      { id: "bitcoin" },
      { id: "ethereum" },
      { id: "solana" },
      { id: "binancecoin" },
      { id: "ripple" },
      { id: "dogecoin" },
      { id: "cardano" },
      { id: "aptos" },
      { id: "arbitrum" },
      { id: "cosmos" },
      { id: "filecoin" },
    ];
  }
  return [...ids].map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const coin = await getCoinDetail(id);
  if (!coin) return { title: "Không tìm thấy coin" };
  return {
    title: `${coin.name} (${coin.symbol.toUpperCase()})`,
    description: `Giá ${coin.name}, biểu đồ, vốn hóa và tin liên quan.`,
  };
}

export default async function CoinPage({ params }: Props) {
  const { id } = await params;
  const [coin, rate, posts] = await Promise.all([
    getCoinDetail(id),
    fetchUsdVndRate(),
    getAllPosts(),
  ]);
  if (!coin) notFound();

  const [chart, binance] = await Promise.all([
    loadChartData(coin.id, coin.symbol, "7d"),
    getPriceBundle(coin.symbol),
  ]);

  const related = posts
    .filter((p) => {
      const sym = coin.symbol.toUpperCase();
      return (
        p.coins.includes(sym) ||
        p.titleVi?.toUpperCase().includes(sym) ||
        p.contentVi?.toUpperCase().includes(sym)
      );
    })
    .slice(0, 3);

  const price = binance?.lastPrice || coin.current_price;
  const change24 =
    binance?.priceChangePercent ?? coin.price_change_percentage_24h;

  return (
    <CoinDetailView
      initial={coin}
      initialPrice={price}
      initialChange24={change24}
      vndRate={rate}
      candles={chart.candles}
      chartSource={chart.source}
      related={related}
      binanceHigh={binance?.highPrice}
      binanceLow={binance?.lowPrice}
      binanceSymbol={binance?.symbol}
      binanceQuoteVol={binance?.quoteVolume}
    />
  );
}
