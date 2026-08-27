import { ArrowRight, BadgeCheck, Building2, GraduationCap, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { Reveal } from "@/components/Reveal";
import { getDepartmentAnchorId } from "@/lib/departmentAnchors";

const departmentGrowthContent = {
  "行銷策略部": {
    learningPoints: ["社群經營及行銷數據分析實戰力", "跨部門協作能力", "從零打造行銷企劃", "多元通路行銷思維"],
    bonusItems: ["熟悉 Canva 操作使用", "熟悉社群媒體與行銷工具", "擁有許多創意與行銷思維", "剪輯能力", "願意學習新事物、不怕問"],
  },
  "學術營運部": {
    learningPoints: ["專業書信撰寫、往來能力", "活動設計、統籌能力", "學術性活動的規劃執行", "更深化管顧思維及技能，提升管顧個案面試能力"],
    bonusItems: ["對社團、社課內容、專案流程有一定了解程度", "富有統整能力、快速理解能力", "臨機應變反應快", "批判性思考，願意提出問題＆可能的解方", "願意主動外向"],
  },
  "人才發展部": {
    learningPoints: ["面試、書審設計", "與人溝通、深度交流的能力", "設計並辦理社團交流活動", "用影響力強化社團文化和凝聚力"],
    bonusItems: ["活動舉辦與籌備經驗", "個性細心、願意主動與人相處", "勇於接受挑戰與突破自己的心態", "抗壓性、隨機應變與危機處理能力", "渴望學習與成長，有上進心"],
  },
  "專案開發部": {
    learningPoints: ["對外關係建立、陌生合作關係開發", "協助專案生釐清方向、穩定進度", "大型發表活動統籌", "提升觀察力與解決問題的邏輯"],
    bonusItems: ["曾擔任過本社「專案生」", "對管顧基本知識、專案流程熟悉", "團隊合作、願意嘗試新的學習機會", "商業溝通、書信往來經驗", "能提出很多想法及優化"],
  },
  "對外發展部": {
    learningPoints: ["品牌打造與形象經營", "對外溝通與協調實戰", "大型活動規劃執行", "評估外部資源、尋找雙贏合作方式"],
    bonusItems: ["具備良好的口頭與書面溝通能力，擅長規劃與協調", "不怕生，願意主動對外接洽或上台簡報", "撰寫合作企劃書、活動企劃書經驗"],
  },
} as const;

function DepartmentGrowthList({ title, icon: Icon, items }: { title: string; icon: typeof GraduationCap; items: readonly string[] }) {
  return <section className="department-growth-list" aria-label={title}>
    <h3><Icon size={18} aria-hidden="true" />{title}</h3>
    <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
  </section>;
}

export default function DepartmentsPage() {
  const departments = trpc.content.departments.publicList.useQuery();
  return <main className="service-shell"><PublicSiteHeader section="FIVE DEPARTMENTS" /><section className="service-hero"><p className="club-section-number">ORGANIZATION</p><h1>五部門介紹</h1><p>FJUBAC 以五個部門分工處理招募、專案、對外、學術與品牌內容。以下只呈現目前啟用的部門與公開職責，不揭露個人名單或職務任期。</p></section><section className="service-content"><div className="service-ledger"><UsersRound /><div><strong>公開介紹範圍</strong><span>部門分工、學習點與加分項目可公開閱讀；個人資料、任期與內部工作紀錄仍依權限保護。</span></div></div><Reveal>{departments.isLoading ? <div className="service-empty">正在讀取部門介紹…</div> : departments.isError ? <div className="service-empty"><Building2 size={28} /><h2>暫時無法載入部門資料。</h2><p>{departments.error.message || "請稍後重新整理頁面。"}</p><button type="button" className="club-primary" onClick={() => departments.refetch()}>重新載入</button></div> : departments.data?.length ? <div className="department-public-grid">{departments.data.map((department, index) => {
    const growthContent = departmentGrowthContent[department.name as keyof typeof departmentGrowthContent];
    return <article key={department.id} id={getDepartmentAnchorId(department.name)} className="department-public-card"><span>DEPT. {String(index + 1).padStart(2, "0")}</span><h2>{department.name}</h2><p className="department-english">{department.englishName}</p><p>{department.description || "此部門的公開工作說明尚在整理中。"}</p>{growthContent ? <div className="department-growth-grid"><DepartmentGrowthList title="學習點" icon={GraduationCap} items={growthContent.learningPoints} /><DepartmentGrowthList title="加分項目" icon={BadgeCheck} items={growthContent.bonusItems} /></div> : null}</article>;
  })}</div> : <div className="service-empty"><Building2 size={28} /><h2>部門介紹尚在整理中。</h2><p>待部門資料啟用後，網站會在此顯示已確認的公開職責。</p></div>}</Reveal><Reveal><section className="department-cta"><div><p className="club-section-number">GET INVOLVED</p><h2>想更了解參與方式？</h2><p>請由正式招生頁查看當期校內或校外申請資訊與流程。</p></div><Link href="/apply" className="club-primary">前往招生資訊 <ArrowRight size={15} /></Link></section></Reveal></section><PublicSiteFooter /></main>;
}
