import { fetchBinanceTicker } from "./binance";
import {
  loadChartData,
  fetchCoinGeckoMarketChart,
  fetchCoinGeckoOhlc,
  type ChartRange,
} from "./chart-data";

export { loadChartData, fetchCoinGeckoMarketChart, fetchCoinGeckoOhlc };
export type { ChartRange };

const COINGECKO = "https://api.coingecko.com/api/v3";

export type CoinDetail = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  descriptionVi: string;
  homepage?: string;
  categories: string[];
  market_cap_rank: number | null;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d: number | null;
  price_change_percentage_30d: number | null;
  price_change_percentage_1h: number | null;
  last_updated: string;
};

/** Map id phổ biến → symbol khi CoinGecko fail (CF Worker / rate limit) */
const ID_SYMBOL: Record<string, { symbol: string; name: string }> = {
  bitcoin: { symbol: "btc", name: "Bitcoin" },
  ethereum: { symbol: "eth", name: "Ethereum" },
  tether: { symbol: "usdt", name: "Tether" },
  binancecoin: { symbol: "bnb", name: "BNB" },
  solana: { symbol: "sol", name: "Solana" },
  ripple: { symbol: "xrp", name: "XRP" },
  "usd-coin": { symbol: "usdc", name: "USDC" },
  dogecoin: { symbol: "doge", name: "Dogecoin" },
  cardano: { symbol: "ada", name: "Cardano" },
  tron: { symbol: "trx", name: "TRON" },
  avalanche_2: { symbol: "avax", name: "Avalanche" },
  "avalanche-2": { symbol: "avax", name: "Avalanche" },
  chainlink: { symbol: "link", name: "Chainlink" },
  the_open_network: { symbol: "ton", name: "Toncoin" },
  "the-open-network": { symbol: "ton", name: "Toncoin" },
  sui: { symbol: "sui", name: "Sui" },
  pepe: { symbol: "pepe", name: "Pepe" },
  polkadot: { symbol: "dot", name: "Polkadot" },
  "polygon-ecosystem-token": { symbol: "pol", name: "POL" },
  near: { symbol: "near", name: "NEAR" },
  aptos: { symbol: "apt", name: "Aptos" },
  arbitrum: { symbol: "arb", name: "Arbitrum" },
  optimism: { symbol: "op", name: "Optimism" },
  litecoin: { symbol: "ltc", name: "Litecoin" },
  "shiba-inu": { symbol: "shib", name: "Shiba Inu" },
};

function fallbackCoin(id: string, tickerPrice = 0, change24: number | null = null): CoinDetail {
  const known = ID_SYMBOL[id.toLowerCase()];
  const symbol = known?.symbol || id.replace(/-/g, "").slice(0, 8);
  const name =
    known?.name ||
    id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  return {
    id,
    symbol,
    name,
    image: "",
    descriptionVi: "",
    homepage: undefined,
    categories: [],
    market_cap_rank: null,
    current_price: tickerPrice,
    market_cap: 0,
    total_volume: 0,
    high_24h: null,
    low_24h: null,
    ath: null,
    ath_change_percentage: null,
    ath_date: null,
    atl: null,
    circulating_supply: null,
    total_supply: null,
    max_supply: null,
    price_change_percentage_24h: change24,
    price_change_percentage_7d: null,
    price_change_percentage_30d: null,
    price_change_percentage_1h: null,
    last_updated: new Date().toISOString(),
  };
}

export async function fetchCoinDetail(id: string): Promise<CoinDetail | null> {
  if (!id || !/^[a-z0-9-]+$/i.test(id)) return null;

  try {
    const url = new URL(`${COINGECKO}/coins/${encodeURIComponent(id)}`);
    url.searchParams.set("localization", "true");
    url.searchParams.set("tickers", "false");
    url.searchParams.set("market_data", "true");
    url.searchParams.set("community_data", "false");
    url.searchParams.set("developer_data", "false");
    url.searchParams.set("sparkline", "false");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "CryptoMarketVN/1.0",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      // CF / rate-limit: vẫn mở trang bằng Binance
      const known = ID_SYMBOL[id.toLowerCase()];
      const sym = known?.symbol || id;
      const t = await fetchBinanceTicker(sym);
      return fallbackCoin(id, t?.lastPrice ?? 0, t?.priceChangePercent ?? null);
    }
    const j = (await res.json()) as {
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
        : descEn.slice(0, 1200) || "Chưa có mô tả cho coin này.";

    return {
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
      last_updated: md?.last_updated || j.last_updated || new Date().toISOString(),
    };
  } catch (e) {
    console.error("fetchCoinDetail", e);
    const known = ID_SYMBOL[id.toLowerCase()];
    const sym = known?.symbol || id;
    try {
      const t = await fetchBinanceTicker(sym);
      return fallbackCoin(id, t?.lastPrice ?? 0, t?.priceChangePercent ?? null);
    } catch {
      return fallbackCoin(id);
    }
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @deprecated dùng loadChartData(id, symbol, range) */
export async function fetchChartCandles(
  symbol: string,
  range: ChartRange = "7d",
  coinId = "",
) {
  return loadChartData(coinId, symbol, range);
}

export async function getPriceBundle(symbol: string) {
  const ticker = await fetchBinanceTicker(symbol);
  return ticker;
}
