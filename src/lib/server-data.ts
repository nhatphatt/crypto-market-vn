/**
 * Server-only data layer for static Pages.
 * Ưu tiên data/markets-snapshot.json → live API.
 * Không import module này từ Client Components.
 */

import {
  enrichGlobalStats,
  fetchGlobalMarket,
  fetchTopCoins,
} from "./markets";
import { fetchFearGreed } from "./fear-greed";
import { fetchCoinDetail } from "./coin-detail";
import {
  snapshotCoinDetail,
  snapshotFear,
  snapshotGlobal,
  snapshotMarkets,
} from "./snapshot";
import type { CoinMarket, FearGreed, GlobalMarket } from "./types";
import type { CoinDetail } from "./coin-detail";

export async function getTopCoins(limit = 50): Promise<CoinMarket[]> {
  const snap = await snapshotMarkets(limit);
  if (snap.length > 0) return snap;
  return fetchTopCoins(limit);
}

export async function getGlobalMarket(
  coins: CoinMarket[] = [],
): Promise<GlobalMarket | null> {
  const snap = await snapshotGlobal();
  if (snap && snap.total_market_cap_usd > 0) {
    return enrichGlobalStats(snap, coins);
  }
  const live = await fetchGlobalMarket();
  return enrichGlobalStats(live, coins);
}

export async function getFearGreed(): Promise<FearGreed | null> {
  const snap = await snapshotFear();
  if (snap) return snap;
  return fetchFearGreed();
}

export async function getCoinDetail(id: string): Promise<CoinDetail | null> {
  const snap = await snapshotCoinDetail(id);
  // Snapshot đủ nếu có mcap hoặc % 1h/7d (từ markets list)
  if (
    snap &&
    (snap.market_cap > 0 ||
      snap.price_change_percentage_1h != null ||
      snap.price_change_percentage_7d != null)
  ) {
    return snap;
  }
  const live = await fetchCoinDetail(id);
  if (live && (live.market_cap > 0 || live.descriptionVi)) return live;
  return snap || live;
}
