import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";
import { ReadingAssist } from "@/components/ReadingAssist";
import { SiteChromeContext } from "@/components/SiteChromeContext";

const SECTION_BY_PATH: Record<string, string> = {
  "/": "首頁",
  "/research": "PUBLIC RESEARCH ARCHIVE",
  "/apply": "RECRUITMENT PORTAL",
  "/recruitment": "RECRUITMENT PORTAL",
  "/account": "MEMBER ACCESS",
  "/me": "個人中心",
  "/announcements": "PUBLIC BULLETIN",
  "/events": "EVENTS & PARTICIPATION",
  "/links": "LINKS & RESOURCES",
  "/learning": "社團活動",
  "/outcomes": "PUBLIC OUTCOMES",
  "/departments": "FIVE DEPARTMENTS",
  "/workspace": "個人中心／工作區",
  "/404": "找不到此頁面",
};

function getSection(pathname: string) {
  if (pathname.startsWith("/manage/")) return "MANAGEMENT DESK";
  return SECTION_BY_PATH[pathname] ?? "FJUBAC";
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const pathname = location.split("?")[0]?.split("#")[0] || "/";

  return <SiteChromeContext.Provider value>
    <div className="app-frame">
      <ReadingAssist />
      <PublicSiteHeader section={getSection(pathname)} global />
      <div className="app-page-stage">{children}</div>
      <PublicSiteFooter global />
    </div>
  </SiteChromeContext.Provider>;
}
