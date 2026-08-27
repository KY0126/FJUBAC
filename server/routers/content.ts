import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";
import { announcements, auditLogs, departments, eventRegistrations, events, projectAssignments, siteDisplaySettings, users } from "../../drizzle/schema";
import { getDb, getUserClubContext } from "../db";
import { adminProcedure, contentManageProcedure, eventManageProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS, DEPARTMENT_CAROUSEL_MAX_INTERVAL_MS, DEPARTMENT_CAROUSEL_MIN_INTERVAL_MS } from "../club/siteDisplaySettings";

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

const announcementInput = z.object({
  title: z.string().trim().min(2).max(220),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1).max(20_000),
  category: z.enum(["general", "recruitment", "event", "academic", "external", "governance"]).default("general"),
  coverImageDataUrl: z.string().max(8_000_000).optional(),
  visibility: z.enum(["public", "member", "project", "officer"]),
  status: z.enum(["draft", "published", "archived"]),
});

async function storeAnnouncementCover(dataUrl: string | undefined, actorUserId: number) {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "公告封面必須是 PNG、JPEG、WebP 或 GIF 圖片。" });
  const [, mimeType, encoded] = matches;
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.byteLength > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "公告封面上限為 5MB。" });
  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
  const { url } = await storagePut(`club-announcement-covers/${actorUserId}/${Date.now()}.${extension}`, buffer, mimeType);
  return url;
}

