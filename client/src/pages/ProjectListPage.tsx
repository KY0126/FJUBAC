import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, FolderKanban, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "../const";

export default function ProjectListPage() {
  const { isAuthenticated, loading } = useAuth();
  const query = trpc.workspace.projectWork.workflow.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15_000, refetchIntervalInBackground: false });
  if (loading) return <main className="container py-20">正在確認帳號權限…</main>;
  if (!isAuthenticated) return <AccessNotice login />;
  if (query.isError) return <AccessNotice />;
  const projects = query.data?.projects ?? [];
  return <main className="container py-12 sm:py-16">
    <section className="max-w-3xl">
      <p className="text-sm font-semibold tracking-[.18em] text-blue-700">FJUBAC PROJECTS</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">專案流程工作區</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">僅顯示您目前獲指派的專案；具專案管理權限的專案開發部幹部可檢視其管理範圍。流程狀態每 15 秒同步一次。</p>
    </section>
    {query.isLoading ? <p className="mt-12 text-slate-600">正在載入授權專案…</p> : projects.length === 0 ? <Card className="mt-10 border-blue-100 bg-white"><CardContent className="py-10 text-slate-700">目前沒有可顯示的有效專案指派。此頁不會建立示範專案或文件。</CardContent></Card> : <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map(({ project, currentStage }, index) => {
        const stage = query.data?.stages.find(item => item.key === currentStage);
        return <Card key={project.id} className="group border-blue-100 bg-white transition-shadow hover:shadow-lg">
          <CardHeader><div className="flex items-start justify-between gap-3"><FolderKanban className="mt-1 h-5 w-5 text-blue-700" /><Badge variant="secondary">第 {index + 1} 個流程階段</Badge></div><CardTitle className="mt-5 text-xl text-slate-950">{project.title}</CardTitle><CardDescription className="line-clamp-3 leading-6">{project.description || "尚未提供公開說明。"}</CardDescription></CardHeader>
          <CardContent><p className="text-sm font-semibold text-blue-800">目前：{stage?.title ?? "管顧方法論與問題定義"}</p><Link href={`/projects/${project.id}`} className="mt-5 flex items-center justify-between rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">查看流程詳情 <ArrowRight className="h-4 w-4" /></Link></CardContent>
        </Card>;
      })}
    </section>}
  </main>;
}

export function AccessNotice({ login = false }: { login?: boolean }) {
  return <main className="container py-20"><Card className="mx-auto max-w-2xl border-amber-200 bg-amber-50"><CardHeader><div className="flex items-center gap-3 text-amber-900"><LockKeyhole className="h-6 w-6" /><CardTitle>{login ? "請先登入社員帳號" : "403：您目前沒有此頁面的存取權"}</CardTitle></div><CardDescription className="text-amber-900/80">此內容僅對有效專案生及具專案管理權限的相關幹部開放。訪客、一般社員與未獲指派的使用者不會取得專案資料。</CardDescription></CardHeader><CardContent>{login ? <Button onClick={() => startLogin()}>前往登入</Button> : <Link href="/me" className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-4 py-2 font-semibold text-white"><AlertTriangle className="h-4 w-4" />返回個人中心</Link>}</CardContent></Card></main>;
}
