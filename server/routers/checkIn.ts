import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, eventCheckIns, eventCheckInSessions, eventRegistrations, events, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { eventManageProcedure, protectedProcedure, router } from "../_core/trpc";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

const sessionInput = z.object({ eventId: z.number().int().positive(), label: z.string().trim().min(1).max(100), startsAt: z.date(), endsAt: z.date() });
const tokenInput = z.string().min(30).max(120);
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const issueToken = () => randomBytes(32).toString("base64url");

async function findSession(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, sessionId: number) {
  const [session] = await db.select().from(eventCheckInSessions).where(eq(eventCheckInSessions.id, sessionId)).limit(1);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "找不到報到場次。" });
  return session;
}

export const checkInRouter = router({
  sessionsForEvent: eventManageProcedure.input(z.object({ eventId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb(); assertDatabase(db);
    const sessions = await db.select().from(eventCheckInSessions).where(eq(eventCheckInSessions.eventId, input.eventId)).orderBy(desc(eventCheckInSessions.createdAt));
    return Promise.all(sessions.map(async session => {
      const entries = await db.select({ id: eventCheckIns.id }).from(eventCheckIns).where(eq(eventCheckIns.sessionId, session.id));
      return { ...session, checkInCount: entries.length };
    }));
  }),
  createSession: eventManageProcedure.input(sessionInput).mutation(async ({ ctx, input }) => {
    if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "報到結束時間必須晚於開始時間。" });
    const db = await getDb(); assertDatabase(db);
    const [event] = await db.select({ id: events.id, status: events.status }).from(events).where(eq(events.id, input.eventId)).limit(1);
    if (!event || ["cancelled", "draft"].includes(event.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "此活動目前不能建立 QR 報到場次。" });
    await db.update(eventCheckInSessions).set({ status: "paused" }).where(and(eq(eventCheckInSessions.eventId, input.eventId), eq(eventCheckInSessions.status, "active")));
    const token = issueToken();
    const result = await db.insert(eventCheckInSessions).values({ ...input, tokenHash: digest(token), createdByUserId: ctx.user.id });
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "event_checkin.session_created", targetType: "event_checkin_session", targetId: result[0].insertId, afterData: { eventId: input.eventId, label: input.label, startsAt: input.startsAt, endsAt: input.endsAt } });
    return { id: result[0].insertId, token };
  }),
  rotateToken: eventManageProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); assertDatabase(db);
    const session = await findSession(db, input.sessionId);
    if (session.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "已關閉的報到場次不可輪替 QR。" });
    const token = issueToken();
    await db.update(eventCheckInSessions).set({ tokenHash: digest(token), rotatedAt: new Date() }).where(eq(eventCheckInSessions.id, session.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "event_checkin.token_rotated", targetType: "event_checkin_session", targetId: session.id, beforeData: { eventId: session.eventId }, afterData: { rotatedAt: new Date() } });
    return { token };
  }),
  setSessionStatus: eventManageProcedure.input(z.object({ sessionId: z.number().int().positive(), status: z.enum(["active", "paused", "closed"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); assertDatabase(db);
    const session = await findSession(db, input.sessionId);
    if (session.status === "closed" && input.status !== "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "已關閉的報到場次不可重新啟用。請建立新場次。" });
    await db.update(eventCheckInSessions).set({ status: input.status, closedAt: input.status === "closed" ? new Date() : null }).where(eq(eventCheckInSessions.id, session.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: `event_checkin.session_${input.status}`, targetType: "event_checkin_session", targetId: session.id, beforeData: { status: session.status }, afterData: { status: input.status } });
    return { success: true };
  }),
  scan: protectedProcedure.input(z.object({ token: tokenInput })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); assertDatabase(db);
    const now = new Date();
    const [session] = await db.select().from(eventCheckInSessions).where(and(eq(eventCheckInSessions.tokenHash, digest(input.token)), eq(eventCheckInSessions.status, "active"), lte(eventCheckInSessions.startsAt, now), gte(eventCheckInSessions.endsAt, now))).limit(1);
    if (!session) throw new TRPCError({ code: "BAD_REQUEST", message: "此 QR 已失效、尚未開放或目前暫停使用。" });
    const [event] = await db.select({ id: events.id, title: events.title, status: events.status }).from(events).where(eq(events.id, session.eventId)).limit(1);
    if (!event || event.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "此活動目前無法簽到。" });
    const [registration] = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, session.eventId), eq(eventRegistrations.userId, ctx.user.id))).limit(1);
    if (!registration || registration.status === "cancelled" || registration.status === "waitlisted") throw new TRPCError({ code: "FORBIDDEN", message: "僅限已完成報名的社員使用此 QR 簽到。" });
    const [existing] = await db.select().from(eventCheckIns).where(and(eq(eventCheckIns.eventId, session.eventId), eq(eventCheckIns.userId, ctx.user.id))).limit(1);
    if (existing || registration.status === "attended") return { status: "already_checked_in" as const, eventTitle: event.title, checkedInAt: existing?.checkedInAt ?? registration.createdAt };
    const result = await db.insert(eventCheckIns).values({ eventId: session.eventId, sessionId: session.id, registrationId: registration.id, userId: ctx.user.id, method: "qr", attendanceStatus: "attended", recordedByUserId: null, checkedInAt: now });
    await db.update(eventRegistrations).set({ status: "attended" }).where(eq(eventRegistrations.id, registration.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "event_checkin.qr_scanned", targetType: "event_checkin", targetId: result[0].insertId, afterData: { eventId: session.eventId, sessionId: session.id, method: "qr" } });
    return { status: "checked_in" as const, eventTitle: event.title, checkedInAt: now };
  }),
  myHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); assertDatabase(db);
    return db.select({ checkIn: eventCheckIns, event: { id: events.id, title: events.title, startsAt: events.startsAt, location: events.location }, session: { id: eventCheckInSessions.id, label: eventCheckInSessions.label } }).from(eventCheckIns).innerJoin(events, eq(eventCheckIns.eventId, events.id)).innerJoin(eventCheckInSessions, eq(eventCheckIns.sessionId, eventCheckInSessions.id)).where(eq(eventCheckIns.userId, ctx.user.id)).orderBy(desc(eventCheckIns.checkedInAt)).limit(20);
  }),
  manageEntries: eventManageProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb(); assertDatabase(db);
    const session = await findSession(db, input.sessionId);
    const registrations = await db.select({ registration: eventRegistrations, user: { id: users.id, name: users.name, email: users.email, studentNumber: users.studentNumber } }).from(eventRegistrations).innerJoin(users, eq(eventRegistrations.userId, users.id)).where(eq(eventRegistrations.eventId, session.eventId)).orderBy(asc(eventRegistrations.registeredAt));
    const entries = await db.select().from(eventCheckIns).where(eq(eventCheckIns.eventId, session.eventId));
    return { session, entries: registrations.map(row => ({ ...row, checkIn: entries.find(entry => entry.registrationId === row.registration.id) ?? null })) };
  }),
  recordManual: eventManageProcedure.input(z.object({ sessionId: z.number().int().positive(), registrationId: z.number().int().positive(), attendanceStatus: z.enum(["attended", "absent"]), correctionReason: z.string().trim().min(1).max(300) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); assertDatabase(db);
    const session = await findSession(db, input.sessionId);
    if (session.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "已關閉的報到場次不可再更正。" });
    const [registration] = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.id, input.registrationId), eq(eventRegistrations.eventId, session.eventId))).limit(1);
    if (!registration || registration.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "此報名紀錄不可進行人工出席登錄。" });
    const [existing] = await db.select().from(eventCheckIns).where(eq(eventCheckIns.registrationId, registration.id)).limit(1);
    const now = new Date();
    if (existing) await db.update(eventCheckIns).set({ sessionId: session.id, method: "manual", attendanceStatus: input.attendanceStatus, recordedByUserId: ctx.user.id, correctionReason: input.correctionReason, checkedInAt: now }).where(eq(eventCheckIns.id, existing.id));
    else await db.insert(eventCheckIns).values({ eventId: session.eventId, sessionId: session.id, registrationId: registration.id, userId: registration.userId, method: "manual", attendanceStatus: input.attendanceStatus, recordedByUserId: ctx.user.id, correctionReason: input.correctionReason, checkedInAt: now });
    await db.update(eventRegistrations).set({ status: input.attendanceStatus }).where(eq(eventRegistrations.id, registration.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "event_checkin.manual_recorded", targetType: "event_checkin_session", targetId: session.id, beforeData: existing ? { attendanceStatus: existing.attendanceStatus, method: existing.method } : null, afterData: { registrationId: registration.id, attendanceStatus: input.attendanceStatus, correctionReason: input.correctionReason } });
    return { success: true };
  }),
});
