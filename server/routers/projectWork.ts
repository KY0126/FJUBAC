import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { auditLogs, learningCareerResourceMappings, personalNotifications, projectAssignments, projectDeliverables, projectMilestones, projectStageDocuments, projects, projectTasks, projectWorkflowStates, projectWorkflowTransitions, resources, users } from "../../drizzle/schema";
import { getDb, getUserClubContext } from "../db";
import { canUsePermission, PERMISSION_GROUPS } from "../club/permissions";
import { canUserReadScopedResource } from "../club/resourceAccess";
import { protectedProcedure, router } from "../_core/trpc";
import { storageGet } from "../storage";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

type ProjectAccess = { project: typeof projects.$inferSelect; canManage: boolean };

export const PROJECT_WORKFLOW_STAGES = [
  { key: "methodology", title: "管顧方法論與問題定義", deliverables: ["Scoping Statement", "問題拆解樹"] },
  { key: "framing", title: "建構問題與專案啟動", deliverables: ["Hypothesis Tree", "Kick-off 簡報"] },
  { key: "industry", title: "環境分析與競爭定位", deliverables: ["3C", "PESTEL", "波特五力"] },
  { key: "qualitative", title: "質性研究與現況診斷", deliverables: ["訪談大綱", "Persona", "CJM"] },
  { key: "quantitative", title: "量化分析與數據驗證", deliverables: ["TAM-SAM-SOM", "財務模型"] },
  { key: "synthesis", title: "核心問題解決與故事線構建", deliverables: ["Midterm Report", "Storyboard"] },
  { key: "mvp", title: "方案設計與原型驗證", deliverables: ["MVP 測試方案", "用戶反饋"] },
  { key: "impact", title: "效益評估與管理交付", deliverables: ["Final Presentation", "ROI 報告"] },
] as const;

type WorkflowStage = (typeof PROJECT_WORKFLOW_STAGES)[number]["key"];
const workflowStageSchema = z.enum(["methodology", "framing", "industry", "qualitative", "quantitative", "synthesis", "mvp", "impact"]);
const careerCategorySchema = z.enum(["club_activities", "workshops", "corporate_visits", "career_preparation"]);
const stageIndex = (stage: WorkflowStage) => PROJECT_WORKFLOW_STAGES.findIndex(item => item.key === stage);

async function hasWorkflowDirectoryAccess(user: { id: number; role: "user" | "admin" }) {
  if (user.role === "admin") return true;
  const clubContext = await getUserClubContext(user.id);
  if (canUsePermission({ isPresident: false, permissionGroups: clubContext?.permissionGroups ?? [] }, PERMISSION_GROUPS.projectManageDepartment)) return true;
  const db = await getDb(); assertDatabase(db);
  const [assignment] = await db.select({ id: projectAssignments.id }).from(projectAssignments).where(and(eq(projectAssignments.userId, user.id), eq(projectAssignments.status, "active"))).limit(1);
  return Boolean(assignment);
}

async function requireCurriculumManager(user: { id: number; role: "user" | "admin" }) {
  if (user.role === "admin") return;
  const clubContext = await getUserClubContext(user.id);
  if (!canUsePermission({ isPresident: false, permissionGroups: clubContext?.permissionGroups ?? [] }, PERMISSION_GROUPS.projectManageDepartment)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "只有具專案管理權限的專案開發部幹部可管理社團活動。" });
  }
}

async function notifyActiveProjectMembers(projectId: number, title: string, body: string) {
  const db = await getDb(); assertDatabase(db);
  const recipients = await db.select({ userId: projectAssignments.userId }).from(projectAssignments).where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.status, "active")));
  if (recipients.length) await db.insert(personalNotifications).values(recipients.map(recipient => ({ userId: recipient.userId, title, body, href: `/projects/${projectId}`, category: "project" as const })));
}

