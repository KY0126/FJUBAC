import {
  boolean,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Users support both Manus OAuth (for the project owner) and the club's
 * approved internal/external account credentials. High-level permissions are
 * granted by active officer assignments, not by the base admin/user field.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 128 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    accountType: mysqlEnum("accountType", ["internal", "external", "oauth"]),
    studentNumber: varchar("studentNumber", { length: 32 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    accountStatus: mysqlEnum("accountStatus", ["pending_activation", "active", "inactive"])
      .default("pending_activation")
      .notNull(),
    avatarStorageKey: varchar("avatarStorageKey", { length: 500 }),
    avatarUrl: varchar("avatarUrl", { length: 500 }),
    grade: varchar("grade", { length: 80 }),
    contact: varchar("contact", { length: 120 }),
    lastPasswordChangedAt: timestamp("lastPasswordChangedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_student_number_unique").on(table.studentNumber),
    index("users_account_status_idx").on(table.accountStatus),
  ]
);

export const departments = mysqlTable(
  "departments",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    englishName: varchar("englishName", { length: 160 }).notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("departments_active_idx").on(table.isActive)]
);

export const memberships = mysqlTable(
  "memberships",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["active", "inactive", "alumni"]).default("active").notNull(),
    cohort: varchar("cohort", { length: 40 }),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    endedAt: timestamp("endedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("memberships_user_unique").on(table.userId), index("memberships_status_idx").on(table.status)]
);

export const recruitmentCycles = mysqlTable(
  "recruitmentCycles",
  {
    id: int("id").autoincrement().primaryKey(),
    audienceType: mysqlEnum("audienceType", ["internal", "external"]).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull(),
    opensAt: timestamp("opensAt").notNull(),
    documentDeadlineAt: timestamp("documentDeadlineAt").notNull(),
    interviewStartsAt: timestamp("interviewStartsAt"),
    resultAnnouncedAt: timestamp("resultAnnouncedAt"),
    status: mysqlEnum("status", ["draft", "open", "closed", "archived"]).default("draft").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("recruitment_cycles_status_idx").on(table.status, table.audienceType)]
);

export const membershipApplications = mysqlTable(
  "membershipApplications",
  {
    id: int("id").autoincrement().primaryKey(),
    cycleId: int("cycleId")
      .notNull()
      .references(() => recruitmentCycles.id, { onDelete: "restrict" }),
    applicantType: mysqlEnum("applicantType", ["internal", "external"]).notNull(),
    applicantName: varchar("applicantName", { length: 120 }).notNull(),
    studentNumber: varchar("studentNumber", { length: 32 }),
    schoolEmail: varchar("schoolEmail", { length: 320 }),
    externalEmail: varchar("externalEmail", { length: 320 }),
    grade: varchar("grade", { length: 80 }).notNull(),
    contact: varchar("contact", { length: 120 }).notNull(),
    motivation: text("motivation").notNull(),
    status: mysqlEnum("status", [
      "submitted",
      "document_review",
      "returned",
      "interview_scheduled",
      "interview_completed",
      "approved",
      "waitlisted",
      "rejected",
      "activation_pending",
      "withdrawn",
      "expired",
    ])
      .default("submitted")
      .notNull(),
    finalDecisionNote: text("finalDecisionNote"),
    finalizedByUserId: int("finalizedByUserId").references(() => users.id, { onDelete: "set null" }),
    finalizedAt: timestamp("finalizedAt"),
    accountUserId: int("accountUserId").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("applications_cycle_status_idx").on(table.cycleId, table.status),
    index("applications_email_idx").on(table.schoolEmail),
    index("applications_external_email_idx").on(table.externalEmail),
  ]
);

export const applicationReviews = mysqlTable(
  "applicationReviews",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("applicationId")
      .notNull()
      .references(() => membershipApplications.id, { onDelete: "cascade" }),
    stage: mysqlEnum("stage", ["document", "interview"]).notNull(),
    reviewerUserId: int("reviewerUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    result: mysqlEnum("result", ["pass", "return", "fail", "waitlist", "recommend"]).notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("application_reviews_application_idx").on(table.applicationId, table.stage)]
);

export const interviewSchedules = mysqlTable(
  "interviewSchedules",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("applicationId")
      .notNull()
      .references(() => membershipApplications.id, { onDelete: "cascade" }),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    format: mysqlEnum("format", ["online", "in_person"]).notNull(),
    locationOrLink: varchar("locationOrLink", { length: 500 }),
    status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no_show"])
      .default("scheduled")
      .notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("interviews_application_idx").on(table.applicationId, table.status)]
);

