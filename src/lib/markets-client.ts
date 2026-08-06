/**
 * Client-side market data:
 * 1) CoinGecko (đủ vốn hóa, logo, % 1h/7d) — CORS *
 * 2) Fallback Binance ticker (giá + % 24h)
 */

import type { CoinMarket, FearGreed, GlobalMarket } from "./types";

const CG = "https://api.coingecko.com/api/v3";
const BINANCE_HOSTS = [
  "https://api.binance.com",
  "https://data-api.binance.vision",
] as const;

export const MARKET_PAIRS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "USDCUSDT",
  "DOGEUSDT", "ADAUSDT", "TRXUSDT", "TONUSDT", "AVAXUSDT", "SHIBUSDT",
  "LINKUSDT", "DOTUSDT", "BCHUSDT", "NEARUSDT", "LTCUSDT", "UNIUSDT",
  "ATOMUSDT", "ETCUSDT", "XLMUSDT", "APTUSDT", "FILUSDT", "ARBUSDT",
  "OPUSDT", "ICPUSDT", "HBARUSDT", "VETUSDT", "INJUSDT", "SUIUSDT",
  "SEIUSDT", "PEPEUSDT", "WIFUSDT", "BONKUSDT", "RENDERUSDT", "FETUSDT",
  "AAVEUSDT", "IMXUSDT", "STXUSDT", "ALGOUSDT", "GRTUSDT", "SANDUSDT",
  "MANAUSDT", "AXSUSDT", "THETAUSDT", "EGLDUSDT", "FLOWUSDT", "CHZUSDT",
  "ENSUSDT", "CRVUSDT", "LDOUSDT", "RUNEUSDT", "CAKEUSDT", "GALAUSDT",
  "SNXUSDT", "COMPUSDT", "WLDUSDT", "TIAUSDT", "JUPUSDT", "PYTHUSDT",
  "JTOUSDT", "WBTCUSDT", "FDUSDUSDT", "ENAUSDT", "PENDLEUSDT", "OMUSDT",
  "TAOUSDT", "BERAUSDT", "CROUSDT", "OKBUSDT", "FLOKIUSDT", "RAYUSDT",
  "ORDIUSDT", "POLUSDT", "WUSDT", "ETHFIUSDT", "EIGENUSDT", "MOVEUSDT",
] as const;

const SYM_TO_ID: Record<string, string> = {
  btc: "bitcoin", eth: "ethereum", bnb: "binancecoin", sol: "solana",
  xrp: "ripple", usdc: "usd-coin", ada: "cardano", doge: "dogecoin",
  trx: "tron", ton: "the-open-network", avax: "avalanche-2",
  shib: "shiba-inu", link: "chainlink", dot: "polkadot",
  bch: "bitcoin-cash", near: "near", ltc: "litecoin", uni: "uniswap",
  atom: "cosmos", etc: "ethereum-classic", xlm: "stellar", apt: "aptos",
  fil: "filecoin", arb: "arbitrum", op: "optimism",
  icp: "internet-computer", hbar: "hedera-hashgraph", vet: "vechain",
  inj: "injective-protocol", sui: "sui", sei: "sei-network", pepe: "pepe",
  wif: "dogwifcoin", bonk: "bonk", render: "render-token", fet: "fetch-ai",
  aave: "aave", imx: "immutable-x", stx: "blockstack", algo: "algorand",
  grt: "the-graph", sand: "the-sandbox", mana: "decentraland",
  axs: "axie-infinity", theta: "theta-token", egld: "elrond-erd-2",
  flow: "flow", chz: "chiliz", ens: "ethereum-name-service",
  crv: "curve-dao-token", ldo: "lido-dao", rune: "thorchain",
  cake: "pancakeswap-token", gala: "gala", snx: "havven",
  comp: "compound-governance-token", wld: "worldcoin-wld", tia: "celestia",
  jup: "jupiter-exchange-solana", pyth: "pyth-network",
  jto: "jito-governance-token", wbtc: "wrapped-bitcoin",
  fdusd: "first-digital-usd", ena: "ethena", pendle: "pendle",
  om: "mantra-dao", tao: "bittensor", bera: "berachain-bera",
  cro: "crypto-com-chain", okb: "okb", floki: "floki", ray: "raydium",
  ordi: "ordinals", pol: "polygon-ecosystem-token", w: "wormhole",
  ethfi: "ether-fi", eigen: "eigenlayer", move: "movement",
};

