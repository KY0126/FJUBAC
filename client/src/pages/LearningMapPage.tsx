import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BriefcaseBusiness, Building2, Coffee, GraduationCap, LockKeyhole } from "lucide-react";
import { useState } from "react";
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
  const [category, setCategory] = useState<(typeof categories)[number]["key"]>("club_activities");
  const query = trpc.workspace.projectWork.learningCareerMap.list.useQuery({ category }, { enabled: isAuthenticated, refetchInterval: 15_000, refetchIntervalInBackground: false });
  if (loading) return <main className="container py-20">正在確認帳號權限…</main>;
  if (!isAuthenticated) return <main className="container py-20"><Card className="mx-auto max-w-2xl border-amber-200 bg-amber-50"><CardHeader><CardTitle className="flex items-center gap-3 text-amber-900"><LockKeyhole />請先登入社員帳號</CardTitle><CardDescription className="text-amber-900/80">「學習與職涯地圖」僅開放給有效專案生與具授權的相關幹部。</CardDescription></CardHeader><CardContent><button className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white" onClick={() => startLogin()}>前往登入</button></CardContent></Card></main>;
  if (query.isError) return <AccessNotice />;
  const selected = categories.find(item => item.key === category)!; const Icon = selected.icon;
  return <main className="container py-12 sm:py-16"><section className="max-w-3xl"><p className="text-sm font-semibold tracking-[.18em] text-blue-700">LEARNING & CAREER MAP</p><h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-5xl">學習與職涯地圖</h1><p className="mt-5 text-base leading-8 text-slate-700">依四大培育範疇整理的受權限保護資源。頁面只會顯示您依資源可見範圍與有效專案身分可讀取的真實內容。</p></section><Tabs value={category} onValueChange={value => setCategory(value as typeof category)} className="mt-9"><TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">{categories.map(item => <TabsTrigger key={item.key} value={item.key} className="data-[state=active]:bg-blue-800 data-[state=active]:text-white">{item.title}</TabsTrigger>)}</TabsList></Tabs><Card className="mt-6 border-blue-100"><CardHeader><div className="flex gap-3"><Icon className="mt-1 h-6 w-6 text-blue-700" /><div><CardTitle>{selected.title}</CardTitle><CardDescription className="mt-1">{selected.description}</CardDescription></div></div></CardHeader><CardContent>{query.isLoading ? <p className="text-slate-700">正在載入資源…</p> : (query.data?.length ?? 0) === 0 ? <p className="rounded-lg bg-slate-50 p-7 leading-7 text-slate-700">此分類目前沒有可依您的授權範圍顯示的正式資源。系統不會建立或展示虛構題庫、企業紀錄、照片、心得、影音或職涯資料。</p> : <div className="grid gap-4 md:grid-cols-2">{query.data?.map(({ mapping, resource }) => <article key={mapping.id} className="rounded-lg border border-slate-200 p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold text-slate-950">{resource.title}</h2><Badge variant="secondary">{resource.visibility}</Badge></div><p className="mt-3 text-sm leading-6 text-slate-700">{resource.description || "尚未提供說明。"}</p><p className="mt-4 text-xs text-slate-600">檔案：{resource.fileName}</p></article>)}</div>}</CardContent></Card></main>;
}
