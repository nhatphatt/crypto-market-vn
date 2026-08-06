"use client";

import Link from "next/link";
import type { CoinMarket } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import {
  mergeLiveChange24,
  mergeLivePrice,
  type LiveQuote,
} from "@/lib/use-binance-live";
import { prefetchBinanceKlines } from "@/lib/binance-klines-client";
import { CoinIcon } from "./CoinIcon";
import { PriceChange } from "./PriceChange";
import { LiveStatus } from "./LiveStatus";

export function MarketTable({
  coins,
  title = "Bảng giá",
  showCount = true,
  quotes = {},
  live = false,
  showLiveBadge = true,
}: {
  coins: CoinMarket[];
  title?: string;
  showCount?: boolean;
  quotes?: Record<string, LiveQuote>;
  live?: boolean;
  showLiveBadge?: boolean;
}) {
  return (
    <section className="group/table overflow-hidden rounded-xl border border-hairline bg-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-body">{title}</h2>
          {showLiveBadge && <LiveStatus live={live} />}
        </div>
        {showCount && (
          <span className="text-xs text-muted">{coins.length} coin</span>
        )}
      </div>
      <div className="scroll-x-hover">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium md:px-5">#</th>
              <th className="px-2 py-3 font-medium">Tên</th>
              <th className="px-2 py-3 text-right font-medium">Giá</th>
              <th className="px-2 py-3 text-right font-medium">1h</th>
              <th className="px-2 py-3 text-right font-medium">24h</th>
              <th className="px-2 py-3 text-right font-medium">7d</th>
              <th className="px-2 py-3 text-right font-medium">Vốn hóa</th>
              <th className="px-4 py-3 text-right font-medium md:px-5">
                Volume 24h
              </th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => {
              const key = coin.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
              const q = quotes[key];
              const price = mergeLivePrice(
                coin.symbol,
                coin.current_price,
                quotes,
              );
              const change24 = mergeLiveChange24(
                coin.symbol,
                coin.price_change_percentage_24h_in_currency ??
                  coin.price_change_percentage_24h,
                quotes,
              );
              const flash = q?.flash;

              return (
                <tr
                  key={coin.id}
                  className={[
                    "border-b border-hairline/70 transition-colors duration-300 last:border-0",
                    flash === "up"
                      ? "bg-trading-up/10"
                      : flash === "down"
                        ? "bg-trading-down/10"
                        : "hover:bg-surface-elevated/40",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted md:px-5">
                    {coin.market_cap_rank}
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href={`/coin/${coin.id}/`}
                      className="group flex items-center gap-2.5"
                      onMouseEnter={() => prefetchBinanceKlines(coin.symbol, "7d")}
                      onFocus={() => prefetchBinanceKlines(coin.symbol, "7d")}
                    >
                      <CoinIcon
                        symbol={coin.symbol}
                        image={coin.image}
                        name={coin.name}
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-body group-hover:text-primary">
                          {coin.name}
                        </p>
                        <p className="text-xs uppercase text-muted">
                          {coin.symbol}
                          {q?.pair ? (
                            <span className="ml-1.5 normal-case text-[10px] text-muted/80">
                              live
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td
                    className={[
                      "px-2 py-3 text-right font-mono text-sm font-medium tabular-nums transition-colors duration-300",
                      flash === "up"
                        ? "text-trading-up"
                        : flash === "down"
                          ? "text-trading-down"
                          : "text-body",
                    ].join(" ")}
                  >
                    {formatUsd(price)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <PriceChange
                      value={coin.price_change_percentage_1h_in_currency}
                    />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <PriceChange value={change24} />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <PriceChange
                      value={coin.price_change_percentage_7d_in_currency}
                    />
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-sm text-muted-strong">
                    {formatUsd(coin.market_cap, true)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted-strong md:px-5">
                    {formatUsd(coin.total_volume, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {coins.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-muted">
          Không tải được dữ liệu giá. Thử lại sau vài phút.
        </p>
      )}
    </section>
  );
}
