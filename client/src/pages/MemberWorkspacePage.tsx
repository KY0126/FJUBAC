import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

/**
 * 舊工作區網址保留為可分享的相容入口。
 * 實際資源、專案與任務均已整合到個人中心的 #workspace 區塊。
 */
export default function MemberWorkspacePage() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/me#workspace"); }, [setLocation]);
  return <main className="workspace-gate workspace-redirecting"><LoaderCircle aria-hidden="true" /><h1>社員工作區已整合至個人中心</h1><p>正在前往你的資源、專案與任務區塊。</p><Link href="/me#workspace" className="club-primary">前往個人中心</Link></main>;
}
