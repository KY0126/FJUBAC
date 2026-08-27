import { ArrowLeft, Download, Eye, FolderKanban, FolderOpen, Heart, LockKeyhole, NotebookTabs, UserRound } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string) { return new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" }); }

export default function MemberWorkspacePage() {
  const { user, isAuthenticated } = useAuth();
  const resources = trpc.workspace.resources.list.useQuery(undefined, { enabled: isAuthenticated });
  const projects = trpc.workspace.projects.mine.useQuery(undefined, { enabled: isAuthenticated });
  const favoriteIds = trpc.personal.favoriteIds.useQuery(undefined, { enabled: isAuthenticated });
  const download = trpc.workspace.resources.download.useMutation({ onSuccess: result => { window.open(result.url, "_blank", "noopener,noreferrer"); }, onError: error => toast.error(error.message || "資源下載未完成，請稍後再試。") });
  const openResource = trpc.workspace.resources.open.useMutation({ onSuccess: result => { window.open(result.url, "_blank", "noopener,noreferrer"); }, onError: error => toast.error(error.message || "資源開啟未完成，請稍後再試。") });
  const setFavorite = trpc.personal.setFavorite.useMutation({ onSuccess: () => void favoriteIds.refetch(), onError: error => toast.error(error.message || "資源收藏未完成，請稍後再試。") });
  if (!isAuthenticated) return <main className="workspace-gate"><LockKeyhole /><h1>社員工作區需要登入</h1><p>核准後的社員可查看四級資源與被指派的專案資料。</p><Link href="/account" className="club-primary">社員登入</Link></main>;
  const projectContent = projects.isLoading ? <div className="workspace-empty">正在讀取專案資料…</div>
    : projects.isError ? <div className="workspace-empty"><FolderOpen /><h3>暫時無法載入專案。</h3><p>{projects.error.message}</p><button className="club-primary" onClick={() => projects.refetch()}>重新載入</button></div>
      : projects.data?.length ? <div className="project-grid">{projects.data.map(item => <article className="project-card" key={item.assignment.id}><FolderKanban /><p className="club-section-number">{item.assignment.projectRole.replaceAll("_", " ")}</p><h3>{item.project.title}</h3><p>{item.project.description || "專案說明尚未補充。"}</p><footer><span>{item.project.status}</span><time>{item.project.updatedAt ? `更新於 ${formatDate(item.project.updatedAt)}` : ""}</time></footer></article>)}</div>
        : <div className="workspace-empty"><FolderOpen /><h3>目前沒有有效專案指派。</h3><p>成為專案生後，專案開發部會在此提供專案公告與資源。</p></div>;
  const resourceContent = resources.isLoading ? <div className="workspace-empty">正在整理被授權資源…</div>
    : resources.isError ? <div className="workspace-empty"><NotebookTabs /><h3>暫時無法載入資源。</h3><p>{resources.error.message}</p><button className="club-primary" onClick={() => resources.refetch()}>重新載入</button></div>
    : resources.data?.length ? <div className="resource-list">{resources.data.map(resource => { const isFavorite = favoriteIds.data?.includes(resource.id) ?? false; return <article className="resource-item" key={resource.id}><NotebookTabs /><div><span className="status-chip">{resource.visibility.toUpperCase()}</span><h3>{resource.title}</h3><p>{resource.description || "尚無描述"}</p><small>{resource.fileName}{resource.versionLabel ? ` · ${resource.versionLabel}` : ""}</small></div><div className="resource-item-actions"><button aria-label={isFavorite ? `取消收藏 ${resource.title}` : `收藏 ${resource.title}`} className={isFavorite ? "is-favorite" : ""} onClick={() => setFavorite.mutate({ resourceId: resource.id, isFavorite: !isFavorite })} disabled={setFavorite.isPending}><Heart size={17} /></button><button aria-label={`開啟 ${resource.title}`} onClick={() => openResource.mutate({ resourceId: resource.id })} disabled={openResource.isPending}><Eye size={17} /></button><button aria-label={`下載 ${resource.title}`} onClick={() => download.mutate({ resourceId: resource.id })} disabled={download.isPending}><Download size={17} /></button></div></article>; })}</div>
        : <div className="workspace-empty"><NotebookTabs /><h3>目前沒有可存取的資源。</h3><p>資源會由對應部門依公開、社員、專案或幹部範圍發布。</p></div>;
  return <main className="workspace-shell"><header className="workspace-header"><Link href="/" className="back-link"><ArrowLeft size={16} />返回 FJUBAC</Link><div><Link href="/me" className="workspace-profile-link"><UserRound size={17} /><span>{user?.name || "社員"}</span></Link></div></header><section className="workspace-hero"><p className="club-section-number">MEMBER DESK</p><h1>我的學習與實作</h1><p>依你的社員、專案生與幹部指派顯示資源與專案。所有範圍皆於後端重新驗證。</p></section><section className="workspace-content"><div className="workspace-section-head"><div><p className="club-section-number">01 / ASSIGNMENTS</p><h2>我的專案</h2></div><span>{projects.data?.length ?? 0} 個有效指派</span></div>{projectContent}<div className="workspace-section-head resource-heading"><div><p className="club-section-number">02 / KNOWLEDGE BASE</p><h2>我的資源</h2></div><span>公開／社員／專案／幹部</span></div>{resourceContent}</section></main>;
}
