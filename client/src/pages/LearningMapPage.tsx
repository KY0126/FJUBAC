import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BriefcaseBusiness, Building2, Coffee, FileText, GraduationCap, Heart, LockKeyhole, Search, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { startLogin } from "../const";
import { AccessNotice } from "./ProjectListPage";

const categories = [
  { key: "club_activities", title: "社團核心活動", icon: Coffee },
  { key: "workshops", title: "專業工作坊", icon: GraduationCap },
  { key: "corporate_visits", title: "企業參訪", icon: Building2 },
  { key: "career_preparation", title: "職場預備課", icon: BriefcaseBusiness },
] as const;

const schoolYearFor = (date: Date | string) => { const value = new Date(date); const year = value.getFullYear(); return String((value.getMonth() >= 8 ? year : year - 1) - 1911); };
const semesterFor = (date: Date | string) => { const month = new Date(date).getMonth(); return month >= 8 || month <= 0 ? "第一學期" : "第二學期"; };
const visibilityLabel = (visibility: "public" | "member" | "project" | "officer") => visibility === "project" ? "專案限定" : visibility === "officer" ? "幹部限定" : visibility === "member" ? "社員資源" : "已公開資源";

export default function LearningMapPage() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [keyword, setKeyword] = useState("");
  const [selectedYear, setSelectedYear] = useState("全部");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const query = trpc.workspace.projectWork.learningCareerMap.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15_000, refetchIntervalInBackground: false });
  const favorites = trpc.personal.favoriteIds.useQuery(undefined, { enabled: isAuthenticated });
  const setFavorite = trpc.personal.setFavorite.useMutation({ onSuccess: (_, input) => { utils.personal.favoriteIds.invalidate(); toast.success(input.isFavorite ? "已加入我的資源收藏。" : "已從我的資源收藏移除。"); }, onError: error => toast.error(error.message) });
  const resources = query.data ?? [];
  const years = useMemo(() => Array.from(new Set(resources.map(row => schoolYearFor(row.resource.createdAt)))).sort((a, b) => Number(b) - Number(a)), [resources]);
  const records = useMemo(() => resources.filter(({ mapping, resource }) => { const haystack = `${resource.title} ${resource.description ?? ""} ${resource.fileName} ${categories.find(item => item.key === mapping.category)?.title ?? ""}`.toLocaleLowerCase(); return (!keyword.trim() || haystack.includes(keyword.trim().toLocaleLowerCase())) && (selectedYear === "全部" || schoolYearFor(resource.createdAt) === selectedYear) && (!selectedSemester || semesterFor(resource.createdAt) === selectedSemester) && (selectedCategory === "全部" || mapping.category === selectedCategory); }), [resources, keyword, selectedYear, selectedSemester, selectedCategory]);
  if (loading) return <main className="container py-20">正在確認帳號權限…</main>;
  if (!isAuthenticated) return <main className="container py-20"><Card className="mx-auto max-w-2xl border-amber-200 bg-amber-50"><CardHeader><CardTitle className="flex items-center gap-3 text-amber-900"><LockKeyhole />請先登入社員帳號</CardTitle><CardDescription className="text-amber-900/80">「社團活動」僅開放給有效專案生與具授權的相關幹部。</CardDescription></CardHeader><CardContent><button className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white" onClick={() => startLogin()}>前往登入</button></CardContent></Card></main>;
  if (query.isError) return <AccessNotice />;
  const favoriteSet = new Set(favorites.data ?? []);
  return <main className="service-shell teaching-records-page"><section className="service-hero teaching-records-hero"><p className="club-section-number">CLUB ACTIVITIES</p><h1>社團活動</h1><p>將您有權讀取的活動資源整理為可搜尋與篩選的閱讀卡片；學年與學期均依既有資源建立時間推導，不會自行補填日期或內容。</p></section><section className="service-content teaching-records-content" aria-label="社團活動"><div className="teaching-filter-panel"><div className="teaching-search"><Search size={18} /><label className="sr-only" htmlFor="activity-search">搜尋社團活動</label><input id="activity-search" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="搜尋活動主題、資源名稱或檔案名稱" /></div><div className="teaching-select-row"><label>學年度<select value={selectedYear} onChange={event => { setSelectedYear(event.target.value); setSelectedSemester(""); }}><option value="全部">全部</option>{years.map(year => <option key={year} value={year}>{year} 學年度</option>)}</select></label><label>學期<select value={selectedSemester} disabled={selectedYear === "全部"} onChange={event => setSelectedSemester(event.target.value)}><option value="">{selectedYear === "全部" ? "請先選擇學年" : "全部學期"}</option><option value="第一學期">第一學期</option><option value="第二學期">第二學期</option></select></label></div><div className="teaching-filter-row"><span><Tags size={15} />類別</span><button type="button" aria-pressed={selectedCategory === "全部"} onClick={() => setSelectedCategory("全部")}>全部</button>{categories.map(category => <button type="button" key={category.key} aria-pressed={selectedCategory === category.key} onClick={() => setSelectedCategory(category.key)}>{category.title}</button>)}</div></div><p className="teaching-result-count">顯示 <strong>{records.length}</strong> / {resources.length} 項可讀取的活動資源</p>{query.isLoading ? <p className="text-slate-700">正在載入活動資源…</p> : records.length ? <div className="teaching-record-grid learning-map-card-grid">{records.map(({ mapping, resource }) => { const category = categories.find(item => item.key === mapping.category)!; const Icon = category.icon; const isFavorite = favoriteSet.has(resource.id); return <article key={mapping.id} className="teaching-record-card"><div className="teaching-card-visual learning-map-card-visual" aria-hidden="true"><Icon size={42} /></div><div className="teaching-card-body"><div className="flex items-start justify-between gap-3"><span className="teaching-year">{schoolYearFor(resource.createdAt)} 學年度 · {semesterFor(resource.createdAt)}</span><button type="button" aria-pressed={isFavorite} className={`learning-card-favorite ${isFavorite ? "is-favorite" : ""}`} onClick={() => setFavorite.mutate({ resourceId: resource.id, isFavorite: !isFavorite })} disabled={setFavorite.isPending}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} />{isFavorite ? "已收藏" : "收藏"}</button></div><span className="teaching-tag">{category.title}</span><h2>{resource.title}</h2><p>{resource.description || "尚未提供說明。"}</p><small className="teaching-year">{visibilityLabel(resource.visibility)} · 檔案：{resource.fileName}{resource.versionLabel ? ` · ${resource.versionLabel}` : ""}</small><Badge variant="secondary" className="sr-only">資源</Badge></div></article>; })}</div> : <div className="service-empty"><Search size={28} /><h2>{resources.length ? "找不到符合條件的活動資源" : "尚無可顯示的正式活動資源"}</h2><p>{resources.length ? "請調整搜尋文字、學年、學期或類別標籤。" : "系統不會建立或展示虛構題庫、企業紀錄、照片、心得、影音或職涯資料。"}</p></div>}</section></main>;
}