export const contentRouter = router({
  displaySettings: router({
    publicRead: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { departmentCarouselIntervalMs: DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS };
      const [settings] = await db.select({ departmentCarouselIntervalMs: siteDisplaySettings.departmentCarouselIntervalMs }).from(siteDisplaySettings).where(eq(siteDisplaySettings.id, 1)).limit(1);
      return { departmentCarouselIntervalMs: settings?.departmentCarouselIntervalMs ?? DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS };
    }),
    manageRead: adminProcedure.query(async () => {
      const db = await getDb();
      assertDatabase(db);
      const [settings] = await db.select({ departmentCarouselIntervalMs: siteDisplaySettings.departmentCarouselIntervalMs, updatedAt: siteDisplaySettings.updatedAt }).from(siteDisplaySettings).where(eq(siteDisplaySettings.id, 1)).limit(1);
      return settings ?? { departmentCarouselIntervalMs: DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS, updatedAt: null };
    }),
    update: adminProcedure.input(z.object({ departmentCarouselIntervalMs: z.number().int().min(DEPARTMENT_CAROUSEL_MIN_INTERVAL_MS).max(DEPARTMENT_CAROUSEL_MAX_INTERVAL_MS) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [existing] = await db.select({ departmentCarouselIntervalMs: siteDisplaySettings.departmentCarouselIntervalMs }).from(siteDisplaySettings).where(eq(siteDisplaySettings.id, 1)).limit(1);
      await db.insert(siteDisplaySettings).values({ id: 1, departmentCarouselIntervalMs: input.departmentCarouselIntervalMs, updatedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { departmentCarouselIntervalMs: input.departmentCarouselIntervalMs, updatedByUserId: ctx.user.id } });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "site_display.department_carousel_interval_updated", targetType: "site_display_settings", targetId: 1, beforeData: { departmentCarouselIntervalMs: existing?.departmentCarouselIntervalMs ?? DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS }, afterData: { departmentCarouselIntervalMs: input.departmentCarouselIntervalMs } });
      return { departmentCarouselIntervalMs: input.departmentCarouselIntervalMs };
    }),
  }),
  announcements: router({
    publicList: publicProcedure.input(z.object({ category: z.enum(["general", "recruitment", "event", "academic", "external", "governance"]).optional() }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(announcements.status, "published"), eq(announcements.visibility, "public")];
      if (input?.category) conditions.push(eq(announcements.category, input.category));
      return db.select().from(announcements).where(and(...conditions)).orderBy(desc(announcements.publishedAt)).limit(24);
    }),
    create: contentManageProcedure.input(announcementInput).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const publishedAt = input.status === "published" ? new Date() : null;
      const coverImageUrl = await storeAnnouncementCover(input.coverImageDataUrl, ctx.user!.id);
      const { coverImageDataUrl: _coverImageDataUrl, ...announcementData } = input;
      const result = await db.insert(announcements).values({ ...announcementData, coverImageUrl, publishedAt, createdByUserId: ctx.user!.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user!.id, action: "announcement.created", targetType: "announcement", targetId: result[0].insertId, afterData: { status: input.status, visibility: input.visibility, category: input.category, hasCover: Boolean(coverImageUrl) } });
      return { id: result[0].insertId };
    }),
  }),
  departments: router({
    publicList: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: departments.id, code: departments.code, name: departments.name, englishName: departments.englishName, description: departments.description }).from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.id));
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
    myRegistrationStatuses: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDatabase(db);
      return db.select({ eventId: eventRegistrations.eventId, status: eventRegistrations.status, waitlistPosition: eventRegistrations.waitlistPosition }).from(eventRegistrations).where(eq(eventRegistrations.userId, ctx.user.id));
    }),
    listManage: eventManageProcedure.query(async () => {
      const db = await getDb();
      assertDatabase(db);
      return db.select().from(events).orderBy(desc(events.startsAt));
    }),
    registrationsManage: eventManageProcedure.input(z.object({ eventId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, input.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定活動。" });
      return db.select({ registration: eventRegistrations, user: { id: users.id, name: users.name, email: users.email, studentNumber: users.studentNumber } }).from(eventRegistrations).innerJoin(users, eq(eventRegistrations.userId, users.id)).where(eq(eventRegistrations.eventId, input.eventId)).orderBy(asc(eventRegistrations.registeredAt));
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
    update: eventManageProcedure.input(eventInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "活動結束時間必須晚於開始時間。" });
      if (input.registrationDeadlineAt && input.registrationDeadlineAt > input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "報名截止時間不得晚於活動開始時間。" });
      if (input.visibility === "project" && !input.projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "專案限定活動必須指定專案。" });
      const db = await getDb();
      assertDatabase(db);
      const [existing] = await db.select().from(events).where(eq(events.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要修改的活動。" });
      const { id, ...eventData } = input;
      await db.update(events).set({ ...eventData, projectId: eventData.projectId ?? null }).where(eq(events.id, id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user!.id, action: "event.updated", targetType: "event", targetId: id, beforeData: { title: existing.title, visibility: existing.visibility, status: existing.status }, afterData: { title: eventData.title, visibility: eventData.visibility, status: eventData.status } });
      return { id };
    }),
    delete: eventManageProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [existing] = await db.select().from(events).where(eq(events.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要刪除的活動。" });
      await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, input.id));
      await db.delete(events).where(eq(events.id, input.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user!.id, action: "event.deleted", targetType: "event", targetId: input.id, beforeData: { title: existing.title, visibility: existing.visibility, status: existing.status } });
      return { success: true } as const;
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
    markAttendance: eventManageProcedure.input(z.object({ registrationId: z.number().int().positive(), status: z.enum(["attended", "absent"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [registration] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.id, input.registrationId)).limit(1);
      if (!registration) throw new TRPCError({ code: "NOT_FOUND", message: "找不到活動報名資料。" });
      if (!["registered", "waitlisted", "attended", "absent"].includes(registration.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "已取消的報名無法登錄出席。" });
      await db.update(eventRegistrations).set({ status: input.status }).where(eq(eventRegistrations.id, input.registrationId));
      await db.insert(auditLogs).values({ actorUserId: ctx.user!.id, action: `event.attendance_marked_${input.status}`, targetType: "event", targetId: registration.eventId, beforeData: { registrationId: registration.id, status: registration.status }, afterData: { registrationId: registration.id, status: input.status } });
      return { success: true };
    }),
  }),
});
