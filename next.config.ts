import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
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
    unoptimized: true,
  },
};

export default nextConfig;

// Cloudflare bindings trong `next dev` (no-op khi build production)
initOpenNextCloudflareForDev();
