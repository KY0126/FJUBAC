import { ArrowUpRight, BookOpenText, Download, FileText, Instagram, Linkedin, Link2, MessageCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { Reveal } from "@/components/Reveal";
import { FloatingTableOfContents } from "@/components/FloatingTableOfContents";

const OFFICIAL_LINKS = [
  { label: "Instagram", description: "追蹤公開貼文、短影音與即時訊息。", href: "https://www.instagram.com/fjubac_?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw==", Icon: Instagram },
  { label: "Threads", description: "查看 FJUBAC 的公開 Threads 貼文。", href: "https://www.threads.com/@fjubac_", Icon: MessageCircle },
  { label: "LinkedIn", description: "查看 FJUBAC 的公開 LinkedIn 頁面。", href: "https://tw.linkedin.com/company/fjubac", Icon: Linkedin },
] as const;

export default function PublicLinksPage() {
  const resources = trpc.workspace.resources.publicList.useQuery();
  const download = trpc.workspace.resources.publicDownload.useMutation({
    onError: error => toast.error(error.message || "暫時無法準備下載檔案。"),
  });

  const requestDownload = async (resourceId: number) => {
    const tab = window.open("", "_blank", "noopener,noreferrer");
    try {
      const result = await download.mutateAsync({ resourceId });
      if (tab) tab.location.href = result.url;
      else window.location.assign(result.url);
    } catch {
      tab?.close();
    }
  };

  return <main className="service-shell"><PublicSiteHeader section="LINKS & RESOURCES" /><FloatingTableOfContents sections={[{ id: "official-links", label: "官方連結" }, { id: "public-resources", label: "公開資源" }]} /><section className="service-hero"><p className="club-section-number">PUBLIC DIRECTORY</p><h1>公開連結與資源</h1><p>此處只收錄已確認的官方公開連結，以及已完成公開同意紀錄的資源。聯絡信箱尚未公告前，不會以替代信箱或猜測內容呈現。</p></section><section className="service-content public-directory-content"><Reveal><section id="official-links" className="directory-section"><div className="section-title-row"><div><p className="club-section-number">OFFICIAL LINKS</p><h2>官方連結</h2></div><Link2 aria-hidden="true" /></div><div className="official-link-grid">{OFFICIAL_LINKS.map(({ label, description, href, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" className="official-link-card"><Icon size={22} /><div><strong>{label}</strong><p>{description}</p></div><ArrowUpRight size={17} /></a>)}</div></section></Reveal><Reveal><section id="public-resources" className="directory-section"><div className="section-title-row"><div><p className="club-section-number">CONSENTED MATERIALS</p><h2>公開資源</h2></div><BookOpenText aria-hidden="true" /></div>{resources.isLoading ? <div className="service-empty compact-empty">正在讀取公開資源…</div> : resources.isError ? <div className="service-empty compact-empty"><FileText size={24} /><p>暫時無法載入公開資源。</p><button type="button" className="club-secondary" onClick={() => resources.refetch()}><RefreshCw size={15} />重新載入</button></div> : resources.data?.length ? <div className="resource-public-list">{resources.data.map(resource => <article key={resource.id} className="resource-public-card"><FileText size={23} /><div><h3>{resource.title}</h3><p>{resource.description || "此資源尚未提供文字說明。"}</p><small>{resource.fileName}{resource.versionLabel ? ` · ${resource.versionLabel}` : ""}</small></div><button type="button" className="club-secondary" disabled={download.isPending} onClick={() => requestDownload(resource.id)}><Download size={15} />下載</button></article>)}</div> : <div className="service-empty compact-empty"><BookOpenText size={26} /><h3>目前尚無可公開的資源。</h3><p>資源會在取得必要公開同意後，由授權幹部加入此處。</p></div>}</section></Reveal></section><PublicSiteFooter /></main>;
}
