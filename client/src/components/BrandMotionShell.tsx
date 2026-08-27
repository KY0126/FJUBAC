import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const EMBLEM_URL = "/manus-storage/fjubac-emblem-reference_4b3d690c.png";
const BRAND_PRESENTATION_DURATION_MS = 1_800;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  try { if (localStorage.getItem("fjubac-user-reduced-motion") === "true") return true; } catch { /* ignore unavailable storage */ }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isInternalNavigation(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  if (anchor.dataset.motion === "off") return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  const destination = new URL(anchor.href, window.location.href);
  return destination.origin === window.location.origin && destination.pathname !== window.location.pathname;
}

export function BrandMotionShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isInitialLoading, setIsInitialLoading] = useState(() => !prefersReducedMotion());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasMounted = useRef(false);
  const clearTransition = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setIsInitialLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setIsInitialLoading(false), BRAND_PRESENTATION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (prefersReducedMotion()) return;
    setIsTransitioning(true);
    if (clearTransition.current) window.clearTimeout(clearTransition.current);
    clearTransition.current = window.setTimeout(() => setIsTransitioning(false), BRAND_PRESENTATION_DURATION_MS);
  }, [location]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!prefersReducedMotion() && isInternalNavigation(event.target)) setIsTransitioning(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (clearTransition.current) window.clearTimeout(clearTransition.current);
    };
  }, []);

  return <><div className="brand-motion-content">{children}</div>{isInitialLoading ? <div className="brand-loader" role="status" aria-label="正在載入 FJUBAC 網站"><div className="brand-loader-inner"><img src={EMBLEM_URL} alt="" /></div></div> : null}<div className={`brand-route-curtain${isTransitioning ? " is-visible" : ""}`} aria-hidden="true"><div className="brand-route-curtain-mark"><img src={EMBLEM_URL} alt="" /></div></div></>;
}
