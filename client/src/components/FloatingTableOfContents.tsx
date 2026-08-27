import { ChevronLeft, ChevronRight, ListTree } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type TableOfContentsSection = { id: string; label: string };

const DESKTOP_TOC_COLLAPSED_STORAGE_KEY = "fjubac:toc:desktop-collapsed";
const MOBILE_TOC_OPEN_STORAGE_KEY = "fjubac:toc:mobile-open";

export function FloatingTableOfContents({ sections, label = "本頁章節目錄", trackScroll = true }: { sections: readonly TableOfContentsSection[]; label?: string; trackScroll?: boolean }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const mobileDetailsRef = useRef<HTMLDetailsElement>(null);
  const sectionIds = useMemo(() => sections.map(section => section.id).join("|"), [sections]);

  useEffect(() => {
    try {
      setDesktopCollapsed(window.localStorage.getItem(DESKTOP_TOC_COLLAPSED_STORAGE_KEY) === "true");
      if (mobileDetailsRef.current) mobileDetailsRef.current.open = window.localStorage.getItem(MOBILE_TOC_OPEN_STORAGE_KEY) === "true";
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !sections.length) return;
    if (!trackScroll) {
      const updateHashSelection = () => {
        const hashId = decodeURIComponent(window.location.hash.slice(1));
        if (sections.some(section => section.id === hashId)) setActiveId(hashId);
      };
      updateHashSelection();
      window.addEventListener("hashchange", updateHashSelection);
      return () => window.removeEventListener("hashchange", updateHashSelection);
    }
    let frameId = 0;
    const updateActiveSection = () => {
      frameId = 0;
      const marker = Math.min(220, window.innerHeight * .32);
      const visibleSections = sections
        .map(section => ({ id: section.id, top: document.getElementById(section.id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY }))
        .filter(section => Number.isFinite(section.top));
      const passedSections = visibleSections.filter(section => section.top <= marker);
      const deepestTop = Math.max(...passedSections.map(section => section.top));
      const sameRowSections = passedSections.filter(section => Math.abs(section.top - deepestTop) < 4);
      const reachedPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const current = reachedPageEnd ? visibleSections.at(-1) : sameRowSections.find(section => section.id === activeId) ?? sameRowSections.at(-1) ?? visibleSections[0];
      if (current) setActiveId(current.id);
    };
    const queueUpdate = () => { if (!frameId) frameId = window.requestAnimationFrame(updateActiveSection); };
    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    window.addEventListener("hashchange", queueUpdate);
    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      window.removeEventListener("hashchange", queueUpdate);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [activeId, sectionIds, sections, trackScroll]);

  if (sections.length < 2) return null;
  const setDesktopPreference = () => setDesktopCollapsed(current => {
    const next = !current;
    try { window.localStorage.setItem(DESKTOP_TOC_COLLAPSED_STORAGE_KEY, String(next)); } catch {}
    return next;
  });
  const setMobilePreference = (isOpen: boolean) => { try { window.localStorage.setItem(MOBILE_TOC_OPEN_STORAGE_KEY, String(isOpen)); } catch {} };
  const navigateToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    event.preventDefault();
    window.history.pushState(null, "", `#${sectionId}`);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
    const mobileDetails = event.currentTarget.closest("details");
    mobileDetails?.removeAttribute("open");
    if (mobileDetails) setMobilePreference(false);
    setActiveId(sectionId);
  };
  const links = <ol>{sections.map(section => <li key={section.id}><a href={`#${section.id}`} aria-current={activeId === section.id ? "location" : undefined} onClick={event => navigateToSection(event, section.id)}>{section.label}</a></li>)}</ol>;
  return <aside className="floating-toc" aria-label={label}><div className="floating-toc-desktop" data-collapsed={desktopCollapsed}><div className="floating-toc-heading"><p><ListTree size={15} aria-hidden="true" />本頁章節</p><button type="button" aria-label={desktopCollapsed ? "展開章節目錄" : "收合章節目錄"} aria-expanded={!desktopCollapsed} onClick={setDesktopPreference}>{desktopCollapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}</button></div>{desktopCollapsed ? null : links}</div><details ref={mobileDetailsRef} className="floating-toc-mobile" onToggle={event => setMobilePreference(event.currentTarget.open)}><summary><ListTree size={16} aria-hidden="true" />本頁章節</summary>{links}</details></aside>;
}
