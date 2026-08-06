/**
 * Client-side coin detail + % 1h/7d từ Binance klines
 * (khi CoinGecko 429 / static build fallback).
 */

import type { CoinDetail } from "./coin-detail";
import { toBinanceSymbol } from "./binance";

const CG = "https://api.coingecko.com/api/v3";
const BN_HOSTS = [
  "https://api.binance.com",
  "https://data-api.binance.vision",
] as const;

const LS_COIN = "cmvn_coin_v1_";
const LS_TTL = 15 * 60_000; // 15 phút

async function fetchJson(
  url: string,
  timeoutMs = 12000,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
      mode: "cors",
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(t);
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readCache(id: string): CoinDetail | null {
  try {
    const raw = localStorage.getItem(LS_COIN + id);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: CoinDetail };
    if (Date.now() - at > LS_TTL) return null;
    if (!data?.id || !data.name) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(id: string, data: CoinDetail) {
  try {
    localStorage.setItem(
      LS_COIN + id,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    /* quota */
  }
}

/** CoinGecko coin detail (browser CORS) */
export async function fetchCoinDetailClient(
  id: string,
): Promise<CoinDetail | null> {
  const cached = typeof window !== "undefined" ? readCache(id) : null;

  const url = new URL(`${CG}/coins/${encodeURIComponent(id)}`);
  url.searchParams.set("localization", "true");
  url.searchParams.set("tickers", "false");
  url.searchParams.set("market_data", "true");
  url.searchParams.set("community_data", "false");
  url.searchParams.set("developer_data", "false");
  url.searchParams.set("sparkline", "false");

  const r = await fetchJson(url.toString(), 14000);
  if (!r.ok || !r.data) {
    // 429 / fail → dùng cache local nếu còn
    return cached;
  }

  const j = r.data as {
    id: string;
    symbol: string;
    name: string;
    image?: { large?: string; small?: string };
    description?: { vi?: string; en?: string };
    links?: { homepage?: string[] };
    categories?: string[];
    market_cap_rank?: number;
    market_data?: {
      current_price?: { usd?: number };
      market_cap?: { usd?: number };
      total_volume?: { usd?: number };
      high_24h?: { usd?: number };
      low_24h?: { usd?: number };
      ath?: { usd?: number };
      ath_change_percentage?: { usd?: number };
      ath_date?: { usd?: string };
      atl?: { usd?: number };
      circulating_supply?: number;
      total_supply?: number;
      max_supply?: number;
      price_change_percentage_24h?: number;
      price_change_percentage_7d?: number;
      price_change_percentage_30d?: number;
      price_change_percentage_1h_in_currency?: { usd?: number };
      last_updated?: string;
    };
    last_updated?: string;
  };

  const md = j.market_data;
  const descEn = stripHtml(j.description?.en || "");
  const descViRaw = stripHtml(j.description?.vi || "");
  const descriptionVi =
    descViRaw.length > 80
      ? descViRaw.slice(0, 1200)
      : descEn.slice(0, 1200) || "";

  const detail: CoinDetail = {
    id: j.id,
    symbol: j.symbol,
    name: j.name,
    image: j.image?.large || j.image?.small || "",
    descriptionVi,
    homepage: j.links?.homepage?.find(Boolean),
    categories: (j.categories || []).filter(Boolean).slice(0, 6),
    market_cap_rank: j.market_cap_rank ?? null,
    current_price: md?.current_price?.usd ?? 0,
    market_cap: md?.market_cap?.usd ?? 0,
    total_volume: md?.total_volume?.usd ?? 0,
    high_24h: md?.high_24h?.usd ?? null,
    low_24h: md?.low_24h?.usd ?? null,
    ath: md?.ath?.usd ?? null,
    ath_change_percentage: md?.ath_change_percentage?.usd ?? null,
    ath_date: md?.ath_date?.usd ?? null,
    atl: md?.atl?.usd ?? null,
    circulating_supply: md?.circulating_supply ?? null,
    total_supply: md?.total_supply ?? null,
    max_supply: md?.max_supply ?? null,
    price_change_percentage_24h: md?.price_change_percentage_24h ?? null,
    price_change_percentage_7d: md?.price_change_percentage_7d ?? null,
    price_change_percentage_30d: md?.price_change_percentage_30d ?? null,
    price_change_percentage_1h:
      md?.price_change_percentage_1h_in_currency?.usd ?? null,
    last_updated:
      md?.last_updated || j.last_updated || new Date().toISOString(),
  };

  writeCache(id, detail);
  return detail;
}

function pctFromCloses(earlier: number, later: number): number | null {
  if (!Number.isFinite(earlier) || !Number.isFinite(later) || earlier <= 0)
    return null;
  return ((later - earlier) / earlier) * 100;
}

async function klinesCloses(
  pair: string,
  interval: string,
  limit: number,
): Promise<number[]> {
  for (const host of BN_HOSTS) {
    const url = `${host}/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${limit}`;
    const r = await fetchJson(url, 8000);
    if (!r.ok || !Array.isArray(r.data) || r.data.length < 2) continue;
    const closes = (r.data as unknown[][]).map((row) => Number(row[4]));
    if (closes.every((c) => Number.isFinite(c) && c > 0)) return closes;
  }
  return [];
}

/**
 * % 1h / 7d / 30d từ nến Binance (không cần CoinGecko).
 */
export async function fetchBinancePeriodChanges(symbol: string): Promise<{
  change1h: number | null;
  change7d: number | null;
  change30d: number | null;
  high24: number | null;
  low24: number | null;
  last: number | null;
  change24: number | null;
}> {
  const pair = toBinanceSymbol(symbol);
  if (!pair) {
    return {
      change1h: null,
      change7d: null,
      change30d: null,
      high24: null,
      low24: null,
      last: null,
      change24: null,
    };
  }

  const [c1h, c7d, c30d, ticker] = await Promise.all([
    klinesCloses(pair, "1h", 3),
    klinesCloses(pair, "1d", 8),
    klinesCloses(pair, "1d", 32),
    (async () => {
      for (const host of BN_HOSTS) {
        const r = await fetchJson(
          `${host}/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`,
          6000,
        );
        if (r.ok && r.data && typeof r.data === "object") {
          return r.data as Record<string, string>;
        }
      }
      return null;
    })(),
  ]);

  const change1h =
    c1h.length >= 2
      ? pctFromCloses(c1h[c1h.length - 2], c1h[c1h.length - 1])
      : null;
  // close hiện tại vs close ~7 ngày trước
  const change7d =
    c7d.length >= 7
      ? pctFromCloses(c7d[c7d.length - 7], c7d[c7d.length - 1])
      : c7d.length >= 2
        ? pctFromCloses(c7d[0], c7d[c7d.length - 1])
        : null;
  const change30d =
    c30d.length >= 30
      ? pctFromCloses(c30d[c30d.length - 30], c30d[c30d.length - 1])
      : c30d.length >= 2
        ? pctFromCloses(c30d[0], c30d[c30d.length - 1])
        : null;

  return {
    change1h,
    change7d,
    change30d,
    high24: ticker ? Number(ticker.highPrice) : null,
    low24: ticker ? Number(ticker.lowPrice) : null,
    last: ticker ? Number(ticker.lastPrice) : null,
    change24: ticker ? Number(ticker.priceChangePercent) : null,
  };
}

/** Merge SSR + CG + Binance periods */
export function mergeCoinDetail(
  base: CoinDetail,
  cg: CoinDetail | null,
  bn: Awaited<ReturnType<typeof fetchBinancePeriodChanges>>,
): CoinDetail {
  const src = cg && cg.market_cap > 0 ? cg : base;
  const isFallbackDesc =
    !src.descriptionVi ||
    src.descriptionVi.includes("tạm thời không tải") ||
    src.descriptionVi.includes("CoinGecko");

  return {
    ...src,
    descriptionVi: isFallbackDesc
      ? cg?.descriptionVi && !cg.descriptionVi.includes("tạm thời")
        ? cg.descriptionVi
        : ""
      : src.descriptionVi,
    image: cg?.image || src.image,
    current_price: bn.last && bn.last > 0 ? bn.last : src.current_price,
    price_change_percentage_24h:
      bn.change24 ?? src.price_change_percentage_24h,
    price_change_percentage_1h:
      src.price_change_percentage_1h ?? bn.change1h,
    price_change_percentage_7d:
      src.price_change_percentage_7d ?? bn.change7d,
    price_change_percentage_30d:
      src.price_change_percentage_30d ?? bn.change30d,
    high_24h: bn.high24 ?? src.high_24h,
    low_24h: bn.low24 ?? src.low_24h,
    market_cap: cg?.market_cap || src.market_cap,
    total_volume: cg?.total_volume || src.total_volume,
    ath: cg?.ath ?? src.ath,
    ath_change_percentage: cg?.ath_change_percentage ?? src.ath_change_percentage,
    ath_date: cg?.ath_date ?? src.ath_date,
    circulating_supply: cg?.circulating_supply ?? src.circulating_supply,
    total_supply: cg?.total_supply ?? src.total_supply,
    max_supply: cg?.max_supply ?? src.max_supply,
    market_cap_rank: cg?.market_cap_rank ?? src.market_cap_rank,
    categories: cg?.categories?.length ? cg.categories : src.categories,
    homepage: cg?.homepage || src.homepage,
    last_updated: new Date().toISOString(),
  };
}
