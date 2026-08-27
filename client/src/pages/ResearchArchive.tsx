import { useMemo, useState } from "react";
import { BookOpenText, ExternalLink, Filter, Search, Tags } from "lucide-react";
import { reportData } from "@/data/researchData";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";

const tags = ["商業分析與管顧基礎", "研究方法與資料分析", "產業分析與策略設計", "顧問式簡報與溝通", "案例面試與職涯能力", "專案實作與企業連結", "外部數位資源", "社團運作與學習場景"];
const tagFor = (title: string) => /訪談|研究|量化|Focus/i.test(title) ? tags[1] : /產業|航空|MVP|效益|競爭/i.test(title) ? tags[2] : /簡報|Storyline|Ghost|SCR/i.test(title) ? tags[3] : /Case|履歷|實習|職涯|工作/i.test(title) ? tags[4] : /Kick-off|專案|企業參訪/i.test(title) ? tags[5] : /Google|數位人才/i.test(title) ? tags[6] : /招募|AMA|Coffee|旁聽|社員/i.test(title) ? tags[7] : tags[0];
const schoolYearFor = (date: string) => { const value = new Date(`${date}T00:00:00`); const year = value.getFullYear(); return value.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`; };
const years = ["全部", ...Array.from(new Set(reportData.items.map(item => schoolYearFor(item.date))))].sort((a, b) => b.localeCompare(a));

export default function ResearchArchive() {
  const [keyword, setKeyword] = useState("");
  const [selectedTag, setSelectedTag] = useState("全部");
  const [selectedYear, setSelectedYear] = useState("全部");
  const records = useMemo(() => reportData.items.filter(item => {
    const haystack = `${item.title} ${item.theme} ${tagFor(item.title)}`.toLocaleLowerCase();
    return (!keyword.trim() || haystack.includes(keyword.trim().toLocaleLowerCase())) &&
      (selectedTag === "全部" || tagFor(item.title) === selectedTag) &&
      (selectedYear === "全部" || schoolYearFor(item.date) === selectedYear);
  }), [keyword, selectedTag, selectedYear]);

  return <div className="service-shell teaching-records-page">
    <PublicSiteHeader section="社課教學紀錄" />
    <main>
      <section className="service-hero teaching-records-hero">
        <p className="club-section-number">KNOWLEDGE RECORDS</p>
        <h1>社課教學紀錄</h1>
        <p>將公開可核對的社課與商業知識內容整理為逐項閱讀卡片。此頁為公開內容紀錄，並非正式課綱、教材或課程承諾。</p>
      </section>
      <section className="service-content teaching-records-content" aria-label="社課教學紀錄">
        <div className="teaching-filter-panel"><div className="teaching-search"><Search size={18} /><label className="sr-only" htmlFor="teaching-search">搜尋教學紀錄</label><input id="teaching-search" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="搜尋主題、方法或文章名稱" /></div><div className="teaching-filter-row"><span><Filter size={15} />學年</span>{years.map(year => <button type="button" key={year} aria-pressed={selectedYear === year} onClick={() => setSelectedYear(year)}>{year}</button>)}</div><div className="teaching-filter-row"><span><Tags size={15} />標籤</span><button type="button" aria-pressed={selectedTag === "全部"} onClick={() => setSelectedTag("全部")}>全部</button>{tags.map(tag => <button type="button" key={tag} aria-pressed={selectedTag === tag} onClick={() => setSelectedTag(tag)}>{tag}</button>)}</div></div>
        <p className="teaching-result-count">顯示 <strong>{records.length}</strong> / {reportData.items.length} 則已核對內容</p>
        {records.length ? <div className="teaching-record-grid">{records.map(item => <article className="teaching-record-card" key={item.id}><div className="teaching-card-visual" aria-hidden="true"><BookOpenText size={42} /></div><div className="teaching-card-body"><span className="teaching-year">{schoolYearFor(item.date)} · {item.type}</span><span className="teaching-tag">{tagFor(item.title)}</span><h2>{item.title}</h2><p>{item.theme}主題的公開內容紀錄，可由原始公開頁核對發布資訊。</p><a href={item.source} target="_blank" rel="noreferrer">查看公開來源 <ExternalLink size={15} /></a></div></article>)}</div> : <div className="service-empty"><Search size={28} /><h2>找不到符合條件的教學紀錄</h2><p>請調整搜尋文字、學年或主題標籤。</p></div>}
      </section>
    </main>
    <PublicSiteFooter />
  </div>;
}
