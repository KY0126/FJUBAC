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
});
