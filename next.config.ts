import type { NextConfig } from "next";

/**
 * Static export → Cloudflare Pages (không Workers).
 * Giá/chart realtime: browser → Binance.
 * Tin: build-time từ data/news.json (Actions scrape + redeploy).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "assets.coincap.io" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "**.coindesk.com" },
      { protocol: "https", hostname: "**.cointelegraph.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.cryptoslate.com" },
      { protocol: "https", hostname: "**.wp.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "**.thedefiant.io" },
      { protocol: "https", hostname: "**.decrypt.co" },
      { protocol: "https", hostname: "**.cryptopotato.com" },
      { protocol: "https", hostname: "**.coin68.com" },
      { protocol: "https", hostname: "**.blogtienao.com" },
    ],
  },
};

export default nextConfig;
