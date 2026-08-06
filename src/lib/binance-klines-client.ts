/**
 * Fetch klines TRỰC TIẾP browser → Binance (CORS *), fallback CoinGecko.
 * Race multi-host + multi-alias, cache tab.
 */

import type { Candle } from "./binance";
import { expandBinanceAliases, toBinanceSymbol } from "./binance";
import type { ChartRange } from "./chart-data";

const HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
] as const;

export const RANGE_KLINES: Record<
  ChartRange,
  { interval: string; limit: number }
> = {
  "1d": { interval: "15m", limit: 96 },
  "7d": { interval: "1h", limit: 168 },
  "30d": { interval: "4h", limit: 180 },
  "90d": { interval: "1d", limit: 90 },
};

const RANGE_CG_DAYS: Record<ChartRange, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Cache session (tab) – đổi range / quay lại coin không fetch lại */
const cache = new Map<string, { at: number; candles: Candle[]; pair: string }>();
const CACHE_TTL = 90_000;
/** In-flight dedupe – nhiều component cùng fetch 1 pair */
const inflight = new Map<string, Promise<{ candles: Candle[]; pair: string }>>();

function cacheKey(pair: string, interval: string, limit: number) {
  return `${pair}:${interval}:${limit}`;
}

function parseKlines(rows: unknown): Candle[] {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const map = new Map<number, Candle>();
  for (const r of rows as Array<unknown[]>) {
    if (!Array.isArray(r) || r.length < 6) continue;
    const time = Math.floor(Number(r[0]) / 1000);
    const open = Number(r[1]);
    const high = Number(r[2]);
    const low = Number(r[3]);
    const close = Number(r[4]);
    const volume = Number(r[5]);
    if (!Number.isFinite(time) || !Number.isFinite(close) || close <= 0)
      continue;
    const o = Number.isFinite(open) ? open : close;
    const h = Number.isFinite(high) ? high : Math.max(o, close);
    const l = Number.isFinite(low) ? low : Math.min(o, close);
    map.set(time, {
      time,
      open: o,
      high: Math.max(o, close, h),
      low: Math.min(o, close, l),
      close,
      volume: Number.isFinite(volume) ? volume : 0,
    });
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

function normalizeCandles(raw: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of raw) {
    if (!Number.isFinite(c.time) || !Number.isFinite(c.close) || c.close <= 0)
      continue;
    const t = Math.floor(c.time);
    const open = Number.isFinite(c.open) ? c.open : c.close;
    const high = Math.max(
      open,
      c.close,
      Number.isFinite(c.high) ? c.high : c.close,
    );
    const low = Math.min(
      open,
      c.close,
      Number.isFinite(c.low) ? c.low : c.close,
    );
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

async function fetchOneHost(
  host: string,
  pair: string,
  interval: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const url = `${host}/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
    mode: "cors",
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const candles = parseKlines(await res.json());
  if (candles.length < 3) throw new Error("empty");
  return candles;
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

/**
 * Race host × alias. Timeout dài hơn (mạng VN / chặn từng host).
 */
export async function fetchBinanceKlinesFast(
  symbol: string,
  range: ChartRange = "7d",
  timeoutMs = 8000,
): Promise<{ candles: Candle[]; pair: string | null }> {
  const cfg = RANGE_KLINES[range];
  const pairs = uniquePairs(symbol);
  if (!pairs.length) return { candles: [], pair: null };

  for (const pair of pairs) {
    const key = cacheKey(pair, cfg.interval, cfg.limit);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL && hit.candles.length >= 3) {
      return { candles: hit.candles, pair: hit.pair };
    }
  }

  const flightKey = `${symbol.toLowerCase()}|${range}|${cfg.interval}|${cfg.limit}`;
  const existing = inflight.get(flightKey);
  if (existing) {
    try {
      return await existing;
    } catch {
      return { candles: [], pair: pairs[0] ?? null };
    }
  }

  const run = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const tasks: Promise<{ candles: Candle[]; pair: string }>[] = [];
      for (const pair of pairs) {
        for (const host of HOSTS) {
          tasks.push(
            fetchOneHost(
              host,
              pair,
              cfg.interval,
              cfg.limit,
              ctrl.signal,
            ).then((candles) => ({ candles, pair })),
          );
        }
      }

      const winner = await Promise.any(tasks);
      try {
        ctrl.abort();
      } catch {
        /* */
      }
      clearTimeout(timer);

      const key = cacheKey(winner.pair, cfg.interval, cfg.limit);
      cache.set(key, {
        at: Date.now(),
        candles: winner.candles,
        pair: winner.pair,
      });
      return winner;
    } catch {
      clearTimeout(timer);
      throw new Error("all failed");
    }
  })();

  inflight.set(flightKey, run);
  try {
    return await run;
  } catch {
    return { candles: [], pair: pairs[0] ?? null };
  } finally {
    inflight.delete(flightKey);
  }
}

/** CoinGecko OHLC từ browser — khi Binance bị chặn / không có pair */
export async function fetchCoinGeckoOhlcClient(
  coinId: string,
  range: ChartRange = "7d",
  timeoutMs = 9000,
): Promise<Candle[]> {
  if (!coinId) return [];
  const days = RANGE_CG_DAYS[range] ?? 7;
  const allowed = [1, 7, 14, 30, 90, 180, 365];
  const d = allowed.includes(days)
    ? days
    : allowed.reduce((a, b) =>
        Math.abs(b - days) < Math.abs(a - days) ? b : a,
      );

  const cacheId = `cg-ohlc|${coinId}|${d}`;
  const hit = cache.get(cacheId);
  if (hit && Date.now() - hit.at < CACHE_TTL && hit.candles.length >= 3) {
    return hit.candles;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/ohlc?vs_currency=usd&days=${d}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
      mode: "cors",
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as number[][];
    if (!Array.isArray(rows) || rows.length < 3) return [];
    const candles = normalizeCandles(
      rows.map((row) => ({
        time: Math.floor(Number(row[0]) / 1000),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: 0,
      })),
    );
    if (candles.length >= 3) {
      cache.set(cacheId, { at: Date.now(), candles, pair: "coingecko" });
    }
    return candles;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Market chart (line → pseudo-candle) khi OHLC 429 */
export async function fetchCoinGeckoMarketChartClient(
  coinId: string,
  range: ChartRange = "7d",
  timeoutMs = 9000,
): Promise<Candle[]> {
  if (!coinId) return [];
  const days = RANGE_CG_DAYS[range] ?? 7;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
      mode: "cors",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { prices?: [number, number][] };
    const prices = data.prices || [];
    if (prices.length < 2) return [];
    const span = (prices[prices.length - 1][0] - prices[0][0]) / 1000;
    const bucketSec = Math.max(60, Math.floor(span / 100));
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
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Chart client: Binance → CoinGecko OHLC → market_chart.
 */
export async function fetchChartCandlesClient(
  coinId: string,
  symbol: string,
  range: ChartRange = "7d",
): Promise<{
  candles: Candle[];
  pair: string | null;
  source: "binance" | "coingecko-ohlc" | "coingecko" | "none";
}> {
  const bn = await fetchBinanceKlinesFast(symbol, range, 8000);
  if (bn.candles.length >= 3) {
    return { candles: bn.candles, pair: bn.pair, source: "binance" };
  }

  if (coinId) {
    const ohlc = await fetchCoinGeckoOhlcClient(coinId, range, 9000);
    if (ohlc.length >= 3) {
      return { candles: ohlc, pair: bn.pair, source: "coingecko-ohlc" };
    }
    const mc = await fetchCoinGeckoMarketChartClient(coinId, range, 9000);
    if (mc.length >= 3) {
      return { candles: mc, pair: bn.pair, source: "coingecko" };
    }
  }

  return { candles: [], pair: bn.pair, source: "none" };
}

export function peekChartCache(
  symbol: string,
  range: ChartRange,
): Candle[] | null {
  const cfg = RANGE_KLINES[range];
  for (const pair of uniquePairs(symbol)) {
    const hit = cache.get(cacheKey(pair, cfg.interval, cfg.limit));
    if (hit && Date.now() - hit.at < CACHE_TTL && hit.candles.length >= 3) {
      return hit.candles;
    }
  }
  return null;
}

/** Prefetch nền – hover coin / soft refresh */
export function prefetchBinanceKlines(
  symbol: string,
  range: ChartRange = "7d",
): void {
  if (peekChartCache(symbol, range)) return;
  void fetchBinanceKlinesFast(symbol, range, 8000);
}
