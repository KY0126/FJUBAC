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
    expect(home).toContain('fjubac-emblem-reference_4b3d690c.png');
    expect(publicHeader).toContain('fjubac-emblem-reference_4b3d690c.png');
    expect(css).toContain('.club-emblem { width:50px;');
    expect(css).toContain('.club-emblem { width:40px;');
  });
});
