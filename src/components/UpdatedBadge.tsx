"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

/**
 * compact: chỉ "Cập nhật 5 phút trước" (không ghép full datetime)
 * default: relative + datetime
 */
export function UpdatedBadge({
  iso,
  label = "Cập nhật",
  compact = false,
}: {
  iso?: string | null;
  label?: string;
  compact?: boolean;
}) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) return;
    const tick = () => setRelative(formatRelativeTime(iso));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  if (!iso) return null;

  const absolute = formatDateTime(iso);

  if (compact) {
    return (
      <p className="text-inherit text-muted" title={absolute}>
        {label} {relative ?? absolute}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted" title={absolute}>
      {label}: {relative ?? absolute}
      {relative != null && (
        <>
          <span className="mx-1.5 text-hairline">·</span>
          <span className="text-muted-strong">{absolute}</span>
        </>
      )}
    </p>
  );
}
