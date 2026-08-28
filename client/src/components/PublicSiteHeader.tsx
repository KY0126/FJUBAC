import { ArrowRight, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { type ReactNode, useContext, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { SiteChromeContext } from "@/components/SiteChromeContext";

export function PublicSiteHeader({ section, utilityAction, global = false }: { section: string; utilityAction?: ReactNode; global?: boolean }) {
  const { isAuthenticated, logout } = useAuth();
  const hasGlobalChrome = useContext(SiteChromeContext);
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isCurrent = (...paths: string[]) => paths.includes(location);
  const linkClass = (...paths: string[]) => `public-nav-link${isCurrent(...paths) ? " is-current" : ""}`;
  const closeMenu = () => setIsMenuOpen(false);
  const handleLogout = () => { void logout().catch(() => undefined); };

  if (hasGlobalChrome && !global) return null;

  return <header className="site-subheader">
    <Link href="/" className="club-wordmark" aria-label="FJUBAC 首頁">
      <img className="club-emblem" src="/manus-storage/fjubac-emblem-reference_4b3d690c.png" alt="" />
      <span><strong>FJUBAC</strong><small>FJU BUSINESS ANALYTICS CLUB</small></span>
    </Link>
    <button className="public-nav-toggle" type="button" aria-label={isMenuOpen ? "關閉導覽選單" : "開啟導覽選單"} aria-expanded={isMenuOpen} aria-controls="public-navigation" onClick={() => setIsMenuOpen(open => !open)}>{isMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    <nav id="public-navigation" className={`public-nav${isMenuOpen ? " is-open" : ""}`} aria-label="網站主導覽">
      <div className="public-nav-cluster public-nav-cluster-public">
        <span className="public-nav-cluster-label">公開資訊</span>
        <Link href="/announcements" onClick={closeMenu} className={linkClass("/announcements")} aria-current={isCurrent("/announcements") ? "page" : undefined}>最新資訊</Link>
        <Link href="/departments" onClick={closeMenu} className={linkClass("/departments")} aria-current={isCurrent("/departments") ? "page" : undefined}>社團介紹</Link>
        <details className="public-nav-dropdown">
          <summary className={linkClass("/learning", "/outcomes", "/research")} aria-current={isCurrent("/learning", "/outcomes", "/research") ? "page" : undefined}>探索 FJUBAC <ChevronDown size={14} /></summary>
          <div className="public-nav-dropdown-menu">
            <Link href="/learning" onClick={closeMenu} className={linkClass("/learning")} aria-current={isCurrent("/learning") ? "page" : undefined}>社團活動</Link>
            <Link href="/research" onClick={closeMenu} className={linkClass("/research")} aria-current={isCurrent("/research") ? "page" : undefined}>社課教學紀錄</Link>
            <Link href="/outcomes" onClick={closeMenu} className={linkClass("/outcomes")} aria-current={isCurrent("/outcomes") ? "page" : undefined}>公開專案成果</Link>
          </div>
        </details>
      </div>
      <div className="public-nav-cluster public-nav-cluster-member">
        <span className="public-nav-cluster-label">社員服務</span>
        <Link href={isAuthenticated ? "/me" : "/account"} onClick={closeMenu} className={linkClass(isAuthenticated ? "/me" : "/account")} aria-current={isCurrent(isAuthenticated ? "/me" : "/account") ? "page" : undefined}>{isAuthenticated ? "個人中心" : "社員登入"}</Link>
      </div>
    </nav>
    <div className="site-subheader-actions"><span className="site-current-section">{section}</span>{utilityAction}{isAuthenticated ? <button type="button" className="public-header-logout" onClick={handleLogout}><LogOut size={14} />登出</button> : null}<Link href="/apply" aria-current={isCurrent("/apply") ? "page" : undefined}>我要申請 <ArrowRight size={14} /></Link></div>
  </header>;
}
