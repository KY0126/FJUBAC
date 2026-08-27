import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Filter, FolderKanban, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { Reveal } from "@/components/Reveal";

function formatDate(value: Date | string | null) { return value ? new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short" }) : null; }
function academicYear(value: Date | string | null) { if (!value) return "未公開"; const date = new Date(value); const year = date.getFullYear(); return date.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`; }

export default function PublicOutcomesPage() {
  const outcomes = trpc.workspace.projects.publicList.useQuery();
  const [selectedYear, setSelectedYear] = useState("全部");
  const years = useMemo(() => ["全部", ...Array.from(new Set((outcomes.data ?? []).map(({ project }) => academicYear(project.endsAt ?? project.startsAt)).filter(year => year !== "未公開")))].sort((a, b) => b.localeCompare(a)), [outcomes.data]);
  const visibleOutcomes = useMemo(() => (outcomes.data ?? []).filter(({ project }) => selectedYear === "全部" || academicYear(project.endsAt ?? project.startsAt) === selectedYear), [outcomes.data, selectedYear]);
  return <main className="service-shell"><PublicSiteHeader section="公開專案成果" /><section className="service-hero"><p className="club-section-number">CONSENTED SHOWCASE</p><h1>公開專案成果</h1><p>僅顯示仍在進行或已完成、且已記錄公開同意的專案摘要。未取得同意的專案內容、成員資料、客戶資訊與內部文件不會在此公開。</p></section><section className="service-content"><div className="service-ledger"><BadgeCheck /><div><strong>公開原則</strong><span>公開展示以明確同意為前提，並保留專案資料與個資的權限邊界。</span></div></div><div className="outcome-year-filter" aria-label="完成學年篩選"><span><Filter size={15} />完成學年</span>{years.map(year => <button type="button" key={year} aria-pressed={selectedYear === year} onClick={() => setSelectedYear(year)}>{year}</button>)}</div><Reveal>{outcomes.isLoading ? <div className="service-empty">正在讀取可公開的專案成果…</div> : outcomes.isError ? <div className="service-empty"><FolderKanban size={28} /><h2>暫時無法載入公開成果。</h2><p>{outcomes.error.message || "請稍後重新整理頁面。"}</p><button type="button" className="club-primary" onClick={() => outcomes.refetch()}><RefreshCw size={15} />重新載入</button></div> : visibleOutcomes.length ? <div className="outcome-grid">{visibleOutcomes.map(({ project, departmentName, departmentEnglishName }) => <article key={project.id} className="outcome-card"><div><span className="status-chip">{project.status === "completed" ? "已完成" : "進行中"}</span>{departmentName ? <small>{departmentName}{departmentEnglishName ? ` · ${departmentEnglishName}` : ""}</small> : null}</div><h2>{project.title}</h2><p>{project.publicSummary}</p><footer><span>完成學年：{academicYear(project.endsAt ?? project.startsAt)}</span>{formatDate(project.endsAt ?? project.startsAt) ? <span> · {formatDate(project.endsAt ?? project.startsAt)}</span> : null}</footer></article>)}</div> : <div className="service-empty"><FolderKanban size={28} /><h2>此學年尚無可公開的專案成果。</h2><p>請選擇其他完成學年，或於完成必要同意後再公開專案。</p></div>}</Reveal></section><PublicSiteFooter /></main>;
}
