import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, memberships, users, verificationCodes } from "../../drizzle/schema";
import { canManageAccount, toAccountAuditData } from "../club/accountManagementRules";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

const accountStatus = z.enum(["pending_activation", "active", "inactive"]);
const membershipStatus = z.enum(["active", "inactive", "alumni"]);
const accountIdInput = z.object({ userId: z.number().int().positive() });

async function getManagedAccount(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, actorUserId: number, userId: number) {
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定帳號。" });
  if (!canManageAccount(actorUserId, account)) throw new TRPCError({ code: "FORBIDDEN", message: "不可管理自己的帳號或 OAuth 治理帳號。" });
  const [membership] = await db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
  return { account, membership };
}

export const accountsRouter = router({
  list: adminProcedure.input(z.object({ query: z.string().trim().max(120).optional(), accountStatus: accountStatus.optional(), membershipStatus: membershipStatus.optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    assertDatabase(db);
    const conditions = [];
    if (input?.accountStatus) conditions.push(eq(users.accountStatus, input.accountStatus));
    if (input?.membershipStatus) conditions.push(eq(memberships.status, input.membershipStatus));
    if (input?.query) {
      const query = `%${input.query}%`;
      conditions.push(or(like(users.name, query), like(users.email, query), like(users.studentNumber, query)));
    }
    return db.select({ user: { id: users.id, name: users.name, email: users.email, loginMethod: users.loginMethod, role: users.role, accountType: users.accountType, studentNumber: users.studentNumber, accountStatus: users.accountStatus, createdAt: users.createdAt, updatedAt: users.updatedAt, lastSignedIn: users.lastSignedIn }, membership: { id: memberships.id, status: memberships.status, cohort: memberships.cohort, joinedAt: memberships.joinedAt, endedAt: memberships.endedAt } }).from(users).leftJoin(memberships, eq(memberships.userId, users.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(users.updatedAt));
  }),
  updateProfile: adminProcedure.input(accountIdInput.extend({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(320), studentNumber: z.string().trim().max(32).optional(), membershipStatus: membershipStatus.optional(), cohort: z.string().trim().max(40).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    const { account, membership } = await getManagedAccount(db, ctx.user.id, input.userId);
    if (account.accountType === "internal" && !input.studentNumber) throw new TRPCError({ code: "BAD_REQUEST", message: "校內帳號需保留學號。" });
    const beforeData = toAccountAuditData(account, membership?.status ?? null);
    await db.update(users).set({ name: input.name, email: input.email.toLowerCase(), studentNumber: account.accountType === "internal" ? input.studentNumber : null }).where(eq(users.id, input.userId));
    if (membership && input.membershipStatus) await db.update(memberships).set({ status: input.membershipStatus, cohort: input.cohort || null, endedAt: input.membershipStatus === "active" ? null : new Date() }).where(eq(memberships.id, membership.id));
    const [updated] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    const [updatedMembership] = await db.select().from(memberships).where(eq(memberships.userId, input.userId)).limit(1);
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "account.admin_profile_updated", targetType: "user", targetId: input.userId, beforeData, afterData: updated ? toAccountAuditData(updated, updatedMembership?.status ?? null) : null });
    return { success: true };
  }),
  setStatus: adminProcedure.input(accountIdInput.extend({ status: accountStatus, reason: z.string().trim().min(3).max(255) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    const { account, membership } = await getManagedAccount(db, ctx.user.id, input.userId);
    const beforeData = toAccountAuditData(account, membership?.status ?? null);
    await db.update(users).set({ accountStatus: input.status }).where(eq(users.id, input.userId));
    const [updated] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: input.status === "inactive" ? "account.admin_deactivated" : "account.admin_status_updated", targetType: "user", targetId: input.userId, beforeData, afterData: { ...(updated ? toAccountAuditData(updated, membership?.status ?? null) : {}), reason: input.reason } });
    return { success: true };
  }),
  resetActivation: adminProcedure.input(accountIdInput.extend({ reason: z.string().trim().min(3).max(255) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    assertDatabase(db);
    const { account, membership } = await getManagedAccount(db, ctx.user.id, input.userId);
    if (account.accountStatus === "inactive") throw new TRPCError({ code: "BAD_REQUEST", message: "請先復原帳號，再重設啟用流程。" });
    const beforeData = toAccountAuditData(account, membership?.status ?? null);
    const now = new Date();
    await db.update(verificationCodes).set({ consumedAt: now }).where(and(eq(verificationCodes.userId, input.userId), eq(verificationCodes.purpose, "activation")));
    await db.update(users).set({ accountStatus: "pending_activation", passwordHash: null }).where(eq(users.id, input.userId));
    const [updated] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "account.admin_activation_reset", targetType: "user", targetId: input.userId, beforeData, afterData: { ...(updated ? toAccountAuditData(updated, membership?.status ?? null) : {}), reason: input.reason } });
    return { success: true };
  }),
});
