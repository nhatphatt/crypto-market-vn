import { formatPct, pctTone } from "@/lib/format";

export function PriceChange({
  value,
  className = "",
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const tone = pctTone(value);
  const color =
    tone === "up"
      ? "text-trading-up"
      : tone === "down"
        ? "text-trading-down"
        : "text-muted";

  return (
    <span className={`font-mono text-[13px] font-medium tabular-nums ${color} ${className}`}>
      {formatPct(value)}
    </span>
  );
}
