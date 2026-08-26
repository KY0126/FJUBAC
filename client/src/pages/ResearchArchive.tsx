/**
 * Design system — 校園檔案室：新瑞士平面設計 × 學術檔案美學。
 * 原則：證據優先、編年與主題並行、朱砂紅校對線、側欄索引與不對稱內容帶。
 */
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Link as LinkIcon,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { reportData } from "@/data/researchData";

const ARCHIVE_RED = "#C9472E";
const colors: Record<string, string> = {
  "技能與方法知識": "#365B67",
  "活動與職涯連結": "#638456",
  "社群招募與定位": ARCHIVE_RED,
  "貼文": "#243037",
  "Reels": ARCHIVE_RED,
};

const themeChartConfig = {
  count: { label: "核對內容數", color: "#365B67" },
} satisfies ChartConfig;

const yearChartConfig = {
  count: { label: "核對內容數", color: ARCHIVE_RED },
} satisfies ChartConfig;

const contentTypes = ["全部", "貼文", "Reels"];
const contentThemes = ["全部", ...reportData.themeTotals.map((entry) => entry.name)];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function ResearchArchive() {

  const [selectedType, setSelectedType] = useState("全部");
  const [selectedTheme, setSelectedTheme] = useState("全部");
  const [copied, setCopied] = useState(false);

  const filteredItems = useMemo(
    () =>
      reportData.items.filter(
        (item) =>
          (selectedType === "全部" || item.type === selectedType) &&
          (selectedTheme === "全部" || item.theme === selectedTheme),
      ),
    [selectedTheme, selectedType],
  );

  const shareReport = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.print();
    }
  };

  return (
    <div className="archive-shell">
      <aside className="archive-sidebar" aria-label="研究報告導覽">
        <a className="archive-brand" href="#overview" aria-label="前往報告開頭">
          <img
            src="/manus-storage/fjubac-archive-mark_d244c157.png"
            alt="抽象檔案索引卡標誌"
          />
          <span>
            <small>公開內容研究</small>
            <strong>社群檔案室</strong>
          </span>
        </a>

        <nav className="archive-nav" aria-label="章節">
          {[
            ["01", "研究摘要", "#overview"],
            ["02", "內容結構", "#patterns"],
            ["03", "公開索引", "#index"],
            ["04", "研究方法", "#method"],
          ].map(([number, label, href]) => (
            <a key={href} href={href}>
              <span>{number}</span>
              {label}
              <ChevronRight size={15} aria-hidden="true" />
            </a>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">檔案狀態</span>
          <strong>公開可核對</strong>
          <p>研究日期：2026.08.26<br />非管理者、未登入視角</p>
        </div>
      </aside>

      <main>
        <section id="overview" className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow-line"><span />IG PUBLIC CONTENT / FJUBAC_</div>
            <p className="archive-number">RESEARCH NOTE · 026</p>
            <div className="hero-brand-stamp">
              <img src="/manus-storage/fjubac-archive-mark_d244c157.png" alt="朱砂紅與石墨灰的檔案索引卡標誌" />
              <span><small>ARCHIVE MARK</small><strong>PUBLIC DOSSIER</strong></span>
            </div>
            <h1>從公開索引<br /><em>回看內容脈絡</em></h1>
            <p className="hero-lede">
              以可驗證的貼文、Reels 與精選動態名稱，整理 <strong>FJUBAC 輔大商業分析社</strong>如何把能力培養、職涯連結與社群招募編織成一條內容路徑。
            </p>
            <div className="hero-actions">
              <a href="#index" className="primary-action">查閱公開索引 <ArrowDownRight size={17} /></a>
              <a href="https://www.instagram.com/fjubac_/" target="_blank" rel="noreferrer" className="text-action">核對帳號原頁 <ArrowUpRight size={16} /></a>
            </div>
          </div>
          <div className="hero-image-wrap" aria-hidden="true">
            <img src="/manus-storage/fjubac-archive-hero_e92e09fb.jpg" alt="" className="hero-image" />
            <div className="image-caption">研究資料視覺意象<br />ARCHIVE DESK / 01</div>
          </div>
          <div className="hero-footer">
            <span>帳號：@fjubac_</span>
            <span>FJU Business Analytics Club</span>
            <span>公開資料整理</span>
          </div>
        </section>

        <section className="scope-strip" aria-label="研究範圍說明">
          <ShieldCheck size={20} aria-hidden="true" />
          <p><strong>範圍註記：</strong>本報告不把未登入狀態下的缺失資料解讀為不存在。已直接核對 19 則公開內容與 7 組精選名稱；因 Instagram 登入牆限制，無法聲稱已列出帳號全部內容。</p>
          <a href="#method">查閱研究方法 <ArrowDownRight size={15} /></a>
        </section>

        <section className="metrics-band" aria-label="核心指標">
          <article>
            <span className="metric-label">可核對內容</span>
            <strong>{reportData.totals.verifiedItems}</strong>
            <p>直接公開網址的貼文與 Reels</p>
          </article>
          <article>
            <span className="metric-label">可辨識精選</span>
            <strong>{reportData.highlights.length}</strong>
            <p>名稱層級，未推論逐則內容</p>
          </article>
          <article>
            <span className="metric-label">可見平均按讚</span>
            <strong>{reportData.totals.averageVisibleLikes}</strong>
            <p>僅以 {reportData.totals.visibleLikesItems} 則可見數據計算</p>
          </article>
          <article className="accent-metric">
            <span className="metric-label">2026 上半年</span>
            <strong>11</strong>
            <p>已核對條目，顯示密集更新節奏</p>
          </article>
        </section>

        <section id="patterns" className="section-block patterns-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow-line"><span />02 / CONTENT STRUCTURE</div>
              <h2>三條內容線索，<br />一個成長敘事。</h2>
            </div>
            <p>在可核對樣本中，技能知識與活動職涯各有 7 則，並由 5 則社群招募內容串接，形成「學習 → 實作／接觸職場 → 加入社群」的循環。</p>
          </div>

          <div className="insight-layout">
            <div className="insight-poster">
              <img src="/manus-storage/fjubac-archive-insight_92d11583.jpg" alt="以檔案夾與索引卡呈現的研究視覺意象" />
              <div><span>內容角色</span><strong>不只公告，<br />更是學習地圖。</strong></div>
            </div>
            <div className="insight-cards">
              <article>
                <span className="card-index">A / 01</span>
                <h3>能力可帶走</h3>
                <p>量化分析、OKR、SMART、效益評估、個案面試與產業解構，將方法論拆成可學習的步驟。</p>
              </article>
              <article>
                <span className="card-index">A / 02</span>
                <h3>職涯可接近</h3>
                <p>Coffee Chat、企業參訪、實習訪談與外部課程，讓學生從抽象職涯議題走向具體接觸點。</p>
              </article>
              <article>
                <span className="card-index">A / 03</span>
                <h3>加入有脈絡</h3>
                <p>社員故事、AMA 與招募說明會持續回應「我是否適合加入」的疑問，降低新生決策門檻。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="chart-section section-block" aria-labelledby="chart-heading">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow-line"><span />03 / VERIFIED SAMPLE</div>
              <h2 id="chart-heading">讓樣本自己說話。</h2>
            </div>
            <p>圖表僅使用已直接核對的公開內容。游標懸停可查看數值；不以帳號總貼文數推估不可見內容。</p>
          </div>
          <div className="chart-grid">
            <article className="chart-card wide">
              <header><span>主題分布</span><strong>19 則已核對內容</strong></header>
              <ChartContainer config={themeChartConfig} className="theme-chart">
                <BarChart data={[...reportData.themeTotals]} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={{ fill: "#4B4A45", fontSize: 12 }} />
                  <ChartTooltip cursor={{ fill: "rgba(201,71,46,.08)" }} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {reportData.themeTotals.map((entry) => <Cell key={entry.name} fill={colors[entry.name]} />)}
                    <LabelList dataKey="count" position="right" fill="#243037" fontSize={13} />
                  </Bar>
                </BarChart>
              </ChartContainer>
              <div className="chart-meta"><span>範圍 / 2023.12—2026.06</span><span>證據 / N=19</span></div>
            </article>
            <article className="chart-card type-card">
              <header><span>內容型態</span><strong>貼文 vs Reels</strong></header>
              <ChartContainer config={{ count: { label: "內容數" } }} className="type-chart">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={[...reportData.typeTotals]} dataKey="count" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                    {reportData.typeTotals.map((entry) => <Cell key={entry.name} fill={colors[entry.name]} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="chart-legend-row">
                {reportData.typeTotals.map((item) => <span key={item.name}><i style={{ background: colors[item.name] }} />{item.name}<b>{item.count}</b></span>)}
              </div>
              <div className="chart-meta"><span>樣本 / 已核對內容</span><span>基準 / 直接公開網址</span></div>
            </article>
            <article className="chart-card timeline-card">
              <header><span>核對內容的時間分布</span><strong>2023—2026</strong></header>
              <ChartContainer config={yearChartConfig} className="year-chart">
                <BarChart data={[...reportData.yearTotals]} margin={{ top: 18, right: 8, bottom: 0, left: -16 }}>
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#4B4A45", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#8A8981", fontSize: 11 }} />
                  <ChartTooltip cursor={{ fill: "rgba(201,71,46,.08)" }} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={ARCHIVE_RED} radius={[3, 3, 0, 0]}><LabelList dataKey="count" position="top" fill="#243037" fontSize={12} /></Bar>
                </BarChart>
              </ChartContainer>
              <div className="chart-meta"><span>編年 / 發布日期</span><span>證據 / N=19</span></div>
            </article>
          </div>
        </section>

        <section className="engagement-section section-block">
          <div className="engagement-copy">
            <div className="eyebrow-line"><span />04 / VISIBLE RESPONSE</div>
            <h2>可見互動，<br /><em>只作保守閱讀。</em></h2>
            <p>在 15 則可見按讚數的條目中，合計 552 個讚。最高可見反應同時出現在新生經驗談、職涯活動、產業解構與實習故事，說明不同內容角色各有吸引點，而非單一公式。</p>
            <div className="engagement-note"><Sparkles size={18} />缺失互動欄位維持缺失，不以 0 或模型數字填補。</div>
          </div>
          <ol className="ranking-list">
            {reportData.topByLikes.map((item, index) => (
              <li key={item.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.title}</strong><small>{item.type} · {item.theme}</small></div>
                <b>{item.likes}<small>讚</small></b>
                <a href={item.source} target="_blank" rel="noreferrer" aria-label={`開啟 ${item.title} 原始來源`}><ArrowUpRight size={17} /></a>
              </li>
            ))}
          </ol>
        </section>

        <section className="highlight-section" aria-labelledby="highlights-heading">
          <div>
            <div className="eyebrow-line"><span />05 / HIGHLIGHT DIRECTORY</div>
            <h2 id="highlights-heading">精選動態的<br />公開目錄。</h2>
          </div>
          <div className="highlight-board">
            <p>未登入狀態僅可辨識名稱，未能讀取故事逐則內容或日期。</p>
            <div className="highlight-chips">
              {reportData.highlights.map((highlight, index) => <span key={highlight}><b>{String(index + 1).padStart(2, "0")}</b>{highlight}</span>)}
            </div>
            <img src="/manus-storage/fjubac-archive-timeline_92a7400d.jpg" alt="以資料卡呈現時間索引的研究視覺意象" />
          </div>
        </section>

        <section id="index" className="archive-index section-block">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow-line"><span />06 / PUBLIC CONTENT INDEX</div>
              <h2>逐筆查看，<br />回到公開來源。</h2>
            </div>
            <p>這是 19 則以直接公開網址核對的內容索引。使用篩選器縮小範圍，再開啟來源頁自行查閱。</p>
          </div>

          <div className="filter-bar" aria-label="內容篩選">
          <div className="filter-label"><Filter size={16} />檔案篩選卡</div>
            <div className="filter-group">
              <span>型態</span>
              {contentTypes.map((type) => <button key={type} type="button" aria-pressed={selectedType === type} onClick={() => setSelectedType(type)}>{type}</button>)}
            </div>
            <div className="filter-group theme-filter">
              <span>主題</span>
              {contentThemes.map((theme) => <button key={theme} type="button" aria-pressed={selectedTheme === theme} onClick={() => setSelectedTheme(theme)}>{theme}</button>)}
            </div>
          </div>

          <div className="index-status"><Search size={15} />索引篩選結果：<strong>{filteredItems.length}</strong> / {reportData.items.length} 則已核對內容</div>
          <div className="content-table" role="table" aria-label="公開內容索引表">
            <div className="content-table-head" role="row">
              <span>日期</span><span>內容</span><span>主題</span><span>公開互動</span><span>來源</span>
            </div>
            {filteredItems.map((item) => (
              <article className="content-row" key={item.id} role="row">
                <time dateTime={item.date}>{formatDate(item.date)}</time>
                <div className="content-title"><span className={`type-tag ${item.type === "Reels" ? "reel" : ""}`}>{item.type}</span><strong>{item.title}</strong></div>
                <span className="theme-tag" style={{ "--tag-color": colors[item.theme] } as React.CSSProperties}>{item.theme}</span>
                <span className="interaction-text">{item.likes === null ? "未公開" : `${item.likes} 讚`}{item.comments === null ? "" : ` · ${item.comments} 留言`}</span>
                <a href={item.source} target="_blank" rel="noreferrer" aria-label={`前往 ${item.title} 原始公開頁`}><LinkIcon size={16} /><span>開啟</span></a>
              </article>
            ))}
          </div>
        </section>

        <section id="method" className="method-section">
          <div className="method-image"><img src="/manus-storage/fjubac-archive-method_2eaf73f6.jpg" alt="文件卡、紅筆與放大鏡組成的研究方法意象" /></div>
          <div className="method-copy">
            <div className="eyebrow-line"><span />07 / METHOD & LIMITS</div>
            <h2>以可驗證為界，<br />不替資料補故事。</h2>
            <p>研究先從公開帳號頁辨識帳號簡介、公開指標與精選名稱，再用每則貼文或 Reels 的直接公開網址核對文字、日期、內容型態與可見互動。所有圖表均以已核對條目計算，缺失值保持缺失。</p>
            <div className="method-grid">
              <div><BookOpenCheck size={18} /><strong>已核對</strong><span>19 則直接公開內容</span></div>
              <div><FileText size={18} /><strong>未推論</strong><span>精選的逐則故事內容</span></div>
              <div><ShieldCheck size={18} /><strong>未估計</strong><span>不可見貼文與互動欄位</span></div>
            </div>
            <p className="method-end">如需取得可審計的完整內容清單，應由帳號管理者提供官方匯出資料或授權存取；在此之前，本報告維持公開可驗證範圍。</p>
          </div>
        </section>

        <footer className="report-footer">
          <div className="footer-identity"><img src="/manus-storage/fjubac-archive-mark_d244c157.png" alt="抽象檔案索引卡標誌" /><div><span className="eyebrow">PUBLIC CONTENT RESEARCH</span><strong>@fjubac_ / FJUBAC 輔大商業分析社</strong></div></div>
          <div className="footer-actions">
            <button type="button" onClick={() => window.print()}><Printer size={16} />封存為 PDF／列印</button>
            <button type="button" onClick={shareReport}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "已複製索引連結" : "複製檔案索引"}</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
