"use client";

import { useMemo, useState } from "react";

const FALLBACK = "/images/posts/fallback.svg";

/**
 * Thứ tự ảnh:
 * 1) featuredImage (og:image gốc – mỗi bài khác nhau)
 * 2) brandCard local (khi remote chết / chặn hotlink)
 * 3) fallback.svg
 */
export function NewsCover({
  featuredImage,
  brandCard,
  alt,
  className = "h-full w-full object-cover",
  priority = false,
}: {
  featuredImage?: string | null;
  brandCard?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const sources = useMemo(() => {
    const list: string[] = [];
    // Ảnh gốc trước để mỗi bài khác nhau
    if (featuredImage) list.push(featuredImage);
    if (brandCard && brandCard !== featuredImage) list.push(brandCard);
    list.push(FALLBACK);
    return [...new Set(list.filter(Boolean))];
  }, [featuredImage, brandCard]);

  const [idx, setIdx] = useState(0);
  const src = sources[Math.min(idx, sources.length - 1)] || FALLBACK;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => {
        setIdx((i) => (i < sources.length - 1 ? i + 1 : i));
      }}
    />
  );
}