export function iconUrlForSymbol(sym: string): string {
  const s = sym.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `https://assets.coincap.io/assets/icons/${s}@2x.png`;
}

async function fetchJson(url: string, timeoutMs = 10000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
      mode: "cors",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** CoinGecko markets – full fields + images */
export async function fetchTopCoinsFromCoinGeckoClient(
  limit = 100,
): Promise<CoinMarket[] | null> {
  const url = new URL(`${CG}/coins/markets`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(Math.min(limit, 250)));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "1h,24h,7d");

  const data = await fetchJson(url.toString(), 12000);
  if (!Array.isArray(data) || data.length === 0) return null;
  return data as CoinMarket[];
}

function mapBinanceRows(
  rows: Array<Record<string, string>>,
  limit: number,
): CoinMarket[] {
  return rows
    .map((r) => {
      const pair = r.symbol || "";
      const base = pair.replace(/USDT$/i, "");
      const sym = base.toLowerCase();
      const id = SYM_TO_ID[sym] || sym;
      const price = Number(r.lastPrice);
      const change = Number(r.priceChangePercent);
      const quoteVol = Number(r.quoteVolume);
      return {
        id,
        symbol: sym,
        name: base,
        image: iconUrlForSymbol(sym),
        current_price: price,
        market_cap: 0,
        market_cap_rank: 0,
        total_volume: quoteVol,
        price_change_percentage_24h: change,
        price_change_percentage_24h_in_currency: change,
        price_change_percentage_1h_in_currency: null,
        price_change_percentage_7d_in_currency: null,
        _qv: quoteVol,
      } as CoinMarket & { _qv: number };
    })
    .filter((c) => Number.isFinite(c.current_price) && c.current_price > 0)
    .sort((a, b) => b._qv - a._qv)
    .slice(0, limit)
    .map((c, i) => {
      const { _qv, ...rest } = c;
      return { ...rest, market_cap_rank: i + 1 };
    });
}

