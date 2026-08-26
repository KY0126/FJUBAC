import { ArrowRight, BadgeCheck, FolderKanban, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { Reveal } from "@/components/Reveal";

function formatDate(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short" });
}

export default function PublicOutcomesPage() {
  const outcomes = trpc.workspace.projects.publicList.useQuery();
  return <main className="service-shell"><PublicSiteHeader section="PUBLIC OUTCOMES" /><section className="service-hero"><p className="club-section-number">CONSENTED SHOWCASE</p><h1>公開專案成果</h1><p>僅顯示仍在進行或已完成、且已記錄公開同意的專案摘要。未取得同意的專案內容、成員資料、客戶資訊與內部文件不會在此公開。</p></section><section className="service-content"><div className="service-ledger"><BadgeCheck /><div><strong>公開原則</strong><span>公開展示以明確同意為前提，並保留專案資料與個資的權限邊界。</span></div></div><Reveal>{outcomes.isLoading ? <div className="service-empty">正在讀取可公開的專案成果…</div> : outcomes.isError ? <div className="service-empty"><FolderKanban size={28} /><h2>暫時無法載入公開成果。</h2><p>{outcomes.error.message || "請稍後重新整理頁面。"}</p><button type="button" className="club-primary" onClick={() => outcomes.refetch()}><RefreshCw size={15} />重新載入</button></div> : outcomes.data?.length ? <div className="outcome-grid">{outcomes.data.map(({ project, departmentName, departmentEnglishName }) => <article key={project.id} className="outcome-card"><div><span className="status-chip">{project.status === "completed" ? "已完成" : "進行中"}</span>{departmentName ? <small>{departmentName}{departmentEnglishName ? ` · ${departmentEnglishName}` : ""}</small> : null}</div><h2>{project.title}</h2><p>{project.publicSummary}</p><footer>{formatDate(project.startsAt) ? <span>開始於 {formatDate(project.startsAt)}</span> : <span>未公開專案時程</span>}</footer></article>)}</div> : <div className="service-empty"><FolderKanban size={28} /><h2>目前尚無可公開的專案成果。</h2><p>專案只有在完成必要同意與公開摘要確認後，才會出現在此處。</p><Link href="/learning" className="club-primary">了解學習地圖 <ArrowRight size={15} /></Link></div>}</Reveal></section><PublicSiteFooter /></main>;
}
