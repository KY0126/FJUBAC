import { Activity, ArrowLeft, FilePlus2, FolderPlus, ImagePlus, LockKeyhole, Megaphone, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { EventManagementPanel } from "@/components/EventManagementPanel";

async function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function projectIdFromForm(form: FormData) {
  const raw = String(form.get("projectId") ?? "");
  return raw ? Number(raw) : undefined;
}

export default function ManagementWorkspacePage() {
  const { user, isAuthenticated } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const isOwner = isAuthenticated && user?.role === "admin";
  const clubContext = trpc.club.me.useQuery(undefined, { enabled: isAuthenticated && !isOwner });
  const permissionGroups = clubContext.data?.permissionGroups ?? [];
  const canContent = isOwner || permissionGroups.includes("content.manage.public");
  const canEvent = isOwner || permissionGroups.includes("event.manage.department");
  const canProject = isOwner || permissionGroups.includes("project.manage.department");
  const canResource = isOwner || permissionGroups.includes("resource.manage.department");
  const hasManagementScope = canContent || canEvent || canProject || canResource;
  const projects = trpc.workspace.projects.listManage.useQuery(undefined, { enabled: canProject });
  const members = trpc.workspace.members.activeDirectory.useQuery(undefined, { enabled: canProject });
  const assignments = trpc.workspace.projects.assignments.useQuery({ projectId: selectedProjectId ?? 1 }, { enabled: canProject && selectedProjectId !== null });
  const governanceStatus = trpc.governance.scheduleStatus.useQuery(undefined, { enabled: isOwner });
  const governanceAudit = trpc.governance.auditRecent.useQuery(undefined, { enabled: isOwner });
  const errorToast = (message: string) => toast.error(message || "操作未完成，請稍後再試。");
  const createAnnouncement = trpc.content.announcements.create.useMutation({ onSuccess: () => toast.success("公告已建立。"), onError: error => errorToast(error.message) });
  const createProject = trpc.workspace.projects.create.useMutation({ onSuccess: () => { toast.success("專案已建立。"), utils.workspace.projects.listManage.invalidate(); }, onError: error => errorToast(error.message) });
  const assignProjectMember = trpc.workspace.projects.assign.useMutation({ onSuccess: () => { toast.success("專案成員已更新。"), assignments.refetch(); }, onError: error => errorToast(error.message) });
  const uploadResource = trpc.workspace.resources.upload.useMutation({ onSuccess: () => { toast.success("資源已上傳。"), setFile(null); }, onError: error => errorToast(error.message) });
  const runGovernance = trpc.governance.runDailyCheck.useMutation({ onSuccess: summary => { toast.success(`每日治理檢查完成：撤權 ${summary.expiredAssignments} 筆、清理認證碼 ${summary.cleanedVerificationCodes} 筆。`); governanceStatus.refetch(); governanceAudit.refetch(); }, onError: error => errorToast(error.message) });

  if (!isAuthenticated) return <main className="workspace-gate"><LockKeyhole /><h1>此工作台需要登入</h1><p>社員與幹部可使用已核准的社團帳號登入；社長可使用治理登入進入跨部門管理與稽核工作台。</p><div className="workspace-gate-actions"><Link href="/account" className="club-primary">社員登入</Link><button type="button" className="club-secondary" onClick={startLogin}>社長治理登入</button></div></main>;
  if (!isOwner && clubContext.isLoading) return <main className="workspace-gate"><Activity /><h1>正在確認工作範圍</h1><p>系統正在讀取你的部門職務與有效任期。</p></main>;
  if (!hasManagementScope) return <main className="workspace-gate"><LockKeyhole /><h1>目前沒有管理工作範圍</h1><p>此帳號尚未被指派有效的部門職務。請由社長確認你的職務、權限群組與任期。</p><Link href="/workspace" className="club-primary">前往社員工作區</Link></main>;

  const submitAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { await createAnnouncement.mutateAsync({ title: String(form.get("title")), excerpt: String(form.get("excerpt") || ""), content: String(form.get("content")), category: form.get("category") as "general" | "recruitment" | "event" | "academic" | "external" | "governance", coverImageDataUrl: coverFile ? await readAsDataUrl(coverFile) : undefined, visibility: "public", status: "published" }); event.currentTarget.reset(); setCoverFile(null); } catch { /* toast handled by mutation */ }
  };
  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try { await createProject.mutateAsync({ title: String(form.get("title")), description: String(form.get("description") || ""), status: "active", isPublic: form.get("isPublic") === "on", publicSummary: String(form.get("publicSummary") || ""), confirmPublicConsent: form.get("confirmPublicConsent") === "on" }); event.currentTarget.reset(); } catch { /* toast handled by mutation */ }
  };
  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const projectId = Number(form.get("projectId"));
    const userId = Number(form.get("userId"));
    if (!projectId || !userId) return toast.error("請選擇專案與有效社員。");
    try { await assignProjectMember.mutateAsync({ projectId, userId, projectRole: form.get("projectRole") as "project_member" | "project_lead" | "advisor" }); setSelectedProjectId(projectId); event.currentTarget.reset(); } catch { /* toast handled by mutation */ }
  };
  const submitResource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return toast.error("請選擇要上傳的檔案。");
    const form = new FormData(event.currentTarget);
    const visibility = form.get("visibility") as "public" | "member" | "project" | "officer";
    const projectId = projectIdFromForm(form);
    if (visibility === "project" && !projectId) return toast.error("專案限定資源必須選擇一個專案。");
    try { await uploadResource.mutateAsync({ title: String(form.get("title")), description: String(form.get("description") || ""), fileName: file.name, mimeType: file.type || "application/octet-stream", dataUrl: await readAsDataUrl(file), visibility, projectId, confirmPublicConsent: form.get("confirmPublicConsent") === "on" }); event.currentTarget.reset(); setFile(null); } catch { /* toast handled by mutation */ }
  };

  const projectOptions = projects.data ?? [];
  const projectCatalogReady = !projects.isLoading && !projects.isError && projectOptions.length > 0;
  const memberDirectory = members.data ?? [];
  const memberDirectoryReady = !members.isLoading && !members.isError && memberDirectory.length > 0;
  const projectCatalogNotice = projects.isLoading ? "正在載入專案清單…" : projects.isError ? `無法載入專案清單：${projects.error.message}` : projectOptions.length === 0 ? "目前尚未建立可用專案；請先建立專案，再建立專案範圍活動、資源或成員指派。" : null;
  const memberDirectoryNotice = members.isLoading ? "正在載入有效社員名單…" : members.isError ? `無法載入社員名單：${members.error.message}` : memberDirectory.length === 0 ? "目前沒有有效社員，無法進行專案生指派。請先完成社員核准與帳號啟用。" : null;
  return <main className="manage-shell">
    <header className="workspace-header"><Link href="/" className="back-link"><ArrowLeft size={16} />離開工作台</Link><span>President / Acting Site Owner</span></header>
    <section className="manage-hero"><p className="club-section-number">GOVERNANCE DESK</p><h1>內容與工作區管理</h1><p>此 MVP 依五部門職務呈現可管理範圍；每項操作都會保留資料範圍與稽核紀錄。</p></section>
    <section className="manage-grid">
      {!isOwner ? <section className="manage-form governance-card"><header><ShieldCheck /><div><h2>目前已授權工作範圍</h2><p>{permissionGroups.join(" · ") || "尚未取得可用權限"}</p></div></header><p className="governance-detail">內容、活動、專案與資源的可見區塊會依有效職務與任期顯示。</p></section> : null}
      {isOwner ? <section className="manage-form governance-card"><header><ShieldCheck /><div><h2>每日治理任務</h2><p>部署後由受信任的定時任務處理任期提醒、到期撤權與過期認證碼清理。</p></div></header><div className="governance-status"><Activity size={16} /><span>{governanceStatus.data?.scheduleCronTaskUid ? "已綁定正式定時任務" : "尚未綁定定時任務；完成部署後再啟用。"}</span></div><p className="governance-detail">最近執行：{governanceStatus.data?.lastRanAt ? new Date(governanceStatus.data.lastRanAt).toLocaleString("zh-TW") : "尚未執行"}</p><button type="button" className="club-secondary" disabled={runGovernance.isPending} onClick={() => runGovernance.mutate()}>{runGovernance.isPending ? "檢查中…" : "立即執行一次治理檢查"}</button></section> : null}
      {isOwner ? <section className="manage-form governance-card"><header><ShieldCheck /><div><h2>治理稽核紀錄</h2><p>保留最近 20 筆高風險操作、任期提醒與自動撤權資料。</p></div></header>{governanceAudit.isLoading ? <p className="governance-detail">正在讀取治理紀錄…</p> : governanceAudit.isError ? <p className="form-error">無法讀取稽核紀錄：{governanceAudit.error.message}</p> : governanceAudit.data?.length ? <div className="audit-list">{governanceAudit.data.map(entry => <div key={entry.id}><strong>{entry.action}</strong><span>{entry.actorName || entry.actorEmail || "系統定時任務"} · {entry.targetType}{entry.targetId ? ` #${entry.targetId}` : ""}</span><time>{new Date(entry.createdAt).toLocaleString("zh-TW")}</time></div>)}</div> : <p className="governance-detail">尚無可顯示的治理紀錄。</p>}</section> : null}
      {canContent ? <form className="manage-form" onSubmit={submitAnnouncement}><header><Megaphone /><div><h2>發布公開公告</h2><p>行銷策略部與對外發展部的公開內容入口。</p></div></header><label>標題<input name="title" required maxLength={220} /></label><label>分類<select name="category" defaultValue="general"><option value="general">一般公告</option><option value="recruitment">招生</option><option value="event">活動</option><option value="academic">學術</option><option value="external">對外</option><option value="governance">治理</option></select></label><label>摘要<input name="excerpt" maxLength={500} /></label><label>內容<textarea name="content" required rows={5} maxLength={20000} /></label><label>可選封面圖片<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => setCoverFile(event.target.files?.[0] ?? null)} /></label><p className="governance-detail"><ImagePlus size={15} />封面僅使用已取得發布權限的圖片；接受 PNG、JPEG、WebP 或 GIF，單檔上限 5MB。</p><button className="club-primary" disabled={createAnnouncement.isPending}><FilePlus2 size={16} />{createAnnouncement.isPending ? "發布中…" : "發布公告"}</button></form> : null}
      {canEvent ? <EventManagementPanel projects={projectOptions} projectCatalogNotice={projectCatalogNotice} /> : null}
      {canProject ? <><form className="manage-form" onSubmit={submitProject}><header><FolderPlus /><div><h2>建立專案</h2><p>建立後可在右側指派有效社員為專案生、組長或指導角色。</p></div></header><label>專案名稱<input name="title" required maxLength={200} /></label><label>專案說明<textarea name="description" rows={4} maxLength={5000} /></label><label className="consent-field"><input type="checkbox" name="isPublic" />將此專案列入公開成果</label><label>公開摘要（僅公開成果必填）<textarea name="publicSummary" rows={3} maxLength={5000} /></label><label className="consent-field"><input type="checkbox" name="confirmPublicConsent" />我確認此成果已取得必要的公開同意，且內容不含未授權個資或保密資訊。</label><button className="club-primary" disabled={createProject.isPending}>{createProject.isPending ? "建立中…" : "建立專案"}</button></form><section className="manage-form"><header><UsersRound /><div><h2>指派專案成員</h2><p>僅有效社員可成為專案生；可查看選定專案的現有成員。</p></div></header>{projectCatalogNotice ? <p className="form-error">{projectCatalogNotice}</p> : null}{memberDirectoryNotice ? <p className="form-error">{memberDirectoryNotice}</p> : null}<form className="inline-management-form" onSubmit={submitAssignment}><label>專案<select name="projectId" required defaultValue="" disabled={!projectCatalogReady} onChange={event => setSelectedProjectId(event.target.value ? Number(event.target.value) : null)}><option value="">{projectCatalogReady ? "選擇專案" : "專案清單未就緒"}</option>{projectOptions.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>社員<select name="userId" required defaultValue="" disabled={!memberDirectoryReady}><option value="">{memberDirectoryReady ? "選擇有效社員" : "社員名單未就緒"}</option>{memberDirectory.map(member => <option key={member.id} value={member.id}>{member.name || member.email || member.studentNumber || `社員 #${member.id}`}</option>)}</select></label><label>角色<select name="projectRole" defaultValue="project_member"><option value="project_member">專案生</option><option value="project_lead">專案組長</option><option value="advisor">指導角色</option></select></label><button className="club-primary" disabled={!projectCatalogReady || !memberDirectoryReady || assignProjectMember.isPending}>{assignProjectMember.isPending ? "指派中…" : "儲存指派"}</button></form><div className="assignment-list">{selectedProjectId === null ? <p>選擇專案後顯示目前指派成員。</p> : assignments.isError ? <p className="form-error">無法取得專案成員：{assignments.error.message}</p> : assignments.isLoading ? <p>讀取成員中…</p> : assignments.data?.length ? assignments.data.map(row => <div key={row.assignment.id}><strong>{row.user.name || row.user.email || `社員 #${row.user.id}`}</strong><span>{row.assignment.projectRole} · {row.assignment.status}</span></div>) : <p>此專案尚未指派成員。</p>}</div></section></> : null}
      {canResource ? <form className="manage-form" onSubmit={submitResource}><header><UploadCloud /><div><h2>上傳資源</h2><p>檔案存入受管理儲存空間；單檔上限 10MB；專案資源需綁定專案。</p></div></header><label>資源名稱<input name="title" required maxLength={200} /></label><label>描述<textarea name="description" rows={3} maxLength={5000} /></label><label>範圍<select name="visibility" defaultValue="member"><option value="member">社員</option><option value="public">公開</option><option value="project">專案</option><option value="officer">幹部</option></select></label><label>指定專案（僅專案範圍必填）<select name="projectId" defaultValue="" disabled={!projectCatalogReady}><option value="">{projectCatalogReady ? "選擇專案" : "專案清單未就緒"}</option>{projectOptions.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>{projectCatalogNotice ? <p className="form-error">{projectCatalogNotice}</p> : null}<label>檔案<input type="file" onChange={event => setFile(event.target.files?.[0] ?? null)} required /></label><label className="consent-field"><input type="checkbox" name="confirmPublicConsent" />若選擇「公開」，我確認此檔案已取得公開同意，且不含未授權個資或保密資訊。</label><button className="club-primary" disabled={uploadResource.isPending}>{uploadResource.isPending ? "上傳中…" : "上傳資源"}</button></form> : null}
    </section>
  </main>;
}
