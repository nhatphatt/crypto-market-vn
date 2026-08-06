import type { FearGreed } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { fearGreedTone } from "@/lib/fear-greed";

type Variant = "default" | "compact";

/**
 * compact: gọn để nằm cùng dải overview với 4 metric
 * default: dùng khi cần giải thích đầy đủ
 */
export function FearGreedCard({
  data,
  variant = "default",
}: {
  data: FearGreed | null;
  variant?: Variant;
}) {
  if (!data) {
    return (
      <div className="flex h-full items-center rounded-xl border border-hairline bg-surface-card px-4 py-3.5 md:px-5 md:py-4">
        <p className="text-sm text-muted">Không tải được Fear &amp; Greed.</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, data.value));
  const compact = variant === "compact";

  return (
    <div
      className={[
        "flex h-full flex-col rounded-xl border border-hairline bg-surface-card",
        compact ? "px-4 py-3.5 md:px-5 md:py-4" : "p-5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-none text-muted md:text-xs">
            Fear &amp; Greed
          </p>
          <div className="mt-2.5 flex items-baseline gap-2">
            <p
              className={[
                "font-mono font-bold tabular-nums tracking-tight leading-none",
                compact ? "text-xl md:text-[1.375rem]" : "text-4xl",
                fearGreedTone(data.value),
              ].join(" ")}
            >
              {data.value}
            </p>
            <p className="truncate text-xs font-semibold text-body md:text-sm">
              {data.classificationVi}
            </p>
          </div>
        </div>
        {!compact && (
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-hairline"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
          </div>
        )}
      </div>

      <div
        className={[
          "overflow-hidden rounded-full bg-surface-elevated",
          compact ? "mt-3 h-1" : "mt-4 h-1.5",
        ].join(" ")}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p
        className={[
          "text-muted",
          compact
            ? "mt-3 min-h-[1.25rem] text-[11px] leading-none"
            : "mt-3 text-xs leading-relaxed",
        ].join(" ")}
      >
        {compact
          ? `Cập nhật ${formatDateTime(data.timestamp)}`
          : `Cập nhật ${formatDateTime(data.timestamp)}. 0 = sợ hãi cực độ, 100 = tham lam cực độ. Không dùng một mình để mua/bán.`}
      </p>
    </div>
  );
}
