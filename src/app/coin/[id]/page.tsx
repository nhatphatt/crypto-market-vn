import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { PriceChart } from "@/components/PriceChart";
import { PriceChange } from "@/components/PriceChange";
import { UpdatedBadge } from "@/components/UpdatedBadge";
import { WatchButton } from "@/components/WatchButton";
import { BlogCard } from "@/components/BlogCard";
import { CoinIcon } from "@/components/CoinIcon";
import { fetchCoinDetail, getPriceBundle, loadChartData } from "@/lib/coin-detail";
import { getAllPosts } from "@/lib/news";
import { fetchUsdVndRate } from "@/lib/rates";
import {
  formatDateTime,
  formatNumber,
  formatUsd,
  formatVnd,
} from "@/lib/format";
import { LivePriceHeader } from "@/components/LivePriceHeader";

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

  // Chart + ticker song song – không chờ tuần tự
  const [chart, binance] = await Promise.all([
    loadChartData(coin.id, coin.symbol, "7d"),
    getPriceBundle(coin.symbol),
  ]);
  const candles = chart.candles;
  const source = chart.source;
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
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
      <Link
        href="/thi-truong"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-strong hover:text-primary"
      >
        <ArrowLeft weight="bold" className="h-4 w-4" />
        Về thị trường
      </Link>

      <header className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <CoinIcon
            symbol={coin.symbol}
            image={coin.image}
            name={coin.name}
            size={56}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-body md:text-3xl">
                {coin.name}
              </h1>
              <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-mono text-sm uppercase text-muted-strong">
                {coin.symbol}
              </span>
              {coin.market_cap_rank != null && (
                <span className="text-xs text-muted">
                  Hạng #{coin.market_cap_rank}
                </span>
              )}
            </div>
            <LivePriceHeader
              symbol={coin.symbol}
              initialPrice={price}
              initialChange24={change24}
              vndRate={rate}
            />
            <div className="mt-2">
              <UpdatedBadge iso={coin.last_updated} label="Cập nhật" compact />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton coinId={coin.id} />
          {coin.homepage && (
            <a
              href={coin.homepage}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-hairline bg-surface-card px-3 text-sm font-semibold text-body hover:border-primary/40"
            >
              Website
              <ArrowSquareOut weight="bold" className="h-4 w-4" />
            </a>
          )}
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="% 1 giờ"
          node={<PriceChange value={coin.price_change_percentage_1h} />}
        />
        <Metric
          label="% 24 giờ"
          node={<PriceChange value={change24} />}
        />
        <Metric
          label="% 7 ngày"
          node={<PriceChange value={coin.price_change_percentage_7d} />}
        />
        <Metric
          label="% 30 ngày"
          node={<PriceChange value={coin.price_change_percentage_30d} />}
        />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vốn hóa" value={formatUsd(coin.market_cap, true)} />
        <Metric label="Volume 24h" value={formatUsd(coin.total_volume, true)} />
        <Metric
          label="Cao / Thấp 24h"
          value={`${formatUsd(binance?.highPrice ?? coin.high_24h ?? 0)} / ${formatUsd(binance?.lowPrice ?? coin.low_24h ?? 0)}`}
        />
        <Metric
          label="ATH"
          value={
            coin.ath != null
              ? `${formatUsd(coin.ath)} (${coin.ath_change_percentage != null ? coin.ath_change_percentage.toFixed(1) + "%" : "—"})`
              : "—"
          }
        />
      </section>

      {binance && (
        <p className="mt-3 text-xs text-muted">
          Giá giao ngay Binance ({binance.symbol}): {formatUsd(binance.lastPrice)}{" "}
          · Volume quote 24h: {formatUsd(binance.quoteVolume, true)}
        </p>
      )}

      <section className="mt-8">
        <PriceChart
          coinId={coin.id}
          symbol={coin.symbol}
          initialCandles={candles}
          initialSource={source}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-hairline bg-surface-card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-body">Giới thiệu</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-strong">
            {coin.descriptionVi}
          </p>
          {coin.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {coin.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-surface-elevated px-2 py-1 text-xs text-muted-strong"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-hairline bg-surface-card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-body">Cung lưu hành</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row
              k="Circulating"
              v={formatNumber(coin.circulating_supply, 0)}
            />
            <Row k="Total supply" v={formatNumber(coin.total_supply, 0)} />
            <Row k="Max supply" v={formatNumber(coin.max_supply, 0)} />
            <Row
              k="ATH ngày"
              v={
                coin.ath_date
                  ? formatDateTime(coin.ath_date)
                  : "—"
              }
            />
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Thông tin tham khảo từ CoinGecko
            {binance ? " và Binance" : ""}. Không phải tư vấn đầu tư.
          </p>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-body">
            Tin liên quan {coin.symbol.toUpperCase()}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  node,
}: {
  label: string;
  value?: string;
  node?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-2 font-mono text-sm font-semibold text-body md:text-base">
        {node ?? value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline/60 pb-2 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono text-body">{v}</dd>
    </div>
  );
}
