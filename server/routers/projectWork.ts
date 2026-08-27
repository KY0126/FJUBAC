import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, projectAssignments, projectDeliverables, projectMilestones, projects, projectTasks, resources, users } from "../../drizzle/schema";
import { getDb, getUserClubContext } from "../db";
import { canUsePermission, PERMISSION_GROUPS } from "../club/permissions";
import { canUserReadScopedResource } from "../club/resourceAccess";
import { protectedProcedure, router } from "../_core/trpc";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

type ProjectAccess = { project: typeof projects.$inferSelect; canManage: boolean };

async function getProjectAccess(user: { id: number; role: "user" | "admin" }, projectId: number): Promise<ProjectAccess> {
  const db = await getDb();
  assertDatabase(db);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定專案。" });
  if (user.role === "admin") return { project, canManage: true };
  const clubContext = await getUserClubContext(user.id);
  if (canUsePermission({ isPresident: false, permissionGroups: clubContext?.permissionGroups ?? [] }, PERMISSION_GROUPS.projectManageDepartment)) return { project, canManage: true };
  const [assignment] = await db.select().from(projectAssignments).where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, user.id), eq(projectAssignments.status, "active"))).limit(1);
  if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "目前帳號未被指派至此專案。" });
  return { project, canManage: assignment.projectRole === "project_lead" || assignment.projectRole === "advisor" };
}

async function requireProjectManager(user: { id: number; role: "user" | "admin" }, projectId: number) {
  const access = await getProjectAccess(user, projectId);
  if (!access.canManage) throw new TRPCError({ code: "FORBIDDEN", message: "只有專案組長、指導角色或具專案管理權限的幹部可管理此內容。" });
  return access.project;
}

async function assertMilestoneInProject(milestoneId: number | undefined, projectId: number) {
  if (!milestoneId) return;
  const db = await getDb();
  assertDatabase(db);
  const [milestone] = await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId))).limit(1);
  if (!milestone) throw new TRPCError({ code: "BAD_REQUEST", message: "指定的里程碑不屬於此專案。" });
}

async function assertActiveAssignee(assigneeUserId: number | undefined, projectId: number) {
  if (!assigneeUserId) return;
  const db = await getDb();
  assertDatabase(db);
  const [assignment] = await db.select({ id: projectAssignments.id }).from(projectAssignments).where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, assigneeUserId), eq(projectAssignments.status, "active"))).limit(1);
  if (!assignment) throw new TRPCError({ code: "BAD_REQUEST", message: "任務負責人必須是此專案的有效指派成員。" });
}

const milestoneInput = z.object({ projectId: z.number().int().positive(), title: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), dueAt: z.date().optional(), status: z.enum(["planned", "in_progress", "completed", "archived"]).default("planned"), sortOrder: z.number().int().min(0).max(10_000).default(0) });
const taskInput = z.object({ projectId: z.number().int().positive(), milestoneId: z.number().int().positive().optional(), title: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), assigneeUserId: z.number().int().positive().optional(), status: z.enum(["todo", "in_progress", "blocked", "completed", "cancelled"]).default("todo"), priority: z.enum(["low", "normal", "high"]).default("normal"), dueAt: z.date().optional(), sortOrder: z.number().int().min(0).max(10_000).default(0) });
const deliverableInput = z.object({ projectId: z.number().int().positive(), taskId: z.number().int().positive().optional(), resourceId: z.number().int().positive(), title: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), status: z.enum(["draft", "submitted"]).default("draft") });

