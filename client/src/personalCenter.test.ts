import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8");
}

describe("個人帳號中心", () => {
  it("具備頭像、偏好與本人資源存取紀錄的資料模型", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("avatarStorageKey");
    expect(schema).toContain("avatarUrl");
    expect(schema).toContain("userPreferences");
    expect(schema).toContain("resourceAccessLogs");
    expect(schema).toContain("resourceFavorites");
    expect(schema).toContain("personalNotifications");
    expect(schema).toContain("resourceHistoryVisible");
  });

  it("個人中心程序一律受保護且不將密碼或驗證碼納入個人摘要", () => {
    const router = source("server/routers/personal.ts");
    expect(router).toContain("summary: protectedProcedure");
    expect(router).toContain("changePassword: protectedProcedure");
    expect(router).toContain("setFavorite: protectedProcedure");
    expect(router).toContain("markNotificationRead: protectedProcedure");
    expect(router).toContain("archiveNotification: protectedProcedure");
    expect(router).toContain("verifyPassword(input.currentPassword");
    expect(router).not.toContain("passwordHash: users.passwordHash");
    expect(router).not.toContain("verificationCodes");
  });

  it("頭像與資源開啟紀錄採實際受保護流程", () => {
    const router = source("server/routers/personal.ts");
    const workspace = source("server/routers/workspace.ts");
    expect(router).toContain("image\\/(?:png|jpeg|webp)");
    expect(router).toContain("2 * 1024 * 1024");
    expect(router).toContain("storagePut(`member-avatars/");
    expect(workspace).toContain("action: \"view\"");
    expect(workspace).toContain("action: \"download\"");
    expect(router).toContain("canUserReadScopedResource(userId, entry.resource)");
  });

  it("個人中心提供 14 項範圍的第一階段入口並支援個人減少動態偏好", () => {
    const page = source("client/src/pages/PersonalCenterPage.tsx");
    const app = source("client/src/App.tsx");
    const motion = source("client/src/components/BrandMotionShell.tsx");
    const styles = source("client/src/index.css");
    expect(app).toContain('path={"/me"}');
    expect(page).toContain("個人資料與頭像");
    expect(page).toContain("帳號與登入安全");
    expect(page).toContain("我的活動、專案與申請");
    expect(page).toContain("我的資源存取紀錄");
    expect(page).toContain("我的資源收藏");
    expect(page).toContain("站內通知");
    expect(page).toContain("個人異動／稽核摘要");
    expect(page).toContain("通知、隱私與動態");
    expect(page).toContain("workspace.projectWork.mine.useQuery");
    expect(page).toContain("取消報名");
    expect(page).toContain("content.events.cancelRegistration.useMutation");
    expect(motion).toContain("fjubac-user-reduced-motion");
    expect(styles).toContain('data-fjubac-reduced-motion="true"');
  });
});
