"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * M50 — reusable horizontal swipe shell.
 *
 * Both `<DashboardShell>` (Connect / Plan / Earn / Family) and
 * `<OnboardingShell>` (3 setup steps) compose this primitive so the
 * carousel mechanism lives in one place. Native CSS scroll-snap does
 * the heavy lifting — no carousel library, no JS-driven animation.
 *
 *   - Each panel fills the track horizontally and is one viewport tall.
 *   - An IntersectionObserver tracks the active panel and (optionally)
 *     mirrors it into `location.hash` so back/forward + deep links work.
 *   - The bottom tab indicator is a pill bar; tapping a segment scrolls
 *     the matching panel into view.
 */

export interface SwipePanel {
  id: string;
  label: string;
  content: ReactNode;
}

interface SwipeShellProps {
  panels: SwipePanel[];
  /**
   * Sync the active panel id into `location.hash`. Default true.
   * Set false for surfaces (like onboarding) where hash deep-linking
   * doesn't make sense.
   */
  hashSync?: boolean;
  /** Initial panel id. Defaults to the first panel. */
  initialPanelId?: string;
  /** Optional click-handler invoked on every panel change. */
  onActivePanelChange?: (panelId: string) => void;
  /** Custom label rendered in the tab indicator (e.g. "1 of 3"). */
  tabIndicatorVariant?: "labels" | "dots";
}

export function SwipeShell({
  panels,
  hashSync = true,
  initialPanelId,
  onActivePanelChange,
  tabIndicatorVariant = "labels",
}: SwipeShellProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Map<string, HTMLElement>>(new Map());
  const ignoreObserverRef = useRef(false);

  const initial = useMemo(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && panels.some((p) => p.id === hash)) {
        return hash;
      }
    }
    return initialPanelId ?? panels[0]?.id ?? "";
  }, [initialPanelId, panels]);

  const [activeId, setActiveId] = useState(initial);

  const scrollToPanel = useCallback(
    (panelId: string, behavior: ScrollBehavior = "smooth") => {
      const el = panelRefs.current.get(panelId);
      if (!el) return;
      ignoreObserverRef.current = true;
      el.scrollIntoView({ behavior, inline: "start", block: "nearest" });
      // Re-enable observer after the scroll likely settles.
      window.setTimeout(() => {
        ignoreObserverRef.current = false;
      }, 400);
    },
    []
  );

  // On mount, jump to the initial panel without animation so deep-links
  // open directly to the right place with no flash.
  useEffect(() => {
    scrollToPanel(initial, "instant");
  }, [initial, scrollToPanel]);

  // Track which panel is most-visible and propagate to state + URL hash.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserverRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = (visible.target as HTMLElement).dataset.panelId;
        if (!id) return;
        setActiveId((prev) => (prev === id ? prev : id));
      },
      {
        root: track,
        threshold: [0.55, 0.85],
      }
    );

    panelRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [panels]);

  useEffect(() => {
    if (!activeId) return;
    onActivePanelChange?.(activeId);
    if (hashSync && typeof window !== "undefined") {
      const next = `#${activeId}`;
      if (window.location.hash !== next) {
        window.history.replaceState(null, "", next);
      }
    }
  }, [activeId, hashSync, onActivePanelChange]);

  return (
    <>
      <div className="shell-track" ref={trackRef}>
        {panels.map((panel) => (
          <section
            key={panel.id}
            id={panel.id}
            data-panel-id={panel.id}
            className="shell-panel"
            ref={(el) => {
              if (el) panelRefs.current.set(panel.id, el);
              else panelRefs.current.delete(panel.id);
            }}
            aria-label={panel.label}
          >
            {panel.content}
          </section>
        ))}
      </div>

      <nav className="shell-tabs" aria-label="Sections">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className="shell-tab"
            aria-current={panel.id === activeId ? "true" : "false"}
            onClick={() => {
              setActiveId(panel.id);
              scrollToPanel(panel.id);
            }}
          >
            {tabIndicatorVariant === "dots" ? "•" : panel.label}
          </button>
        ))}
      </nav>
    </>
  );
}
