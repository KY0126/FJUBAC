import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function PublicSiteHeader({ section }: { section: string }) {
  return (
    <header className="site-subheader">
      <Link href="/" className="club-wordmark" aria-label="FJUBAC 首頁">
        <img className="club-emblem" src="/manus-storage/fjubac-emblem-reference_4b3d690c.png" alt="" />
        <span><strong>FJUBAC</strong><small>FJU BUSINESS ANALYTICS CLUB</small></span>
      </Link>
      <nav aria-label="公開服務導覽">
        <Link href="/announcements">公告</Link>
        <Link href="/events">活動</Link>
        <Link href="/links">資源</Link>
        <Link href="/departments">部門</Link>
        <Link href="/research">公開研究</Link>
        <Link href="/account">社員登入</Link>
      </nav>
      <div className="site-subheader-actions"><span>{section}</span><Link href="/apply">加入 FJUBAC <ArrowRight size={14} /></Link></div>
    </header>
  );
}
