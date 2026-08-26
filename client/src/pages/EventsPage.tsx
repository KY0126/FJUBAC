import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function dateTime(value: Date | string) {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export default function EventsPage() {
  const { isAuthenticated } = useAuth();
  const publicEvents = trpc.content.events.publicList.useQuery();
  const memberEvents = trpc.content.events.listForMember.useQuery(undefined, { enabled: isAuthenticated });
  const register = trpc.content.events.register.useMutation({ onSuccess: result => toast.success(result.status === "registered" ? "已完成活動報名。" : `活動已額滿，已加入候補第 ${result.waitlistPosition} 位。`), onError: error => toast.error(error.message || "活動報名未完成，請稍後再試。") });
  const events = isAuthenticated ? memberEvents.data : publicEvents.data;
  const activeQuery = isAuthenticated ? memberEvents : publicEvents;
  const content = activeQuery.isLoading ? <div className="service-empty">正在整理可參與活動…</div>
    : activeQuery.isError ? <div className="service-empty"><CalendarDays size={30} /><h2>暫時無法載入活動。</h2><p>{activeQuery.error.message || "請稍後重新整理頁面。"}</p><button className="club-primary" onClick={() => activeQuery.refetch()}>重新載入</button></div>
      : events?.length ? <div className="event-list">{events.map(event => <article className="event-card" key={event.id}><div className="event-card-top"><span className="status-chip">{event.visibility.toUpperCase()}</span><span>{event.status === "full" ? "額滿候補" : event.status === "open" ? "報名中" : "已發布"}</span></div><h2>{event.title}</h2><p>{event.summary || "活動詳細內容將由授權幹部持續更新。"}</p><dl><div><dt><CalendarDays size={15} />時間</dt><dd>{dateTime(event.startsAt)}</dd></div><div><dt><MapPin size={15} />地點</dt><dd>{event.location || "將另行通知"}</dd></div><div><dt><UsersRound size={15} />名額</dt><dd>{event.capacity === 0 ? "不設上限" : `${event.capacity} 人`}</dd></div></dl><div className="event-card-actions">{isAuthenticated && event.status !== "full" ? <button className="club-primary" disabled={register.isPending} onClick={() => register.mutate({ eventId: event.id })}>{register.isPending ? "處理中…" : "報名活動"}</button> : isAuthenticated ? <button className="club-secondary" disabled={register.isPending} onClick={() => register.mutate({ eventId: event.id })}>加入候補</button> : <Link href="/account" className="club-primary">社員登入後報名</Link>}</div></article>)}</div>
        : <div className="service-empty"><CalendarDays size={30} /><h2>目前沒有符合此範圍的活動。</h2><p>公開活動會在發布後顯示；社員可登入查看更多活動類型。</p><Link href="/apply" className="club-primary">探索加入路徑</Link></div>;
  return <main className="service-shell"><header className="service-header"><Link href="/" className="back-link"><ArrowLeft size={16} />返回 FJUBAC</Link><span>EVENTS & PARTICIPATION</span></header><section className="service-hero"><p className="club-section-number">02 / EVENTS</p><h1>活動與參與</h1><p>{isAuthenticated ? "你目前可查看公開、社員與已授權專案／幹部範圍的活動。" : "公開活動會顯示在此；登入後可查看社員、專案或幹部限定活動。"}</p></section><section className="service-content">{content}</section><footer className="service-footer"><CheckCircle2 size={15} />報名與候補狀態由後端依名額與可見範圍判定。</footer></main>;
}
