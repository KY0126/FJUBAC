import { ArrowLeft, ArrowRight, Pause, Play, UserRound } from "lucide-react";
import { CSSProperties, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { getDepartmentAnchorId } from "@/lib/departmentAnchors";
import { DEPARTMENT_ROTATE_INTERVAL_MS, getDepartmentStackLayout } from "@/lib/stackedDepartmentCards";

const departments = [
  { name: "人才發展部", en: "Talent Acquisition & Engagement", text: "規劃校內外招生、書審、面試與社員參與。", tone: "coral" },
  { name: "專案開發部", en: "Project Development & Management", text: "以專案實作串起分析學習、協作與成果交付。", tone: "ink" },
  { name: "對外發展部", en: "External Affairs", text: "串聯合作、對外活動與職涯交流機會。", tone: "moss" },
  { name: "學術營運部", en: "Academic Operations", text: "經營社課、教材、學術活動與知識資源。", tone: "blue" },
  { name: "行銷策略部", en: "Marketing Strategy", text: "傳遞社團故事、公開內容與活動資訊。", tone: "sand" },
] as const;

export function StackedDepartmentCards() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeDepartment = departments[activeIndex];
  const isAutoPaused = isManuallyPaused || isPointerInside || isFocusWithin || !isDocumentVisible || prefersReducedMotion;
  const pauseReason = prefersReducedMotion ? "reduced-motion" : !isDocumentVisible ? "document-hidden" : isManuallyPaused ? "manual" : isFocusWithin ? "focus" : isPointerInside ? "pointer" : "none";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    const updateVisibility = () => setIsDocumentVisible(document.visibilityState === "visible");
    updatePreference();
    updateVisibility();
    media.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (isAutoPaused) return;
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % departments.length), DEPARTMENT_ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAutoPaused]);

  const selectDepartment = (index: number, shouldFocus = false, isManual = true) => {
    const nextIndex = (index + departments.length) % departments.length;
    setActiveIndex(nextIndex);
    if (isManual) setIsManuallyPaused(true);
    if (shouldFocus) window.requestAnimationFrame(() => cardRefs.current[nextIndex]?.focus());
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectDepartment(index + 1, true);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectDepartment(index - 1, true);
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectDepartment(0, true);
    }
    if (event.key === "End") {
      event.preventDefault();
      selectDepartment(departments.length - 1, true);
    }
  };

  const stopFocusPause = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusWithin(false);
  };

  return <div className="site-department-showcase" aria-label="五部門焦點卡片" data-autoplay-state={isAutoPaused ? "paused" : "running"} data-autoplay-reason={pauseReason} onMouseEnter={() => setIsPointerInside(true)} onMouseLeave={() => setIsPointerInside(false)} onFocusCapture={() => setIsFocusWithin(true)} onBlurCapture={stopFocusPause}>
    <div className="site-department-stack">
      <div className="site-department-stage">
      {departments.map((department, index) => {
        const layout = getDepartmentStackLayout(index, activeIndex, departments.length);
        const isActive = index === activeIndex;
        const style = {
          "--stack-shift": layout.shift,
          "--stack-scale": String(layout.scale),
          "--stack-opacity": String(layout.opacity),
          zIndex: layout.zIndex,
        } as CSSProperties;
        return <article key={department.name}
          className={`site-department-card ${department.tone} stack-offset-${layout.offset} ${isActive ? "is-active" : ""}`}
          style={style}
        >
          <button ref={element => { cardRefs.current[index] = element; }} type="button" className="site-department-card-select" aria-pressed={isActive} aria-label={`選擇${department.name}，${isActive ? "目前焦點" : ""}`} onClick={() => selectDepartment(index)} onKeyDown={event => onCardKeyDown(event, index)}>
          <h3>{department.name}</h3>
          <small>{department.en}</small>
          <div className="site-department-card-team" aria-label={`${department.name}幹部資訊尚未公開`}>
            <span aria-hidden="true"><UserRound size={17} /></span>
            <div><strong>頭像待公開</strong><small>取得本人同意後顯示</small></div>
            <dl><div><dt>姓名</dt><dd>尚未公開</dd></div><div><dt>系級</dt><dd>尚未公開</dd></div></dl>
          </div>
          <p>{department.text}</p>
          </button>
          <Link href={`/departments#${getDepartmentAnchorId(department.name)}`} className="site-department-detail-link">查看部門介紹 <ArrowRight size={14} /></Link>
        </article>;
      })}
      </div>
      <div className="site-department-controls" aria-label="切換部門焦點">
        <button type="button" onClick={() => selectDepartment(activeIndex - 1)} aria-label="上一個部門"><ArrowLeft size={16} />上一個</button>
        <p aria-live={isAutoPaused ? "polite" : "off"}><strong>{activeDepartment.name}</strong><small>{prefersReducedMotion ? "已依減少動態偏好停止自動輪播" : isManuallyPaused ? "自動輪播已暫停，可隨時恢復" : "約每 4.8 秒切換；可點選卡片或使用左右方向鍵"}</small></p>
        <button type="button" onClick={() => selectDepartment(activeIndex + 1)} aria-label="下一個部門">下一個<ArrowRight size={16} /></button>
      </div>
      <button type="button" className="site-department-autoplay" disabled={prefersReducedMotion} aria-pressed={!isAutoPaused} onClick={() => setIsManuallyPaused(paused => !paused)}>{isManuallyPaused || prefersReducedMotion ? <Play size={15} /> : <Pause size={15} />}{prefersReducedMotion ? "減少動態偏好已停止輪播" : isManuallyPaused ? "啟動自動輪播" : "暫停自動輪播"}</button>
    </div>
  </div>;
}
