import { PriceChange } from "./PriceChange";
import { pctTone } from "@/lib/format";

/**
 * Metric card chuẩn dashboard:
 * - 3 tầng cố định: label → value → footer (luôn cùng min-height)
 * - Tránh card “hở bụng” khi có/không có % thay đổi
 */
export function StatCard({
  label,
  value,
  change,
  changeUnit = "percent",
  hint,
}: {
  label: string;
  value: string;
  change?: number | null;
  changeUnit?: "percent" | "points";
  hint?: string;
}) {
  const hasChange = change != null && Number.isFinite(change);
  const tone = pctTone(change);
  const toneClass =
    tone === "up"
      ? "text-trading-up"
      : tone === "down"
        ? "text-trading-down"
        : "text-muted";

  return (
    <div className="flex h-full flex-col rounded-xl border border-hairline bg-surface-card px-4 py-3.5 md:px-5 md:py-4">
      {/* Tầng 1 – label */}
      <p className="text-[11px] font-medium leading-none text-muted md:text-xs">
        {label}
      </p>

      {/* Tầng 2 – số chính */}
      <p className="mt-2.5 font-mono text-xl font-semibold leading-none tracking-tight text-body tabular-nums md:text-[1.375rem]">
        {value}
      </p>

      {/* Tầng 3 – footer cố định chiều cao (1 dòng) */}
      <div className="mt-3 flex min-h-[1.25rem] items-center gap-2">
        {hasChange && changeUnit === "percent" && (
          <PriceChange value={change} />
        )}
        {hasChange && changeUnit === "points" && (
          <span
            className={`font-mono text-[12px] font-medium tabular-nums ${toneClass}`}
          >
            {change! > 0 ? "+" : ""}
            {change!.toFixed(2)} điểm
          </span>
        )}
        {hint ? (
          <span className="text-[11px] leading-none text-muted">{hint}</span>
        ) : !hasChange ? (
          <span className="text-[11px] leading-none text-muted/50">—</span>
        ) : null}
      </div>
    </div>
  );
}
