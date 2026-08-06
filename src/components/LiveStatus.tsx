"use client";

export function LiveStatus({
  live,
  label = "Giá Binance",
}: {
  live: boolean;
  label?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        live
          ? "bg-trading-up/12 text-trading-up"
          : "bg-surface-elevated text-muted",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          live ? "bg-trading-up animate-pulse" : "bg-muted",
        ].join(" ")}
      />
      {live ? `${label} · Trực tiếp` : "Đang kết nối…"}
    </span>
  );
}
