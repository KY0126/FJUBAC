import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, eventRegistrations, events, memberships, membershipApplications, personalNotifications, projectAssignments, projects, resourceAccessLogs, resourceFavorites, resources, userPreferences, users } from "../../drizzle/schema";
import { hashPassword, verifyPassword } from "../club/passwords";
import { getDb, getUserClubContext } from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { canUserReadScopedResource } from "../club/resourceAccess";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

function parseAvatar(dataUrl: string) {
  const matches = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "頭像僅支援 PNG、JPEG 或 WebP 圖片。" });
  const [, mimeType, encoded] = matches;
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "頭像圖片大小須介於 1B 至 2MB 之間。" });
  const isPng = mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = mimeType === "image/jpeg" && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const isWebp = mimeType === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (!isPng && !isJpeg && !isWebp) throw new TRPCError({ code: "BAD_REQUEST", message: "頭像內容與宣告的圖片格式不一致。" });
  return { buffer, mimeType };
}

const profileInput = z.object({ name: z.string().trim().min(1).max(120), grade: z.string().trim().max(80).optional(), contact: z.string().trim().max(120).optional() });
const preferencesInput = z.object({ reducedMotion: z.boolean(), inAppNotifications: z.boolean(), emailNotifications: z.boolean(), resourceHistoryVisible: z.boolean() });

async function createInAppNotification(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, notification: { title: string; body: string; href: string; category: "system" | "account" | "activity" | "project" | "recruitment" }) {
  const [preferences] = await db.select({ inAppNotifications: userPreferences.inAppNotifications }).from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (preferences?.inAppNotifications === false) return;
  await db.insert(personalNotifications).values({ userId, ...notification });
}

