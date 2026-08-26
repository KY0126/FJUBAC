import { ArrowLeft, Bell, CalendarDays, FileText } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string | null) {
  if (!value) return "未發布";
  return new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" });
}

export default function AnnouncementsPage() {
  const announcements = trpc.content.announcements.publicList.useQuery();
  const content = announcements.isLoading ? <div className="service-empty">正在整理公告…</div>
    : announcements.isError ? <div className="service-empty"><FileText size={28} /><h2>暫時無法載入公告。</h2><p>{announcements.error.message || "請稍後重新整理頁面，或改從首頁進入其他服務。"}</p><button className="club-primary" onClick={() => announcements.refetch()}>重新載入</button></div>
      : announcements.data?.length ? <div className="announcement-list">{announcements.data.map(item => <article className="announcement-card" key={item.id}><div><span className="status-chip">PUBLIC</span><time>{formatDate(item.publishedAt)}</time></div><h2>{item.title}</h2><p>{item.excerpt || item.content.slice(0, 160)}</p><footer><FileText size={15} />由 FJUBAC 授權單位發布</footer></article>)}</div>
        : <div className="service-empty"><FileText size={28} /><h2>目前沒有已發布的公開公告。</h2><p>後續的招生、活動與對外資訊會由各部門依權限發布。</p><Link href="/apply" className="club-primary">查看招生資訊</Link></div>;
  return <main className="service-shell"><header className="service-header"><Link href="/" className="back-link"><ArrowLeft size={16} />返回 FJUBAC</Link><span>PUBLIC BULLETIN</span></header><section className="service-hero"><p className="club-section-number">01 / PUBLIC CONTENT</p><h1>公告與資訊</h1><p>由授權部門發布的公開內容。招生活動、社群資訊與對外訊息將在此同步更新。</p></section><section className="service-content"><div className="service-ledger"><Bell /><div><strong>公開範圍</strong><span>僅顯示已發布、且設定為公開的公告。</span></div></div>{content}</section><footer className="service-footer"><CalendarDays size={15} />需要活動資訊？請前往 <Link href="/events">活動頁</Link>。</footer></main>;
}
