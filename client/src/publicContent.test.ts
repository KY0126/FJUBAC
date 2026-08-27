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

  it("部門卡片保留未連結的 Instagram 位置，輪播速度由受保護設定管理", () => {
    const departmentCards = source("client/src/components/StackedDepartmentCards.tsx");
    const contentRouter = source("server/routers/content.ts");
    const management = source("client/src/pages/ManagementWorkspacePage.tsx");
    expect(departmentCards).toContain("Instagram 連結待提供");
    expect(departmentCards).not.toContain("threads.com/@fjubac_");
    expect(departmentCards).not.toContain("tw.linkedin.com/company/fjubac");
    expect(departmentCards).toContain("displaySettings.publicRead");
    expect(contentRouter).toContain("displaySettings: router");
    expect(contentRouter).toContain("adminProcedure.input");
    expect(contentRouter).toContain("site_display.department_carousel_interval_updated");
    expect(management).toContain("DepartmentCarouselSettingsPanel");
  });

  it("五部門卡片呈現使用者確認的定位與工作內容", () => {
    const departmentCards = source("client/src/components/StackedDepartmentCards.tsx");
    expect(departmentCards).toContain("#數位時代的操盤手");
    expect(departmentCards).toContain("#硬核實力的知識庫");
    expect(departmentCards).toContain("#組織凝聚的靈魂");
    expect(departmentCards).toContain("#系統化成長的推手");
    expect(departmentCards).toContain("#品牌開發的公關尖兵");
    expect(departmentCards).toContain("IG 貼文、限動、活動宣傳內容");
    expect(departmentCards).toContain("簡報邏輯、Excel 實戰及模擬案例分析 (CSG)");
    expect(departmentCards).toContain("Club Bonding 與 Coffee Chat (CC)");
    expect(departmentCards).toContain("建立 Mentor 導師關係至成果發表");
    expect(departmentCards).toContain("企業合作與大型活動策劃");
  });

  it("五部門介紹頁呈現使用者確認的學習點與加分項目", () => {
    const departmentsPage = source("client/src/pages/DepartmentsPage.tsx");
    const recruitmentPage = source("client/src/pages/RecruitmentPage.tsx");
    const growthContent = source("client/src/lib/departmentGrowthContent.ts");
    expect(departmentsPage).toContain('from "@/lib/departmentGrowthContent"');
    expect(recruitmentPage).toContain('from "@/lib/departmentGrowthContent"');
    expect(recruitmentPage).toContain("加分項目用於自我評估，並不代表申請門檻");
    expect(growthContent).toContain("社群經營及行銷數據分析實戰力");
    expect(growthContent).toContain("熟悉 Canva 操作");
    expect(growthContent).toContain("專業書信撰寫與往來能力");
    expect(growthContent).toContain("富有統整能力、快速理解能力");
    expect(growthContent).toContain("面試、書審設計");
    expect(growthContent).toContain("活動舉辦與籌備經驗");
    expect(growthContent).toContain("陌生開發與合作關係建立");
    expect(growthContent).toContain("曾擔任過本社「專案生」");
    expect(growthContent).toContain("品牌打造與形象經營");
    expect(growthContent).toContain("撰寫合作企劃書、活動企劃書經驗");
    expect(departmentsPage).toContain('title="學習點"');
    expect(departmentsPage).toContain('title="加分項目"');
  });

  it("P0 可近用性樣式提供安全錨點、鍵盤焦點與表單錯誤文字回饋", () => {
    const stylesheet = source("client/src/index.css");
    const departmentsPage = source("client/src/pages/DepartmentsPage.tsx");
    expect(stylesheet).toContain("scroll-margin-top:96px");
    expect(stylesheet).toContain(":focus-visible");
    expect(stylesheet).toContain("請檢查此欄位的格式或必填資訊");
    expect(stylesheet).toContain(":user-invalid");
    expect(stylesheet).toContain("prefers-contrast:more");
    expect(departmentsPage).toContain("scrollIntoView({ block: \"start\" })");
  });

  it("P1 排版與內容卡片互動維持流動閱讀與精細游標限定", () => {
    const stylesheet = source("client/src/index.css");
    expect(stylesheet).toContain("text-wrap:balance");
    expect(stylesheet).toContain("text-wrap:pretty");
    expect(stylesheet).toContain("max-inline-size:64ch");
    expect(stylesheet).toContain("font-size:clamp(2.2rem,4.8vw,4.25rem)");
    expect(stylesheet).toContain("@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)");
    expect(stylesheet).toContain("transform:translateY(-4px)");
    expect(stylesheet).toContain("@media (hover:none), (pointer:coarse)");
  });

  it("全站閱讀輔助與品牌紋理提供進度、回到頂部和減少動態支援", () => {
    const readingAssist = source("client/src/components/ReadingAssist.tsx");
    const siteChrome = source("client/src/components/SiteChrome.tsx");
    const stylesheet = source("client/src/index.css");
    expect(readingAssist).toContain('aria-label="頁面閱讀進度"');
    expect(readingAssist).toContain('aria-label="回到頁面頂端"');
    expect(readingAssist).toContain("window.scrollTo");
    expect(readingAssist).toContain("tabIndex={showBackToTop ? 0 : -1}");
    expect(siteChrome).toContain("<ReadingAssist />");
    expect(siteChrome).toContain("<PublicSiteHeader");
    expect(siteChrome).toContain("<PublicSiteFooter");
    expect(stylesheet).toContain(".reading-progress");
    expect(stylesheet).toContain(".reading-back-to-top");
    expect(stylesheet).toContain("P2: reading orientation and low-contrast FJUBAC data texture");
  });

  it("長篇公開頁提供浮動章節目錄、實際錨點與目前段落標示，首頁則不顯示目錄", () => {
    const toc = source("client/src/components/FloatingTableOfContents.tsx");
    const home = source("client/src/pages/Home.tsx");
    const departments = source("client/src/pages/DepartmentsPage.tsx");
    const learning = source("client/src/pages/LearningMapPage.tsx");
    const links = source("client/src/pages/PublicLinksPage.tsx");
    const stylesheet = source("client/src/index.css");
    expect(toc).toContain('aria-current={activeId === section.id ? "location" : undefined}');
    expect(toc).toContain("target.scrollIntoView");
    expect(toc).toContain("reachedPageEnd");
    expect(toc).toContain("DESKTOP_TOC_COLLAPSED_STORAGE_KEY");
    expect(toc).toContain("MOBILE_TOC_OPEN_STORAGE_KEY");
    expect(toc).toContain("window.localStorage");
    expect(toc).toContain('mobileDetails?.removeAttribute("open")');
    expect(toc).toContain("floating-toc-mobile");
    expect(home).toContain("id=\"join\"");
    expect(home).not.toContain("FloatingTableOfContents");
    expect(departments).toContain("departmentSections");
    expect(departments).toContain("trackScroll={false}");
    expect(learning).toContain("learning-stage-${step}");
    expect(learning).toContain("trackScroll={false}");
    expect(links).toContain('id="official-links"');
    expect(links).toContain('id="public-resources"');
    expect(stylesheet).toContain(".floating-toc");
    expect(stylesheet).toContain("@media (max-width:1120px)");
    expect(stylesheet).toContain('font-weight:800');
    expect(stylesheet).toContain('border-left:4px solid #087bb7');
    const blueBrand = source("client/src/blue-brand.css");
    const timingVerifier = source("scripts/verify-brand-motion-timing.mjs");
    expect(blueBrand).toContain(".floating-toc-desktop { background:rgba(248,252,255,.72);");
    expect(blueBrand).toContain(".floating-toc-mobile { background:rgba(248,252,255,.78);");
    expect(timingVerifier).toContain("const duration = 1_800;");
    const recruitment = source("client/src/pages/RecruitmentPage.tsx");
    expect(recruitment).toContain("recruitmentSections");
    expect(recruitment).toContain("recruitment-cycle-selection");
    expect(recruitment).toContain("recruitment-application-details");
  });

  it("全頁面呈現驗收涵蓋公開、社員與管理入口的三種裝置尺寸", () => {
    const verifier = source("scripts/verify-page-presentation.mjs");
    expect(verifier).toContain('"/manage/accounts"');
    expect(verifier).toContain('"/research"');
    expect(verifier).toContain('name: "桌機"');
    expect(verifier).toContain('name: "平板"');
    expect(verifier).toContain('name: "手機"');
    expect(verifier).toContain("horizontalOverflow");
    expect(verifier).toContain("textClips");
    expect(verifier).toContain("fixedOutOfBounds");
    expect(verifier).toContain("persistentLoadingMessages");
    expect(verifier).toContain("siteHeaderCount");
    expect(verifier).toContain("siteFooterCount");
    expect(verifier).toContain("backToTopCount");
  });

  it("404 頁使用繁體中文並提供語意主內容容器", () => {
    const notFound = source("client/src/pages/NotFound.tsx");
    expect(notFound).toContain("<main");
    expect(notFound).toContain("找不到此頁面");
    expect(notFound).toContain("返回首頁");
  });

  it("社課教學紀錄以逐項卡片呈現八類標籤，並支援關鍵字與學年組合篩選", () => {
    const research = source("client/src/pages/ResearchArchive.tsx");
    expect(research).toContain("const tags =");
    expect(research).toContain("商業分析與管顧基礎");
    expect(research).toContain("社團運作與學習場景");
    expect(research).toContain("selectedYear");
    expect(research).toContain("keyword");
    expect(research).toContain("teaching-record-card");
  });

  it("研究檔案索引的公開標題不使用省略號裁切", () => {
    const stylesheet = source("client/src/index.css");
    expect(stylesheet).toContain(".content-title strong { color: #273139; font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }");
    expect(stylesheet).not.toContain(".content-title strong { color: #273139; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }");
  });

  it("個人中心整合資源、專案與任務，並以真實有效專案指派顯示社員或專案生", () => {
    const personal = source("client/src/pages/PersonalCenterPage.tsx");
    const workspace = source("client/src/pages/MemberWorkspacePage.tsx");
    expect(personal).toContain('const memberRole = workspaceProjects.data?.length ? "專案生" : "社員"');
    expect(personal).toContain('id="workspace"');
    expect(personal).toContain("我的資源與專案工作區");
    expect(personal).toContain("05 / RESOURCE HISTORY");
    expect(personal).toContain("06 / FAVORITES");
    expect(personal).toContain("07 / ACCOUNT ACTIVITY");
    expect(workspace).toContain('setLocation("/me#workspace")');
  });
});
