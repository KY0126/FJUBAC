import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { scheduledJobs } from "../../drizzle/schema";
import { getDb } from "../db";
import { runDailyGovernance } from "../club/dailyGovernance";
import { DAILY_GOVERNANCE_JOB_KEY } from "../club/governanceRules";
import { sdk } from "../_core/sdk";

export async function dailyGovernanceHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database-unavailable" });
    const [job] = await db.select().from(scheduledJobs).where(and(eq(scheduledJobs.jobKey, DAILY_GOVERNANCE_JOB_KEY), eq(scheduledJobs.scheduleCronTaskUid, user.taskUid))).limit(1);
    if (!job) return res.json({ ok: true, skipped: "orphan" });
    if (!job.isEnabled) return res.json({ ok: true, skipped: "disabled" });
    const summary = await runDailyGovernance();
    return res.json({ ok: true, summary });
  } catch (error) {
    return res.status(500).json({ error: String(error), context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
