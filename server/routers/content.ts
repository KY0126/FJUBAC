import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";
import { announcements, auditLogs, eventRegistrations, events, projectAssignments } from "../../drizzle/schema";
import { getDb, getUserClubContext } from "../db";
import { contentManageProcedure, eventManageProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

async function assertEventEligibility(userId: number, event: typeof events.$inferSelect) {
  if (event.visibility === "public") return;
  const context = await getUserClubContext(userId);
  if (event.visibility === "member" && context?.membership?.status === "active") return;
  if (event.visibility === "officer" && (context?.permissionGroups.length ?? 0) > 0) return;
  if (event.visibility === "project" && event.projectId) {
    const db = await getDb();
    assertDatabase(db);
    const [assignment] = await db.select().from(projectAssignments).where(and(eq(projectAssignments.projectId, event.projectId), eq(projectAssignments.userId, userId), eq(projectAssignments.status, "active"))).limit(1);
    if (assignment) return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "目前帳號不符合此活動的參加資格。" });
}

const eventInput = z.object({
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().max(5000).optional(),
  startsAt: z.date(),
  endsAt: z.date(),
  registrationDeadlineAt: z.date().optional(),
  location: z.string().trim().max(240).optional(),
  capacity: z.number().int().min(0).max(2000),
  visibility: z.enum(["public", "member", "project", "officer"]),
  projectId: z.number().int().positive().optional(),
  status: z.enum(["draft", "published", "open", "full", "closed", "cancelled", "completed"]),
});

export const contentRouter = router({
  announcements: router({
    publicList: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(announcements).where(and(eq(announcements.status, "published"), eq(announcements.visibility, "public"))).orderBy(desc(announcements.publishedAt)).limit(12);
    }),
    create: contentManageProcedure.input(z.object({ title: z.string().trim().min(2).max(220), excerpt: z.string().trim().max(500).optional(), content: z.string().trim().min(1).max(20000), visibility: z.enum(["public", "member", "project", "officer"]), status: z.enum(["draft", "published", "archived"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const publishedAt = input.status === "published" ? new Date() : null;
      const result = await db.insert(announcements).values({ ...input, publishedAt, createdByUserId: ctx.user!.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user!.id, action: "announcement.created", targetType: "announcement", targetId: result[0].insertId, afterData: { status: input.status, visibility: input.visibility } });
      return { id: result[0].insertId };
    }),
  }),
  events: router({
    publicList: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(events).where(and(eq(events.visibility, "public"), inArray(events.status, ["published", "open", "full"]))).orderBy(asc(events.startsAt)).limit(24);
    }),
    listForMember: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDatabase(db);
      const context = await getUserClubContext(ctx.user.id);
      const allowed = ["public"] as ("public" | "member" | "project" | "officer")[];
      if (context?.membership?.status === "active") allowed.push("member");
      if ((context?.permissionGroups.length ?? 0) > 0) allowed.push("officer");
      const projectRows = await db.select({ projectId: projectAssignments.projectId }).from(projectAssignments).where(and(eq(projectAssignments.userId, ctx.user.id), eq(projectAssignments.status, "active")));
      const projectIds = projectRows.map(row => row.projectId);
      const visibilityScope = projectIds.length
        ? or(inArray(events.visibility, allowed), and(eq(events.visibility, "project"), inArray(events.projectId, projectIds)))
        : inArray(events.visibility, allowed);
      return db.select().from(events).where(and(visibilityScope, inArray(events.status, ["published", "open", "full"]))).orderBy(asc(events.startsAt));
    }),
    create: eventManageProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "活動結束時間必須晚於開始時間。" });
      if (input.registrationDeadlineAt && input.registrationDeadlineAt > input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "報名截止時間不得晚於活動開始時間。" });
      if (input.visibility === "project" && !input.projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "專案限定活動必須指定專案。" });
      const db = await getDb();
      assertDatabase(db);
      const result = await db.insert(events).values({ ...input, projectId: input.projectId ?? null, createdByUserId: ctx.user!.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user!.id, action: "event.created", targetType: "event", targetId: result[0].insertId, afterData: { visibility: input.visibility, status: input.status } });
      return { id: result[0].insertId };
    }),
    register: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [event] = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      if (!event || !["open", "published", "full"].includes(event.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "此活動目前無法報名。" });
      if (event.registrationDeadlineAt && event.registrationDeadlineAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "此活動已截止報名。" });
      await assertEventEligibility(ctx.user.id, event);
      const [existing] = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, ctx.user.id))).limit(1);
      if (existing && existing.status !== "cancelled") throw new TRPCError({ code: "CONFLICT", message: "你已完成此活動的報名或候補。" });
      const registrations = await db.select({ id: eventRegistrations.id }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "registered")));
      const isRegistered = event.capacity === 0 || registrations.length < event.capacity;
      const waitlistPosition = isRegistered ? null : (await db.select({ id: eventRegistrations.id }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "waitlisted")))).length + 1;
      if (existing) await db.update(eventRegistrations).set({ status: isRegistered ? "registered" : "waitlisted", waitlistPosition, cancelledAt: null, registeredAt: new Date() }).where(eq(eventRegistrations.id, existing.id));
      else await db.insert(eventRegistrations).values({ eventId: event.id, userId: ctx.user.id, status: isRegistered ? "registered" : "waitlisted", waitlistPosition });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: isRegistered ? "event.registered" : "event.waitlisted", targetType: "event", targetId: event.id });
      return { status: isRegistered ? "registered" as const : "waitlisted" as const, waitlistPosition };
    }),
    cancelRegistration: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [registration] = await db.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, input.eventId), eq(eventRegistrations.userId, ctx.user.id))).limit(1);
      if (!registration || ["cancelled", "attended", "absent"].includes(registration.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "目前沒有可取消的有效報名。" });
      await db.update(eventRegistrations).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(eventRegistrations.id, registration.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "event.registration_cancelled", targetType: "event", targetId: input.eventId });
      return { success: true };
    }),
  }),
});