export const projectWorkRouter = router({
  overview: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    const access = await getProjectAccess(ctx.user, input.projectId);
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
    const milestones = await db.select().from(projectMilestones).where(eq(projectMilestones.projectId, input.projectId)).orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.dueAt));
    const tasks = await db.select({ task: projectTasks, assignee: { id: users.id, name: users.name } }).from(projectTasks).leftJoin(users, eq(projectTasks.assigneeUserId, users.id)).where(eq(projectTasks.projectId, input.projectId)).orderBy(asc(projectTasks.sortOrder), asc(projectTasks.dueAt));
    const deliverables = await db.select({ deliverable: projectDeliverables, resource: { id: resources.id, title: resources.title, fileName: resources.fileName, versionLabel: resources.versionLabel } }).from(projectDeliverables).leftJoin(resources, eq(projectDeliverables.resourceId, resources.id)).where(eq(projectDeliverables.projectId, input.projectId)).orderBy(desc(projectDeliverables.updatedAt));
    return { project, milestones, tasks, deliverables, canManage: access.canManage };
  }),
  members: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    await getProjectAccess(ctx.user, input.projectId);
    return db.select({ userId: projectAssignments.userId, projectRole: projectAssignments.projectRole, name: users.name }).from(projectAssignments).innerJoin(users, eq(projectAssignments.userId, users.id)).where(and(eq(projectAssignments.projectId, input.projectId), eq(projectAssignments.status, "active"))).orderBy(asc(users.name));
  }),
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    assertDatabase(db);
    return db.select({ task: projectTasks, project: { id: projects.id, title: projects.title }, milestone: { id: projectMilestones.id, title: projectMilestones.title } }).from(projectTasks).innerJoin(projects, eq(projectTasks.projectId, projects.id)).leftJoin(projectMilestones, eq(projectTasks.milestoneId, projectMilestones.id)).innerJoin(projectAssignments, and(eq(projectAssignments.projectId, projectTasks.projectId), eq(projectAssignments.userId, ctx.user.id), eq(projectAssignments.status, "active"))).where(and(eq(projectTasks.assigneeUserId, ctx.user.id), inArray(projectTasks.status, ["todo", "in_progress", "blocked"]))).orderBy(asc(projectTasks.dueAt), desc(projectTasks.updatedAt));
  }),
  milestones: router({
    create: protectedProcedure.input(milestoneInput).mutation(async ({ ctx, input }) => {
      await requireProjectManager(ctx.user, input.projectId);
      const db = await getDb(); assertDatabase(db);
      const result = await db.insert(projectMilestones).values({ ...input, description: input.description ?? null, dueAt: input.dueAt ?? null, createdByUserId: ctx.user.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.milestone_created", targetType: "project", targetId: input.projectId, afterData: { milestoneId: result[0].insertId, title: input.title, status: input.status } });
      return { id: result[0].insertId };
    }),
    update: protectedProcedure.input(milestoneInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [existing] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, input.id)).limit(1);
      if (!existing || existing.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要修改的里程碑。" });
      await requireProjectManager(ctx.user, input.projectId);
      const { id, projectId, ...values } = input;
      await db.update(projectMilestones).set({ ...values, description: values.description ?? null, dueAt: values.dueAt ?? null }).where(eq(projectMilestones.id, id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.milestone_updated", targetType: "project", targetId: projectId, beforeData: { milestoneId: id, status: existing.status }, afterData: { milestoneId: id, status: values.status } });
      return { id };
    }),
    archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [existing] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, input.id), eq(projectMilestones.projectId, input.projectId))).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要封存的里程碑。" });
      await requireProjectManager(ctx.user, input.projectId);
      await db.update(projectMilestones).set({ status: "archived" }).where(eq(projectMilestones.id, input.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.milestone_archived", targetType: "project", targetId: input.projectId, beforeData: { milestoneId: input.id, status: existing.status } });
      return { success: true };
    }),
  }),
  tasks: router({
    create: protectedProcedure.input(taskInput).mutation(async ({ ctx, input }) => {
      await requireProjectManager(ctx.user, input.projectId);
      await assertMilestoneInProject(input.milestoneId, input.projectId);
      await assertActiveAssignee(input.assigneeUserId, input.projectId);
      const db = await getDb(); assertDatabase(db);
      const result = await db.insert(projectTasks).values({ ...input, description: input.description ?? null, milestoneId: input.milestoneId ?? null, assigneeUserId: input.assigneeUserId ?? null, dueAt: input.dueAt ?? null, completedAt: input.status === "completed" ? new Date() : null, createdByUserId: ctx.user.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.task_created", targetType: "project", targetId: input.projectId, afterData: { taskId: result[0].insertId, assigneeUserId: input.assigneeUserId ?? null, status: input.status } });
      return { id: result[0].insertId };
    }),
    update: protectedProcedure.input(taskInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, input.id)).limit(1);
      if (!existing || existing.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要修改的任務。" });
      await requireProjectManager(ctx.user, input.projectId);
      await assertMilestoneInProject(input.milestoneId, input.projectId);
      await assertActiveAssignee(input.assigneeUserId, input.projectId);
      const { id, projectId, ...values } = input;
      await db.update(projectTasks).set({ ...values, description: values.description ?? null, milestoneId: values.milestoneId ?? null, assigneeUserId: values.assigneeUserId ?? null, dueAt: values.dueAt ?? null, completedAt: values.status === "completed" ? existing.completedAt ?? new Date() : null }).where(eq(projectTasks.id, id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.task_updated", targetType: "project", targetId: projectId, beforeData: { taskId: id, status: existing.status, assigneeUserId: existing.assigneeUserId }, afterData: { taskId: id, status: values.status, assigneeUserId: values.assigneeUserId ?? null } });
      return { id };
    }),
    cancel: protectedProcedure.input(z.object({ id: z.number().int().positive(), projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [existing] = await db.select().from(projectTasks).where(and(eq(projectTasks.id, input.id), eq(projectTasks.projectId, input.projectId))).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要取消的任務。" });
      await requireProjectManager(ctx.user, input.projectId);
      await db.update(projectTasks).set({ status: "cancelled", completedAt: null }).where(eq(projectTasks.id, input.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.task_cancelled", targetType: "project", targetId: input.projectId, beforeData: { taskId: input.id, status: existing.status } });
      return { success: true };
    }),
    updateMineStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["todo", "in_progress", "blocked", "completed"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [task] = await db.select().from(projectTasks).where(and(eq(projectTasks.id, input.id), eq(projectTasks.assigneeUserId, ctx.user.id))).limit(1);
      if (!task) throw new TRPCError({ code: "FORBIDDEN", message: "只能更新自己被指派的有效任務。" });
      await getProjectAccess(ctx.user, task.projectId);
      await db.update(projectTasks).set({ status: input.status, completedAt: input.status === "completed" ? task.completedAt ?? new Date() : null }).where(eq(projectTasks.id, input.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.task_status_updated_by_assignee", targetType: "project", targetId: task.projectId, beforeData: { taskId: task.id, status: task.status }, afterData: { taskId: task.id, status: input.status } });
      return { id: task.id, status: input.status };
    }),
  }),
  deliverables: router({
    create: protectedProcedure.input(deliverableInput).mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(ctx.user, input.projectId);
      const db = await getDb(); assertDatabase(db);
      if (input.taskId) {
        const [task] = await db.select({ id: projectTasks.id }).from(projectTasks).where(and(eq(projectTasks.id, input.taskId), eq(projectTasks.projectId, input.projectId))).limit(1);
        if (!task) throw new TRPCError({ code: "BAD_REQUEST", message: "指定任務不屬於此專案。" });
      }
      const [resource] = await db.select().from(resources).where(and(eq(resources.id, input.resourceId), eq(resources.projectId, input.projectId))).limit(1);
      if (!resource || !(await canUserReadScopedResource(ctx.user.id, resource))) throw new TRPCError({ code: "FORBIDDEN", message: "交付物必須連結目前可讀取的專案資源。" });
      const result = await db.insert(projectDeliverables).values({ ...input, taskId: input.taskId ?? null, description: input.description ?? null, submittedByUserId: ctx.user.id, submittedAt: input.status === "submitted" ? new Date() : null });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.deliverable_created", targetType: "project", targetId: input.projectId, afterData: { deliverableId: result[0].insertId, resourceId: input.resourceId, status: input.status, isManager: access.canManage } });
      return { id: result[0].insertId };
    }),
    submit: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [deliverable] = await db.select().from(projectDeliverables).where(eq(projectDeliverables.id, input.id)).limit(1);
      if (!deliverable) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要提交的交付物。" });
      const access = await getProjectAccess(ctx.user, deliverable.projectId);
      if (!access.canManage && deliverable.submittedByUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能提交自己建立的交付物。" });
      await db.update(projectDeliverables).set({ status: "submitted", submittedAt: new Date(), submittedByUserId: ctx.user.id }).where(eq(projectDeliverables.id, input.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.deliverable_submitted", targetType: "project", targetId: deliverable.projectId, afterData: { deliverableId: input.id } });
      return { success: true };
    }),
    review: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["accepted", "archived"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const [deliverable] = await db.select().from(projectDeliverables).where(eq(projectDeliverables.id, input.id)).limit(1);
      if (!deliverable) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要處理的交付物。" });
      await requireProjectManager(ctx.user, deliverable.projectId);
      await db.update(projectDeliverables).set({ status: input.status }).where(eq(projectDeliverables.id, input.id));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: input.status === "accepted" ? "project.deliverable_accepted" : "project.deliverable_archived", targetType: "project", targetId: deliverable.projectId, beforeData: { deliverableId: input.id, status: deliverable.status }, afterData: { deliverableId: input.id, status: input.status } });
      return { success: true };
    }),
  }),
});
