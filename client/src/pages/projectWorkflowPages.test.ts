import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const listPage = readFileSync(new URL("./ProjectListPage.tsx", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("./ProjectDetailPage.tsx", import.meta.url), "utf8");
const learningPage = readFileSync(new URL("./LearningMapPage.tsx", import.meta.url), "utf8");

describe("專案流程與職涯地圖前端契約", () => {
  it("列表、詳情與職涯地圖皆以 15 秒輪詢同步", () => {
    expect(listPage).toContain("refetchInterval: 15_000");
    expect(detailPage).toContain("refetchInterval: 15_000");
    expect(learningPage).toContain("refetchInterval: 15_000");
  });

  it("未登入與無權限使用者不會取得敏感頁面內容", () => {
    expect(listPage).toContain("AccessNotice");
    expect(detailPage).toContain("AccessNotice");
    expect(learningPage).toContain("僅開放給有效專案生");
  });

  it("詳情頁具階段連動、退回原因及鎖定提示", () => {
    expect(detailPage).toContain("project-workflow-stepper");
    expect(detailPage).toContain("退回原因（退回時必填）");
    expect(detailPage).toContain("已鎖定");
  });

  it("職涯地圖沿用社課教學紀錄的三欄圖文卡片骨架", () => {
    expect(learningPage).toContain("teaching-record-grid learning-map-card-grid");
    expect(learningPage).toContain("teaching-record-card");
    expect(learningPage).toContain("teaching-card-visual learning-map-card-visual");
    expect(learningPage).toContain("teaching-card-body");
  });
});