export const officerAssignments = mysqlTable(
  "officerAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    departmentId: int("departmentId")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 120 }).notNull(),
    permissionGroup: varchar("permissionGroup", { length: 80 }).notNull(),
    startsOn: timestamp("startsOn").notNull(),
    endsOn: timestamp("endsOn").notNull(),
    status: mysqlEnum("status", ["active", "ended", "revoked"]).default("active").notNull(),
    reminder30SentAt: timestamp("reminder30SentAt"),
    reminder7SentAt: timestamp("reminder7SentAt"),
    revokedAt: timestamp("revokedAt"),
    revocationReason: varchar("revocationReason", { length: 255 }),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("officer_assignments_active_idx").on(table.status, table.startsOn, table.endsOn),
    index("officer_assignments_user_idx").on(table.userId, table.departmentId),
  ]
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    departmentId: int("departmentId").references(() => departments.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["draft", "active", "completed", "archived", "cancelled"])
      .default("draft")
      .notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    isPublic: boolean("isPublic").default(false).notNull(),
    publicSummary: text("publicSummary"),
    publicCoverImageUrl: varchar("publicCoverImageUrl", { length: 500 }),
    publicConsentRecordedAt: timestamp("publicConsentRecordedAt"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("projects_department_status_idx").on(table.departmentId, table.status), index("projects_public_idx").on(table.isPublic, table.status)]
);

export const projectAssignments = mysqlTable(
  "projectAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectRole: mysqlEnum("projectRole", ["project_member", "project_lead", "advisor"]).default("project_member").notNull(),
    startsAt: timestamp("startsAt").defaultNow().notNull(),
    endsAt: timestamp("endsAt"),
    status: mysqlEnum("status", ["active", "ended", "removed"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("project_assignments_unique").on(table.projectId, table.userId),
    index("project_assignments_user_idx").on(table.userId, table.status),
  ]
);

export const projectMilestones = mysqlTable(
  "projectMilestones",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    dueAt: timestamp("dueAt"),
    status: mysqlEnum("status", ["planned", "in_progress", "completed", "archived"]).default("planned").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("project_milestones_project_status_idx").on(table.projectId, table.status), index("project_milestones_due_idx").on(table.projectId, table.dueAt)]
);

export const projectTasks = mysqlTable(
  "projectTasks",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    milestoneId: int("milestoneId").references(() => projectMilestones.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    assigneeUserId: int("assigneeUserId").references(() => users.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["todo", "in_progress", "blocked", "completed", "cancelled"]).default("todo").notNull(),
    priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
    dueAt: timestamp("dueAt"),
    completedAt: timestamp("completedAt"),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("project_tasks_project_status_idx").on(table.projectId, table.status), index("project_tasks_assignee_status_idx").on(table.assigneeUserId, table.status), index("project_tasks_milestone_idx").on(table.milestoneId)]
);

export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary"),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    registrationDeadlineAt: timestamp("registrationDeadlineAt"),
    location: varchar("location", { length: 240 }),
    capacity: int("capacity").notNull().default(0),
    visibility: mysqlEnum("visibility", ["public", "member", "project", "officer"]).default("member").notNull(),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["draft", "published", "open", "full", "closed", "cancelled", "completed"])
      .default("draft")
      .notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("events_status_start_idx").on(table.status, table.startsAt), index("events_visibility_idx").on(table.visibility)]
);

export const eventRegistrations = mysqlTable(
  "eventRegistrations",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["registered", "waitlisted", "cancelled", "attended", "absent"])
      .default("registered")
      .notNull(),
    waitlistPosition: int("waitlistPosition"),
    registeredAt: timestamp("registeredAt").defaultNow().notNull(),
    cancelledAt: timestamp("cancelledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("event_registrations_unique").on(table.eventId, table.userId), index("event_registrations_status_idx").on(table.eventId, table.status)]
);

export const announcements = mysqlTable(
  "announcements",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 220 }).notNull(),
    excerpt: varchar("excerpt", { length: 500 }),
    content: text("content").notNull(),
    category: mysqlEnum("category", ["general", "recruitment", "event", "academic", "external", "governance"]).default("general").notNull(),
    coverImageUrl: varchar("coverImageUrl", { length: 500 }),
    visibility: mysqlEnum("visibility", ["public", "member", "project", "officer"]).default("public").notNull(),
    status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
    departmentId: int("departmentId").references(() => departments.id, { onDelete: "set null" }),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    publishedAt: timestamp("publishedAt"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("announcements_public_idx").on(table.status, table.visibility, table.publishedAt), index("announcements_category_idx").on(table.category, table.publishedAt)]
);

