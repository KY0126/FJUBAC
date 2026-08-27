import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("FJUBAC 校徽藍色品牌系統", () => {
  it("保留校徽參考的深靛藍與校徽藍色階", () => {
    const css = source("client/src/blue-brand.css");
    expect(css).toContain("--fjubac-indigo:#303a73");
    expect(css).toContain("--fju-blue:#0066b3");
    expect(css).toContain(".archive-shell");
  });

  it("首頁保留既有快速導覽，並啟用可重新開啟的功能導覽遮罩", () => {
    const home = source("client/src/pages/Home.tsx");
    const overlay = source("client/src/components/SiteOnboardingOverlay.tsx");
    expect(home).toContain('className="site-quick-links"');
    expect(home).toContain("SiteOnboardingOverlay");
    expect(home).toContain("SiteTourTrigger");
    expect(overlay).toContain("ONBOARDING_STORAGE_KEY");
    expect(overlay).toContain('event.key === "Escape"');
  });

  it("公開導覽列使用 FJUBAC 社徽並設定跨裝置尺寸", () => {
    const home = source("client/src/pages/Home.tsx");
    const publicHeader = source("client/src/components/PublicSiteHeader.tsx");
    const css = source("client/src/blue-brand.css");
    expect(home).toContain("PublicSiteHeader");
    expect(publicHeader).toContain('fjubac-emblem-reference_4b3d690c.png');
    expect(css).toContain('.club-emblem { width:50px;');
    expect(css).toContain('.club-emblem { width:40px;');
  });

  it("公開導覽列收斂主選單並提供內容分組、目前頁與行動版分區", () => {
    const home = source("client/src/pages/Home.tsx");
    const publicHeader = source("client/src/components/PublicSiteHeader.tsx");
    const css = source("client/src/blue-brand.css");
    expect(home).toContain("<PublicSiteHeader");
    expect(publicHeader).toContain("最新資訊");
    expect(publicHeader).toContain("社團介紹");
    expect(publicHeader).toContain("探索 FJUBAC");
    expect(publicHeader).toContain("公開資訊");
    expect(publicHeader).toContain("社員服務");
    expect(publicHeader).toContain('aria-current={isCurrent("/announcements") ? "page" : undefined}');
    expect(publicHeader).toContain("我要申請");
    expect(css).toContain(".public-nav-toggle");
    expect(css).toContain(".public-nav-cluster-label");
    expect(publicHeader).not.toContain("社員工作區</Link>");
  });

  it("深藍主要按鈕固定使用白色文字，避免繼承周圍深色文字", () => {
    const css = source("client/src/blue-brand.css");
    expect(css).toContain(".club-primary,.site-button.primary,.site-header-cta,.site-subheader-actions>a,.resource-item button,.primary-action { color:#fff; }");
  });

  it("所有路由由共用殼層提供唯一頁首、頁尾與回到頂部控制", () => {
    const app = source("client/src/App.tsx");
    const chrome = source("client/src/components/SiteChrome.tsx");
    const home = source("client/src/pages/Home.tsx");
    expect(app).toContain("<SiteChrome><BrandMotionShell><Router /></BrandMotionShell></SiteChrome>");
    expect(chrome).toContain("<ReadingAssist />");
    expect(chrome).toContain("<PublicSiteHeader");
    expect(chrome).toContain("<PublicSiteFooter");
    expect(home).not.toContain("FloatingTableOfContents");
  });

  it("內部頁使用明確前景色，並在共用頁首存在時隱藏舊式局部頁首", () => {
    const css = source("client/src/blue-brand.css");
    expect(css).toContain(".workspace-shell,.manage-shell,.management-shell { background:#f8fafd; color:var(--blue-ink); }");
    expect(css).toContain(".app-page-stage :is(.account-shell,.personal-shell,.workspace-shell,.manage-shell)>.workspace-header");
    expect(css).toContain(".app-page-stage .account-shell>.account-header");
    expect(css).toContain(".app-page-stage .management-shell>.management-header");
  });
});