export const personalRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    assertDatabase(db);
    const userId = ctx.user.id;
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email, accountType: users.accountType, studentNumber: users.studentNumber, accountStatus: users.accountStatus, avatarUrl: users.avatarUrl, grade: users.grade, contact: users.contact, createdAt: users.createdAt, updatedAt: users.updatedAt, lastSignedIn: users.lastSignedIn, lastPasswordChangedAt: users.lastPasswordChangedAt }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "找不到目前帳號。" });
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    const clubContext = await getUserClubContext(userId);
    const assignedProjects = await db.select({ project: projects, assignment: projectAssignments }).from(projectAssignments).innerJoin(projects, eq(projectAssignments.projectId, projects.id)).where(and(eq(projectAssignments.userId, userId), eq(projectAssignments.status, "active"))).orderBy(desc(projects.updatedAt)).limit(5);
    const registrations = await db.select({ registration: eventRegistrations, event: events }).from(eventRegistrations).innerJoin(events, eq(eventRegistrations.eventId, events.id)).where(eq(eventRegistrations.userId, userId)).orderBy(desc(eventRegistrations.createdAt)).limit(5);
    const rawResourceHistory = preferences?.resourceHistoryVisible === false ? [] : await db.select({ log: resourceAccessLogs, resource: { id: resources.id, title: resources.title, fileName: resources.fileName, visibility: resources.visibility, projectId: resources.projectId, mimeType: resources.mimeType } }).from(resourceAccessLogs).innerJoin(resources, eq(resourceAccessLogs.resourceId, resources.id)).where(eq(resourceAccessLogs.userId, userId)).orderBy(desc(resourceAccessLogs.createdAt)).limit(50);
    const resourceHistory = [] as typeof rawResourceHistory;
    for (const entry of rawResourceHistory) if (await canUserReadScopedResource(userId, entry.resource)) resourceHistory.push(entry);
    const rawFavorites = await db.select({ favorite: resourceFavorites, resource: { id: resources.id, title: resources.title, fileName: resources.fileName, visibility: resources.visibility, projectId: resources.projectId } }).from(resourceFavorites).innerJoin(resources, eq(resourceFavorites.resourceId, resources.id)).where(eq(resourceFavorites.userId, userId)).orderBy(desc(resourceFavorites.createdAt)).limit(30);
    const favorites = [] as typeof rawFavorites;
    for (const entry of rawFavorites) if (await canUserReadScopedResource(userId, entry.resource)) favorites.push(entry);
    const notifications = await db.select({ id: personalNotifications.id, title: personalNotifications.title, body: personalNotifications.body, href: personalNotifications.href, category: personalNotifications.category, readAt: personalNotifications.readAt, createdAt: personalNotifications.createdAt }).from(personalNotifications).where(and(eq(personalNotifications.userId, userId), isNull(personalNotifications.archivedAt))).orderBy(desc(personalNotifications.createdAt)).limit(12);
    const audits = await db.select({ id: auditLogs.id, actorUserId: auditLogs.actorUserId, action: auditLogs.action, targetType: auditLogs.targetType, targetId: auditLogs.targetId, createdAt: auditLogs.createdAt }).from(auditLogs).where(or(eq(auditLogs.actorUserId, userId), and(eq(auditLogs.targetType, "user"), eq(auditLogs.targetId, userId)))).orderBy(desc(auditLogs.createdAt)).limit(12);
    const applications = await db.select({ id: membershipApplications.id, status: membershipApplications.status, submittedAt: membershipApplications.submittedAt, updatedAt: membershipApplications.updatedAt }).from(membershipApplications).where(eq(membershipApplications.accountUserId, userId)).orderBy(desc(membershipApplications.updatedAt)).limit(3);
    return { user, membership: clubContext?.membership ?? null, assignments: clubContext?.assignments ?? [], preferences: preferences ?? { reducedMotion: false, inAppNotifications: true, emailNotifications: false, resourceHistoryVisible: true }, projects: assignedProjects, registrations, resourceHistory: resourceHistory.slice(0, 12), favorites, notifications, auditSummary: audits.map(audit => ({ ...audit, source: audit.actorUserId === userId ? "self" as const : "governance" as const })), applications };
  }),
  favoriteIds: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    assertDatabase(db);
    const entries = await db.select({ resourceId: resourceFavorites.resourceId, resource: { visibility: resources.visibility, projectId: resources.projectId } }).from(resourceFavorites).innerJoin(resources, eq(resourceFavorites.resourceId, resources.id)).where(eq(resourceFavorites.userId, ctx.user.id));
    const allowedIds: number[] = [];
    for (const entry of entries) if (await canUserReadScopedResource(ctx.user.id, entry.resource)) allowedIds.push(entry.resourceId);
    return allowedIds;
  }),
  setFavorite: protectedProcedure.input(z.object({ resourceId: z.number().int().positive(), isFavorite: z.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    const [resource] = await db.select({ id: resources.id, visibility: resources.visibility, projectId: resources.projectId }).from(resources).where(eq(resources.id, input.resourceId)).limit(1);
    if (!resource || !(await canUserReadScopedResource(ctx.user.id, resource))) throw new TRPCError({ code: "FORBIDDEN", message: "目前帳號沒有收藏此資源的權限。" });
    if (input.isFavorite) await db.insert(resourceFavorites).values({ userId: ctx.user.id, resourceId: input.resourceId }).onDuplicateKeyUpdate({ set: { resourceId: input.resourceId } });
    else await db.delete(resourceFavorites).where(and(eq(resourceFavorites.userId, ctx.user.id), eq(resourceFavorites.resourceId, input.resourceId)));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: input.isFavorite ? "personal.resource_favorited" : "personal.resource_unfavorited", targetType: "resource", targetId: input.resourceId });
    return { success: true };
  }),
  markNotificationRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    await db.update(personalNotifications).set({ readAt: new Date() }).where(and(eq(personalNotifications.id, input.notificationId), eq(personalNotifications.userId, ctx.user.id), isNull(personalNotifications.archivedAt)));
    return { success: true };
  }),
  archiveNotification: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    await db.update(personalNotifications).set({ archivedAt: new Date() }).where(and(eq(personalNotifications.id, input.notificationId), eq(personalNotifications.userId, ctx.user.id), isNull(personalNotifications.archivedAt)));
    return { success: true };
  }),
  updateProfile: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    const [before] = await db.select({ name: users.name, grade: users.grade, contact: users.contact }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    await db.update(users).set({ name: input.name, grade: input.grade || null, contact: input.contact || null }).where(eq(users.id, ctx.user.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "personal.profile_updated", targetType: "user", targetId: ctx.user.id, beforeData: before ?? null, afterData: { name: input.name, grade: input.grade || null, contact: input.contact || null } });
    await createInAppNotification(db, ctx.user.id, { title: "個人資料已更新", body: "你的姓名、年級或聯絡方式已由本人更新。", href: "/me#profile", category: "account" });
    return { success: true };
  }),
  updatePreferences: protectedProcedure.input(preferencesInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    await db.insert(userPreferences).values({ userId: ctx.user.id, ...input }).onDuplicateKeyUpdate({ set: { ...input } });
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "personal.preferences_updated", targetType: "user", targetId: ctx.user.id, afterData: { reducedMotion: input.reducedMotion, inAppNotifications: input.inAppNotifications, emailNotifications: input.emailNotifications, resourceHistoryVisible: input.resourceHistoryVisible } });
    return { success: true };
  }),
  uploadAvatar: protectedProcedure.input(z.object({ dataUrl: z.string().min(32).max(3_000_000) })).mutation(async ({ ctx, input }) => {
    const { buffer, mimeType } = parseAvatar(input.dataUrl);
    const db = await getDb();
    assertDatabase(db);
    const extension = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
    const upload = await storagePut(`member-avatars/${ctx.user.id}/avatar.${extension}`, buffer, mimeType);
    await db.update(users).set({ avatarStorageKey: upload.key, avatarUrl: upload.url }).where(eq(users.id, ctx.user.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "personal.avatar_uploaded", targetType: "user", targetId: ctx.user.id, afterData: { hasAvatar: true } });
    await createInAppNotification(db, ctx.user.id, { title: "個人頭像已更新", body: "你的個人頭像已成功儲存。", href: "/me#profile", category: "account" });
    return { avatarUrl: upload.url };
  }),
  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    assertDatabase(db);
    await db.update(users).set({ avatarStorageKey: null, avatarUrl: null }).where(eq(users.id, ctx.user.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "personal.avatar_removed", targetType: "user", targetId: ctx.user.id, afterData: { hasAvatar: false } });
    return { success: true };
  }),
  changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12, "新密碼至少需 12 個字元。").max(128), confirmPassword: z.string() })).mutation(async ({ ctx, input }) => {
    if (input.newPassword !== input.confirmPassword) throw new TRPCError({ code: "BAD_REQUEST", message: "兩次輸入的新密碼不一致。" });
    const db = await getDb();
    assertDatabase(db);
    const [account] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!account || account.accountType === "oauth") throw new TRPCError({ code: "BAD_REQUEST", message: "Manus OAuth 帳號不使用社團密碼，請在 Manus 帳號服務調整安全設定。" });
    if (!verifyPassword(input.currentPassword, account.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "目前密碼不正確。" });
    await db.update(users).set({ passwordHash: hashPassword(input.newPassword), lastPasswordChangedAt: new Date() }).where(eq(users.id, ctx.user.id));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "personal.password_changed", targetType: "user", targetId: ctx.user.id });
    await createInAppNotification(db, ctx.user.id, { title: "登入密碼已更新", body: "你的社團帳號登入密碼已由本人變更。若非本人操作，請立即聯絡社團管理者。", href: "/me#security", category: "account" });
    return { success: true };
  }),
});
