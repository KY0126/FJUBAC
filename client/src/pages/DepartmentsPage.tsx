import { ArrowRight, BadgeCheck, Building2, GraduationCap, UsersRound } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { Reveal } from "@/components/Reveal";
import { getDepartmentAnchorId } from "@/lib/departmentAnchors";
import { departmentGrowthContent } from "@/lib/departmentGrowthContent";

function DepartmentGrowthList({ title, icon: Icon, items }: { title: string; icon: typeof GraduationCap; items: readonly string[] }) {
  return <section className="department-growth-list" aria-label={title}>
    <h3><Icon size={18} aria-hidden="true" />{title}</h3>
    <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
  </section>;
}

export default function DepartmentsPage() {
  const departments = trpc.content.departments.publicList.useQuery();
  useEffect(() => {
    if (!departments.data?.length || !window.location.hash) return;
    const anchorId = decodeURIComponent(window.location.hash.slice(1));
    window.requestAnimationFrame(() => document.getElementById(anchorId)?.scrollIntoView({ block: "start" }));
  }, [departments.data]);
  return <main className="service-shell"><PublicSiteHeader section="FIVE DEPARTMENTS" /><section className="service-hero"><p className="club-section-number">ORGANIZATION</p><h1>五部門介紹</h1><p>FJUBAC 以五個部門分工處理招募、專案、對外、學術與品牌內容。以下只呈現目前啟用的部門與公開職責，不揭露個人名單或職務任期。</p></section><section className="service-content"><div className="service-ledger"><UsersRound /><div><strong>公開介紹範圍</strong><span>部門分工、學習點與加分項目可公開閱讀；個人資料、任期與內部工作紀錄仍依權限保護。</span></div></div><Reveal>{departments.isLoading ? <div className="service-empty">正在讀取部門介紹…</div> : departments.isError ? <div className="service-empty"><Building2 size={28} /><h2>暫時無法載入部門資料。</h2><p>{departments.error.message || "請稍後重新整理頁面。"}</p><button type="button" className="club-primary" onClick={() => departments.refetch()}>重新載入</button></div> : departments.data?.length ? <div className="department-public-grid">{departments.data.map((department, index) => {
    const growthContent = departmentGrowthContent[department.name as keyof typeof departmentGrowthContent];
    return <article key={department.id} id={getDepartmentAnchorId(department.name)} className="department-public-card"><span>DEPT. {String(index + 1).padStart(2, "0")}</span><h2>{department.name}</h2><p className="department-english">{department.englishName}</p><p>{department.description || "此部門的公開工作說明尚在整理中。"}</p>{growthContent ? <div className="department-growth-grid"><DepartmentGrowthList title="學習點" icon={GraduationCap} items={growthContent.learningPoints} /><DepartmentGrowthList title="加分項目" icon={BadgeCheck} items={growthContent.bonusItems} /></div> : null}</article>;
  })}</div> : <div className="service-empty"><Building2 size={28} /><h2>部門介紹尚在整理中。</h2><p>待部門資料啟用後，網站會在此顯示已確認的公開職責。</p></div>}</Reveal><Reveal><section className="department-cta"><div><p className="club-section-number">GET INVOLVED</p><h2>想更了解參與方式？</h2><p>請由正式招生頁查看當期校內或校外申請資訊與流程。</p></div><Link href="/apply" className="club-primary">前往招生資訊 <ArrowRight size={15} /></Link></section></Reveal></section><PublicSiteFooter /></main>;
}
