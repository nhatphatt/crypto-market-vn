"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CoinMarket } from "@/lib/types";
import { useBinanceLive } from "@/lib/use-binance-live";
import { useMarketCoins } from "@/lib/use-market-coins";
import { formatUsd } from "@/lib/format";
import { prefetchBinanceKlines } from "@/lib/binance-klines-client";
import { CoinIcon } from "./CoinIcon";
import { PriceChange } from "./PriceChange";

/** Lấp hero bằng coin thật (logo + giá live) – không card marketing trống */
export function HeroLiveCoins({ coins: initial }: { coins: CoinMarket[] }) {
  const { coins, loading } = useMarketCoins(initial, 12);
  const top = useMemo(() => coins.slice(0, 6), [coins]);
  const symbols = useMemo(() => top.map((c) => c.symbol), [top]);
  const { quotes } = useBinanceLive(symbols);

  if (top.length === 0) {
    return (
      <div className="grid h-full min-h-[200px] place-items-center rounded-xl bg-surface-elevated/40 text-sm text-muted">
        {loading ? "Đang tải giá…" : "Chưa có dữ liệu giá"}
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {top.map((coin) => {
        const key = coin.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
        const q = quotes[key];
        const price = q?.price ?? coin.current_price;
        const change =
          q?.change24 ??
          coin.price_change_percentage_24h_in_currency ??
          coin.price_change_percentage_24h;
        const flash = q?.flash;

        return (
          <Link
            key={coin.id}
            href={`/coin/${coin.id}`}
            onMouseEnter={() => prefetchBinanceKlines(coin.symbol, "7d")}
            onFocus={() => prefetchBinanceKlines(coin.symbol, "7d")}
            className={[
              "flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-hairline bg-surface-card p-3.5 transition-colors sm:min-h-[6.25rem] sm:p-4",
              flash === "up"
                ? "bg-trading-up/10"
                : flash === "down"
                  ? "bg-trading-down/10"
                  : "hover:border-primary/30 hover:bg-surface-elevated/50",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5">
              <CoinIcon
                symbol={coin.symbol}
                image={coin.image}
                name={coin.name}
                size={28}
              />
              <span className="truncate text-sm font-semibold uppercase text-body">
                {coin.symbol}
              </span>
            </div>
            <div className="mt-3">
              <p
                className={[
                  "font-mono text-[15px] font-semibold tabular-nums sm:text-base",
                  flash === "up"
                    ? "text-trading-up"
                    : flash === "down"
                      ? "text-trading-down"
                      : "text-body",
                ].join(" ")}
              >
                {formatUsd(price)}
              </p>
              <div className="mt-1">
                <PriceChange value={change} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
