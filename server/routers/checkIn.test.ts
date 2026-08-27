import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

describe("QR 活動簽到的資料與權限邊界", () => {
  it("只保存雜湊權杖，且場次與簽到紀錄以活動、報名與社員唯一鍵防止重複", () => {
    const schema = source("drizzle/schema.ts");
    const router = source("server/routers/checkIn.ts");
    expect(schema).toContain('export const eventCheckInSessions');
    expect(schema).toContain('tokenHash: varchar("tokenHash", { length: 128 }).notNull()');
    expect(schema).toContain('uniqueIndex("event_checkins_event_user_unique").on(table.eventId, table.userId)');
    expect(schema).toContain('uniqueIndex("event_checkins_registration_unique").on(table.registrationId)');
    expect(router).toContain('randomBytes(32).toString("base64url")');
    expect(router).toContain('createHash("sha256")');
    expect(router).toContain('tokenHash: digest(token)');
  });

  it("自助掃碼僅接受有效時段、開放場次且已完成報名的本人，並以既有結果處理重複掃碼", () => {
    const router = source("server/routers/checkIn.ts");
    expect(router).toContain('protectedProcedure.input(z.object({ token: tokenInput }))');
    expect(router).toContain('eq(eventCheckInSessions.status, "active")');
    expect(router).toContain('lte(eventCheckInSessions.startsAt, now)');
    expect(router).toContain('gte(eventCheckInSessions.endsAt, now)');
    expect(router).toContain('eq(eventRegistrations.userId, ctx.user.id)');
    expect(router).toContain('registration.status === "waitlisted"');
    expect(router).toContain('status: "already_checked_in" as const');
    expect(router).toContain('action: "event_checkin.qr_scanned"');
  });

  it("場次管理、名單與人工備援均受活動管理權限保護，且人工更正必填理由並記錄稽核", () => {
    const router = source("server/routers/checkIn.ts");
    expect(router).toContain('eventManageProcedure.input(sessionInput)');
    expect(router).toContain('eventManageProcedure.input(z.object({ sessionId: z.number().int().positive() }))');
    expect(router).toContain('correctionReason: z.string().trim().min(1).max(300)');
    expect(router).toContain('action: "event_checkin.manual_recorded"');
    expect(router).toContain('action: `event_checkin.session_${input.status}`');
  });

  it("個人中心與前端 QR 介面只呈現授權範圍內容，不將個資寫入 QR 網址", () => {
    const personal = source("server/routers/personal.ts");
    const memberUi = source("client/src/components/PersonalCheckInHistory.tsx");
    const scanUi = source("client/src/components/EventQrCheckIn.tsx");
    expect(personal).toContain('where(eq(eventCheckIns.userId, userId))');
    expect(personal).toContain('checkInHistory');
    expect(memberUi).toContain('僅顯示你本人的 QR 或人工備援簽到結果');
    expect(memberUi).toContain('useQuery(undefined, { enabled: isAuthenticated })');
    expect(memberUi).toContain('if (!isAuthenticated) return null');
    expect(scanUi).toContain('系統會在登入後確認你是否為該活動已報名的社員');
    expect(scanUi).not.toContain('studentNumber');
    expect(scanUi).not.toContain('email');
  });
});
