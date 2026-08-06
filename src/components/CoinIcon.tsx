"use client";

import { useMemo, useState } from "react";

/**
 * Logo coin với chuỗi fallback:
 * 1) image từ CoinGecko/SSR
 * 2) CoinCap icons (phủ nhiều coin mới)
 * 3) cryptocurrency-icons (cổ điển)
 * 4) avatar chữ
 */
export function CoinIcon({
  symbol,
  image,
  name,
  size = 28,
  className = "",
}: {
  symbol: string;
  image?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const sym = symbol.toLowerCase().replace(/[^a-z0-9]/g, "") || "x";
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (image && /^https?:\/\//i.test(image) && !image.includes("undefined")) {
      list.push(image);
    }
    // CoinCap – coverage tốt hơn package icons cũ
    list.push(`https://assets.coincap.io/assets/icons/${sym}@2x.png`);
    // spothq icons (legacy)
    list.push(
      `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${sym}.svg`,
    );
    return list;
  }, [image, sym]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  const letter = (name || symbol || "?").slice(0, 1).toUpperCase();

  if (!src || idx >= candidates.length) {
    return (
      <span
        className={[
          "inline-flex shrink-0 items-center justify-center rounded-full bg-surface-elevated font-semibold text-muted-strong",
          className,
        ].join(" ")}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={["shrink-0 rounded-full bg-surface-elevated object-cover", className].join(
        " ",
      )}
      style={{ width: size, height: size }}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
