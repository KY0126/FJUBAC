import { desc, eq } from "drizzle-orm";
import { auditLogs, scheduledJobs, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { runDailyGovernance } from "../club/dailyGovernance";
import { DAILY_GOVERNANCE_JOB_KEY } from "../club/governanceRules";

export const governanceRouter = router({
  scheduleStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const [job] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.jobKey, DAILY_GOVERNANCE_JOB_KEY)).limit(1);
    return job ?? null;
  }),
  auditRecent: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);
  }),
  runDailyCheck: adminProcedure.mutation(async () => runDailyGovernance()),
});
