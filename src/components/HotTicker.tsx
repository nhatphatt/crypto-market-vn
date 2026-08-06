"use client";

import Link from "next/link";
import type { CoinMarket } from "@/lib/types";
import type { LiveQuote } from "@/lib/use-binance-live";
import { formatUsd } from "@/lib/format";
import { CoinIcon } from "./CoinIcon";
import { PriceChange } from "./PriceChange";
import { DragScroll } from "./DragScroll";

/** Ticker ngang – không header bar / border cắt */
export function HotTicker({
  coins,
  quotes,
}: {
  coins: CoinMarket[];
  quotes: Record<string, LiveQuote>;
  live?: boolean;
}) {
  if (coins.length === 0) return null;

  return (
    <DragScroll
      className="rounded-xl border border-hairline bg-surface-card"
      trackClassName="flex gap-1 px-3 py-3"
    >
      {coins.map((coin) => {
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
            href={`/coin/${coin.id}/`}
            draggable={false}
            className={[
              "flex min-w-[140px] shrink-0 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors duration-300",
              flash === "up"
                ? "bg-trading-up/15"
                : flash === "down"
                  ? "bg-trading-down/15"
                  : "hover:bg-surface-elevated/60",
            ].join(" ")}
          >
            <CoinIcon
              symbol={coin.symbol}
              image={coin.image}
              name={coin.name}
              size={28}
              className="pointer-events-none"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-body">
                {coin.symbol}
              </p>
              <p
                className={[
                  "font-mono text-[12px] font-medium tabular-nums",
                  flash === "up"
                    ? "text-trading-up"
                    : flash === "down"
                      ? "text-trading-down"
                      : "text-body",
                ].join(" ")}
              >
                {formatUsd(price)}
              </p>
            </div>
            <div className="ml-auto">
              <PriceChange value={change} />
            </div>
          </Link>
        );
      })}
    </DragScroll>
  );
}
