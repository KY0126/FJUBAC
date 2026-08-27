import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(new URL("./pages/MemberWorkspacePage.tsx", import.meta.url), "utf8");
const tasks = readFileSync(new URL("./components/MyTaskSummary.tsx", import.meta.url), "utf8");
const projectWork = readFileSync(new URL("./components/ProjectWorkPanel.tsx", import.meta.url), "utf8");
const eventManagement = readFileSync(new URL("./components/EventManagementPanel.tsx", import.meta.url), "utf8");
const eventsPage = readFileSync(new URL("./pages/EventsPage.tsx", import.meta.url), "utf8");
const lifecycle = readFileSync(new URL("./pages/ProjectContentManagementPage.tsx", import.meta.url), "utf8");

describe("MVP-2 社員參與與成長介面", () => {
  it("在社員工作區呈現真實待辦空狀態，並由本人任務查詢提供資料", () => {
    expect(workspace).toContain("<MyTaskSummary />");
    expect(tasks).toContain("workspace.projectWork.mine.useQuery");
    expect(tasks).toContain("目前沒有指派給你的實際待辦");
  });

  it("在專案工作面板提供里程碑、任務與交付物生命週期，而不提供示範資料", () => {
    expect(projectWork).toContain("尚無實際里程碑資料");
    expect(projectWork).toContain("尚無實際任務資料");
    expect(projectWork).toContain("尚無實際交付物資料");
    expect(projectWork).toContain("milestones.archive");
    expect(projectWork).toContain("tasks.cancel");
    expect(projectWork).toContain("deliverables.review");
    expect(projectWork).toContain("submitMilestoneEdit");
    expect(projectWork).toContain("submitTaskEdit");
    expect(projectWork).toContain("task.assigneeUserId === currentUserId");
    expect(projectWork).toContain("負責人");
    expect(projectWork).toContain("里程碑");
  });

  it("提供幹部出席登錄與成果／資源版本管理，不加入 QR 或自動候補遞補", () => {
    expect(eventManagement).toContain("events.registrationsManage.useQuery");
    expect(eventManagement).toContain("events.markAttendance.useMutation");
    expect(eventsPage).toContain("events.myRegistrationStatuses.useQuery");
    expect(eventsPage).toContain("events.cancelRegistration.useMutation");
    expect(eventsPage).toContain("取消我的報名");
    expect(lifecycle).toContain("projects.withdrawPublic.useMutation");
    expect(lifecycle).toContain("projects.archive.useMutation");
    expect(lifecycle).toContain("supersedesResourceId");
    expect(eventManagement).not.toContain("QR");
    expect(eventManagement).not.toContain("自動遞補");
  });
});
