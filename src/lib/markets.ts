import type { CoinMarket, GlobalMarket } from "./types";

const COINGECKO = "https://api.coingecko.com/api/v3";
const BINANCE = "https://data-api.binance.vision/api/v3";

/** Cache process-level: tránh spam CoinGecko khi nhiều RSC gọi cùng lúc */
type CacheEntry<T> = { at: number; data: T };
const g = globalThis as unknown as {
  __cmvnMarketsCache?: CacheEntry<CoinMarket[]>;
  __cmvnGlobalCache?: CacheEntry<GlobalMarket | null>;
};

const MEMORY_TTL_MS = 45_000; // 45s trong process

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } },
  retries = 3,
): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429) {
        const wait = 800 * (i + 1) + Math.floor(Math.random() * 400);
        await sleep(wait);
        continue;
      }
      return res;
    } catch {
      await sleep(400 * (i + 1));
    }
  }
  return null;
}

/** Symbol Binance → CoinGecko id (để link /coin/[id] vẫn mở được) */
const SYM_TO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  bnb: "binancecoin",
  sol: "solana",
  xrp: "ripple",
  usdc: "usd-coin",
  ada: "cardano",
  doge: "dogecoin",
  trx: "tron",
  ton: "the-open-network",
  avax: "avalanche-2",
  shib: "shiba-inu",
  link: "chainlink",
  dot: "polkadot",
  bch: "bitcoin-cash",
  near: "near",
  matic: "matic-network",
  pol: "polygon-ecosystem-token",
  ltc: "litecoin",
  uni: "uniswap",
  atom: "cosmos",
  etc: "ethereum-classic",
  xlm: "stellar",
  apt: "aptos",
  fil: "filecoin",
  arb: "arbitrum",
  op: "optimism",
  icp: "internet-computer",
  hbar: "hedera-hashgraph",
  vet: "vechain",
  inj: "injective-protocol",
  sui: "sui",
  sei: "sei-network",
  pepe: "pepe",
  wif: "dogwifcoin",
  bonk: "bonk",
  render: "render-token",
  rndr: "render-token",
  fet: "fetch-ai",
  aave: "aave",
  mkr: "maker",
  imx: "immutable-x",
  stx: "blockstack",
  algo: "algorand",
  grt: "the-graph",
  sand: "the-sandbox",
  mana: "decentraland",
  axs: "axie-infinity",
  theta: "theta-token",
  egld: "elrond-erd-2",
  flow: "flow",
  chz: "chiliz",
  ens: "ethereum-name-service",
  crv: "curve-dao-token",
  ldo: "lido-dao",
  rune: "thorchain",
  cake: "pancakeswap-token",
  gala: "gala",
  snx: "havven",
  comp: "compound-governance-token",
  wld: "worldcoin-wld",
  tia: "celestia",
  jup: "jupiter-exchange-solana",
  pyth: "pyth-network",
  jto: "jito-governance-token",
  wbtc: "wrapped-bitcoin",
  fdusd: "first-digital-usd",
  ena: "ethena",
  pendle: "pendle",
  om: "mantra-dao",
  tao: "bittensor",
  bera: "berachain-bera",
  cro: "crypto-com-chain",
  okb: "okb",
  leo: "leo-token",
  floki: "floki",
  ray: "raydium",
  ordi: "ordinals",
  bgb: "bitget-token",
  hype: "hyperliquid",
  move: "movement",
  ethfi: "ether-fi",
  eigen: "eigenlayer",
  w: "wormhole",
};

function iconFor(sym: string): string {
  const s = sym.toLowerCase().replace(/[^a-z0-9]/g, "");
  // CoinCap – cover coin mới tốt hơn cryptocurrency-icons
  return `https://assets.coincap.io/assets/icons/${s}@2x.png`;
}

/** Cặp USDT phổ biến – tránh GET /ticker/24hr full (~2.5MB, Next không cache được) */
const FALLBACK_PAIRS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "USDCUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "TRXUSDT",
  "TONUSDT",
  "AVAXUSDT",
  "SHIBUSDT",
  "LINKUSDT",
  "DOTUSDT",
  "BCHUSDT",
  "NEARUSDT",
  "LTCUSDT",
  "UNIUSDT",
  "ATOMUSDT",
  "ETCUSDT",
  "XLMUSDT",
  "APTUSDT",
  "FILUSDT",
  "ARBUSDT",
  "OPUSDT",
  "ICPUSDT",
  "HBARUSDT",
  "VETUSDT",
  "INJUSDT",
  "SUIUSDT",
  "SEIUSDT",
  "PEPEUSDT",
  "WIFUSDT",
  "BONKUSDT",
  "RENDERUSDT",
  "FETUSDT",
  "AAVEUSDT",
  "MKRUSDT",
  "IMXUSDT",
  "STXUSDT",
  "ALGOUSDT",
  "GRTUSDT",
  "SANDUSDT",
  "MANAUSDT",
  "AXSUSDT",
  "THETAUSDT",
  "EGLDUSDT",
  "FLOWUSDT",
  "CHZUSDT",
  "ENSUSDT",
  "CRVUSDT",
  "LDOUSDT",
  "RUNEUSDT",
  "CAKEUSDT",
  "GALAUSDT",
  "SNXUSDT",
  "COMPUSDT",
  "WLDUSDT",
  "TIAUSDT",
  "JUPUSDT",
  "PYTHUSDT",
  "JTOUSDT",
  "WBTCUSDT",
  "FDUSDUSDT",
  "ENAUSDT",
  "PENDLEUSDT",
  "OMUSDT",
  "TAOUSDT",
  "BERAUSDT",
  "CROUSDT",
  "OKBUSDT",
  "LEOUSDT",
  "FLOKIUSDT",
  "RAYUSDT",
  "ORDIUSDT",
  "POLUSDT",
  "WUSDT",
  "ETHFIUSDT",
  "EIGENUSDT",
  "MOVEUSDT",
];

