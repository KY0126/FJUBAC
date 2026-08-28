import { Archive, CheckCircle2, ClipboardList, Flag, FolderOutput, Milestone, Pencil, Plus, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function toLocalInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function dateLabel(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" }) : "未設定期限";
}

const taskStatusLabel = { todo: "待處理", in_progress: "進行中", blocked: "受阻", completed: "已完成", cancelled: "已取消" } as const;
const milestoneStatusLabel = { planned: "規劃中", in_progress: "進行中", completed: "已完成", archived: "已封存" } as const;

export function ProjectWorkPanel({ projectId, projectTitle }: { projectId: number; projectTitle: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const overview = trpc.workspace.projectWork.overview.useQuery({ projectId }, { enabled: isOpen });
  const members = trpc.workspace.projectWork.members.useQuery({ projectId }, { enabled: isOpen });
  const resources = trpc.workspace.resources.list.useQuery(undefined, { enabled: isOpen });
  const refresh = () => { void overview.refetch(); void members.refetch(); };
  const createMilestone = trpc.workspace.projectWork.milestones.create.useMutation({ onSuccess: () => { toast.success("里程碑已建立。"), refresh(); }, onError: error => toast.error(error.message) });
  const updateMilestone = trpc.workspace.projectWork.milestones.update.useMutation({ onSuccess: () => { toast.success("里程碑已更新。"), setEditingMilestoneId(null), refresh(); }, onError: error => toast.error(error.message) });
  const archiveMilestone = trpc.workspace.projectWork.milestones.archive.useMutation({ onSuccess: () => { toast.success("里程碑已封存。"), setEditingMilestoneId(null), refresh(); }, onError: error => toast.error(error.message) });
  const createTask = trpc.workspace.projectWork.tasks.create.useMutation({ onSuccess: () => { toast.success("任務已建立。"), refresh(); }, onError: error => toast.error(error.message) });
  const updateTask = trpc.workspace.projectWork.tasks.update.useMutation({ onSuccess: () => { toast.success("任務已更新。"), setEditingTaskId(null), refresh(); }, onError: error => toast.error(error.message) });
  const cancelTask = trpc.workspace.projectWork.tasks.cancel.useMutation({ onSuccess: () => { toast.success("任務已取消。"), setEditingTaskId(null), refresh(); }, onError: error => toast.error(error.message) });
  const updateMine = trpc.workspace.projectWork.tasks.updateMineStatus.useMutation({ onSuccess: () => { toast.success("任務狀態已更新。"), refresh(); utils.personal.summary.invalidate(); }, onError: error => toast.error(error.message) });
  const createDeliverable = trpc.workspace.projectWork.deliverables.create.useMutation({ onSuccess: () => { toast.success("交付物已建立。"), refresh(); }, onError: error => toast.error(error.message) });
  const submitDeliverable = trpc.workspace.projectWork.deliverables.submit.useMutation({ onSuccess: () => { toast.success("交付物已送出。"), refresh(); }, onError: error => toast.error(error.message) });
  const reviewDeliverable = trpc.workspace.projectWork.deliverables.review.useMutation({ onSuccess: () => { toast.success("交付物狀態已更新。"), refresh(); }, onError: error => toast.error(error.message) });

  const submitNewMilestone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createMilestone.mutateAsync({ projectId, title: String(form.get("title")), description: String(form.get("description") || "") || undefined, dueAt: form.get("dueAt") ? new Date(String(form.get("dueAt"))) : undefined, status: "planned", sortOrder: 0 });
    event.currentTarget.reset();
  };
  const submitMilestoneEdit = async (event: FormEvent<HTMLFormElement>, milestoneId: number) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateMilestone.mutateAsync({ id: milestoneId, projectId, title: String(form.get("title")), description: String(form.get("description") || "") || undefined, dueAt: form.get("dueAt") ? new Date(String(form.get("dueAt"))) : undefined, status: form.get("status") as "planned" | "in_progress" | "completed" | "archived", sortOrder: Number(form.get("sortOrder") || 0) });
  };
  const taskPayload = (form: FormData) => {
    const milestoneValue = String(form.get("milestoneId") || "none");
    const assigneeValue = String(form.get("assigneeUserId") || "unassigned");
    return { projectId, milestoneId: milestoneValue === "none" ? undefined : Number(milestoneValue), title: String(form.get("title")), description: String(form.get("description") || "") || undefined, assigneeUserId: assigneeValue === "unassigned" ? undefined : Number(assigneeValue), priority: form.get("priority") as "low" | "normal" | "high", status: form.get("status") as "todo" | "in_progress" | "blocked" | "completed" | "cancelled", dueAt: form.get("dueAt") ? new Date(String(form.get("dueAt"))) : undefined, sortOrder: Number(form.get("sortOrder") || 0) };
  };
  const submitNewTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createTask.mutateAsync({ ...taskPayload(form), status: "todo" });
    event.currentTarget.reset();
  };
  const submitTaskEdit = async (event: FormEvent<HTMLFormElement>, taskId: number) => {
    event.preventDefault();
    await updateTask.mutateAsync({ id: taskId, ...taskPayload(new FormData(event.currentTarget)) });
  };
  const submitDeliverableForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const taskValue = String(form.get("taskId") || "none");
    await createDeliverable.mutateAsync({ projectId, taskId: taskValue === "none" ? undefined : Number(taskValue), resourceId: Number(form.get("resourceId")), title: String(form.get("title")), description: String(form.get("description") || "") || undefined, status: "draft" });
    event.currentTarget.reset();
  };

  const projectResources = (resources.data ?? []).filter(resource => resource.projectId === projectId);
  const currentUserId = user?.id;
  return <section className="project-work-panel">
    <div className="project-work-actions"><button type="button" className="project-work-toggle" aria-expanded={isOpen} onClick={() => setIsOpen(open => !open)}><ClipboardList size={16} />{isOpen ? "收合專案工作" : "查看專案工作"}</button><a className="club-secondary" href={`/projects/${projectId}`}>八階段流程</a></div>
    {!isOpen ? null : overview.isLoading ? <p className="project-work-empty">正在讀取「{projectTitle}」的真實工作資料…</p> : overview.isError || !overview.data ? <p className="project-work-empty">無法載入專案工作資料：{overview.error?.message || "請稍後再試。"}</p> : <div className="project-work-content">
      <div className="project-work-heading"><div><p className="club-section-number">PROJECT WORK</p><h3>{projectTitle}</h3><p>僅顯示你目前被授權查看的里程碑、任務與交付物。</p></div>{overview.data.canManage ? <span className="project-work-manager">可管理此專案</span> : null}</div>
      <section className="project-work-section"><header><Milestone size={17} /><div><h4>里程碑</h4><p>規劃、追蹤、完整編修與封存專案的重要節點。</p></div></header>{overview.data.milestones.length ? <ul className="project-work-list">{overview.data.milestones.map(milestone => <li key={milestone.id}><div><strong>{milestone.title}</strong><span>{milestoneStatusLabel[milestone.status]} · {dateLabel(milestone.dueAt)}</span>{milestone.description ? <small>{milestone.description}</small> : null}</div>{overview.data.canManage ? <div className="project-work-actions"><button type="button" onClick={() => setEditingMilestoneId(editingMilestoneId === milestone.id ? null : milestone.id)}><Pencil size={14} />編修</button>{milestone.status !== "archived" ? <button type="button" onClick={() => archiveMilestone.mutate({ id: milestone.id, projectId })}><Archive size={14} />封存</button> : null}</div> : null}{overview.data.canManage && editingMilestoneId === milestone.id ? <form className="project-work-form project-work-edit-form" onSubmit={event => submitMilestoneEdit(event, milestone.id)}><label>名稱<input name="title" required maxLength={200} defaultValue={milestone.title} /></label><label>狀態<select name="status" defaultValue={milestone.status}><option value="planned">規劃中</option><option value="in_progress">進行中</option><option value="completed">已完成</option><option value="archived">已封存</option></select></label><label>期限<input name="dueAt" type="datetime-local" defaultValue={toLocalInput(milestone.dueAt)} /></label><label>排序<input name="sortOrder" type="number" min="0" max="10000" defaultValue={milestone.sortOrder} /></label><label>說明<textarea name="description" rows={2} maxLength={5000} defaultValue={milestone.description || ""} /></label><div className="project-work-form-actions"><button type="submit" className="club-secondary" disabled={updateMilestone.isPending}>儲存里程碑</button><button type="button" className="project-work-cancel" onClick={() => setEditingMilestoneId(null)}>取消</button></div></form> : null}</li>)}</ul> : <p className="project-work-empty">尚無實際里程碑資料。</p>}{overview.data.canManage ? <form className="project-work-form" onSubmit={submitNewMilestone}><label>新增里程碑<input name="title" required maxLength={200} placeholder="例如：完成提案確認" /></label><label>期限<input name="dueAt" type="datetime-local" /></label><label>說明<textarea name="description" rows={2} maxLength={5000} /></label><button type="submit" className="club-secondary" disabled={createMilestone.isPending}><Plus size={15} />新增里程碑</button></form> : null}</section>
      <section className="project-work-section"><header><Flag size={17} /><div><h4>任務與待辦</h4><p>組長與授權幹部可完整編修；受指派社員只能更新自己的任務狀態。</p></div></header>{overview.data.tasks.length ? <ul className="project-work-list">{overview.data.tasks.map(({ task, assignee }) => <li key={task.id}><div><strong>{task.title}</strong><span>{taskStatusLabel[task.status]} · {task.priority === "high" ? "高優先" : task.priority === "low" ? "低優先" : "一般優先"} · {dateLabel(task.dueAt)}</span><small>{assignee?.name ? `負責人：${assignee.name}` : "尚未指派負責人"}{task.description ? ` · ${task.description}` : ""}</small></div>{overview.data.canManage ? <div className="project-work-actions"><button type="button" onClick={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}><Pencil size={14} />編修</button>{task.status !== "cancelled" ? <button type="button" onClick={() => cancelTask.mutate({ id: task.id, projectId })}>取消</button> : null}</div> : null}{task.assigneeUserId === currentUserId && !["completed", "cancelled"].includes(task.status) ? <label className="task-self-status">更新我的狀態<select value={task.status} disabled={updateMine.isPending} onChange={event => updateMine.mutate({ id: task.id, status: event.target.value as "todo" | "in_progress" | "blocked" | "completed" })}><option value="todo">待處理</option><option value="in_progress">進行中</option><option value="blocked">受阻</option><option value="completed">已完成</option></select></label> : null}{overview.data.canManage && editingTaskId === task.id ? <form className="project-work-form project-work-edit-form" onSubmit={event => submitTaskEdit(event, task.id)}><label>名稱<input name="title" required maxLength={200} defaultValue={task.title} /></label><label>狀態<select name="status" defaultValue={task.status}><option value="todo">待處理</option><option value="in_progress">進行中</option><option value="blocked">受阻</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select></label><label>里程碑<select name="milestoneId" defaultValue={task.milestoneId ? String(task.milestoneId) : "none"}><option value="none">不連結里程碑</option>{overview.data.milestones.filter(item => item.status !== "archived").map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>負責人<select name="assigneeUserId" defaultValue={task.assigneeUserId ? String(task.assigneeUserId) : "unassigned"}><option value="unassigned">暫不指派</option>{(members.data ?? []).map(member => <option key={member.userId} value={member.userId}>{member.name || `社員 #${member.userId}`} · {member.projectRole}</option>)}</select></label><label>優先程度<select name="priority" defaultValue={task.priority}><option value="low">低</option><option value="normal">一般</option><option value="high">高</option></select></label><label>期限<input name="dueAt" type="datetime-local" defaultValue={toLocalInput(task.dueAt)} /></label><label>排序<input name="sortOrder" type="number" min="0" max="10000" defaultValue={task.sortOrder} /></label><label>說明<textarea name="description" rows={2} maxLength={5000} defaultValue={task.description || ""} /></label><div className="project-work-form-actions"><button type="submit" className="club-secondary" disabled={updateTask.isPending}>儲存任務</button><button type="button" className="project-work-cancel" onClick={() => setEditingTaskId(null)}>取消</button></div></form> : null}</li>)}</ul> : <p className="project-work-empty">尚無實際任務資料。</p>}{overview.data.canManage ? <form className="project-work-form" onSubmit={submitNewTask}><label>新增任務<input name="title" required maxLength={200} /></label><label>里程碑<select name="milestoneId" defaultValue="none"><option value="none">不連結里程碑</option>{overview.data.milestones.filter(item => item.status !== "archived").map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>負責人<select name="assigneeUserId" defaultValue="unassigned"><option value="unassigned">暫不指派</option>{(members.data ?? []).map(member => <option key={member.userId} value={member.userId}>{member.name || `社員 #${member.userId}`} · {member.projectRole}</option>)}</select></label><label>優先程度<select name="priority" defaultValue="normal"><option value="low">低</option><option value="normal">一般</option><option value="high">高</option></select></label><label>期限<input name="dueAt" type="datetime-local" /></label><input name="status" type="hidden" value="todo" /><input name="sortOrder" type="hidden" value="0" /><label>說明<textarea name="description" rows={2} maxLength={5000} /></label><button type="submit" className="club-secondary" disabled={createTask.isPending}><Plus size={15} />新增任務</button></form> : null}</section>
      <section className="project-work-section"><header><FolderOutput size={17} /><div><h4>交付物</h4><p>只可連結已實際上傳且目前可讀的專案資源。</p></div></header>{overview.data.deliverables.length ? <ul className="project-work-list">{overview.data.deliverables.map(({ deliverable, resource }) => <li key={deliverable.id}><div><strong>{deliverable.title}</strong><span>{deliverable.status === "draft" ? "草稿" : deliverable.status === "submitted" ? "已送出" : deliverable.status === "accepted" ? "已接受" : "已封存"}{resource ? ` · ${resource.title}${resource.versionLabel ? `（${resource.versionLabel}）` : ""}` : " · 原資源已不可用"}</span>{deliverable.description ? <small>{deliverable.description}</small> : null}</div><div className="project-work-actions">{deliverable.status === "draft" ? <button type="button" onClick={() => submitDeliverable.mutate({ id: deliverable.id })}><Send size={14} />送出</button> : null}{overview.data.canManage && deliverable.status === "submitted" ? <button type="button" onClick={() => reviewDeliverable.mutate({ id: deliverable.id, status: "accepted" })}><CheckCircle2 size={14} />接受</button> : null}{overview.data.canManage && !["accepted", "archived"].includes(deliverable.status) ? <button type="button" onClick={() => reviewDeliverable.mutate({ id: deliverable.id, status: "archived" })}><Archive size={14} />封存</button> : null}</div></li>)}</ul> : <p className="project-work-empty">尚無實際交付物資料。</p>}{projectResources.length ? <form className="project-work-form" onSubmit={submitDeliverableForm}><label>交付物名稱<input name="title" required maxLength={200} /></label><label>連結資源<select name="resourceId" required defaultValue={String(projectResources[0].id)}>{projectResources.map(resource => <option key={resource.id} value={resource.id}>{resource.title}{resource.versionLabel ? `（${resource.versionLabel}）` : ""}</option>)}</select></label><label>對應任務<select name="taskId" defaultValue="none"><option value="none">不連結任務</option>{overview.data.tasks.filter(({ task }) => task.status !== "cancelled").map(({ task }) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>說明<textarea name="description" rows={2} maxLength={5000} /></label><button type="submit" className="club-secondary" disabled={createDeliverable.isPending}><FolderOutput size={15} />建立交付物</button></form> : <p className="project-work-empty">尚無可連結的專案資源。請由授權幹部在管理工作台上傳實際檔案後再建立交付物。</p>}</section>
    </div>}
  </section>;
}
