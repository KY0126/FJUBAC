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

  it("首頁維持既有快速導覽，且不含暫緩的功能導覽遮罩", () => {
    const home = source("client/src/pages/Home.tsx");
    expect(home).toContain('className="site-quick-links"');
    expect(home).not.toContain("SiteOnboardingOverlay");
    expect(home).not.toContain("site-onboarding");
  });
});
