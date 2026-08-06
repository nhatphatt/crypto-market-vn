/**
 * Đọc data/markets-snapshot.json — nguồn chính cho static Pages
 * (local build & production giống nhau).
 */

import { readFile } from "fs/promises";
import path from "path";
import type { CoinMarket, FearGreed, GlobalMarket } from "./types";
import type { CoinDetail } from "./coin-detail";

export type MarketsSnapshot = {
  updatedAt: string;
  markets: CoinMarket[];
  global: GlobalMarket | null;
  fear: FearGreed | null;
  details: Record<string, CoinDetail>;
};

let cached: MarketsSnapshot | null = null;

export async function loadMarketsSnapshot(): Promise<MarketsSnapshot | null> {
  if (cached) return cached;

  // Dynamic import JSON (bundle) + fallback fs
  try {
    const mod = await import("../../data/markets-snapshot.json");
    const raw = (mod as { default?: unknown }).default ?? mod;
    const data = raw as MarketsSnapshot;
    if (data && Array.isArray(data.markets)) {
      // normalize homepage null → undefined
      if (data.details) {
        for (const id of Object.keys(data.details)) {
          const d = data.details[id] as CoinDetail & { homepage?: string | null };
          if (d.homepage === null) d.homepage = undefined;
        }
      }
      cached = data;
      return data;
    }
  } catch {
    /* try fs */
  }

  try {
    const file = path.join(process.cwd(), "data", "markets-snapshot.json");
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as MarketsSnapshot;
    if (data && Array.isArray(data.markets)) {
      cached = data;
      return data;
    }
  } catch {
    /* none */
  }

  return null;
}

export async function snapshotMarkets(limit?: number): Promise<CoinMarket[]> {
  const s = await loadMarketsSnapshot();
  if (!s?.markets?.length) return [];
  return limit ? s.markets.slice(0, limit) : s.markets;
}

export async function snapshotGlobal(): Promise<GlobalMarket | null> {
  const s = await loadMarketsSnapshot();
  return s?.global ?? null;
}

export async function snapshotFear(): Promise<FearGreed | null> {
  const s = await loadMarketsSnapshot();
  return s?.fear ?? null;
}

export async function snapshotCoinDetail(
  id: string,
): Promise<CoinDetail | null> {
  const s = await loadMarketsSnapshot();
  if (!s) return null;
  if (s.details?.[id]) return s.details[id];

  // Fallback: dựng từ markets row
  const row = s.markets.find((c) => c.id === id);
  if (!row) return null;
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    image: row.image || "",
    descriptionVi: "",
    homepage: undefined,
    categories: [],
    market_cap_rank: row.market_cap_rank ?? null,
    current_price: row.current_price,
    market_cap: row.market_cap ?? 0,
    total_volume: row.total_volume ?? 0,
    high_24h: null,
    low_24h: null,
    ath: null,
    ath_change_percentage: null,
    ath_date: null,
    atl: null,
    circulating_supply: null,
    total_supply: null,
    max_supply: null,
    price_change_percentage_24h:
      row.price_change_percentage_24h ??
      row.price_change_percentage_24h_in_currency ??
      null,
    price_change_percentage_7d:
      row.price_change_percentage_7d_in_currency ?? null,
    price_change_percentage_30d: null,
    price_change_percentage_1h:
      row.price_change_percentage_1h_in_currency ?? null,
    last_updated: s.updatedAt || new Date().toISOString(),
  };
}
