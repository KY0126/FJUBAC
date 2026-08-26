import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, ExternalLink, List, MapPin, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { eventIcs, googleCalendarUrl, type CalendarExportEvent } from "@/lib/calendar";
import "@/pages/EventCalendar.css";

type CalendarEvent = CalendarExportEvent & {
  visibility: "public" | "member" | "project" | "officer";
  status: string;
  capacity: number;
};

type CalendarView = "month" | "week" | "list";

function dateTime(value: Date | string) {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

function dateKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function downloadIcs(event: CalendarExportEvent) {
  const blob = new Blob([eventIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fjubac-event-${event.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function EventCalendar({ events, canManage }: { events: CalendarEvent[]; canManage: boolean }) {
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const filteredEvents = useMemo(() => events.filter(event => `${event.title} ${event.summary || ""} ${event.location || ""}`.toLocaleLowerCase("zh-TW").includes(search.trim().toLocaleLowerCase("zh-TW"))), [events, search]);
  const visibleEvents = useMemo(() => filteredEvents.filter(event => {
    const starts = new Date(event.startsAt);
    if (view === "month") return starts.getFullYear() === cursor.getFullYear() && starts.getMonth() === cursor.getMonth();
    if (view === "week") {
      const start = new Date(cursor); start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      return starts >= start && starts < end;
    }
    return true;
  }), [cursor, filteredEvents, view]);
  const calendarDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [cursor]);
  const label = view === "month" ? cursor.toLocaleDateString("zh-TW", { year: "numeric", month: "long" }) : view === "week" ? `當週 · ${cursor.toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}` : "所有可查看活動";
  const navigate = (offset: number) => setCursor(current => { const next = new Date(current); if (view === "month") next.setMonth(next.getMonth() + offset); else next.setDate(next.getDate() + offset * 7); return next; });
  const grouped = useMemo(() => visibleEvents.reduce<Record<string, CalendarEvent[]>>((result, event) => { const key = dateKey(event.startsAt); (result[key] ||= []).push(event); return result; }, {}), [visibleEvents]);
  const eventsForDay = (day: Date) => visibleEvents.filter(event => dateKey(event.startsAt) === dateKey(day));
  const todayKey = dateKey(new Date());

  return <section className="event-calendar" aria-label="活動行事曆">
    <header className="event-calendar-toolbar"><div><h2>活動行事曆</h2><p>依你的社員、專案與幹部權限顯示可查看活動。</p></div><label className="event-calendar-search-wrap"><Search size={15} /><span className="sr-only">搜尋活動</span><input className="event-calendar-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜尋活動、地點或關鍵字" /></label></header>
    <div className="event-calendar-controls"><div className="event-calendar-nav"><button type="button" onClick={() => navigate(-1)}><ChevronLeft size={15} />上一段</button><button type="button" onClick={() => setCursor(new Date())}>今天</button><button type="button" onClick={() => navigate(1)}>下一段<ChevronRight size={15} /></button></div><strong className="event-calendar-label">{label}</strong><div className="event-calendar-tabs"><button type="button" className={view === "month" ? "active" : ""} onClick={() => setView("month")}>月</button><button type="button" className={view === "week" ? "active" : ""} onClick={() => setView("week")}>週</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={14} />清單</button></div></div>
    {view === "month" ? <div className="calendar-month"><div className="calendar-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map(day => <span key={day}>週{day}</span>)}</div><div className="calendar-grid">{calendarDays.map(day => { const dayEvents = eventsForDay(day); const inMonth = day.getMonth() === cursor.getMonth(); return <div className={`calendar-day ${inMonth ? "" : "muted"} ${dateKey(day) === todayKey ? "today" : ""}`} key={day.toISOString()}><time>{day.getDate()}</time>{dayEvents.slice(0, 2).map(event => <button className="calendar-event" type="button" onClick={() => setSelected(event)} key={event.id}>{new Date(event.startsAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} {event.title}</button>)}{dayEvents.length > 2 ? <button className="calendar-more" type="button" onClick={() => { setView("list"); setCursor(day); }}>另有 {dayEvents.length - 2} 項</button> : null}</div>; })}</div></div> : <div className="calendar-list">{Object.keys(grouped).length ? Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, group]) => <div className="calendar-list-group" key={key}><time className="calendar-list-date">{new Date(group[0].startsAt).toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" })}</time><div className="calendar-list-items">{group.map(event => <article className="calendar-list-item" key={event.id}><div><time>{new Date(event.startsAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</time><strong>{event.title}</strong><p>{event.location || "地點將另行通知"} · {event.visibility === "public" ? "公開" : event.visibility === "member" ? "社員" : event.visibility === "project" ? "專案" : "幹部"}</p></div><button type="button" onClick={() => setSelected(event)}>查看詳情</button></article>)}</div></div>) : <p className="calendar-empty">這個範圍尚無符合搜尋條件的活動。</p>}</div>}
    {selected ? <article className="event-detail"><header className="event-detail-head"><div><span className="status-chip">{selected.visibility.toUpperCase()}</span><h3>{selected.title}</h3></div><button type="button" className="event-detail-close" onClick={() => setSelected(null)} aria-label="關閉活動詳情"><X size={17} /></button></header><p>{selected.summary || "活動詳細內容將由授權幹部持續更新。"}</p><div className="event-detail-meta"><span><Clock3 size={14} /> {dateTime(selected.startsAt)}－{new Date(selected.endsAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</span><span><MapPin size={14} /> {selected.location || "將另行通知"}</span><span><UsersRound size={14} /> {selected.capacity === 0 ? "不設名額上限" : `${selected.capacity} 人`}</span></div><div className="event-detail-actions"><a href={googleCalendarUrl(selected)} target="_blank" rel="noreferrer"><ExternalLink size={15} />加入 Google 日曆</a><button type="button" onClick={() => downloadIcs(selected)}><Download size={15} />下載 ICS</button></div></article> : null}
    <p className="event-calendar-note"><CalendarDays size={15} />加入個人 Google 日曆或下載 ICS 後，請在自己的日曆服務中設定提醒時間；網站不會讀取或修改你的個人日曆帳號。</p>
    {canManage ? <p className="event-officer-note"><ShieldCheck size={15} />你具活動管理權限，可前往 <Link href="/manage/workspace">管理工作台</Link> 建立、修改或刪除活動。</p> : null}
  </section>;
}
