import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, departments, eventRegistrations, events, memberships, projectAssignments, projects, resourceAccessLogs, resources, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { storageGet, storagePut } from "../storage";
import { projectManageProcedure, protectedProcedure, publicProcedure, resourceManageProcedure, router } from "../_core/trpc";
import { hasPublicProjectConsent, hasPublicResourceConsent } from "../club/publicContentRules";
import { canUserReadScopedResource } from "../club/resourceAccess";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

const projectInput = z.object({ title: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), departmentId: z.number().int().positive().optional(), startsAt: z.date().optional(), endsAt: z.date().optional(), status: z.enum(["draft", "active", "completed", "archived", "cancelled"]), isPublic: z.boolean().default(false), publicSummary: z.string().trim().max(5000).optional(), confirmPublicConsent: z.boolean().default(false) });
const resourceInput = z.object({ title: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().max(120), dataUrl: z.string().min(16).max(14_000_000), visibility: z.enum(["public", "member", "project", "officer"]), projectId: z.number().int().positive().optional(), departmentId: z.number().int().positive().optional(), versionLabel: z.string().trim().max(80).optional(), confirmPublicConsent: z.boolean().default(false) });

export const workspaceRouter = router({
  projects: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDatabase(db);
      return db.select({ project: projects, assignment: projectAssignments }).from(projectAssignments).innerJoin(projects, eq(projectAssignments.projectId, projects.id)).where(and(eq(projectAssignments.userId, ctx.user.id), eq(projectAssignments.status, "active"))).orderBy(desc(projects.updatedAt));
    }),
    create: projectManageProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
      if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "專案結束時間必須晚於開始時間。" });
      if (!hasPublicProjectConsent(input)) throw new TRPCError({ code: "BAD_REQUEST", message: "公開成果需填寫公開摘要並確認已取得公開同意。" });
      const db = await getDb();
      assertDatabase(db);
      const actor = ctx.user;
      if (!actor) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { confirmPublicConsent: _confirmPublicConsent, ...projectData } = input;
      const result = await db.insert(projects).values({ ...projectData, description: input.description ?? null, departmentId: input.departmentId ?? null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, publicSummary: input.isPublic ? input.publicSummary ?? null : null, publicConsentRecordedAt: input.isPublic ? new Date() : null, createdByUserId: actor.id });
      await db.insert(auditLogs).values({ actorUserId: actor.id, action: "project.created", targetType: "project", targetId: result[0].insertId, afterData: { status: input.status, isPublic: input.isPublic, publicConsentRecordedAt: input.isPublic } });
      return { id: result[0].insertId };
    }),
    listManage: projectManageProcedure.query(async () => {
      const db = await getDb();
      assertDatabase(db);
      return db.select().from(projects).where(inArray(projects.status, ["draft", "active", "completed"])).orderBy(desc(projects.updatedAt));
    }),
    publicList: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ project: projects, departmentName: departments.name, departmentEnglishName: departments.englishName }).from(projects).leftJoin(departments, eq(projects.departmentId, departments.id)).where(and(eq(projects.isPublic, true), inArray(projects.status, ["active", "completed"]), sql`${projects.publicConsentRecordedAt} is not null`)).orderBy(desc(projects.updatedAt));
    }),
    assignments: projectManageProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      assertDatabase(db);
      return db.select({ assignment: projectAssignments, user: { id: users.id, name: users.name, email: users.email, studentNumber: users.studentNumber } }).from(projectAssignments).innerJoin(users, eq(projectAssignments.userId, users.id)).where(eq(projectAssignments.projectId, input.projectId)).orderBy(desc(projectAssignments.createdAt));
    }),
    assign: projectManageProcedure.input(z.object({ projectId: z.number().int().positive(), userId: z.number().int().positive(), projectRole: z.enum(["project_member", "project_lead", "advisor"]).default("project_member") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const actor = ctx.user;
      if (!actor) throw new TRPCError({ code: "UNAUTHORIZED" });
      const [membership] = await db.select().from(memberships).where(and(eq(memberships.userId, input.userId), eq(memberships.status, "active"))).limit(1);
      if (!membership) throw new TRPCError({ code: "BAD_REQUEST", message: "只有有效社員可以被指派為專案生。" });
      await db.insert(projectAssignments).values({ ...input }).onDuplicateKeyUpdate({ set: { projectRole: input.projectRole, status: "active", endsAt: null } });
      await db.insert(auditLogs).values({ actorUserId: actor.id, action: "project.assignment_upserted", targetType: "project", targetId: input.projectId, afterData: { userId: input.userId, projectRole: input.projectRole } });
      return { success: true };
    }),
  }),
  resources: router({
    publicList: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select().from(resources).where(and(eq(resources.visibility, "public"), sql`${resources.publicConsentRecordedAt} is not null`)).orderBy(desc(resources.updatedAt));
      return result.map(({ storageKey: _storageKey, ...resource }) => resource);
    }),
    publicDownload: publicProcedure.input(z.object({ resourceId: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [resource] = await db.select().from(resources).where(and(eq(resources.id, input.resourceId), eq(resources.visibility, "public"), sql`${resources.publicConsentRecordedAt} is not null`)).limit(1);
      if (!resource) throw new TRPCError({ code: "NOT_FOUND", message: "找不到可公開下載的資源。" });
      const { url } = await storageGet(resource.storageKey);
      await db.insert(auditLogs).values({ action: "resource.public_download_requested", targetType: "resource", targetId: resource.id });
      return { url, fileName: resource.fileName };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      assertDatabase(db);
      const all = await db.select().from(resources).orderBy(desc(resources.updatedAt));
      const permitted = [] as typeof all;
      for (const item of all) if (await canUserReadScopedResource(ctx.user.id, item)) permitted.push(item);
      return permitted.map(({ storageKey: _storageKey, ...item }) => item);
    }),
    download: protectedProcedure.input(z.object({ resourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [resource] = await db.select().from(resources).where(eq(resources.id, input.resourceId)).limit(1);
      if (!resource || !(await canUserReadScopedResource(ctx.user.id, resource))) throw new TRPCError({ code: "FORBIDDEN", message: "目前帳號沒有下載此資源的權限。" });
      const { url } = await storageGet(resource.storageKey);
      await db.insert(resourceAccessLogs).values({ userId: ctx.user.id, resourceId: resource.id, action: "download" });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "resource.download_requested", targetType: "resource", targetId: resource.id });
      return { url, fileName: resource.fileName };
    }),
    open: protectedProcedure.input(z.object({ resourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const [resource] = await db.select().from(resources).where(eq(resources.id, input.resourceId)).limit(1);
      if (!resource || !(await canUserReadScopedResource(ctx.user.id, resource))) throw new TRPCError({ code: "FORBIDDEN", message: "目前帳號沒有開啟此資源的權限。" });
      const { url } = await storageGet(resource.storageKey);
      await db.insert(resourceAccessLogs).values({ userId: ctx.user.id, resourceId: resource.id, action: "view" });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "resource.open_requested", targetType: "resource", targetId: resource.id });
      return { url, fileName: resource.fileName };
    }),
    upload: resourceManageProcedure.input(resourceInput).mutation(async ({ ctx, input }) => {
      if (input.visibility === "project" && !input.projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "專案限定資源必須指定專案。" });
      if (!hasPublicResourceConsent(input)) throw new TRPCError({ code: "BAD_REQUEST", message: "公開資源需確認已取得公開同意。" });
      const matches = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "檔案格式不正確。" });
      const [, encodedMime, encoded] = matches;
      const buffer = Buffer.from(encoded, "base64");
      if (buffer.byteLength > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "單一檔案上限為 10MB。" });
      const db = await getDb();
      assertDatabase(db);
      const actor = ctx.user;
      if (!actor) throw new TRPCError({ code: "UNAUTHORIZED" });
      const upload = await storagePut(`club-resources/${actor.id}/${input.fileName}`, buffer, input.mimeType || encodedMime);
      const result = await db.insert(resources).values({ title: input.title, description: input.description ?? null, storageKey: upload.key, fileName: input.fileName, mimeType: input.mimeType || encodedMime, visibility: input.visibility, projectId: input.projectId ?? null, departmentId: input.departmentId ?? null, versionLabel: input.versionLabel ?? null, publicConsentRecordedAt: input.visibility === "public" ? new Date() : null, createdByUserId: actor.id });
      await db.insert(auditLogs).values({ actorUserId: actor.id, action: "resource.uploaded", targetType: "resource", targetId: result[0].insertId, afterData: { visibility: input.visibility, fileName: input.fileName, publicConsentRecordedAt: input.visibility === "public" } });
      return { id: result[0].insertId };
    }),
  }),
  members: router({
    activeDirectory: projectManageProcedure.query(async () => {
      const db = await getDb();
      assertDatabase(db);
      return db.select({ id: users.id, name: users.name, email: users.email, studentNumber: users.studentNumber, accountType: users.accountType }).from(users).innerJoin(memberships, eq(memberships.userId, users.id)).where(eq(memberships.status, "active")).orderBy(users.name);
    }),
  }),
});
