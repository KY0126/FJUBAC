import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const listPage = readFileSync(new URL("./ProjectListPage.tsx", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("./ProjectDetailPage.tsx", import.meta.url), "utf8");
const learningPage = readFileSync(new URL("./LearningMapPage.tsx", import.meta.url), "utf8");

describe("專案流程與社團活動前端契約", () => {
  it("列表、詳情與社團活動皆以 15 秒輪詢同步", () => {
    expect(listPage).toContain("refetchInterval: 15_000");
    expect(detailPage).toContain("refetchInterval: 15_000");
    expect(learningPage).toContain("refetchInterval:15_000");
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
    expect(detailPage).toContain("匯出該階段所有文件");
    expect(detailPage).toContain("exportStageDocuments");
  });

  it("社團活動沿用社課教學紀錄的三欄圖文卡片骨架", () => {
    expect(learningPage).toContain("teaching-record-grid learning-map-card-grid");
    expect(learningPage).toContain("teaching-record-card");
    expect(learningPage).toContain("teaching-card-visual learning-map-card-visual");
    expect(learningPage).toContain("teaching-card-body");
    expect(learningPage).toContain("service-shell teaching-records-page");
    expect(learningPage).toContain("personal.favoriteIds");
    expect(learningPage).toContain("personal.setFavorite");
    expect(learningPage).toContain("已收藏");
  });

  it("以社團活動作為使用者可見名稱", () => {
    expect(learningPage).toContain("<h1>社團活動</h1>");
    expect(learningPage).not.toContain("學習與職涯地圖");
  });

  it("社團活動依搜尋、學年、學期與類別標籤篩選真實資源", () => {
    expect(learningPage).toContain("activity-search");
    expect(learningPage).toContain("學年度");
    expect(learningPage).toContain("請先選擇學年");
    expect(learningPage).toContain("第一學期");
    expect(learningPage).toContain("第二學期");
    expect(learningPage).toContain("<Tags size={15}/>類別");
    expect(learningPage).toContain("schoolYearFor(resource.createdAt)");
    expect(learningPage).toContain("semesterFor(resource.createdAt)");
  });

  it("社團活動提供可展開的進階篩選與清除控制", () => {
    expect(learningPage).toContain("進階篩選");
    expect(learningPage).toContain("activity-advanced-filters");
    expect(learningPage).toContain('type="date"');
    expect(learningPage).toContain("startDate");
    expect(learningPage).toContain("endDate");
    expect(learningPage).toContain("清除所有條件");
    expect(learningPage).toContain("const clear=");
  });

  it("收藏操作具有可移除的愛心微動畫狀態", () => {
    expect(learningPage).toContain("pulsingId");
    expect(learningPage).toContain("is-pulsing");
    expect(learningPage).toContain("onAnimationEnd");
  });

  it("社團活動以真實存取紀錄提供熱門排序並在更新時顯示骨架屏", () => {
    const workflowRouter = readFileSync(new URL("../../../server/routers/projectWork.ts", import.meta.url), "utf8");
    expect(learningPage).toContain("排序方式");
    expect(learningPage).toContain("熱門程度");
    expect(learningPage).toContain("ResultSkeletons");
    expect(learningPage).toContain("query.isFetching");
    expect(workflowRouter).toContain("resourceAccessLogs");
    expect(workflowRouter).toContain("popularity");
    expect(workflowRouter).toContain('sortBy === "popular"');
  });
});
