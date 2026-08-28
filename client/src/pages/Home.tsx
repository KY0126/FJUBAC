import { ArrowRight, BookOpenText, CalendarDays, ChevronRight, FileText, Layers3, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SiteOnboardingOverlay, SiteTourTrigger } from "@/components/SiteOnboardingOverlay";
import { ONBOARDING_STORAGE_KEY, shouldShowOnboarding } from "@/lib/onboarding";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { StackedDepartmentCards } from "@/components/StackedDepartmentCards";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "即將發布";
  return new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" });
}

export default function Home() {
  const announcements = trpc.content.announcements.publicList.useQuery();
  const latestAnnouncements = announcements.data?.slice(0, 2) ?? [];
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    try {
      setIsOnboardingOpen(shouldShowOnboarding(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)));
    } catch {
      setIsOnboardingOpen(true);
    }
  }, []);

  const closeOnboarding = () => {
    setIsOnboardingOpen(false);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    } catch {}
  };

  return (
    <div className="site-home">
      <SiteOnboardingOverlay open={isOnboardingOpen} onClose={closeOnboarding} />
      <PublicSiteHeader section="首頁" />

      <main>
        <section className="site-hero" aria-labelledby="home-title">
          <div className="site-hero-grid" aria-hidden="true" />
          <div className="site-hero-content">
            <p className="site-eyebrow">輔仁大學商業分析社 · FJU BUSINESS ANALYTICS CLUB</p>
            <h1 id="home-title">把分析能力，<br /><em>帶進真實問題。</em></h1>
            <p className="site-hero-lede">FJUBAC 以商業分析、管理思維與專案實作為核心，讓成員在學習、協作與職涯探索之間，建立可以持續累積的能力與作品。</p>
            <div className="site-hero-actions">
              <Link href="/apply" className="site-button primary">了解招生與申請 <ArrowRight size={17} /></Link>
              <a href="#updates" className="site-button text">查看最新資訊 <ChevronRight size={16} /></a>
              <SiteTourTrigger onOpen={() => setIsOnboardingOpen(true)} />
            </div>
          </div>
          <aside className="site-quick-links" aria-label="快速導覽">
            <p>快速導覽</p>
            <Link href="/announcements"><FileText size={17} /><span><strong>公告與資訊</strong><small>招生、社團與對外訊息</small></span><ChevronRight size={16} /></Link>
            <Link href="/learning"><BookOpenText size={17} /><span><strong>社團活動</strong><small>登入後瀏覽授權活動資源</small></span><ChevronRight size={16} /></Link>
            <Link href="/account"><UsersRound size={17} /><span><strong>社員服務</strong><small>登入工作區、查看資源與專案</small></span><ChevronRight size={16} /></Link>
          </aside>
        </section>

        <section className="site-value-strip" aria-label="社團特色">
          <article><span>01</span><div><strong>方法化學習</strong><p>用框架拆解商業問題，建立可重複使用的分析基礎。</p></div></article>
          <article><span>02</span><div><strong>專案化實作</strong><p>把課堂理解轉化為協作、交付與持續累積的成果。</p></div></article>
          <article><span>03</span><div><strong>職涯化連結</strong><p>透過交流與對外活動，讓學習更接近真實產業情境。</p></div></article>
        </section>

        <section id="updates" className="site-section site-updates" aria-labelledby="updates-title">
          <header className="site-section-heading"><div><p className="site-eyebrow">LATEST INFORMATION</p><h2 id="updates-title">最新資訊</h2></div><p>招生、公開公告與活動資訊會由授權單位持續更新。</p></header>
          <div className="site-update-grid">
            <article className="site-feed-card"><header><div><FileText size={19} /><span>公告</span></div><Link href="/announcements">查看全部 <ArrowRight size={14} /></Link></header>
              {announcements.isLoading ? <p className="site-feed-status">正在整理最新公告…</p> : latestAnnouncements.length ? <div className="site-feed-list">{latestAnnouncements.map(item => <div key={item.id}><time>{formatDate(item.publishedAt)}</time><strong>{item.title}</strong><p>{item.excerpt || item.content.slice(0, 82)}</p></div>)}</div> : <div className="site-empty-feed"><strong>目前沒有公開公告</strong><p>最新招生、活動與對外訊息將在發布後顯示於此。</p></div>}</article>
            <article className="site-feed-card"><header><div><BookOpenText size={19} /><span>社團活動</span></div><Link href="/learning">前往瀏覽 <ArrowRight size={14} /></Link></header><div className="site-empty-feed"><strong>授權活動資源</strong><p>有效專案生與相關幹部登入後，可依類別、學年與日期搜尋可讀資源。</p></div></article>
          </div>
        </section>

        <section id="about" className="site-section site-about" aria-labelledby="about-title">
          <div className="site-about-copy"><p className="site-eyebrow">ABOUT FJUBAC</p><h2 id="about-title">從理解資料，<br />到理解<strong>決策與人。</strong></h2></div>
          <div className="site-about-body"><p>我們相信分析並不只是工具，而是一種看待問題、溝通觀點與推動行動的方法。社團從分析框架出發，串起社課、專案、交流與職涯探索。</p><div className="site-link-row"><Link href="/research"><BookOpenText size={17} />閱讀公開內容研究</Link><Link href="/me#workspace"><Layers3 size={17} />前往個人中心工作區</Link></div></div>
        </section>

        <section id="departments" className="site-section site-departments" aria-labelledby="departments-title">
          <header className="site-section-heading"><div><p className="site-eyebrow">ORGANIZATION</p><h2 id="departments-title">五個部門，一個共同目標</h2></div><p>每個部門都有清楚的工作責任與管理範圍，讓參與、合作與交接都有可依循的方式。</p></header>
          <StackedDepartmentCards />
        </section>

        <section id="join" className="site-join" aria-labelledby="join-title"><div><p className="site-eyebrow">JOIN FJUBAC</p><h2 id="join-title">準備好把學習，<br />帶進下一個現場了嗎？</h2><p>校內與校外申請者皆可依各自招生梯次提出申請；流程包含申請、書審、面試與帳號啟用。</p></div><div className="site-join-actions"><Link href="/apply" className="site-button light">查看招生資訊 <ArrowRight size={17} /></Link><Link href="/account" className="site-button outline-light">社員登入</Link></div></section>

        <section className="site-archive-note"><BookOpenText size={22} /><div><strong>公開內容研究檔案</strong><p>想先了解 FJUBAC 的公開內容脈絡、主題與索引，可前往獨立研究頁瀏覽。</p></div><Link href="/research">開啟研究檔案 <ArrowRight size={15} /></Link></section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
