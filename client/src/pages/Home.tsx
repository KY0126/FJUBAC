import { ArrowRight, BookOpen, ChevronRight, Compass, Layers3, Sparkles } from "lucide-react";
import { Link } from "wouter";

const departments = [
  { number: "01", name: "人才發展部", en: "Talent Acquisition & Engagement", text: "規劃校內外招生、書審、面試與社員參與。", tone: "coral" },
  { number: "02", name: "專案開發部", en: "Project Development & Management", text: "把學習轉成專案實作，支持專案生協作與成果累積。", tone: "ink" },
  { number: "03", name: "對外發展部", en: "External Affairs", text: "串聯合作、對外活動與更多可接近的職涯窗口。", tone: "moss" },
  { number: "04", name: "學術營運部", en: "Academic Operations", text: "經營社課、教材、學術活動與持續成長的知識資源。", tone: "blue" },
  { number: "05", name: "行銷策略部", en: "Marketing Strategy", text: "把社團故事、公開內容與活動資訊帶到更多人眼前。", tone: "sand" },
] as const;

export default function Home() {
  return (
    <div className="club-home">
      <header className="club-header">
        <Link href="/" className="club-wordmark" aria-label="FJUBAC 首頁">
          <span className="club-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>FJUBAC</strong><small>FJU BUSINESS ANALYTICS CLUB</small></span>
        </Link>
        <nav aria-label="主要導覽" className="club-nav">
          <a href="#about">社團定位</a>
          <Link href="/announcements">公告資訊</Link>
          <Link href="/events">活動參與</Link>
          <a href="#departments">五個部門</a>
          <a href="#pathway">加入路徑</a>
          <Link href="/research">公開研究檔案</Link>
          <Link href="/account">社員登入</Link>
        </nav>
        <Link href="/apply" className="club-nav-cta">探索招生 <ArrowRight size={15} /></Link>
      </header>

      <main>
        <section className="club-hero" aria-labelledby="club-hero-title">
          <div className="club-hero-grid" aria-hidden="true" />
          <div className="club-hero-copy">
            <p className="club-kicker"><span />FJU BUSINESS ANALYTICS CLUB · ESTABLISHED FOR PRACTICE</p>
            <h1 id="club-hero-title">從理解問題，<br /><em>開始做出改變。</em></h1>
            <p className="club-hero-lede">FJUBAC 以商業分析、管理顧問方法與專案實作為共同語言，陪伴成員在學習、協作與職涯探索之間，建立自己的下一步。</p>
            <div className="club-hero-actions">
              <Link href="/apply" className="club-primary">探索招生頁 <ArrowRight size={17} /></Link>
              <Link href="/research" className="club-secondary">閱讀公開內容研究 <BookOpen size={16} /></Link>
              <Link href="/workspace" className="club-secondary">社員工作區 <ChevronRight size={16} /></Link>
            </div>
          </div>
          <aside className="club-hero-index" aria-label="社團核心路徑">
            <p>FIELD NOTE / 01</p>
            <div><span>01</span><strong>學習方法</strong><small>從問題拆解到分析框架</small></div>
            <div><span>02</span><strong>參與專案</strong><small>把理解化為可交付的實作</small></div>
            <div><span>03</span><strong>連結職涯</strong><small>接近校友、講師與產業現場</small></div>
          </aside>
          <div className="club-hero-caption"><span>ANALYZE · BUILD · CONNECT</span><span>輔仁大學商業分析社</span></div>
        </section>

        <section id="about" className="club-intro section-club">
          <div className="club-section-number">01 / WHY FJUBAC</div>
          <div className="club-intro-layout">
            <h2>不是只讀懂資料，<br />而是<strong>讀懂決策。</strong></h2>
            <div>
              <p>社團的公開內容持續圍繞量化分析、效益評估、個案面試、企業參訪與 Coffee Chat。這些內容指向一條明確路徑：先建立方法，再走進專案與真實職涯情境。</p>
              <p className="club-note"><Compass size={17} />從公開索引到網站服務，我們把資訊整理成每位成員都能查閱、參與與延續的共同基礎。</p>
            </div>
          </div>
          <div className="club-principles">
            <article><span>01</span><h3>分析有方法</h3><p>用可學習、可重複的框架拆解商業問題。</p></article>
            <article><span>02</span><h3>實作有脈絡</h3><p>從社課、專案到交付物，讓每一次參與可被累積。</p></article>
            <article><span>03</span><h3>連結有方向</h3><p>從校園出發，接近產業、校友與職涯對話。</p></article>
          </div>
        </section>

        <section id="departments" className="club-departments section-club" aria-labelledby="departments-title">
          <div className="club-section-header"><div><p className="club-section-number">02 / ORGANIZATION</p><h2 id="departments-title">五個部門，<br /><em>一個共同方向。</em></h2></div><p>每個部門有清楚的資料範圍與工作責任；網站也會依此建立對應的管理權限與交接方式。</p></div>
          <div className="club-department-list">
            {departments.map(department => (
              <article className={`club-department ${department.tone}`} key={department.number}>
                <span className="department-number">{department.number}</span>
                <div><h3>{department.name}</h3><small>{department.en}</small></div>
                <p>{department.text}</p>
                <ChevronRight aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section id="pathway" className="club-pathway section-club">
          <div className="club-pathway-panel">
            <div className="pathway-content"><p className="club-section-number">03 / JOINING PATH</p><h2>從一份申請，<br />走進下一個實作現場。</h2><p>未來招生頁將分別呈現校內與校外梯次、書審、面試與結果通知。會員核准後，才可使用學號或 Email 搭配一次性認證碼啟用帳號。</p><div className="pathway-step-row"><span>01 申請</span><span>02 書審</span><span>03 面試</span><span>04 啟用</span></div></div>
            <div className="pathway-card"><Layers3 size={26} /><strong>招生與會員服務</strong><p>招生流程與帳號認證正依定版規格開發中。系統完成後，校內與校外申請者都可從此進入對應的申請路徑。</p><span>ITERATION 1 · IN BUILD</span></div>
          </div>
        </section>

        <section className="club-research-callout section-club">
          <Sparkles size={22} aria-hidden="true" />
          <div><p className="club-section-number">PUBLIC ARCHIVE</p><h2>先從公開內容，理解 FJUBAC 的脈絡。</h2><p>已完成的公開內容研究報告包含可驗證索引、主題分布、Reels 與精選名稱範圍說明。</p></div>
          <Link href="/research" className="club-dark-link">開啟公開研究檔案 <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="club-footer"><div className="club-wordmark"><span className="club-mark" aria-hidden="true"><i /><i /><i /></span><span><strong>FJUBAC</strong><small>FJU BUSINESS ANALYTICS CLUB</small></span></div><p>建立一個可學習、可協作、可交接的社團數位基礎。</p><span>© FJUBAC · WEBSITE FOUNDATION</span></footer>
    </div>
  );
}
