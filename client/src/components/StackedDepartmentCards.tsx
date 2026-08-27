import { ArrowLeft, ArrowRight, Instagram, Pause, Play, UserRound } from "lucide-react";
import { CSSProperties, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { getDepartmentAnchorId } from "@/lib/departmentAnchors";
import { DEPARTMENT_ROTATE_INTERVAL_MS, getDepartmentStackLayout } from "@/lib/stackedDepartmentCards";
import { trpc } from "@/lib/trpc";

const departments = [
  { name: "人才發展部", code: "TAE", en: "Talent Acquisition & Engagement", tagline: "#組織凝聚的靈魂", intro: "以人為本，策劃社團徵才、Club Bonding 與 Coffee Chat (CC)。學習從組織規劃到人際連結，打造最有溫度的團隊動能！", workItems: ["社員徵才面試和選拔、舉辦說明會", "辦理內部活動：Bonding、Coffee Chat、校友活動等凝聚力活動", "研習生 1on1、期初期末社團感性環節設計"], tone: "coral" },
  { name: "專案開發部", code: "PDM", en: "Project Development & Management", tagline: "#系統化成長的推手", intro: "全程參與專案推進、建立 Mentor 導師關係至成果發表。在這裡，你將內化強大的專案管理 (PM) 與溝通協調能力！", workItems: ["專案業主開發", "擔任專案 Mentor", "專案生 1on1", "期中、期末發表及提升專案生能力 Training 籌備"], tone: "ink" },
  { name: "對外發展部", code: "EAF", en: "External Affairs", tagline: "#品牌開發的公關尖兵", intro: "代表社團連結外部資源，負責企業合作與大型活動策劃。累積第一線公關實戰與商務談判經驗，拓展無限視野！", workItems: ["打造外部合作關係", "舉辦對外的大型活動", "奠定日後社團對外發展的基礎與策略"], tone: "moss" },
  { name: "學術營運部", code: "ACO", en: "Academic Operations", tagline: "#硬核實力的知識庫", intro: "規劃社課內容，涵蓋簡報邏輯、Excel 實戰及模擬案例分析 (CSG)。透過系統化學習，提升專業分析力與實戰表達力！", workItems: ["社課講師開發與接洽，設計社課環節", "舉辦 CIW、CSG 等學術性活動", "各式提升社員能力的 Project 規劃"], tone: "blue" },
  { name: "行銷策略部", code: "MKT", en: "Marketing Strategy", tagline: "#數位時代的操盤手", intro: "主理品牌經營、社群管理與行銷策略規劃。靈活運用 Canva 等數位工具，讓你的創意與行銷思維同步升級！", workItems: ["發想並製作 IG 貼文、限動、活動宣傳內容等行銷企劃", "協助其他部門社群行銷與管理需求", "更多元的行銷管道開發", "針對輔大學生執行市場調查，擬定和執行行銷策略"], tone: "sand" },
] as const;

export function StackedDepartmentCards() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const displaySettings = trpc.content.displaySettings.publicRead.useQuery();
  const activeDepartment = departments[activeIndex];
  const rotationIntervalMs = displaySettings.data?.departmentCarouselIntervalMs ?? DEPARTMENT_ROTATE_INTERVAL_MS;
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
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % departments.length), rotationIntervalMs);
    return () => window.clearInterval(timer);
  }, [isAutoPaused, rotationIntervalMs]);

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
          "--stack-rotate-y": `${layout.rotateY}deg`,
          "--stack-depth": `${layout.depth}px`,
          zIndex: layout.zIndex,
        } as CSSProperties;
        return <article key={department.name}
          className={`site-department-card ${department.tone} stack-offset-${layout.offset} ${isActive ? "is-active" : ""}`}
          style={style}
        >
          <button ref={element => { cardRefs.current[index] = element; }} type="button" className="site-department-card-select" aria-pressed={isActive} aria-label={`選擇${department.name}，${isActive ? "目前焦點" : ""}`} onClick={() => selectDepartment(index)} onKeyDown={event => onCardKeyDown(event, index)}>
          <h3>{department.name}</h3>
          <small>{department.en} · {department.code}</small>
          <div className="site-department-card-team" aria-label={`${department.name}幹部資訊尚未公開`}>
            <span aria-hidden="true"><UserRound size={17} /></span>
            <div><strong>姓名｜尚未公開</strong><small>系級｜尚未公開</small></div>
          </div>
          <p className="site-department-tagline">{department.tagline}</p>
          <p className="site-department-intro">{department.intro}</p>
          <div className="site-department-work"><strong>工作內容</strong><ul>{department.workItems.map(item => <li key={item}>{item}</li>)}</ul></div>
          </button>
          <nav className="site-department-card-socials" aria-label={`${department.name}的 FJUBAC 公開聯絡入口`}>
            <span className="site-department-instagram-pending" aria-label={`${department.name} Instagram 連結待提供`}><Instagram size={13} /><span>Instagram</span></span>
          </nav>
          <Link href={`/departments#${getDepartmentAnchorId(department.name)}`} className="site-department-detail-link">查看部門介紹 <ArrowRight size={14} /></Link>
        </article>;
      })}
      </div>
      <div className="site-department-controls" aria-label="切換部門焦點">
        <button type="button" onClick={() => selectDepartment(activeIndex - 1)} aria-label="上一個部門"><ArrowLeft size={16} />上一個</button>
        <p aria-live={isAutoPaused ? "polite" : "off"}><strong>{activeDepartment.name}</strong><small>{prefersReducedMotion ? "已依減少動態偏好停止自動輪播" : isManuallyPaused ? "自動輪播已暫停，可隨時恢復" : `約每 ${(rotationIntervalMs / 1000).toFixed(1)} 秒切換；可點選卡片或使用左右方向鍵`}</small></p>
        <button type="button" onClick={() => selectDepartment(activeIndex + 1)} aria-label="下一個部門">下一個<ArrowRight size={16} /></button>
      </div>
      <button type="button" className="site-department-autoplay" disabled={prefersReducedMotion} aria-pressed={!isAutoPaused} onClick={() => setIsManuallyPaused(paused => !paused)}>{isManuallyPaused || prefersReducedMotion ? <Play size={15} /> : <Pause size={15} />}{prefersReducedMotion ? "減少動態偏好已停止輪播" : isManuallyPaused ? "啟動自動輪播" : "暫停自動輪播"}</button>
    </div>
  </div>;
}
