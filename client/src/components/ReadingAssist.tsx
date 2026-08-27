import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const BACK_TO_TOP_SCROLL_THRESHOLD = 360;

export function ReadingAssist() {
  const [progress, setProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let frameId = 0;
    const updateReadingState = () => {
      frameId = 0;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollableHeight = Math.max(0, documentHeight - window.innerHeight);
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsScrollable(scrollableHeight > 0);
      setProgress(scrollableHeight ? Math.min(100, Math.round((scrollTop / scrollableHeight) * 100)) : 0);
      setShowBackToTop(scrollableHeight > 0 && scrollTop >= BACK_TO_TOP_SCROLL_THRESHOLD);
    };
    const queueUpdate = () => {
      if (!frameId) frameId = window.requestAnimationFrame(updateReadingState);
    };
    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  const backToTop = () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return <><div className="reading-progress" role="progressbar" aria-label="頁面閱讀進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-hidden={!isScrollable}><span style={{ transform: `scaleX(${progress / 100})` }} /></div><button type="button" className="reading-back-to-top" aria-label="回到頁面頂端" onClick={backToTop} data-visible={showBackToTop} tabIndex={showBackToTop ? 0 : -1}><ArrowUp size={18} aria-hidden="true" /><span>回到頂部</span></button></>;
}