const BINANCE_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
] as const;

function mapBinanceRows(
  rows: Array<Record<string, string>>,
  limit: number,
): CoinMarket[] {
  return rows
    .map((r) => {
      const pair = r.symbol;
      const base = pair.replace(/USDT$/, "");
      const sym = base.toLowerCase();
      const id = SYM_TO_ID[sym] || sym;
      const price = Number(r.lastPrice);
      const change = Number(r.priceChangePercent);
      const quoteVol = Number(r.quoteVolume);
      return {
        id,
        symbol: sym,
        name: base,
        image: iconFor(sym),
        current_price: price,
        market_cap: 0,
        market_cap_rank: 0,
        total_volume: quoteVol,
        price_change_percentage_24h: change,
        price_change_percentage_24h_in_currency: change,
        price_change_percentage_1h_in_currency: null,
        price_change_percentage_7d_in_currency: null,
        _quoteVol: quoteVol,
      } as CoinMarket & { _quoteVol: number };
    })
    .filter((c) => Number.isFinite(c.current_price) && c.current_price > 0)
    .sort((a, b) => b._quoteVol - a._quoteVol)
    .slice(0, limit)
    .map((c, i) => {
      const { _quoteVol, ...rest } = c;
      return { ...rest, market_cap_rank: i + 1 };
    });
}

