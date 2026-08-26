import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleHelp, FileText, GraduationCap, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getNextOnboardingStep, getPreviousOnboardingStep, ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";
import "./SiteOnboardingOverlay.css";

export { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

const steps = [
  {
    eyebrow: "WELCOME TO FJUBAC",
    title: "先從首頁，認識 FJUBAC。",
    text: "你可以在首頁了解社團定位、五個部門與最新動態；下方的快速導覽卡片也會隨時保留給你使用。",
    Icon: GraduationCap,
  },
  {
    eyebrow: "INFORMATION & EVENTS",
    title: "公開資訊與活動，都有清楚入口。",
    text: "招生通知、公開公告與活動會由授權部門持續更新。登入社員帳號後，還可查看已授權的社員或專案活動。",
    Icon: CalendarDays,
  },
  {
    eyebrow: "JOIN & MEMBER DESK",
    title: "從申請到社員服務，依路徑開始。",
    text: "校內與校外申請者可前往招生頁；核准後的社員登入工作區，即可查看專案與依權限開放的資源。",
    Icon: FileText,
  },
] as const;

type SiteOnboardingOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function SiteOnboardingOverlay({ open, onClose }: SiteOnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    window.setTimeout(() => nextButtonRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && !isLastStep) setStepIndex(current => getNextOnboardingStep(current, steps.length));
      if (event.key === "ArrowLeft" && stepIndex > 0) setStepIndex(current => getPreviousOnboardingStep(current));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLastStep, onClose, open, stepIndex]);

  if (!open) return null;

  const Icon = step.Icon;
  return (
    <div className="site-onboarding-backdrop">
      <section className="site-onboarding" role="dialog" aria-modal="true" aria-labelledby="site-onboarding-title" aria-describedby="site-onboarding-description">
        <button className="site-onboarding-close" type="button" onClick={onClose} aria-label="關閉網站導覽"><X size={19} /></button>
        <div className="site-onboarding-brand"><img src="/manus-storage/fjubac-emblem-reference_4b3d690c.png" alt="" /><span><strong>FJUBAC</strong><small>網站功能導覽</small></span></div>
        <div className="site-onboarding-progress" aria-label={`導覽第 ${stepIndex + 1} 步，共 ${steps.length} 步`}>
          {steps.map((_, index) => <span className={index <= stepIndex ? "active" : ""} key={index} />)}
        </div>
        <div className="site-onboarding-icon"><Icon size={25} /></div>
        <p className="site-onboarding-eyebrow">{step.eyebrow}</p>
        <h2 id="site-onboarding-title">{step.title}</h2>
        <p id="site-onboarding-description">{step.text}</p>
        <div className="site-onboarding-footer">
          <button type="button" className="site-onboarding-skip" onClick={onClose}>略過導覽</button>
          <div>
            {stepIndex > 0 && <button type="button" className="site-onboarding-back" onClick={() => setStepIndex(current => getPreviousOnboardingStep(current))}><ArrowLeft size={15} />上一步</button>}
            <button ref={nextButtonRef} type="button" className="site-onboarding-next" onClick={() => isLastStep ? onClose() : setStepIndex(current => getNextOnboardingStep(current, steps.length))}>
              {isLastStep ? <>開始瀏覽 <Check size={15} /></> : <>下一步 <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SiteTourTrigger({ onOpen }: { onOpen: () => void }) {
  return <button type="button" className="site-tour-trigger" onClick={onOpen} aria-label="重新開啟網站功能導覽"><CircleHelp size={16} /><span>網站導覽</span></button>;
}
