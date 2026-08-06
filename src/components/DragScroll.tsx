"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** class cho track cuộn (overflow) – không set padding-y lệch */
  trackClassName?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

const DRAG_THRESHOLD = 8;

/**
 * Cuộn ngang cân đối:
 * - Ẩn scrollbar native (không chiếm layout → trên/dưới đều)
 * - Thanh kéo custom overlay, chỉ hiện khi hover
 * - Kéo nội dung / kéo thumb / click track
 */
export function DragScroll({
  children,
  className = "",
  trackClassName = "",
  ...rest
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    tracking: false,
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
    pointerId: -1,
  });
  const thumbDrag = useRef({
    active: false,
    startX: 0,
    startLeft: 0,
  });

  const [metrics, setMetrics] = useState({
    ratio: 1,
    left: 0,
    needed: false,
  });

  const syncBar = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    const needed = scrollWidth > clientWidth + 2;
    const ratio = needed ? clientWidth / scrollWidth : 1;
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const left = needed ? (scrollLeft / maxScroll) * (1 - ratio) : 0;
    setMetrics({ ratio, left, needed });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncBar();
    el.addEventListener("scroll", syncBar, { passive: true });
    const ro = new ResizeObserver(syncBar);
    ro.observe(el);
    // children width change
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener("resize", syncBar);
    return () => {
      el.removeEventListener("scroll", syncBar);
      ro.disconnect();
      window.removeEventListener("resize", syncBar);
    };
  }, [syncBar, children]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // bỏ qua nếu bấm vào custom bar
    if ((e.target as HTMLElement).closest?.("[data-scroll-bar]")) return;

    const el = trackRef.current;
    if (!el) return;

    drag.current = {
      tracking: true,
      active: false,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      pointerId: e.pointerId,
    };
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    const d = drag.current;
    if (!el || !d.tracking) return;

    const dx = e.clientX - d.startX;
    if (!d.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      d.active = true;
      d.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
      el.classList.add("is-dragging");
    }
    el.scrollLeft = d.scrollLeft - dx;
    e.preventDefault();
  }, []);

  const endDrag = useCallback(() => {
    const el = trackRef.current;
    const d = drag.current;
    if (!el || !d.tracking) return;

    const wasMoved = d.moved;
    const pid = d.pointerId;
    d.tracking = false;
    d.active = false;
    d.moved = false;
    d.pointerId = -1;
    el.classList.remove("is-dragging");
    try {
      if (pid >= 0 && el.hasPointerCapture?.(pid)) {
        el.releasePointerCapture(pid);
      }
    } catch {
      /* */
    }
    if (wasMoved) {
      el.dataset.dragBlock = "1";
      window.setTimeout(() => {
        delete el.dataset.dragBlock;
      }, 50);
    }
  }, []);

  const onClickCapture = useCallback((e: MouseEvent) => {
    if (trackRef.current?.dataset.dragBlock === "1") {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  /** Click track của custom bar → nhảy vị trí */
  const onBarPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = trackRef.current;
    const bar = barRef.current;
    if (!el || !bar) return;

    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const thumbW = rect.width * metrics.ratio;
    const maxThumbLeft = rect.width - thumbW;
    let thumbLeft = x - thumbW / 2;
    thumbLeft = Math.max(0, Math.min(maxThumbLeft, thumbLeft));
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft =
      maxThumbLeft > 0 ? (thumbLeft / maxThumbLeft) * maxScroll : 0;

    thumbDrag.current = {
      active: true,
      startX: e.clientX,
      startLeft: thumbLeft,
    };
    try {
      bar.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
  }, [metrics.ratio]);

  const onBarPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!thumbDrag.current.active) return;
      const el = trackRef.current;
      const bar = barRef.current;
      if (!el || !bar) return;
      const rect = bar.getBoundingClientRect();
      const thumbW = rect.width * metrics.ratio;
      const maxThumbLeft = Math.max(0, rect.width - thumbW);
      const dx = e.clientX - thumbDrag.current.startX;
      let thumbLeft = thumbDrag.current.startLeft + dx;
      thumbLeft = Math.max(0, Math.min(maxThumbLeft, thumbLeft));
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft =
        maxThumbLeft > 0 ? (thumbLeft / maxThumbLeft) * maxScroll : 0;
    },
    [metrics.ratio],
  );

  const onBarPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!thumbDrag.current.active) return;
    thumbDrag.current.active = false;
    try {
      barRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  }, []);

  return (
    <div
      className={["drag-scroll-wrap group/scroll", className].join(" ")}
      {...rest}
    >
      <div
        ref={trackRef}
        className={[
          "drag-scroll-track overflow-x-auto overflow-y-hidden",
          trackClassName,
        ].join(" ")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          const el = trackRef.current;
          const d = drag.current;
          if (d.active && el && d.pointerId >= 0) {
            try {
              if (el.hasPointerCapture?.(d.pointerId)) endDrag();
            } catch {
              endDrag();
            }
          }
        }}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>

      {/* Overlay – không chiếm layout, trên/dưới nội dung luôn đều */}
      {metrics.needed && (
        <div
          ref={barRef}
          data-scroll-bar
          className="drag-scroll-overlay"
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={onBarPointerUp}
          onPointerCancel={onBarPointerUp}
        >
          <div
            className="drag-scroll-thumb"
            style={{
              width: `${Math.max(metrics.ratio * 100, 12)}%`,
              marginLeft: `${metrics.left * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
