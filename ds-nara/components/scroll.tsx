"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { colors, spacing, radius, transitions, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLLABLE — bounded scroll container with fade shadows at overflow edges
   ═══════════════════════════════════════════════════════════════════════════ */

interface ScrollableProps {
  children: ReactNode;
  /** Fixed height. Required for vertical scrolling. */
  maxHeight?: number | string;
  /** Scroll axis. Default "y". */
  axis?: "x" | "y" | "both";
  /** Show fading shadows at overflow edges. Default true. */
  shadows?: boolean;
  /** Custom styles for the scroll container. */
  style?: CSSProperties;
  className?: string;
}

export function Scrollable({
  children,
  maxHeight,
  axis = "y",
  shadows = true,
  style,
  className,
}: ScrollableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({
    top: false,
    bottom: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    if (!shadows) return;
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = el;
      setEdges({
        top: scrollTop > 2,
        bottom: scrollTop + clientHeight < scrollHeight - 2,
        left: scrollLeft > 2,
        right: scrollLeft + clientWidth < scrollWidth - 2,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [shadows, children]);

  const overflowX = axis === "x" || axis === "both" ? "auto" : "hidden";
  const overflowY = axis === "y" || axis === "both" ? "auto" : "hidden";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        ...style,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          overflowX,
          overflowY,
          maxHeight,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>

      {shadows && (axis === "y" || axis === "both") && (
        <>
          <ScrollShadow edge="top" visible={edges.top} />
          <ScrollShadow edge="bottom" visible={edges.bottom} />
        </>
      )}
      {shadows && (axis === "x" || axis === "both") && (
        <>
          <ScrollShadow edge="left" visible={edges.left} />
          <ScrollShadow edge="right" visible={edges.right} />
        </>
      )}
    </div>
  );
}

function ScrollShadow({
  edge,
  visible,
}: {
  edge: "top" | "bottom" | "left" | "right";
  visible: boolean;
}) {
  const isVertical = edge === "top" || edge === "bottom";
  const gradientDir =
    edge === "top"
      ? "to bottom"
      : edge === "bottom"
        ? "to top"
        : edge === "left"
          ? "to right"
          : "to left";

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: transitions.fast,
        background: `linear-gradient(${gradientDir}, ${colors.bg}, transparent)`,
        ...(isVertical
          ? { left: 0, right: 0, height: 20, [edge]: 0 }
          : { top: 0, bottom: 0, width: 20, [edge]: 0 }),
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL TO TOP — fixed button that appears when scrolled down
   ═══════════════════════════════════════════════════════════════════════════ */

interface ScrollToTopProps {
  /** Pixel threshold before the button appears. Default 400. */
  threshold?: number;
  /** Element that's scrollable. Default window. */
  target?: "window" | HTMLElement;
  /** Position offset from bottom-right corner. */
  offset?: { bottom: number; right: number };
  label?: string;
}

export function ScrollToTop({
  threshold = 400,
  target = "window",
  offset = { bottom: 24, right: 24 },
  label = "Back to top",
}: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const getScroller = (): { scrollY: number; scrollTo: (opts: ScrollToOptions) => void } => {
      if (target === "window") {
        return {
          scrollY: window.scrollY,
          scrollTo: (opts) => window.scrollTo(opts),
        };
      }
      return {
        scrollY: target.scrollTop,
        scrollTo: (opts) => target.scrollTo(opts),
      };
    };

    const handler = () => {
      setVisible(getScroller().scrollY > threshold);
    };

    handler();
    const source: EventTarget = target === "window" ? window : target;
    source.addEventListener("scroll", handler, { passive: true });
    return () => source.removeEventListener("scroll", handler);
  }, [threshold, target]);

  const handleClick = () => {
    if (target === "window") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      target.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      style={{
        position: "fixed",
        bottom: offset.bottom,
        right: offset.right,
        zIndex: 50,
        display: "inline-flex",
        alignItems: "center",
        gap: spacing.xxs,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        background: hovered ? colors.ink : colors.bg,
        color: hovered ? colors.bg : colors.ink2,
        border: `1px solid ${hovered ? colors.ink : colors.ruleStrong}`,
        borderRadius: radius.sm,
        boxShadow: "0 4px 16px rgba(26,22,18,0.1)",
        cursor: "pointer",
        ...typography.label,
        transition: transitions.fast,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        pointerEvents: visible ? "auto" : "none",
        outline: "none",
      }}
    >
      <span style={{ fontSize: 10, lineHeight: 1 }}>↑</span>
      {label}
    </button>
  );
}
