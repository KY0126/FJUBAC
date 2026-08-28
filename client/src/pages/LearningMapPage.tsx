import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BriefcaseBusiness, Building2, Coffee, FileText, GraduationCap, Heart, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { startLogin } from "../const";
import { AccessNotice } from "./ProjectListPage";

const categories = [
  { key: "club_activities", title: "社團核心活動", description: "Coffee Chat、Case Interview 實戰演練與題庫。", icon: Coffee },
  { key: "workshops", title: "專業工作坊", description: "數據分析、Excel／PPT 實戰、簡報邏輯等講義與影音紀錄。", icon: GraduationCap },
  { key: "corporate_visits", title: "企業參訪", description: "獲授權的企業參訪經驗、照片與心得回顧。", icon: Building2 },
  { key: "career_preparation", title: "職場預備課", description: "實習、履歷、面試與學長姐職涯路徑資源。", icon: BriefcaseBusiness },
] as const;

export default function LearningMapPage() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<(typeof categories)[number]["key"]>("club_activities");
  const query = trpc.workspace.projectWork.learningCareerMap.list.useQuery({ category }, { enabled: isAuthenticated, refetchInterval: 15_000, refetchIntervalInBackground: false });
  const favorites = trpc.personal.favoriteIds.useQuery(undefined, { enabled: isAuthenticated });
  const setFavorite = trpc.personal.setFavorite.useMutation({ onSuccess: (_, input) => { utils.personal.favoriteIds.invalidate(); toast.success(input.isFavorite ? "已加入我的資源收藏。" : "已從我的資源收藏移除。"); }, onError: error => toast.error(error.message) });
  if (loading) return <main className="container py-20">正在確認帳號權限…</main>;
  if (!isAuthenticated) return <main className="container py-20"><Card className="mx-auto max-w-2xl border-amber-200 bg-amber-50"><CardHeader><CardTitle className="flex items-center gap-3 text-amber-900"><LockKeyhole />請先登入社員帳號</CardTitle><CardDescription className="text-amber-900/80">「學習與職涯地圖」僅開放給有效專案生與具授權的相關幹部。</CardDescription></CardHeader><CardContent><button className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white" onClick={() => startLogin()}>前往登入</button></CardContent></Card></main>;
  if (query.isError) return <AccessNotice />;
  const selected = categories.find(item => item.key === category)!; const Icon = selected.icon; const favoriteSet = new Set(favorites.data ?? []);
  return <main className="service-shell teaching-records-page"><section className="service-hero teaching-records-hero"><p className="club-section-number">LEARNING & CAREER MAP</p><h1>學習與職涯地圖</h1><p>依四大培育範疇整理的受權限保護資源。頁面只會顯示您依資源可見範圍與有效專案身分可讀取的真實內容。</p></section><section className="service-content teaching-records-content" aria-label="學習與職涯地圖"><div className="teaching-filter-panel"><Tabs value={category} onValueChange={value => setCategory(value as typeof category)}><TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">{categories.map(item => <TabsTrigger key={item.key} value={item.key} className="data-[state=active]:bg-blue-800 data-[state=active]:text-white">{item.title}</TabsTrigger>)}</TabsList></Tabs></div><header className="mt-7 mb-5 flex gap-3"><Icon className="mt-1 h-6 w-6 text-blue-700" /><div><h2 className="text-2xl font-bold text-slate-950">{selected.title}</h2><p className="mt-1 text-slate-700">{selected.description}</p></div></header>{query.isLoading ? <p className="text-slate-700">正在載入資源…</p> : (query.data?.length ?? 0) === 0 ? <div className="service-empty"><FileText size={28} /><h2>此分類尚無可顯示的正式資源</h2><p>系統不會建立或展示虛構題庫、企業紀錄、照片、心得、影音或職涯資料。</p></div> : <div className="teaching-record-grid learning-map-card-grid">{query.data?.map(({ mapping, resource }) => { const isFavorite = favoriteSet.has(resource.id); return <article key={mapping.id} className="teaching-record-card"><div className="teaching-card-visual learning-map-card-visual" aria-hidden="true"><FileText size={42} /></div><div className="teaching-card-body"><div className="flex items-start justify-between gap-3"><span className="teaching-year">{selected.title}</span><button type="button" aria-pressed={isFavorite} className={`learning-card-favorite ${isFavorite ? "is-favorite" : ""}`} onClick={() => setFavorite.mutate({ resourceId: resource.id, isFavorite: !isFavorite })} disabled={setFavorite.isPending}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} />{isFavorite ? "已收藏" : "收藏"}</button></div><span className="teaching-tag">{resource.visibility === "project" ? "專案限定" : resource.visibility === "officer" ? "幹部限定" : resource.visibility === "member" ? "社員資源" : "已公開資源"}</span><h3>{resource.title}</h3><p>{resource.description || "尚未提供說明。"}</p><small className="teaching-year">檔案：{resource.fileName}{resource.versionLabel ? ` · ${resource.versionLabel}` : ""}</small><Badge variant="secondary" className="sr-only">資源</Badge></div></article>; })}</div>}</section></main>;
}