async function fetchTopCoinsFromBinanceClient(
  limit: number,
): Promise<CoinMarket[]> {
  const pairs = MARKET_PAIRS.slice(0, Math.max(limit, 40));
  const symbolsParam = encodeURIComponent(JSON.stringify(pairs));

  for (const host of BINANCE_HOSTS) {
    const data = await fetchJson(
      `${host}/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      8000,
    );
    if (Array.isArray(data) && data.length) {
      return mapBinanceRows(data as Array<Record<string, string>>, limit);
    }
  }
  return [];
}

const LS_MARKETS = "cmvn_markets_v2";
const LS_MARKETS_TTL = 10 * 60_000;

function readMarketsCache(limit: number): CoinMarket[] | null {
  try {
    const raw = localStorage.getItem(LS_MARKETS);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: CoinMarket[] };
    if (Date.now() - at > LS_MARKETS_TTL) return null;
    if (!Array.isArray(data) || data.length < 5) return null;
    return data.slice(0, limit);
  } catch {
    return null;
  }
}

function writeMarketsCache(data: CoinMarket[]) {
  try {
    localStorage.setItem(
      LS_MARKETS,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    /* */
  }
}

/** Gắn % 1h / 7d từ klines cho top N (khi CoinGecko 429) */
async function enrichPctFromBinance(
  coins: CoinMarket[],
  maxCoins = 40,
): Promise<CoinMarket[]> {
  const { fetchBinancePeriodChanges } = await import("./coin-detail-client");
  const head = coins.slice(0, maxCoins);
  const tail = coins.slice(maxCoins);
  const out: CoinMarket[] = [];
  // concurrency 6
  const queue = [...head];
  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      if (!c) break;
      try {
        const p = await fetchBinancePeriodChanges(c.symbol);
        out.push({
          ...c,
          current_price: p.last && p.last > 0 ? p.last : c.current_price,
          price_change_percentage_24h:
            p.change24 ?? c.price_change_percentage_24h,
          price_change_percentage_24h_in_currency:
            p.change24 ?? c.price_change_percentage_24h_in_currency,
          price_change_percentage_1h_in_currency:
            p.change1h ?? c.price_change_percentage_1h_in_currency,
          price_change_percentage_7d_in_currency:
            p.change7d ?? c.price_change_percentage_7d_in_currency,
        });
      } catch {
        out.push(c);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  // preserve order by original rank
  const byId = new Map(out.map((c) => [c.id, c]));
  return [
    ...head.map((c) => byId.get(c.id) || c),
    ...tail,
  ];
}

/**
 * Ưu tiên CoinGecko (đầy đủ) → cache local → Binance (+ enrich 1h/7d).
 */
export async function fetchTopCoinsClient(
  limit = 100,
): Promise<CoinMarket[]> {
  const cached =
    typeof window !== "undefined" ? readMarketsCache(limit) : null;

  const cg = await fetchTopCoinsFromCoinGeckoClient(limit);
  if (cg && cg.length > 0) {
    const list = cg.slice(0, limit).map((c) => ({
      ...c,
      image: c.image || iconUrlForSymbol(c.symbol),
    }));
    writeMarketsCache(list);
    return list;
  }

  // CG 429: dùng cache nếu còn % 1h/7d
  if (
    cached &&
    cached.some(
      (c) =>
        c.price_change_percentage_1h_in_currency != null ||
        c.price_change_percentage_7d_in_currency != null,
    )
  ) {
    return cached;
  }

  const bn = await fetchTopCoinsFromBinanceClient(limit);
  if (!bn.length) return cached || [];

  // Gắn 1h/7d từ nến cho top coins
  const enriched = await enrichPctFromBinance(bn, Math.min(36, limit));
  writeMarketsCache(enriched);
  return enriched;
}

export async function fetchGlobalMarketClient(): Promise<GlobalMarket | null> {
  const data = (await fetchJson(`${CG}/global`, 10000)) as {
    data?: {
      total_market_cap?: { usd?: number };
      total_volume?: { usd?: number };
      market_cap_percentage?: { btc?: number; eth?: number };
      market_cap_change_percentage_24h_usd?: number;
      updated_at?: number;
    };
  } | null;
  const d = data?.data;
  if (!d) return null;
  return {
    total_market_cap_usd: d.total_market_cap?.usd ?? 0,
    total_volume_usd: d.total_volume?.usd ?? 0,
    btc_dominance: d.market_cap_percentage?.btc ?? 0,
    eth_dominance: d.market_cap_percentage?.eth ?? 0,
    market_cap_change_percentage_24h:
      d.market_cap_change_percentage_24h_usd ?? 0,
    updated_at: d.updated_at
      ? new Date(d.updated_at * 1000).toISOString()
      : new Date().toISOString(),
  };
}

const FNG_VI: Record<string, string> = {
  "Extreme Fear": "Sợ hãi cực độ",
  Fear: "Sợ hãi",
  Neutral: "Trung lập",
  Greed: "Tham lam",
  "Extreme Greed": "Tham lam cực độ",
};

export async function fetchFearGreedClient(): Promise<FearGreed | null> {
  const data = (await fetchJson(
    "https://api.alternative.me/fng/?limit=1",
    8000,
  )) as {
    data?: Array<{
      value: string;
      value_classification: string;
      timestamp: string;
    }>;
  } | null;
  const row = data?.data?.[0];
  if (!row) return null;
  const classification = row.value_classification;
  return {
    value: Number(row.value),
    classification,
    classificationVi: FNG_VI[classification] ?? classification,
    timestamp: new Date(Number(row.timestamp) * 1000).toISOString(),
  };
}
