"use client";

import Link from "next/link";
import type { CoinMarket } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import {
  mergeLiveChange24,
  mergeLivePrice,
  type LiveQuote,
} from "@/lib/use-binance-live";
import { CoinIcon } from "./CoinIcon";
import { PriceChange } from "./PriceChange";

export function MoverList({
  title,
  coins,
  quotes = {},
}: {
  title: string;
  coins: CoinMarket[];
  quotes?: Record<string, LiveQuote>;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-4 md:p-5">
      <h3 className="text-sm font-semibold text-body">{title}</h3>
      <ul className="mt-3 space-y-1">
        {coins.map((coin) => {
          const key = coin.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
          const q = quotes[key];
          const price = mergeLivePrice(coin.symbol, coin.current_price, quotes);
          const change = mergeLiveChange24(
            coin.symbol,
            coin.price_change_percentage_24h,
            quotes,
          );
          const flash = q?.flash;

          return (
            <li key={coin.id}>
              <Link
                href={`/coin/${coin.id}`}
                className={[
                  "flex items-center gap-3 rounded-md px-1 py-1.5 transition-colors duration-300 -mx-1",
                  flash === "up"
                    ? "bg-trading-up/12"
                    : flash === "down"
                      ? "bg-trading-down/12"
                      : "hover:bg-surface-elevated/50",
                ].join(" ")}
              >
                <CoinIcon
                  symbol={coin.symbol}
                  image={coin.image}
                  name={coin.name}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-body">
                    {coin.symbol.toUpperCase()}
                  </p>
                  <p
                    className={[
                      "font-mono text-xs tabular-nums transition-colors",
                      flash === "up"
                        ? "text-trading-up"
                        : flash === "down"
                          ? "text-trading-down"
                          : "text-muted",
                    ].join(" ")}
                  >
                    {formatUsd(price)}
                  </p>
                </div>
                <PriceChange value={change} />
              </Link>
            </li>
          );
        })}
        {coins.length === 0 && (
          <li className="text-sm text-muted">Chưa có dữ liệu.</li>
        )}
      </ul>
    </div>
  );
}