/** Fallback: ticker 24h multi-host (build-time + runtime) */
async function fetchTopCoinsFromBinance(limit: number): Promise<CoinMarket[]> {
  const pairs = FALLBACK_PAIRS.slice(0, Math.max(limit, 40));
  const symbolsParam = encodeURIComponent(JSON.stringify(pairs));

  for (const host of BINANCE_HOSTS) {
    try {
      const res = await fetch(
        `${host}/api/v3/ticker/24hr?symbols=${symbolsParam}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "CryptoMarketVN/1.0",
          },
          // static export build: plain fetch
          next: { revalidate: 30 },
        },
      );
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<Record<string, string>>;
      if (!Array.isArray(rows) || !rows.length) continue;
      const mapped = mapBinanceRows(rows, limit);
      if (mapped.length) return mapped;
    } catch {
      /* next host */
    }
  }
  return [];
}

async function fetchTopCoinsFromCoinGecko(
  limit: number,
): Promise<CoinMarket[] | null> {
  const url = new URL(`${COINGECKO}/coins/markets`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(Math.min(limit, 250)));
  url.searchParams.set("page", "1");
  // sparkline tốn payload + rate – tắt để giảm 429
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "1h,24h,7d");

  const res = await fetchWithRetry(url.toString(), {
    next: { revalidate: 120 },
    headers: {
      Accept: "application/json",
      // giảm cache thundering herd
    },
  });

  if (!res) return null;
  if (res.status === 429) return null;
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[markets] CoinGecko markets", res.status);
    }
    return null;
  }

  return (await res.json()) as CoinMarket[];
}

export async function fetchTopCoins(limit = 50): Promise<CoinMarket[]> {
  // 1) memory cache
  const cached = g.__cmvnMarketsCache;
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS && cached.data.length) {
    return cached.data.slice(0, limit);
  }

  // 2) Live CoinGecko
  const cg = await fetchTopCoinsFromCoinGecko(limit);
  if (cg && cg.length > 0) {
    g.__cmvnMarketsCache = { at: Date.now(), data: cg };
    return cg.slice(0, limit);
  }

  // 3) Binance ticker
  const bn = await fetchTopCoinsFromBinance(limit);
  if (bn.length > 0) {
    g.__cmvnMarketsCache = { at: Date.now(), data: bn };
    return bn;
  }

  if (cached?.data?.length) return cached.data.slice(0, limit);
  return [];
}

/** Lấy id top coin để prebuild trang chi tiết */
export async function fetchTopCoinIds(limit = 50): Promise<string[]> {
  const coins = await fetchTopCoins(limit);
  return coins.map((c) => c.id);
}

async function fetchGlobalFromCoinGecko(): Promise<GlobalMarket | null> {
  const res = await fetchWithRetry(`${COINGECKO}/global`, {
    next: { revalidate: 120 },
    headers: { Accept: "application/json" },
  });
  if (!res || !res.ok) return null;

  const json = (await res.json()) as {
    data: {
      total_market_cap: { usd: number };
      total_volume: { usd: number };
      market_cap_percentage: { btc: number; eth: number };
      market_cap_change_percentage_24h_usd: number;
      updated_at: number;
    };
  };

  const d = json.data;
  return {
    total_market_cap_usd: d.total_market_cap.usd,
    total_volume_usd: d.total_volume.usd,
    btc_dominance: d.market_cap_percentage.btc,
    eth_dominance: d.market_cap_percentage.eth,
    market_cap_change_percentage_24h: d.market_cap_change_percentage_24h_usd,
    updated_at: new Date(d.updated_at * 1000).toISOString(),
  };
}

/** Ước lượng volume/dominance từ subset cặp top (không tải full market) */
async function fetchGlobalFromBinance(): Promise<GlobalMarket | null> {
  try {
    const pairs = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
    const symbolsParam = encodeURIComponent(JSON.stringify(pairs));
    const res = await fetch(`${BINANCE}/ticker/24hr?symbols=${symbolsParam}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Record<string, string>>;
    if (!Array.isArray(rows) || !rows.length) return null;

    let totalVol = 0;
    let btcVol = 0;
    let ethVol = 0;
    for (const r of rows) {
      const q = Number(r.quoteVolume) || 0;
      totalVol += q;
      if (r.symbol === "BTCUSDT") btcVol = q;
      if (r.symbol === "ETHUSDT") ethVol = q;
    }
    if (totalVol <= 0) return null;
    return {
      total_market_cap_usd: 0,
      total_volume_usd: totalVol,
      btc_dominance: (btcVol / totalVol) * 100,
      eth_dominance: (ethVol / totalVol) * 100,
      market_cap_change_percentage_24h: 0,
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Ước lượng thay đổi dominance (điểm %):
 * share_new ≈ share * (1+r_asset)/(1+r_total)
 * delta = share_new - share
 */
function approxDominanceDelta(
  currentSharePct: number,
  assetMcapChangePct: number | null | undefined,
  totalMcapChangePct: number | null | undefined,
): number | null {
  if (
    assetMcapChangePct == null ||
    totalMcapChangePct == null ||
    !Number.isFinite(assetMcapChangePct) ||
    !Number.isFinite(totalMcapChangePct) ||
    totalMcapChangePct <= -99.5
  ) {
    return null;
  }
  const ratio =
    (1 + assetMcapChangePct / 100) / (1 + totalMcapChangePct / 100);
  const delta = currentSharePct * (ratio - 1);
  if (!Number.isFinite(delta)) return null;
  return delta;
}

/** Gắn thêm % dominance 24h từ dữ liệu BTC/ETH trong bảng markets */
export function enrichGlobalStats(
  global: GlobalMarket | null,
  coins: CoinMarket[],
): GlobalMarket | null {
  if (!global) return null;

  const btc = coins.find(
    (c) => c.id === "bitcoin" || c.symbol.toLowerCase() === "btc",
  );
  const eth = coins.find(
    (c) => c.id === "ethereum" || c.symbol.toLowerCase() === "eth",
  );

  const totalChg = global.market_cap_change_percentage_24h;

  // Ưu tiên market_cap_change_percentage_24h; fallback price 24h (xấp xỉ)
  const btcChg =
    btc?.market_cap_change_percentage_24h ??
    btc?.price_change_percentage_24h ??
    btc?.price_change_percentage_24h_in_currency ??
    null;
  const ethChg =
    eth?.market_cap_change_percentage_24h ??
    eth?.price_change_percentage_24h ??
    eth?.price_change_percentage_24h_in_currency ??
    null;

  return {
    ...global,
    // Volume: API free không cung cấp % 24h đáng tin → để null
    volume_change_percentage_24h: global.volume_change_percentage_24h ?? null,
    btc_dominance_change_24h: approxDominanceDelta(
      global.btc_dominance,
      btcChg,
      totalChg,
    ),
    eth_dominance_change_24h: approxDominanceDelta(
      global.eth_dominance,
      ethChg,
      totalChg,
    ),
  };
}

export async function fetchGlobalMarket(): Promise<GlobalMarket | null> {
  const cached = g.__cmvnGlobalCache;
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) {
    return cached.data;
  }

  const cg = await fetchGlobalFromCoinGecko();
  if (cg) {
    g.__cmvnGlobalCache = { at: Date.now(), data: cg };
    return cg;
  }

  const bn = await fetchGlobalFromBinance();
  if (bn) {
    g.__cmvnGlobalCache = { at: Date.now(), data: bn };
    return bn;
  }

  return cached?.data ?? null;
}

export function pickMovers(
  coins: CoinMarket[],
  direction: "up" | "down",
  n = 5,
) {
  const scored = coins
    .filter((c) => c.price_change_percentage_24h != null)
    .slice()
    .sort((a, b) => {
      const av = a.price_change_percentage_24h ?? 0;
      const bv = b.price_change_percentage_24h ?? 0;
      return direction === "up" ? bv - av : av - bv;
    });
  return scored.slice(0, n);
}
