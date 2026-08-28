import { ArrowUpRight, AtSign, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { useContext } from "react";
import { Link } from "wouter";
import { SiteChromeContext } from "@/components/SiteChromeContext";

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/fjubac_?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw==", Icon: Instagram },
  { label: "Threads", href: "https://www.threads.com/@fjubac_", Icon: MessageCircle },
  { label: "LinkedIn", href: "https://tw.linkedin.com/company/fjubac", Icon: Linkedin },
];

export function PublicSiteFooter({ global = false }: { global?: boolean }) {
  const hasGlobalChrome = useContext(SiteChromeContext);
  if (hasGlobalChrome && !global) return null;
  return <footer className="site-footer public-site-footer"><div className="club-wordmark"><img className="club-emblem" src="/manus-storage/fjubac-emblem-reference_4b3d690c.png" alt="FJUBAC 社徽" /><span><strong>FJUBAC</strong><small>FJU BUSINESS ANALYTICS CLUB</small></span></div><div className="public-footer-links"><nav aria-label="頁尾導覽"><Link href="/announcements">公告</Link><Link href="/events">活動</Link><Link href="/links">連結與資源</Link><Link href="/learning">社團活動</Link><Link href="/research">社課教學紀錄</Link><Link href="/outcomes">公開專案成果</Link><Link href="/departments">五部門</Link><Link href="/apply">加入我們</Link><Link href="/account">社員登入</Link></nav><div className="public-footer-socials"><span>FOLLOW FJUBAC</span><div>{SOCIALS.map(({ label, href, Icon }) => <a href={href} key={label} target="_blank" rel="noreferrer" aria-label={`在新分頁開啟 FJUBAC ${label}`}><Icon size={16} /><span>{label}</span><ArrowUpRight size={13} /></a>)}</div></div></div><div className="public-footer-contact"><AtSign size={16} /><span>聯絡信箱將於社團正式公告後啟用。</span></div><small className="public-footer-copyright">© FJUBAC. All rights reserved.</small></footer>;
}
