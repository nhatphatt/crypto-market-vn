export type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  market_cap_change_percentage_24h?: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_24h?: number | null;
  sparkline_in_7d?: { price: number[] };
};

export type GlobalMarket = {
  total_market_cap_usd: number;
  total_volume_usd: number;
  btc_dominance: number;
  eth_dominance: number;
  /** % thay đổi tổng vốn hóa 24h (CoinGecko) */
  market_cap_change_percentage_24h: number;
  /**
   * Ước lượng thay đổi tỷ trọng BTC/ETH trong 24h (điểm phần trăm),
   * từ % mcap coin vs % mcap toàn market.
   */
  btc_dominance_change_24h?: number | null;
  eth_dominance_change_24h?: number | null;
  /** Volume 24h: API free không có % thay đổi tin cậy → thường null */
  volume_change_percentage_24h?: number | null;
  updated_at: string;
};

export type FearGreed = {
  value: number;
  classification: string;
  classificationVi: string;
  timestamp: string;
};

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  titleVi: string;
  summary: string;
  summaryVi: string;
  /** Nội dung gốc (có thể tiếng Anh) */
  content?: string;
  /** Nội dung đầy đủ tiếng Việt */
  contentVi?: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  coins: string[];
  /** Ảnh hiển thị chính – ưu tiên card local */
  featuredImage: string;
  /** Card SVG local 1200×630 (luôn có sau scrape) */
  brandCard?: string;
  /** og:image gốc (có thể chết / chặn hotlink) */
  coverRemote?: string | null;
  imageSource: "og" | "generated";
  tags: string[];
  lang?: string;
  score?: number;
};

export type NewsIndex = {
  updatedAt: string;
  posts: NewsPost[];
  sources: string[];
};
