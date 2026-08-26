import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8");
}

describe("公開頁尾與招生 FAQ", () => {
  it("頁尾只使用已確認的 FJUBAC 社群連結，且不虛構聯絡信箱", () => {
    const footer = source("client/src/components/PublicSiteFooter.tsx");
    expect(footer).toContain("instagram.com/fjubac_");
    expect(footer).toContain("threads.com/@fjubac_");
    expect(footer).toContain("tw.linkedin.com/company/fjubac");
    expect(footer).not.toMatch(/mailto:/);
  });

  it("招生 FAQ 說明校內外梯次、書審面試、專案資格與帳號啟用", () => {
    const faq = source("client/src/pages/RecruitmentFaq.tsx");
    expect(faq).toContain("校內與校外申請者");
    expect(faq).toContain("書面審查與面試");
    expect(faq).toContain("專案生一定是社員");
    expect(faq).toContain("Email 驗證");
  });

  it("公開內容頁保留同意與無資料原則，不以範例成果補足空白", () => {
    const links = source("client/src/pages/PublicLinksPage.tsx");
    const outcomes = source("client/src/pages/PublicOutcomesPage.tsx");
    const learning = source("client/src/pages/LearningMapPage.tsx");
    expect(links).toContain("已完成公開同意紀錄");
    expect(outcomes).toContain("已記錄公開同意");
    expect(outcomes).toContain("目前尚無可公開的專案成果");
    expect(learning).toContain("不以範例或假資料補足");
  });

  it("公開路由與顯示效果支援正式入口及減少動態偏好", () => {
    const app = source("client/src/App.tsx");
    const reveal = source("client/src/components/Reveal.tsx");
    const styles = source("client/src/index.css");
    expect(app).toContain('path={"/links"}');
    expect(app).toContain('path={"/learning"}');
    expect(app).toContain('path={"/outcomes"}');
    expect(app).toContain('path={"/departments"}');
    expect(reveal).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("prefers-reduced-motion: no-preference");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("公開內容程序與管理表單保留分類、封面、公開同意及下載權限控制", () => {
    const contentRouter = source("server/routers/content.ts");
    const workspaceRouter = source("server/routers/workspace.ts");
    const management = source("client/src/pages/ManagementWorkspacePage.tsx");
    expect(contentRouter).toContain("storeAnnouncementCover");
    expect(contentRouter).toContain("category: z.enum");
    expect(workspaceRouter).toContain("hasPublicProjectConsent(input)");
    expect(workspaceRouter).toContain("hasPublicResourceConsent(input)");
    expect(workspaceRouter).toContain("publicConsentRecordedAt} is not null");
    expect(workspaceRouter).toContain("publicDownload");
    expect(management).toContain("setCoverFile");
    expect(management).toContain('name="confirmPublicConsent"');
  });
});
