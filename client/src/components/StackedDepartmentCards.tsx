import { ArrowLeft, ArrowRight } from "lucide-react";
import { CSSProperties, KeyboardEvent, useRef, useState } from "react";
import { getDepartmentStackLayout } from "@/lib/stackedDepartmentCards";

const departments = [
  { number: "01", name: "人才發展部", en: "Talent Acquisition & Engagement", text: "規劃校內外招生、書審、面試與社員參與。", tone: "coral" },
  { number: "02", name: "專案開發部", en: "Project Development & Management", text: "以專案實作串起分析學習、協作與成果交付。", tone: "ink" },
  { number: "03", name: "對外發展部", en: "External Affairs", text: "串聯合作、對外活動與職涯交流機會。", tone: "moss" },
  { number: "04", name: "學術營運部", en: "Academic Operations", text: "經營社課、教材、學術活動與知識資源。", tone: "blue" },
  { number: "05", name: "行銷策略部", en: "Marketing Strategy", text: "傳遞社團故事、公開內容與活動資訊。", tone: "sand" },
] as const;

export function StackedDepartmentCards() {
  const [activeIndex, setActiveIndex] = useState(2);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeDepartment = departments[activeIndex];

  const selectDepartment = (index: number, shouldFocus = false) => {
    const nextIndex = (index + departments.length) % departments.length;
    setActiveIndex(nextIndex);
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

  return <div className="site-department-stack" aria-label="五部門焦點卡片">
    <div className="site-department-stage" aria-live="polite">
      {departments.map((department, index) => {
        const layout = getDepartmentStackLayout(index, activeIndex, departments.length);
        const isActive = index === activeIndex;
        const style = {
          "--stack-shift": layout.shift,
          "--stack-scale": String(layout.scale),
          "--stack-opacity": String(layout.opacity),
          zIndex: layout.zIndex,
        } as CSSProperties;
        return <button
          key={department.number}
          ref={element => { cardRefs.current[index] = element; }}
          type="button"
          className={`site-department-card ${department.tone} ${isActive ? "is-active" : ""}`}
          style={style}
          aria-pressed={isActive}
          aria-label={`選擇${department.name}，${isActive ? "目前焦點" : ""}`}
          onClick={() => selectDepartment(index)}
          onKeyDown={event => onCardKeyDown(event, index)}
        >
          <span>{department.number}</span>
          <h3>{department.name}</h3>
          <small>{department.en}</small>
          <p>{department.text}</p>
        </button>;
      })}
    </div>
    <div className="site-department-controls" aria-label="切換部門焦點">
      <button type="button" onClick={() => selectDepartment(activeIndex - 1)} aria-label="上一個部門"><ArrowLeft size={16} />上一個</button>
      <p><span>{activeDepartment.number} / {String(departments.length).padStart(2, "0")}</span><strong>{activeDepartment.name}</strong><small>可點選卡片或使用左右方向鍵切換</small></p>
      <button type="button" onClick={() => selectDepartment(activeIndex + 1)} aria-label="下一個部門">下一個<ArrowRight size={16} /></button>
    </div>
  </div>;
}
