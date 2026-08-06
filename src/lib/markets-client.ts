/**
 * Load bảng giá TRỰC TIẾP từ browser → Binance (CORS *).
 * Dùng khi SSR/static build bị trống (CoinGecko 429 / network).
 */

import type { CoinMarket } from "./types";

const HOSTS = [
  "https://api.binance.com",
  "https://data-api.binance.vision",
] as const;

/** Cặp USDT phổ biến – đủ cho bảng thị trường */
export const MARKET_PAIRS = [
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
  "FLOKIUSDT",
  "RAYUSDT",
  "ORDIUSDT",
  "POLUSDT",
  "WUSDT",
  "ETHFIUSDT",
  "EIGENUSDT",
  "MOVEUSDT",
  "1000SATSUSDT",
] as const;

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
  fet: "fetch-ai",
  aave: "aave",
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
  floki: "floki",
  ray: "raydium",
  ordi: "ordinals",
  pol: "polygon-ecosystem-token",
  w: "wormhole",
  ethfi: "ether-fi",
  eigen: "eigenlayer",
  move: "movement",
  "1000sats": "sats-ordinals",
};

function iconFor(sym: string): string {
  const s = sym.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${s}.svg`;
}

function rowsToCoins(
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
        image: iconFor(sym),
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

async function fetchBatch(
  host: string,
  pairs: string[],
  signal?: AbortSignal,
): Promise<CoinMarket[]> {
  const symbolsParam = encodeURIComponent(JSON.stringify(pairs));
  const url = `${host}/api/v3/ticker/24hr?symbols=${symbolsParam}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
    mode: "cors",
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const rows = (await res.json()) as Array<Record<string, string>>;
  if (!Array.isArray(rows) || !rows.length) throw new Error("empty");
  return rowsToCoins(rows, pairs.length);
}

/** Chunk pairs (Binance limit URL length) */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Browser → Binance multi-host, multi-chunk.
 */
export async function fetchTopCoinsClient(
  limit = 80,
  timeoutMs = 8000,
): Promise<CoinMarket[]> {
  const pairs = MARKET_PAIRS.slice(0, Math.max(limit, 40)) as string[];
  const chunks = chunk(pairs, 40);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const all: CoinMarket[] = [];
    for (const part of chunks) {
      let got: CoinMarket[] | null = null;
      for (const host of HOSTS) {
        try {
          got = await fetchBatch(host, part, ctrl.signal);
          break;
        } catch {
          /* try next host */
        }
      }
      if (got) all.push(...got);
    }
    // unique by id, re-rank by volume
    const map = new Map<string, CoinMarket>();
    for (const c of all) {
      const prev = map.get(c.id);
      if (!prev || (c.total_volume ?? 0) > (prev.total_volume ?? 0)) {
        map.set(c.id, c);
      }
    }
    return [...map.values()]
      .sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0))
      .slice(0, limit)
      .map((c, i) => ({ ...c, market_cap_rank: i + 1 }));
  } finally {
    clearTimeout(timer);
  }
}
