import { ArrowLeft, Archive, FileStack, FolderCog, Pencil, RotateCcw, UploadCloud } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ProjectWorkPanel } from "@/components/ProjectWorkPanel";

type ManagedProject = { id: number; title: string; description: string | null; status: "draft" | "active" | "completed" | "archived" | "cancelled"; isPublic: boolean; publicSummary: string | null; startsAt: Date | null; endsAt: Date | null };

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProjectContentManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const club = trpc.club.me.useQuery(undefined, { enabled: isAuthenticated && user?.role !== "admin" });
  const canProject = user?.role === "admin" || club.data?.permissionGroups.includes("project.manage.department") === true;
  const canResource = user?.role === "admin" || club.data?.permissionGroups.includes("resource.manage.department") === true;
  const canManage = canProject || canResource;
  const [editing, setEditing] = useState<ManagedProject | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const utils = trpc.useUtils();
  const projects = trpc.workspace.projects.listManage.useQuery(undefined, { enabled: canProject });
  const resourceScopeProjects = trpc.workspace.projects.resourceScopeList.useQuery(undefined, { enabled: canResource && !canProject });
  const managedResources = trpc.workspace.resources.listManage.useQuery(undefined, { enabled: canResource });
  const updateProject = trpc.workspace.projects.update.useMutation({ onSuccess: () => { toast.success("專案成果資料已更新。"), setEditing(null), utils.workspace.projects.listManage.invalidate(), utils.workspace.projects.publicList.invalidate(); }, onError: error => toast.error(error.message) });
  const withdrawPublic = trpc.workspace.projects.withdrawPublic.useMutation({ onSuccess: () => { toast.success("公開成果已撤回。"), utils.workspace.projects.listManage.invalidate(), utils.workspace.projects.publicList.invalidate(); }, onError: error => toast.error(error.message) });
  const archiveProject = trpc.workspace.projects.archive.useMutation({ onSuccess: () => { toast.success("專案已封存，公開摘要已同步撤回。"), utils.workspace.projects.listManage.invalidate(), utils.workspace.projects.publicList.invalidate(); }, onError: error => toast.error(error.message) });
  const uploadResource = trpc.workspace.resources.upload.useMutation({ onSuccess: () => { toast.success("資源版本已上傳。"), setFile(null), utils.workspace.resources.listManage.invalidate(), utils.workspace.resources.list.invalidate(); }, onError: error => toast.error(error.message) });
  const versionCandidates = useMemo(() => (managedResources.data ?? []), [managedResources.data]);

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    await updateProject.mutateAsync({ id: editing.id, title: String(form.get("title")), description: String(form.get("description") || "") || undefined, status: form.get("status") as ManagedProject["status"], isPublic: form.get("isPublic") === "on", publicSummary: String(form.get("publicSummary") || "") || undefined, confirmPublicConsent: form.get("confirmPublicConsent") === "on" });
  };
  const submitResourceVersion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return toast.error("請選擇要上傳的實際檔案。");
    const form = new FormData(event.currentTarget);
    const visibility = form.get("visibility") as "public" | "member" | "project" | "officer";
    const projectValue = String(form.get("projectId") || "none");
    const supersedesValue = String(form.get("supersedesResourceId") || "none");
    const projectId = projectValue === "none" ? undefined : Number(projectValue);
    if (visibility === "project" && !projectId) return toast.error("專案限定資源必須指定專案。");
    await uploadResource.mutateAsync({ title: String(form.get("title")), description: String(form.get("description") || "") || undefined, fileName: file.name, mimeType: file.type || "application/octet-stream", dataUrl: await readAsDataUrl(file), visibility, projectId, versionLabel: String(form.get("versionLabel") || "") || undefined, supersedesResourceId: supersedesValue === "none" ? undefined : Number(supersedesValue), confirmPublicConsent: form.get("confirmPublicConsent") === "on" });
    event.currentTarget.reset();
  };

  if (!isAuthenticated) return <main className="workspace-gate"><FolderCog /><h1>此管理頁需要登入</h1><p>具專案或資源管理權限的有效幹部可編修成果生命週期與資源版本。</p><Link href="/account" className="club-primary">社員登入</Link></main>;
  if (club.isLoading && user?.role !== "admin") return <main className="workspace-gate"><FolderCog /><h1>正在確認管理範圍</h1><p>系統正在讀取你的有效職務與權限。</p></main>;
  if (!canManage) return <main className="workspace-gate"><FolderCog /><h1>目前沒有此管理權限</h1><p>專案成果與資源版本需由具有效專案或資源管理職務的幹部處理。</p><Link href="/workspace" className="club-primary">返回社員工作區</Link></main>;

  return <main className="manage-shell lifecycle-shell"><header className="workspace-header"><Link href="/manage/workspace" className="back-link"><ArrowLeft size={16} />返回管理工作台</Link><span>PROJECT LIFECYCLE</span></header><section className="manage-hero"><p className="club-section-number">MVP-2 / PROJECT CONTENT</p><h1>成果公開與資源版本</h1><p>僅處理實際建立的專案與實際上傳的資源。撤回與封存均保留稽核紀錄，不會硬刪除既有資料。</p></section><section className="manage-grid">
    {canProject ? <section className="manage-form lifecycle-project-list"><header><FolderCog /><div><h2>專案成果生命週期</h2><p>公開需有明確摘要與必要同意；撤回或封存會移除公開摘要。可展開實際專案的工作內容。</p></div></header>{projects.isLoading ? <p className="governance-detail">正在讀取專案…</p> : projects.isError ? <p className="form-error">無法讀取專案：{projects.error.message}</p> : projects.data?.length ? <div className="managed-event-list">{projects.data.map(project => <article key={project.id}><div><span className="status-chip">{project.status}</span><strong>{project.title}</strong><p>{project.isPublic ? "已取得公開同意並顯示於成果頁" : "未公開"}</p><ProjectWorkPanel projectId={project.id} projectTitle={project.title} /></div><div className="managed-event-actions"><button type="button" onClick={() => setEditing(project as ManagedProject)}><Pencil size={15} />編修</button>{project.isPublic ? <button type="button" onClick={() => withdrawPublic.mutate({ id: project.id })}><RotateCcw size={15} />撤回公開</button> : null}{project.status !== "archived" ? <button type="button" className="danger" onClick={() => { if (window.confirm(`確定封存「${project.title}」？公開摘要將同步撤回。`)) archiveProject.mutate({ id: project.id }); }}><Archive size={15} />封存</button> : null}</div></article>)}</div> : <p className="governance-detail">尚未建立實際專案，無可編修的成果資料。</p>}</section> : null}
    {canProject && editing ? <form className="manage-form" onSubmit={submitProject}><header><Pencil /><div><h2>編修「{editing.title}」</h2><p>公開設定變更會同步影響公開成果頁；只有勾選同意後才可公開。</p></div></header><label>專案名稱<input name="title" required maxLength={200} defaultValue={editing.title} /></label><label>專案說明<textarea name="description" rows={4} maxLength={5000} defaultValue={editing.description ?? ""} /></label><label>狀態<select name="status" defaultValue={editing.status}><option value="draft">草稿</option><option value="active">進行中</option><option value="completed">已完成</option><option value="cancelled">已取消</option><option value="archived">已封存</option></select></label><label className="consent-field"><input name="isPublic" type="checkbox" defaultChecked={editing.isPublic} />將此專案顯示於公開成果</label><label>公開摘要<textarea name="publicSummary" rows={4} maxLength={5000} defaultValue={editing.publicSummary ?? ""} /></label><label className="consent-field"><input name="confirmPublicConsent" type="checkbox" defaultChecked={editing.isPublic} />我確認此成果仍具備必要公開同意，且不含未授權個資或保密資訊。</label><div className="management-form-actions"><button className="club-primary" disabled={updateProject.isPending}>{updateProject.isPending ? "儲存中…" : "儲存成果修改"}</button><button className="club-secondary" type="button" onClick={() => setEditing(null)}>取消編修</button></div></form> : null}
    {canResource ? <><form className="manage-form" onSubmit={submitResourceVersion}><header><UploadCloud /><div><h2>上傳資源／新版本</h2><p>新版本只能取代同一可見範圍與同一專案範圍的既有實際資源。</p></div></header><label>資源名稱<input name="title" required maxLength={200} /></label><label>版本標示（可選）<input name="versionLabel" maxLength={80} placeholder="例如：v2.0" /></label><label>說明<textarea name="description" rows={3} maxLength={5000} /></label><label>可見範圍<select name="visibility" defaultValue="member"><option value="member">社員</option><option value="public">公開</option><option value="project">專案</option><option value="officer">幹部</option></select></label><label>專案範圍<select name="projectId" defaultValue="none"><option value="none">不屬於特定專案</option>{(projects.data ?? resourceScopeProjects.data ?? []).map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>取代既有版本<select name="supersedesResourceId" defaultValue="none"><option value="none">不取代既有資源</option>{versionCandidates.map(resource => <option key={resource.id} value={resource.id}>{resource.title}{resource.versionLabel ? `（${resource.versionLabel}）` : ""} · {resource.visibility}</option>)}</select></label><p className="governance-detail">選擇要取代的資源時，請同步確認新舊資源的可見範圍與專案範圍相同；系統會再次驗證。</p><label>檔案<input type="file" required onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><label className="consent-field"><input name="confirmPublicConsent" type="checkbox" />若選擇公開，我確認已取得公開同意。</label><button className="club-primary" disabled={uploadResource.isPending}>{uploadResource.isPending ? "上傳中…" : "上傳實際資源"}</button></form><section className="manage-form lifecycle-resource-list"><header><FileStack /><div><h2>現有資源版本</h2><p>不顯示或暴露儲存位置；清單只呈現可管理的中繼資料。</p></div></header>{managedResources.isLoading ? <p className="governance-detail">正在讀取資源…</p> : managedResources.isError ? <p className="form-error">無法讀取資源：{managedResources.error.message}</p> : managedResources.data?.length ? <div className="resource-version-list">{managedResources.data.map(resource => <article key={resource.id}><strong>{resource.title}</strong><span>{resource.versionLabel || "未標示版本"} · {resource.visibility} · {resource.projectId ? `專案 #${resource.projectId}` : "非專案範圍"}</span>{resource.supersedesResourceId ? <small>取代資源 #{resource.supersedesResourceId}</small> : null}</article>)}</div> : <p className="governance-detail">尚無實際資源版本資料。</p>}</section></> : null}
  </section></main>;
}
