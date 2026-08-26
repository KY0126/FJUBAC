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
});