async function getOrCreateWorkflowState(projectId: number, userId: number) {
  const db = await getDb(); assertDatabase(db);
  const [existing] = await db.select().from(projectWorkflowStates).where(eq(projectWorkflowStates.projectId, projectId)).limit(1);
  if (existing) return existing;
  await db.insert(projectWorkflowStates).values({ projectId, updatedByUserId: userId });
  const [created] = await db.select().from(projectWorkflowStates).where(eq(projectWorkflowStates.projectId, projectId)).limit(1);
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "無法初始化專案流程。" });
  await db.insert(projectWorkflowTransitions).values({ projectId, fromStage: null, toStage: "methodology", direction: "forward", reason: "初始化八階段專案流程", changedByUserId: userId });
  return created;
}

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
  workflow: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!(await hasWorkflowDirectoryAccess(ctx.user))) throw new TRPCError({ code: "FORBIDDEN", message: "僅限有效專案生或具專案管理權限的幹部查看專案流程。" });
      const db = await getDb(); assertDatabase(db);
      const clubContext = await getUserClubContext(ctx.user.id);
      const isDirectoryManager = ctx.user.role === "admin" || canUsePermission({ isPresident: false, permissionGroups: clubContext?.permissionGroups ?? [] }, PERMISSION_GROUPS.projectManageDepartment);
      const rows = isDirectoryManager
        ? await db.select({ project: projects, state: projectWorkflowStates }).from(projects).leftJoin(projectWorkflowStates, eq(projectWorkflowStates.projectId, projects.id)).orderBy(desc(projects.updatedAt))
        : await db.select({ project: projects, state: projectWorkflowStates }).from(projectAssignments).innerJoin(projects, eq(projectAssignments.projectId, projects.id)).leftJoin(projectWorkflowStates, eq(projectWorkflowStates.projectId, projects.id)).where(and(eq(projectAssignments.userId, ctx.user.id), eq(projectAssignments.status, "active"))).orderBy(desc(projects.updatedAt));
      return { stages: PROJECT_WORKFLOW_STAGES, projects: rows.map(row => ({ project: row.project, currentStage: row.state?.currentStage ?? "methodology" })) };
    }),
    detail: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await getDb(); assertDatabase(db);
      const access = await getProjectAccess(ctx.user, input.projectId);
      const state = await getOrCreateWorkflowState(input.projectId, ctx.user.id);
      const allDocuments = await db.select({ document: projectStageDocuments, resource: { id: resources.id, title: resources.title, fileName: resources.fileName }, deliverable: { id: projectDeliverables.id, title: projectDeliverables.title, status: projectDeliverables.status } }).from(projectStageDocuments).leftJoin(resources, eq(projectStageDocuments.resourceId, resources.id)).leftJoin(projectDeliverables, eq(projectStageDocuments.deliverableId, projectDeliverables.id)).where(eq(projectStageDocuments.projectId, input.projectId)).orderBy(asc(projectStageDocuments.createdAt));
      const documents = access.canManage ? allDocuments : allDocuments.filter(row => row.document.status === "active" && stageIndex(row.document.stage) <= stageIndex(state.currentStage));
      const transitions = await db.select().from(projectWorkflowTransitions).where(eq(projectWorkflowTransitions.projectId, input.projectId)).orderBy(desc(projectWorkflowTransitions.createdAt));
      return { project: access.project, stages: PROJECT_WORKFLOW_STAGES, state, documents, transitions, canManage: access.canManage };
    }),
    transition: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), toStage: workflowStageSchema, reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const project = await requireProjectManager(ctx.user, input.projectId);
      const db = await getDb(); assertDatabase(db);
      const state = await getOrCreateWorkflowState(input.projectId, ctx.user.id);
      const fromIndex = stageIndex(state.currentStage), toIndex = stageIndex(input.toStage);
      if (toIndex === fromIndex) throw new TRPCError({ code: "BAD_REQUEST", message: "專案已位於指定階段。" });
      if (toIndex > fromIndex + 1) throw new TRPCError({ code: "BAD_REQUEST", message: "流程只能逐階段前進，不能跳過階段。" });
      const direction = toIndex > fromIndex ? "forward" : "rollback";
      if (direction === "rollback" && !input.reason) throw new TRPCError({ code: "BAD_REQUEST", message: "退回專案階段時必須填寫原因。" });
      if (direction === "rollback") {
        const laterStages = PROJECT_WORKFLOW_STAGES.slice(toIndex + 1).map(item => item.key);
        await db.update(projectStageDocuments).set({ status: "locked" }).where(and(eq(projectStageDocuments.projectId, input.projectId), inArray(projectStageDocuments.stage, laterStages), eq(projectStageDocuments.status, "active")));
      }
      await db.update(projectWorkflowStates).set({ currentStage: input.toStage, updatedByUserId: ctx.user.id }).where(eq(projectWorkflowStates.id, state.id));
      await db.insert(projectWorkflowTransitions).values({ projectId: input.projectId, fromStage: state.currentStage, toStage: input.toStage, direction, reason: input.reason ?? null, changedByUserId: ctx.user.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: direction === "forward" ? "project.workflow_advanced" : "project.workflow_rolled_back", targetType: "project", targetId: input.projectId, beforeData: { stage: state.currentStage }, afterData: { stage: input.toStage, reason: input.reason ?? null } });
      await notifyActiveProjectMembers(input.projectId, `${project.title}：流程${direction === "forward" ? "前進" : "退回"}`, `目前階段為「${PROJECT_WORKFLOW_STAGES[toIndex].title}」。${input.reason ? `退回原因：${input.reason}` : ""}`);
      return { currentStage: input.toStage, direction };
    }),
    exportStageDocuments: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), stage: workflowStageSchema })).mutation(async ({ ctx, input }) => {
      const access = await getProjectAccess(ctx.user, input.projectId);
      const db = await getDb(); assertDatabase(db);
      const rows = await db.select({ document: projectStageDocuments, resource: { id: resources.id, title: resources.title, fileName: resources.fileName, storageKey: resources.storageKey, visibility: resources.visibility, projectId: resources.projectId } }).from(projectStageDocuments).innerJoin(resources, eq(projectStageDocuments.resourceId, resources.id)).where(and(eq(projectStageDocuments.projectId, input.projectId), eq(projectStageDocuments.stage, input.stage), eq(projectStageDocuments.status, "active")));
      const readableRows = []; for (const row of rows) if (row.resource.storageKey && await canUserReadScopedResource(ctx.user.id, row.resource)) readableRows.push(row);
      const files = await Promise.all(readableRows.map(async row => ({ documentId: row.document.id, title: row.document.title, fileName: row.resource.fileName, url: (await storageGet(row.resource.storageKey)).url })));
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.workflow_stage_documents_exported", targetType: "project", targetId: input.projectId, afterData: { stage: input.stage, documentCount: files.length, managerAccess: access.canManage } });
      return { files };
    }),
    documents: router({
      create: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), stage: workflowStageSchema, resourceId: z.number().int().positive().optional(), deliverableId: z.number().int().positive().optional(), title: z.string().trim().min(2).max(200), summary: z.string().trim().max(5000).optional() })).mutation(async ({ ctx, input }) => {
        await requireProjectManager(ctx.user, input.projectId);
        const db = await getDb(); assertDatabase(db);
        if (input.resourceId) { const [resource] = await db.select({ id: resources.id }).from(resources).where(and(eq(resources.id, input.resourceId), eq(resources.projectId, input.projectId))).limit(1); if (!resource) throw new TRPCError({ code: "BAD_REQUEST", message: "指定資源不屬於此專案。" }); }
        if (input.deliverableId) { const [deliverable] = await db.select({ id: projectDeliverables.id }).from(projectDeliverables).where(and(eq(projectDeliverables.id, input.deliverableId), eq(projectDeliverables.projectId, input.projectId))).limit(1); if (!deliverable) throw new TRPCError({ code: "BAD_REQUEST", message: "指定交付物不屬於此專案。" }); }
        const result = await db.insert(projectStageDocuments).values({ ...input, resourceId: input.resourceId ?? null, deliverableId: input.deliverableId ?? null, summary: input.summary ?? null, createdByUserId: ctx.user.id });
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.workflow_document_created", targetType: "project", targetId: input.projectId, afterData: { documentId: result[0].insertId, stage: input.stage } });
        return { id: result[0].insertId };
      }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), projectId: z.number().int().positive(), title: z.string().trim().min(2).max(200), summary: z.string().trim().max(5000).optional(), status: z.enum(["active", "locked", "archived"]).optional() })).mutation(async ({ ctx, input }) => {
        await requireProjectManager(ctx.user, input.projectId);
        const db = await getDb(); assertDatabase(db);
        const [document] = await db.select().from(projectStageDocuments).where(and(eq(projectStageDocuments.id, input.id), eq(projectStageDocuments.projectId, input.projectId))).limit(1);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定的階段文件。" });
        await db.update(projectStageDocuments).set({ title: input.title, summary: input.summary ?? null, status: input.status ?? document.status }).where(eq(projectStageDocuments.id, input.id));
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.workflow_document_updated", targetType: "project", targetId: input.projectId, beforeData: { documentId: input.id, status: document.status }, afterData: { documentId: input.id, status: input.status ?? document.status } });
        return { id: input.id };
      }),
      archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        await requireProjectManager(ctx.user, input.projectId);
        const db = await getDb(); assertDatabase(db);
        const [document] = await db.select().from(projectStageDocuments).where(and(eq(projectStageDocuments.id, input.id), eq(projectStageDocuments.projectId, input.projectId))).limit(1);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定的階段文件。" });
        await db.update(projectStageDocuments).set({ status: "archived" }).where(eq(projectStageDocuments.id, input.id));
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "project.workflow_document_archived", targetType: "project", targetId: input.projectId, beforeData: { documentId: input.id, status: document.status } });
        return { success: true };
      }),
    }),
  }),
  learningCareerMap: router({
    list: protectedProcedure.input(z.object({ category: careerCategorySchema.optional() }).optional()).query(async ({ ctx, input }) => {
      if (!(await hasWorkflowDirectoryAccess(ctx.user))) throw new TRPCError({ code: "FORBIDDEN", message: "僅限有效專案生或具專案管理權限的幹部查看社團活動。" });
      const db = await getDb(); assertDatabase(db);
      const rows = await db.select({ mapping: learningCareerResourceMappings, resource: resources }).from(learningCareerResourceMappings).innerJoin(resources, eq(learningCareerResourceMappings.resourceId, resources.id)).where(input?.category ? eq(learningCareerResourceMappings.category, input.category) : undefined).orderBy(asc(learningCareerResourceMappings.category), asc(learningCareerResourceMappings.displayOrder));
      const readable = []; for (const row of rows) if (await canUserReadScopedResource(ctx.user.id, row.resource)) readable.push(row); return readable;
    }),
    mapResource: protectedProcedure.input(z.object({ resourceId: z.number().int().positive(), category: careerCategorySchema, displayOrder: z.number().int().min(0).max(10000).default(0) })).mutation(async ({ ctx, input }) => {
      await requireCurriculumManager(ctx.user); const db = await getDb(); assertDatabase(db);
      const [resource] = await db.select({ id: resources.id }).from(resources).where(eq(resources.id, input.resourceId)).limit(1); if (!resource) throw new TRPCError({ code: "NOT_FOUND", message: "找不到要分類的資源。" });
      const [existing] = await db.select().from(learningCareerResourceMappings).where(eq(learningCareerResourceMappings.resourceId, input.resourceId)).limit(1);
      if (existing) await db.update(learningCareerResourceMappings).set({ category: input.category, displayOrder: input.displayOrder, createdByUserId: ctx.user.id }).where(eq(learningCareerResourceMappings.id, existing.id)); else await db.insert(learningCareerResourceMappings).values({ ...input, createdByUserId: ctx.user.id });
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "learning_career.resource_mapped", targetType: "resource", targetId: input.resourceId, afterData: { category: input.category, displayOrder: input.displayOrder } }); return { success: true };
    }),
    removeResource: protectedProcedure.input(z.object({ resourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await requireCurriculumManager(ctx.user); const db = await getDb(); assertDatabase(db); await db.delete(learningCareerResourceMappings).where(eq(learningCareerResourceMappings.resourceId, input.resourceId)); await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "learning_career.resource_unmapped", targetType: "resource", targetId: input.resourceId }); return { success: true }; }),
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
