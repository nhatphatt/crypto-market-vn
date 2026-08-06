"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react";
import type { CoinDetail } from "@/lib/coin-detail";
import type { Candle } from "@/lib/binance";
import type { NewsPost } from "@/lib/types";
import {
  fetchBinancePeriodChanges,
  fetchCoinDetailClient,
  mergeCoinDetail,
} from "@/lib/coin-detail-client";
import {
  formatDateTime,
  formatNumber,
  formatUsd,
  formatVnd,
} from "@/lib/format";
import { CoinIcon } from "./CoinIcon";
import { LivePriceHeader } from "./LivePriceHeader";
import { PriceChange } from "./PriceChange";
import { PriceChart } from "./PriceChart";
import { UpdatedBadge } from "./UpdatedBadge";
import { WatchButton } from "./WatchButton";
import { BlogCard } from "./BlogCard";

export function CoinDetailView({
  initial,
  initialPrice,
  initialChange24,
  vndRate,
  candles,
  chartSource,
  related,
  binanceHigh,
  binanceLow,
  binanceSymbol,
  binanceQuoteVol,
}: {
  initial: CoinDetail;
  initialPrice: number;
  initialChange24: number | null;
  vndRate: number | null;
  candles: Candle[];
  chartSource: string;
  related: NewsPost[];
  binanceHigh?: number | null;
  binanceLow?: number | null;
  binanceSymbol?: string | null;
  binanceQuoteVol?: number | null;
}) {
  const [coin, setCoin] = useState(initial);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHydrating(true);

    void (async () => {
      const [cg, bn] = await Promise.all([
        fetchCoinDetailClient(initial.id),
        fetchBinancePeriodChanges(initial.symbol),
      ]);
      if (cancelled) return;
      setCoin(mergeCoinDetail(initial, cg, bn));
      setHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [initial]);

  const change24 =
    coin.price_change_percentage_24h ?? initialChange24;
  const price =
    coin.current_price > 0 ? coin.current_price : initialPrice;

  const desc = coin.descriptionVi
    ? coin.descriptionVi
    : hydrating
      ? "Đang tải thông tin chi tiết…"
      : `${coin.name} (${coin.symbol.toUpperCase()}) — theo dõi giá realtime trên Crypto Market VN.`;

  const high = binanceHigh ?? coin.high_24h;
  const low = binanceLow ?? coin.low_24h;

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
              {coin.market_cap_rank != null && coin.market_cap_rank > 0 && (
                <span className="text-xs text-muted">
                  Hạng #{coin.market_cap_rank}
                </span>
              )}
              {hydrating && (
                <span className="text-[11px] text-muted">Đang cập nhật…</span>
              )}
            </div>
            <LivePriceHeader
              symbol={coin.symbol}
              initialPrice={price}
              initialChange24={change24}
              vndRate={vndRate}
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
        <Metric
          label="Vốn hóa"
          value={
            coin.market_cap > 0 ? formatUsd(coin.market_cap, true) : "—"
          }
        />
        <Metric
          label="Volume 24h"
          value={
            coin.total_volume > 0 ? formatUsd(coin.total_volume, true) : "—"
          }
        />
        <Metric
          label="Cao / Thấp 24h"
          value={
            high != null && low != null && high > 0
              ? `${formatUsd(high)} / ${formatUsd(low)}`
              : "—"
          }
        />
        <Metric
          label="ATH"
          value={
            coin.ath != null
              ? `${formatUsd(coin.ath)}${
                  coin.ath_change_percentage != null
                    ? ` (${coin.ath_change_percentage.toFixed(1)}%)`
                    : ""
                }`
              : "—"
          }
        />
      </section>

      {binanceSymbol && (
        <p className="mt-3 text-xs text-muted">
          Giá giao ngay Binance ({binanceSymbol}): {formatUsd(price)}
          {vndRate ? ` · ≈ ${formatVnd(price, vndRate)}` : ""}
          {binanceQuoteVol
            ? ` · Volume quote 24h: ${formatUsd(binanceQuoteVol, true)}`
            : ""}
        </p>
      )}

      <section className="mt-8">
        <PriceChart
          coinId={coin.id}
          symbol={coin.symbol}
          initialCandles={candles}
          initialSource={chartSource}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-hairline bg-surface-card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-body">Giới thiệu</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-strong">
            {desc}
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
              v={
                coin.circulating_supply != null
                  ? formatNumber(coin.circulating_supply, 0)
                  : "—"
              }
            />
            <Row
              k="Total supply"
              v={
                coin.total_supply != null
                  ? formatNumber(coin.total_supply, 0)
                  : "—"
              }
            />
            <Row
              k="Max supply"
              v={
                coin.max_supply != null
                  ? formatNumber(coin.max_supply, 0)
                  : "—"
              }
            />
            <Row
              k="ATH ngày"
              v={coin.ath_date ? formatDateTime(coin.ath_date) : "—"}
            />
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Thông tin tham khảo từ CoinGecko và Binance. Không phải tư vấn đầu
            tư.
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
  node?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-body">
        {node ?? value ?? "—"}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline pb-2 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono text-body">{v}</dd>
    </div>
  );
}
