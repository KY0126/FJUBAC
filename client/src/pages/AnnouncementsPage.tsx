import { Bell, CalendarDays, FileText, ImageOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { Reveal } from "@/components/Reveal";

const CATEGORIES = [
  { value: "all", label: "全部" },
  { value: "general", label: "一般公告" },
  { value: "recruitment", label: "招生" },
  { value: "event", label: "活動" },
  { value: "academic", label: "學術" },
  { value: "external", label: "對外" },
  { value: "governance", label: "治理" },
] as const;

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(({ value, label }) => [value, label]));

function formatDate(value: Date | string | null) {
  if (!value) return "未發布";
  return new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" });
}

export default function AnnouncementsPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("all");
  const queryInput = useMemo(() => category === "all" ? undefined : { category }, [category]);
  const announcements = trpc.content.announcements.publicList.useQuery(queryInput);
  const content = announcements.isLoading ? <div className="service-empty">正在整理公告…</div>
    : announcements.isError ? <div className="service-empty"><FileText size={28} /><h2>暫時無法載入公告。</h2><p>{announcements.error.message || "請稍後重新整理頁面，或改從首頁進入其他服務。"}</p><button className="club-primary" onClick={() => announcements.refetch()}>重新載入</button></div>
      : announcements.data?.length ? <div className="announcement-list announcement-card-grid">{announcements.data.map(item => <article className="announcement-card announcement-card-rich" key={item.id}>{item.coverImageUrl ? <img className="announcement-cover" src={item.coverImageUrl} alt="" /> : <div className="announcement-cover announcement-cover-empty" aria-hidden="true"><ImageOff size={24} /></div>}<div className="announcement-card-body"><div><span className="status-chip">{CATEGORY_LABELS[item.category] || "一般公告"}</span><time>{formatDate(item.publishedAt)}</time></div><h2>{item.title}</h2><p>{item.excerpt || item.content.slice(0, 160)}</p><footer><FileText size={15} />由 FJUBAC 授權單位發布</footer></div></article>)}</div>
        : <div className="service-empty"><FileText size={28} /><h2>目前沒有{category === "all" ? "已發布的公開公告" : `${CATEGORY_LABELS[category]}公告`}。</h2><p>後續的招生、活動與對外資訊會由各部門依權限發布。</p><Link href="/apply" className="club-primary">查看招生資訊</Link></div>;
  return <main className="service-shell"><PublicSiteHeader section="PUBLIC BULLETIN" /><section className="service-hero"><p className="club-section-number">PUBLIC INFORMATION</p><h1>公告與資訊</h1><p>招生、活動與對外訊息將由授權部門持續更新。僅顯示已發布且設定為公開的內容。</p></section><section className="service-content"><div className="service-ledger"><Bell /><div><strong>公開範圍</strong><span>可依公告類別查詢社團已正式發布的訊息。</span></div></div><Reveal><div className="announcement-filter" role="tablist" aria-label="公告分類">{CATEGORIES.map(item => <button type="button" key={item.value} role="tab" aria-selected={category === item.value} className={category === item.value ? "is-active" : ""} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>{content}</Reveal></section><footer className="service-footer"><CalendarDays size={15} />需要活動資訊？請前往 <Link href="/events">活動頁</Link>。</footer><PublicSiteFooter /></main>;
}
