import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./projectWork.ts", import.meta.url), "utf8");

describe("MVP-2 專案工作資料範圍", () => {
  it("將工作概覽、成員與我的待辦置於登入及專案存取檢查下", () => {
    expect(source).toContain("overview: protectedProcedure");
    expect(source).toContain("members: protectedProcedure");
    expect(source).toContain("mine: protectedProcedure");
    expect(source).toContain("await getProjectAccess(ctx.user, input.projectId)");
    expect(source).toContain('eq(projectAssignments.status, "active")');
  });

  it("僅允許受指派本人更新任務狀態，並使用封存或取消而非硬刪除", () => {
    expect(source).toContain("updateMineStatus: protectedProcedure");
    expect(source).toContain("eq(projectTasks.assigneeUserId, ctx.user.id)");
    expect(source).toContain('status: "cancelled"');
    expect(source).toContain('status: "archived"');
    expect(source).not.toContain("delete(projectTasks)");
    expect(source).not.toContain("delete(projectMilestones)");
    expect(source).not.toContain("delete(projectDeliverables)");
  });

  it("僅允許同專案且目前可讀的資源成為交付物", () => {
    expect(source).toContain("eq(resources.projectId, input.projectId)");
    expect(source).toContain("canUserReadScopedResource(ctx.user.id, resource)");
    expect(source).toContain("projectDeliverables");
  });

  it("以八個固定階段限制前進、要求退回原因並鎖定後續文件", () => {
    expect(source).toContain("PROJECT_WORKFLOW_STAGES");
    expect(source).toContain("流程只能逐階段前進，不能跳過階段");
    expect(source).toContain("退回專案階段時必須填寫原因");
    expect(source).toContain('set({ status: "locked" })');
    expect(source).toContain("project.workflow_rolled_back");
  });

  it("流程文件採封存取代硬刪除，並通知有效專案成員", () => {
    expect(source).toContain("workflow_document_archived");
    expect(source).toContain("notifyActiveProjectMembers");
    expect(source).toContain("personalNotifications");
    expect(source).not.toContain("delete(projectStageDocuments)");
  });

  it("職涯地圖僅允許有效專案生或具明確專案管理權限者讀取", () => {
    expect(source).toContain("hasWorkflowDirectoryAccess");
    expect(source).toContain("learningCareerMap");
    expect(source).toContain("requireCurriculumManager");
    expect(source).toContain("learningCareerResourceMappings");
  });
});
