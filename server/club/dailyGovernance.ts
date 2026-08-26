import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { auditLogs, officerAssignments, scheduledJobs, verificationCodes } from "../../drizzle/schema";
import { getDb } from "../db";
import { DAILY_GOVERNANCE_JOB_KEY, governanceWindow } from "./governanceRules";

export type DailyGovernanceSummary = { expiredAssignments: number; reminder30Due: number; reminder7Due: number; cleanedVerificationCodes: number; completedAt: string };

export async function runDailyGovernance(): Promise<DailyGovernanceSummary> {
  const db = await getDb();
  if (!db) throw new Error("資料服務暫時無法使用");
  const now = new Date();
  const in30 = governanceWindow(now, 30);
  const in7 = governanceWindow(now, 7);
  const expired = await db.select({ id: officerAssignments.id, userId: officerAssignments.userId, endsOn: officerAssignments.endsOn }).from(officerAssignments).where(and(eq(officerAssignments.status, "active"), lte(officerAssignments.endsOn, now)));
  for (const assignment of expired) {
    await db.update(officerAssignments).set({ status: "ended", revokedAt: now, revocationReason: "term_expired" }).where(and(eq(officerAssignments.id, assignment.id), eq(officerAssignments.status, "active")));
    await db.insert(auditLogs).values({ actorUserId: null, action: "governance.officer_term_auto_ended", targetType: "officer_assignment", targetId: assignment.id, afterData: { endsOn: assignment.endsOn.toISOString() } });
  }
  const reminder30 = await db.select({ id: officerAssignments.id, userId: officerAssignments.userId }).from(officerAssignments).where(and(eq(officerAssignments.status, "active"), lte(officerAssignments.endsOn, in30), gte(officerAssignments.endsOn, now), isNull(officerAssignments.reminder30SentAt)));
  for (const assignment of reminder30) {
    await db.update(officerAssignments).set({ reminder30SentAt: now }).where(eq(officerAssignments.id, assignment.id));
    await db.insert(auditLogs).values({ actorUserId: null, action: "governance.officer_term_reminder_30_due", targetType: "officer_assignment", targetId: assignment.id, afterData: { delivery: "pending_notification_configuration" } });
  }
  const reminder7 = await db.select({ id: officerAssignments.id, userId: officerAssignments.userId }).from(officerAssignments).where(and(eq(officerAssignments.status, "active"), lte(officerAssignments.endsOn, in7), gte(officerAssignments.endsOn, now), isNull(officerAssignments.reminder7SentAt)));
  for (const assignment of reminder7) {
    await db.update(officerAssignments).set({ reminder7SentAt: now }).where(eq(officerAssignments.id, assignment.id));
    await db.insert(auditLogs).values({ actorUserId: null, action: "governance.officer_term_reminder_7_due", targetType: "officer_assignment", targetId: assignment.id, afterData: { delivery: "pending_notification_configuration" } });
  }
  const cleanup = await db.delete(verificationCodes).where(or(lt(verificationCodes.expiresAt, now), lte(verificationCodes.consumedAt, now)));
  const summary: DailyGovernanceSummary = { expiredAssignments: expired.length, reminder30Due: reminder30.length, reminder7Due: reminder7.length, cleanedVerificationCodes: cleanup[0].affectedRows ?? 0, completedAt: now.toISOString() };
  await db.update(scheduledJobs).set({ lastRanAt: now, lastRunSummary: summary }).where(eq(scheduledJobs.jobKey, DAILY_GOVERNANCE_JOB_KEY));
  return summary;
}
