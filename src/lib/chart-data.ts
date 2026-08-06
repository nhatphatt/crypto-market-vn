/**
 * Server-side chart loader (SSR + /api/chart fallback).
 * Binance race song song; CoinGecko fail-fast 1 shot (không sleep retry).
 */

import type { Candle } from "./binance";
import {
  expandBinanceAliases,
  toBinanceSymbol,
} from "./binance";

const COINGECKO = "https://api.coingecko.com/api/v3";
const BINANCE_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
] as const;

export type ChartRange = "1d" | "7d" | "30d" | "90d";
export type ChartSource = "binance" | "coingecko-ohlc" | "coingecko" | "none";

export type ChartResult = {
  candles: Candle[];
  source: ChartSource;
  pair: string | null;
  error?: string;
  ms?: number;
};

const RANGE_BINANCE = {
  "1d": { interval: "15m", limit: 96 },
  "7d": { interval: "1h", limit: 168 },
  "30d": { interval: "4h", limit: 180 },
  "90d": { interval: "1d", limit: 90 },
} as const;

const RANGE_CG_DAYS: Record<ChartRange, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** process cache */
const g = globalThis as unknown as {
  __cmvnChartCache?: Map<string, { at: number; result: ChartResult }>;
  __cmvnChartInflight?: Map<string, Promise<ChartResult>>;
};
function getCache() {
  if (!g.__cmvnChartCache) g.__cmvnChartCache = new Map();
  return g.__cmvnChartCache;
}
function getInflight() {
  if (!g.__cmvnChartInflight) g.__cmvnChartInflight = new Map();
  return g.__cmvnChartInflight;
}
const CACHE_TTL = 45_000;

export function normalizeCandles(raw: Candle[]): Candle[] {
  if (!raw.length) return [];
  const map = new Map<number, Candle>();
  for (const c of raw) {
    if (!Number.isFinite(c.time) || !Number.isFinite(c.close) || c.close <= 0)
      continue;
    const t = Math.floor(c.time);
    const open = Number.isFinite(c.open) ? c.open : c.close;
    const high = Math.max(open, c.close, Number.isFinite(c.high) ? c.high : c.close);
    const low = Math.min(open, c.close, Number.isFinite(c.low) ? c.low : c.close);
    map.set(t, {
      time: t,
      open,
      high: high >= low ? high : low,
      low: low <= high ? low : high,
      close: c.close,
      volume: c.volume || 0,
    });
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

function downsample(candles: Candle[], maxPoints = 300): Candle[] {
  if (candles.length <= maxPoints) return candles;
  const step = Math.ceil(candles.length / maxPoints);
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += step) {
    const chunk = candles.slice(i, Math.min(i + step, candles.length));
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    out.push({
      time: first.time,
      open: first.open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: last.close,
      volume: chunk.reduce((s, c) => s + (c.volume || 0), 0),
    });
  }
  return normalizeCandles(out);
}

async function fetchJson(
  url: string,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Fetch thuần — tương thích Cloudflare Workers / Node
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "CryptoMarketVN/1.0",
      },
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(t);
  }
}

function uniquePairs(symbol: string): string[] {
  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const a of expandBinanceAliases(symbol)) {
    const p = toBinanceSymbol(a);
    if (p && !seen.has(p)) {
      seen.add(p);
      pairs.push(p);
    }
  }
  return pairs;
}

