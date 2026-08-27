import { ListTree } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type TableOfContentsSection = { id: string; label: string };

export function FloatingTableOfContents({ sections, label = "本頁章節目錄", trackScroll = true }: { sections: readonly TableOfContentsSection[]; label?: string; trackScroll?: boolean }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const sectionIds = useMemo(() => sections.map(section => section.id).join("|"), [sections]);

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
  const navigateToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    event.preventDefault();
    window.history.pushState(null, "", `#${sectionId}`);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
    event.currentTarget.closest("details")?.removeAttribute("open");
    setActiveId(sectionId);
  };
  const links = <ol>{sections.map(section => <li key={section.id}><a href={`#${section.id}`} aria-current={activeId === section.id ? "location" : undefined} onClick={event => navigateToSection(event, section.id)}>{section.label}</a></li>)}</ol>;
  return <aside className="floating-toc" aria-label={label}><div className="floating-toc-desktop"><p><ListTree size={15} aria-hidden="true" />本頁章節</p>{links}</div><details className="floating-toc-mobile"><summary><ListTree size={16} aria-hidden="true" />本頁章節</summary>{links}</details></aside>;
}
