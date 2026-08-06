"use client";

import { useEffect, useState } from "react";
import type { FearGreed, GlobalMarket } from "@/lib/types";
import {
  fetchFearGreedClient,
  fetchGlobalMarketClient,
} from "@/lib/markets-client";
import { MarketOverviewBand } from "./MarketOverviewBand";

/**
 * Overview band: dùng SSR nếu có, thiếu thì fetch client (CG + F&G).
 */
export function MarketOverviewLive({
  global: initialGlobal,
  fear: initialFear,
}: {
  global: GlobalMarket | null;
  fear: FearGreed | null;
}) {
  const [global, setGlobal] = useState(initialGlobal);
  const [fear, setFear] = useState(initialFear);

  useEffect(() => {
    setGlobal(initialGlobal);
    setFear(initialFear);
  }, [initialGlobal, initialFear]);

  useEffect(() => {
    let cancelled = false;
    const needGlobal =
      !initialGlobal ||
      !initialGlobal.total_market_cap_usd ||
      initialGlobal.total_market_cap_usd <= 0;
    const needFear = !initialFear;

    void (async () => {
      const tasks: Promise<void>[] = [];
      if (needGlobal) {
        tasks.push(
          fetchGlobalMarketClient().then((g) => {
            if (!cancelled && g) setGlobal(g);
          }),
        );
      }
      if (needFear) {
        tasks.push(
          fetchFearGreedClient().then((f) => {
            if (!cancelled && f) setFear(f);
          }),
        );
      }
      await Promise.all(tasks);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialGlobal, initialFear]);

  return <MarketOverviewBand global={global} fear={fear} />;
}
