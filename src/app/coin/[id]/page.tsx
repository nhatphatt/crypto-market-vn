import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoinDetailView } from "@/components/CoinDetailView";
import {
  fetchCoinDetail,
  getPriceBundle,
  loadChartData,
} from "@/lib/coin-detail";
import { getAllPosts } from "@/lib/news";
import { fetchUsdVndRate } from "@/lib/rates";

type Props = { params: Promise<{ id: string }> };

/** Static export (Cloudflare Pages): prebuild top coin */
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const { fetchTopCoinIds } = await import("@/lib/markets");
    const ids = await fetchTopCoinIds(80);
    return ids.map((id) => ({ id }));
  } catch {
    return [
      { id: "bitcoin" },
      { id: "ethereum" },
      { id: "solana" },
      { id: "binancecoin" },
      { id: "ripple" },
      { id: "dogecoin" },
      { id: "cardano" },
    ];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const coin = await fetchCoinDetail(id);
  if (!coin) return { title: "Không tìm thấy coin" };
  return {
    title: `${coin.name} (${coin.symbol.toUpperCase()})`,
    description: `Giá ${coin.name}, biểu đồ, vốn hóa và tin liên quan.`,
  };
}

export default async function CoinPage({ params }: Props) {
  const { id } = await params;
  const [coin, rate, posts] = await Promise.all([
    fetchCoinDetail(id),
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