async function binanceKlinesServer(
  symbol: string,
  interval: string,
  limit: number,
): Promise<{ candles: Candle[]; pair: string | null }> {
  const pairs = uniquePairs(symbol);
  if (!pairs.length) return { candles: [], pair: null };

  try {
    const winner = await Promise.any(
      pairs.flatMap((pair) =>
        BINANCE_HOSTS.map(async (host) => {
          const url = `${host}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
          const r = await fetchJson(url, 5000);
          if (!r.ok || !Array.isArray(r.data)) throw new Error("fail");
          const rows = r.data as Array<unknown[]>;
          const parsed = normalizeCandles(
            rows.map((row) => ({
              time: Math.floor(Number(row[0]) / 1000),
              open: Number(row[1]),
              high: Number(row[2]),
              low: Number(row[3]),
              close: Number(row[4]),
              volume: Number(row[5]),
            })),
          );
          if (parsed.length < 3) throw new Error("empty");
          return { candles: parsed, pair };
        }),
      ),
    );
    return winner;
  } catch {
    return { candles: [], pair: pairs[0] ?? null };
  }
}

async function cgOhlcOnce(id: string, days: number): Promise<Candle[]> {
  const allowed = [1, 7, 14, 30, 90, 180, 365];
  const d = allowed.includes(days)
    ? days
    : allowed.reduce((a, b) =>
        Math.abs(b - days) < Math.abs(a - days) ? b : a,
      );
  const url = `${COINGECKO}/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${d}`;
  const r = await fetchJson(url, 6000);
  if (!r.ok || !Array.isArray(r.data)) return [];
  const rows = r.data as number[][];
  return normalizeCandles(
    rows.map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: 0,
    })),
  );
}

export async function fetchCoinGeckoOhlc(id: string, days: number) {
  return cgOhlcOnce(id, days);
}

export async function fetchCoinGeckoMarketChart(
  id: string,
  days: number,
): Promise<Candle[]> {
  const url = `${COINGECKO}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
  const r = await fetchJson(url, 6000);
  if (!r.ok || !r.data || typeof r.data !== "object") return [];
  const prices = (r.data as { prices?: [number, number][] }).prices || [];
  if (prices.length < 2) return [];
  const span = (prices[prices.length - 1][0] - prices[0][0]) / 1000;
  const bucketSec = Math.max(60, Math.floor(span / 80));
  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number }
  >();
  for (const [ms, p] of prices) {
    if (!Number.isFinite(p) || p <= 0) continue;
    const key = Math.floor(Math.floor(ms / 1000) / bucketSec) * bucketSec;
    const b = buckets.get(key);
    if (!b) buckets.set(key, { open: p, high: p, low: p, close: p });
    else {
      b.high = Math.max(b.high, p);
      b.low = Math.min(b.low, p);
      b.close = p;
    }
  }
  return normalizeCandles(
    [...buckets.entries()].map(([time, b]) => ({
      time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: 0,
    })),
  );
}

async function loadChartDataUncached(
  coinId: string,
  symbol: string,
  range: ChartRange,
): Promise<ChartResult> {
  const t0 = Date.now();
  const cfg = RANGE_BINANCE[range];
  const days = RANGE_CG_DAYS[range];

  // 1) Binance race song song (host × alias)
  const bn = await binanceKlinesServer(symbol, cfg.interval, cfg.limit);
  if (bn.candles.length >= 3) {
    return {
      candles: downsample(bn.candles),
      source: "binance",
      pair: bn.pair,
      ms: Date.now() - t0,
    };
  }

  // 2) CoinGecko: OHLC + market_chart song song, lấy cái về trước có data
  if (coinId) {
    try {
      const winner = await Promise.any([
        cgOhlcOnce(coinId, days).then((c) => {
          if (c.length < 3) throw new Error("empty");
          return { candles: c, source: "coingecko-ohlc" as const };
        }),
        fetchCoinGeckoMarketChart(coinId, days).then((c) => {
          if (c.length < 3) throw new Error("empty");
          return { candles: c, source: "coingecko" as const };
        }),
      ]);
      return {
        candles: downsample(winner.candles),
        source: winner.source,
        pair: bn.pair,
        ms: Date.now() - t0,
      };
    } catch {
      /* both failed */
    }
  }

  return {
    candles: [],
    source: "none",
    pair: bn.pair,
    ms: Date.now() - t0,
    error: "Không tải được dữ liệu biểu đồ. Thử lại sau giây lát.",
  };
}

export async function loadChartData(
  coinId: string,
  symbol: string,
  range: ChartRange = "7d",
): Promise<ChartResult> {
  const cacheKey = `${coinId}|${symbol}|${range}`;
  const cache = getCache();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL && hit.result.candles.length >= 3) {
    return { ...hit.result, ms: 0 };
  }

  const inflight = getInflight();
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const promise = loadChartDataUncached(coinId, symbol, range)
    .then((result) => {
      if (result.candles.length >= 3) {
        cache.set(cacheKey, { at: Date.now(), result });
      }
      return result;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, promise);
  return promise;
}
