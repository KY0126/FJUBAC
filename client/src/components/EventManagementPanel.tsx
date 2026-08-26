import { CalendarDays, CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ProjectOption = { id: number; title: string };
type ManagedEvent = { id: number; title: string; summary: string | null; startsAt: Date | string; endsAt: Date | string; registrationDeadlineAt: Date | string | null; location: string | null; capacity: number; visibility: "public" | "member" | "project" | "officer"; projectId: number | null; status: "draft" | "published" | "open" | "full" | "closed" | "cancelled" | "completed" };

function localInputValue(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EventManagementPanel({ projects, projectCatalogNotice }: { projects: ProjectOption[]; projectCatalogNotice: string | null }) {
  const utils = trpc.useUtils();
  const managedEvents = trpc.content.events.listManage.useQuery();
  const [editing, setEditing] = useState<ManagedEvent | null>(null);
  const create = trpc.content.events.create.useMutation({ onSuccess: () => { toast.success("活動已建立。"), utils.content.events.listManage.invalidate(), utils.content.events.publicList.invalidate(), utils.content.events.listForMember.invalidate(); }, onError: error => toast.error(error.message || "活動建立失敗。") });
  const update = trpc.content.events.update.useMutation({ onSuccess: () => { toast.success("活動已更新。"), setEditing(null), utils.content.events.listManage.invalidate(), utils.content.events.publicList.invalidate(), utils.content.events.listForMember.invalidate(); }, onError: error => toast.error(error.message || "活動更新失敗。") });
  const remove = trpc.content.events.delete.useMutation({ onSuccess: () => { toast.success("活動已刪除，相關報名資料已一併移除。"), setEditing(null), utils.content.events.listManage.invalidate(), utils.content.events.publicList.invalidate(), utils.content.events.listForMember.invalidate(); }, onError: error => toast.error(error.message || "活動刪除失敗。") });
  const isPending = create.isPending || update.isPending || remove.isPending;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const visibility = form.get("visibility") as ManagedEvent["visibility"];
    const projectId = String(form.get("projectId") || "") ? Number(form.get("projectId")) : undefined;
    if (visibility === "project" && !projectId) return toast.error("專案限定活動必須選擇一個專案。");
    const payload = { title: String(form.get("title")), summary: String(form.get("summary") || ""), startsAt: new Date(String(form.get("startsAt"))), endsAt: new Date(String(form.get("endsAt"))), registrationDeadlineAt: form.get("deadline") ? new Date(String(form.get("deadline"))) : undefined, location: String(form.get("location") || ""), capacity: Number(form.get("capacity") || 0), visibility, projectId, status: form.get("status") as ManagedEvent["status"] };
    if (editing) await update.mutateAsync({ ...payload, id: editing.id });
    else { await create.mutateAsync(payload); event.currentTarget.reset(); }
  };
  return <>
    <form className="manage-form" onSubmit={submit} key={editing?.id ?? "new"}><header><CalendarPlus /><div><h2>{editing ? "編修活動" : "建立活動"}</h2><p>只有具有效活動管理職務的幹部可建立、修改或刪除；活動行事曆會自動更新。</p></div></header><label>活動名稱<input name="title" required maxLength={200} defaultValue={editing?.title ?? ""} /></label><label>簡介<textarea name="summary" rows={3} maxLength={5000} defaultValue={editing?.summary ?? ""} /></label><div className="manage-split"><label>開始<input name="startsAt" type="datetime-local" required defaultValue={localInputValue(editing?.startsAt ?? null)} /></label><label>結束<input name="endsAt" type="datetime-local" required defaultValue={localInputValue(editing?.endsAt ?? null)} /></label></div><label>報名截止<input name="deadline" type="datetime-local" defaultValue={localInputValue(editing?.registrationDeadlineAt ?? null)} /></label><label>地點<input name="location" maxLength={240} defaultValue={editing?.location ?? ""} /></label><div className="manage-split"><label>名額（0 為不限）<input name="capacity" type="number" min="0" defaultValue={editing?.capacity ?? 0} /></label><label>範圍<select name="visibility" defaultValue={editing?.visibility ?? "member"}><option value="member">社員</option><option value="public">公開</option><option value="project">專案</option><option value="officer">幹部</option></select></label></div><label>發布狀態<select name="status" defaultValue={editing?.status ?? "open"}><option value="draft">草稿</option><option value="open">報名中</option><option value="published">已發布</option><option value="full">額滿</option><option value="closed">已關閉</option><option value="cancelled">已取消</option><option value="completed">已完成</option></select></label><label>指定專案（僅專案範圍必填）<select name="projectId" defaultValue={editing?.projectId ?? ""} disabled={projects.length === 0}><option value="">{projects.length ? "選擇專案" : "專案清單未就緒"}</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>{projectCatalogNotice ? <p className="form-error">{projectCatalogNotice}</p> : null}<div className="management-form-actions"><button className="club-primary" disabled={isPending}>{isPending ? "儲存中…" : editing ? "儲存活動修改" : "建立並開放活動"}</button>{editing ? <button className="club-secondary" type="button" onClick={() => setEditing(null)} disabled={isPending}>取消編修</button> : null}</div></form>
    <section className="manage-form event-management-list"><header><CalendarDays /><div><h2>管理既有活動</h2><p>修改後會更新所有成員的活動行事曆；刪除會一併移除該活動的報名／候補資料。</p></div></header>{managedEvents.isLoading ? <p className="governance-detail">正在載入活動清單…</p> : managedEvents.isError ? <p className="form-error">無法讀取活動清單：{managedEvents.error.message}</p> : managedEvents.data?.length ? <div className="managed-event-list">{managedEvents.data.map(event => <article key={event.id}><div><span className="status-chip">{event.visibility.toUpperCase()}</span><strong>{event.title}</strong><p>{new Date(event.startsAt).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })} · {event.status}</p></div><div className="managed-event-actions"><button type="button" onClick={() => setEditing(event as ManagedEvent)}><Pencil size={15} />編修</button><button type="button" className="danger" disabled={remove.isPending} onClick={() => { if (window.confirm(`確定刪除「${event.title}」？相關報名資料也會移除。`)) remove.mutate({ id: event.id }); }}><Trash2 size={15} />刪除</button></div></article>)}</div> : <p className="governance-detail">尚未建立活動。建立後會同步顯示於符合範圍的成員行事曆。</p>}</section>
  </>;
}
