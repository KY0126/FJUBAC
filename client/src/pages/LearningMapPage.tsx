import { ArrowRight, BarChart3, BriefcaseBusiness, ChevronDown, Compass, Layers3, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { Reveal } from "@/components/Reveal";

const JOURNEY = [
  { step: "01", title: "認識問題與脈絡", description: "從公開介紹、說明會與社群內容理解商業分析、管理顧問方法及社團的參與方式。", Icon: Compass },
  { step: "02", title: "練習分析方法", description: "以量化分析、效益評估、產業觀察與個案拆解等公開主題，建立可反覆練習的方法基礎。", Icon: BarChart3 },
  { step: "03", title: "連結專案與交流", description: "依個人參與和指派情況，從專案實作、活動、Coffee Chat 或企業參訪探索應用與職涯情境。", Icon: BriefcaseBusiness },
  { step: "04", title: "回顧與持續探索", description: "透過公開資源、活動回顧與自身經驗整理下一步；不以網站建立個人排名或固定課程承諾。", Icon: Layers3 },
] as const;

export default function LearningMapPage() {
  return <main className="service-shell"><PublicSiteHeader section="LEARNING MAP" /><section className="service-hero"><p className="club-section-number">OPEN LEARNING FRAMEWORK</p><h1>學習地圖</h1><p>這是一份依 FJUBAC 已核對公開內容整理的探索框架，而不是保證開設的課程表、固定時程或個人成效承諾。實際活動與參與方式仍以正式公告為準。</p><a className="scroll-cue" href="#learning-journey"><span>向下查看探索架構</span><ChevronDown size={16} aria-hidden="true" /></a></section><section className="service-content"><div className="service-ledger"><UsersRound /><div><strong>如何閱讀</strong><span>可把四個階段當作理解與規劃參與的參考，不代表每位社員都會經歷相同路徑。</span></div></div><Reveal><div id="learning-journey" className="learning-journey">{JOURNEY.map(({ step, title, description, Icon }, index) => <article key={step} className="learning-stage"><span>{step}</span><Icon size={24} /><h2>{title}</h2><p>{description}</p>{index < JOURNEY.length - 1 ? <ArrowRight className="learning-stage-arrow" aria-hidden="true" /> : null}</article>)}</div></Reveal><Reveal><section className="learning-note"><div><p className="club-section-number">SCOPE NOTE</p><h2>公開脈絡，而非虛構的成果清單</h2><p>此頁僅將可核對的公開主題歸納為學習方向。若尚未有公告、活動、資源或經同意公開的成果，網站會清楚顯示空白狀態，而不以範例或假資料補足。</p></div><div className="learning-note-actions"><Link href="/announcements" className="club-primary">查看正式公告</Link><Link href="/research" className="club-secondary">查看公開研究範圍</Link></div></section></Reveal></section><PublicSiteFooter /></main>;
}