export const resources = mysqlTable(
  "resources",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }),
    visibility: mysqlEnum("visibility", ["public", "member", "project", "officer"]).default("member").notNull(),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    departmentId: int("departmentId").references(() => departments.id, { onDelete: "set null" }),
    versionLabel: varchar("versionLabel", { length: 80 }),
    supersedesResourceId: int("supersedesResourceId"),
    publicConsentRecordedAt: timestamp("publicConsentRecordedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("resources_visibility_idx").on(table.visibility, table.projectId),
    index("resources_public_idx").on(table.visibility, table.publicConsentRecordedAt),
    index("resources_supersedes_idx").on(table.supersedesResourceId),
    foreignKey({ columns: [table.supersedesResourceId], foreignColumns: [table.id], name: "resources_supersedesResourceId_resources_id_fk" }).onDelete("set null"),
  ]
);

export const projectDeliverables = mysqlTable(
  "projectDeliverables",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: int("taskId").references(() => projectTasks.id, { onDelete: "set null" }),
    resourceId: int("resourceId").references(() => resources.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["draft", "submitted", "accepted", "archived"]).default("draft").notNull(),
    submittedByUserId: int("submittedByUserId").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submittedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("project_deliverables_project_status_idx").on(table.projectId, table.status), index("project_deliverables_task_idx").on(table.taskId), index("project_deliverables_resource_idx").on(table.resourceId)]
);

export const userPreferences = mysqlTable(
  "userPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reducedMotion: boolean("reducedMotion").default(false).notNull(),
    inAppNotifications: boolean("inAppNotifications").default(true).notNull(),
    emailNotifications: boolean("emailNotifications").default(false).notNull(),
    resourceHistoryVisible: boolean("resourceHistoryVisible").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("user_preferences_user_unique").on(table.userId)]
);

export const resourceAccessLogs = mysqlTable(
  "resourceAccessLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: int("resourceId")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    action: mysqlEnum("action", ["view", "download"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("resource_access_logs_user_created_idx").on(table.userId, table.createdAt), index("resource_access_logs_resource_idx").on(table.resourceId, table.createdAt)]
);

export const resourceFavorites = mysqlTable(
  "resourceFavorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: int("resourceId")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("resource_favorites_user_resource_unique").on(table.userId, table.resourceId), index("resource_favorites_user_created_idx").on(table.userId, table.createdAt)]
);

export const personalNotifications = mysqlTable(
  "personalNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    href: varchar("href", { length: 500 }),
    category: mysqlEnum("category", ["system", "account", "activity", "project", "recruitment"]).default("system").notNull(),
    readAt: timestamp("readAt"),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("personal_notifications_user_active_idx").on(table.userId, table.archivedAt, table.createdAt)]
);

export const verificationCodes = mysqlTable(
  "verificationCodes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    purpose: mysqlEnum("purpose", ["activation", "password_reset"]).notNull(),
    codeHash: varchar("codeHash", { length: 255 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    maxAttempts: int("maxAttempts").default(5).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    consumedAt: timestamp("consumedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("verification_codes_user_purpose_idx").on(table.userId, table.purpose, table.expiresAt)]
);

export const scheduledJobs = mysqlTable(
  "scheduledJobs",
  {
    id: int("id").autoincrement().primaryKey(),
    jobKey: varchar("jobKey", { length: 80 }).notNull().unique(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    lastRanAt: timestamp("lastRanAt"),
    lastRunSummary: json("lastRunSummary"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("scheduled_jobs_task_uid_idx").on(table.scheduleCronTaskUid)]
);

/**
 * Singleton settings for public-site display behaviour. The canonical row uses id=1
 * and is written only through the audited admin setting procedure.
 */
export const siteDisplaySettings = mysqlTable("siteDisplaySettings", {
  id: int("id").primaryKey(),
  departmentCarouselIntervalMs: int("departmentCarouselIntervalMs").default(3800).notNull(),
  updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 160 }).notNull(),
    targetType: varchar("targetType", { length: 100 }).notNull(),
    targetId: int("targetId"),
    beforeData: json("beforeData"),
    afterData: json("afterData"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_logs_target_idx").on(table.targetType, table.targetId), index("audit_logs_actor_idx").on(table.actorUserId, table.createdAt)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type RecruitmentCycle = typeof recruitmentCycles.$inferSelect;
export type MembershipApplication = typeof membershipApplications.$inferSelect;
export type OfficerAssignment = typeof officerAssignments.$inferSelect;
export type ClubProject = typeof projects.$inferSelect;
export type ClubEvent = typeof events.$inferSelect;
