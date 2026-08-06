"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import type { CoinMarket } from "@/lib/types";
import { useBinanceLive } from "@/lib/use-binance-live";
import { useMarketCoins } from "@/lib/use-market-coins";
import { HotTicker } from "./HotTicker";
import { MarketTable } from "./MarketTable";
import { MoverList } from "./MoverList";
import { LiveStatus } from "./LiveStatus";

function pickMoversLive(
  coins: CoinMarket[],
  quotes: ReturnType<typeof useBinanceLive>["quotes"],
  direction: "up" | "down",
  n = 5,
) {
  return coins
    .map((c) => {
      const key = c.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
      const change =
        quotes[key]?.change24 ?? c.price_change_percentage_24h ?? 0;
      return { coin: c, change };
    })
    .sort((a, b) =>
      direction === "up" ? b.change - a.change : a.change - b.change,
    )
    .slice(0, n)
    .map((s) => s.coin);
}

export function HomeMarkets({ coins: initialCoins }: { coins: CoinMarket[] }) {
  const { coins, loading, error, reload } = useMarketCoins(initialCoins, 30);
  const symbols = useMemo(() => coins.map((c) => c.symbol), [coins]);
  const { quotes, live } = useBinanceLive(symbols);

  const hot = useMemo(() => {
    return coins
      .filter((c) => {
        const key = c.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          quotes[key] != null ||
          ["btc", "eth", "bnb", "sol", "xrp", "doge", "ada", "ton", "avax", "link", "sui", "pepe"].includes(
            key,
          )
        );
      })
      .slice(0, 12);
  }, [coins, quotes]);

  const gainers = useMemo(
    () => pickMoversLive(coins, quotes, "up", 5),
    [coins, quotes],
  );
  const losers = useMemo(
    () => pickMoversLive(coins, quotes, "down", 5),
    [coins, quotes],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-body md:text-lg">
          Giá &amp; biến động
        </h2>
        <div className="flex items-center gap-3">
          <LiveStatus live={live} label="Giá" />
          <Link
            href="/thi-truong"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-strong hover:text-primary"
          >
            Tất cả
            <ArrowRight weight="bold" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <HotTicker
        coins={hot.length ? hot : coins.slice(0, 12)}
        quotes={quotes}
        live={live}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <MoverList title="Tăng mạnh" coins={gainers} quotes={quotes} />
        <MoverList title="Giảm mạnh" coins={losers} quotes={quotes} />
      </div>

      {loading && coins.length === 0 && (
        <p className="rounded-xl border border-hairline bg-surface-card px-5 py-8 text-center text-sm text-muted">
          Đang tải giá…
        </p>
      )}
      {error && coins.length === 0 && !loading && (
        <div className="rounded-xl border border-hairline bg-surface-card px-5 py-8 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-2 text-sm font-semibold text-primary hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}
      {coins.length > 0 && (
        <MarketTable
          coins={coins}
          title="Top 30"
          quotes={quotes}
          live={live}
          showLiveBadge={false}
        />
      )}
    </div>
  );
}
