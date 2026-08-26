import { and, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { departments, InsertUser, memberships, officerAssignments, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (user.accountType !== undefined) {
      values.accountType = user.accountType;
      updateSet.accountType = user.accountType;
    } else {
      values.accountType = "oauth";
      updateSet.accountType = "oauth";
    }

    values.accountStatus = "active";
    updateSet.accountStatus = "active";

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getDepartmentDirectory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.isActive, true));
}

export async function getUserClubContext(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [membership] = await db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
  const now = new Date();
  const assignments = await db
    .select({
      id: officerAssignments.id,
      title: officerAssignments.title,
      permissionGroup: officerAssignments.permissionGroup,
      startsOn: officerAssignments.startsOn,
      endsOn: officerAssignments.endsOn,
      departmentCode: departments.code,
      departmentName: departments.name,
    })
    .from(officerAssignments)
    .innerJoin(departments, eq(officerAssignments.departmentId, departments.id))
    .where(
      and(
        eq(officerAssignments.userId, userId),
        eq(officerAssignments.status, "active"),
        lte(officerAssignments.startsOn, now),
        gte(officerAssignments.endsOn, now)
      )
    );

  return {
    membership: membership ?? null,
    assignments,
    permissionGroups: assignments.map(assignment => assignment.permissionGroup),
  };
}
