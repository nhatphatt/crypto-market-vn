"use client";

import Link from "next/link";
import { useId } from "react";
import { SITE } from "@/lib/constants";

type LogoProps = {
  variant?: "mark" | "full" | "stacked";
  size?: number;
  className?: string;
  href?: string | null;
  showTagline?: boolean;
};

/**
 * Mark chuyên nghiệp: monogram CM trong khung matte.
 * Một đường trend tối giản – fintech, không nến sặc sỡ.
 */
export function LogoMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bg = `cmvn-bg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={bg}
          x1="6"
          y1="2"
          x2="34"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22272E" />
          <stop offset="1" stopColor="#161A1F" />
        </linearGradient>
      </defs>

      {/* Plate */}
      <rect width="40" height="40" rx="9" fill={`url(#${bg})`} />
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="8.5"
        stroke="#343B44"
        strokeWidth="1"
      />

      {/* Chữ C – stroke hình học */}
      <path
        d="M17.2 13.2C15.1 13.2 13.4 15.1 13.4 17.6V22.4C13.4 24.9 15.1 26.8 17.2 26.8C18.55 26.8 19.7 26.05 20.25 24.9"
        stroke="#E8EAED"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Chữ M tối giản + đỉnh trend */}
      <path
        d="M21.2 26.5V15.8L24.6 22.2L28 15.8V26.5"
        stroke="#E8EAED"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Accent nhỏ: tick tăng (vàng muted, 1 điểm) */}
      <circle cx="28.2" cy="14.2" r="1.35" fill="#B89A2E" />
    </svg>
  );
}

export function Logo({
  variant = "full",
  size = 36,
  className = "",
  href = "/",
  showTagline = true,
}: LogoProps) {
  const inner = (
    <span
      className={[
        "inline-flex items-center gap-3",
        variant === "stacked" ? "flex-col items-start gap-2.5" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LogoMark size={size} className="shrink-0" />
      {variant !== "mark" && (
        <span className="flex min-w-0 flex-col justify-center leading-none">
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-body md:text-[15.5px]">
              Crypto Market
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-strong md:text-[12px]">
              VN
            </span>
          </span>
          {showTagline && (
            <span className="mt-1.5 text-[10px] font-medium tracking-[0.06em] text-muted">
              Thị trường · Tin tức · Phân tích
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href === null) return inner;

  return (
    <Link
      href={href}
      className="group transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-90 active:opacity-80"
      aria-label={SITE.name}
    >
      {inner}
    </Link>
  );
}
