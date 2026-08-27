import { and, eq } from "drizzle-orm";
import { projectAssignments } from "../../drizzle/schema";
import { getDb, getUserClubContext } from "../db";

export type ScopedResource = { visibility: "public" | "member" | "project" | "officer"; projectId: number | null };

export async function canUserReadScopedResource(userId: number, item: ScopedResource) {
  if (item.visibility === "public") return true;
  const context = await getUserClubContext(userId);
  if (item.visibility === "member") return context?.membership?.status === "active";
  if (item.visibility === "officer") return (context?.permissionGroups.length ?? 0) > 0;
  if (!item.projectId) return false;
  const db = await getDb();
  if (!db) return false;
  const [assignment] = await db.select({ id: projectAssignments.id }).from(projectAssignments).where(and(eq(projectAssignments.projectId, item.projectId), eq(projectAssignments.userId, userId), eq(projectAssignments.status, "active"))).limit(1);
  return Boolean(assignment);
}
