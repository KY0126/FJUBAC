import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  applicationReviews,
  auditLogs,
  interviewSchedules,
  membershipApplications,
  memberships,
  recruitmentCycles,
  users,
  verificationCodes,
} from "../../drizzle/schema";
import { clearClubSetupSession, getClubSetupUserId, setClubSession, setClubSetupSession } from "../club/clubSession";
import { getEmailDeliveryState, sendVerificationCodeEmail } from "../club/emailDelivery";
import { generateVerificationCode, hashPassword, hashVerificationCode, verifyPassword } from "../club/passwords";
import { getDb } from "../db";
import { getApplicationEmail, isApplicationCycleOpen, isInternalApplicationComplete } from "../club/recruitmentRules";
import { adminProcedure, publicProcedure, recruitmentReviewProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

const applicationInput = z.object({
  cycleId: z.number().int().positive(),
  applicantType: z.enum(["internal", "external"]),
  applicantName: z.string().trim().min(2).max(120),
  studentNumber: z.string().trim().max(32).optional(),
  schoolEmail: z.string().trim().email().max(320).optional(),
  externalEmail: z.string().trim().email().max(320).optional(),
  grade: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(3).max(120),
  motivation: z.string().trim().min(20).max(5000),
});

const unresolvedStatuses = ["submitted", "document_review", "returned", "interview_scheduled", "interview_completed", "waitlisted"] as const;

function assertDatabase<T>(database: T): asserts database is Exclude<T, null> {
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料服務暫時無法使用，請稍後再試。" });
}

const accountIdentifierInput = z.object({ identifier: z.string().trim().min(3).max(320) });
const codePurposeInput = accountIdentifierInput.extend({ purpose: z.enum(["activation", "password_reset"]) });

async function findClubUserByIdentifier(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  const result = await db
    .select()
    .from(users)
    .where(or(eq(users.studentNumber, identifier.trim()), eq(users.email, normalized)))
    .limit(1);
  return result[0];
}

export const recruitmentRouter = router({
  listOpen: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    const cycles = await db
      .select()
      .from(recruitmentCycles)
      .where(eq(recruitmentCycles.status, "open"))
      .orderBy(desc(recruitmentCycles.opensAt));
    return cycles.filter(cycle => isApplicationCycleOpen(cycle, now));
  }),

  submit: publicProcedure.input(applicationInput).mutation(async ({ input }) => {
    const db = await getDb();
    assertDatabase(db);

    if (input.applicantType === "internal" && !isInternalApplicationComplete(input)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "校內申請需填寫學號與學校信箱。" });
    }

    const email = getApplicationEmail(input);
    if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "請填寫對應的聯絡 Email。" });

    const [cycle] = await db.select().from(recruitmentCycles).where(eq(recruitmentCycles.id, input.cycleId)).limit(1);
    if (!cycle || cycle.audienceType !== input.applicantType || !isApplicationCycleOpen(cycle, new Date())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "此招生梯次目前未開放申請。" });
    }

    const existing = await db
      .select({ id: membershipApplications.id })
      .from(membershipApplications)
      .where(
        and(
          eq(membershipApplications.cycleId, input.cycleId),
          inArray(membershipApplications.status, unresolvedStatuses),
          input.applicantType === "internal"
            ? or(eq(membershipApplications.schoolEmail, email), eq(membershipApplications.studentNumber, input.studentNumber ?? ""))
            : eq(membershipApplications.externalEmail, email)
        )
      )
      .limit(1);

    if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "此梯次已有尚未結案的申請紀錄。" });

    const result = await db.insert(membershipApplications).values({
      cycleId: input.cycleId,
      applicantType: input.applicantType,
      applicantName: input.applicantName,
      studentNumber: input.applicantType === "internal" ? input.studentNumber : null,
      schoolEmail: input.applicantType === "internal" ? email : null,
      externalEmail: input.applicantType === "external" ? email : null,
      grade: input.grade,
      contact: input.contact,
      motivation: input.motivation,
      status: "submitted",
    });

    return { applicationId: result[0].insertId, status: "submitted" as const };
  }),

  account: router({
    requestCode: publicProcedure.input(codePurposeInput).mutation(async ({ input }) => {
      const db = await getDb();
      assertDatabase(db);
      const user = await findClubUserByIdentifier(db, input.identifier);
      if (!user || user.accountType === "oauth" || user.accountStatus === "inactive") {
        return { state: "accepted" as const, delivery: "not_available" as const };
      }
      if (input.purpose === "activation" && user.accountStatus !== "pending_activation") {
        return { state: "accepted" as const, delivery: "not_available" as const };
      }
      if (input.purpose === "password_reset" && user.accountStatus !== "active") {
        return { state: "accepted" as const, delivery: "not_available" as const };
      }
      const deliveryState = getEmailDeliveryState();
      if (deliveryState !== "ready") return { state: "awaiting_email_configuration" as const, delivery: deliveryState };

      const email = user.email;
      if (!email) return { state: "accepted" as const, delivery: "not_available" as const };
      const code = generateVerificationCode();
      const now = new Date();
      await db
        .update(verificationCodes)
        .set({ consumedAt: now })
        .where(and(eq(verificationCodes.userId, user.id), eq(verificationCodes.purpose, input.purpose), isNull(verificationCodes.consumedAt)));
      await db.insert(verificationCodes).values({
        userId: user.id,
        email,
        purpose: input.purpose,
        codeHash: hashVerificationCode(code, ENV.cookieSecret),
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      });
      const sent = await sendVerificationCodeEmail({ to: email, recipientName: user.name, code, purpose: input.purpose });
      if (sent.state !== "ready") {
        await db.update(verificationCodes).set({ consumedAt: new Date() }).where(and(eq(verificationCodes.userId, user.id), eq(verificationCodes.purpose, input.purpose), isNull(verificationCodes.consumedAt)));
        return { state: "accepted" as const, delivery: sent.state };
      }
      await db.insert(auditLogs).values({ actorUserId: user.id, action: `account.${input.purpose}_code_sent`, targetType: "user", targetId: user.id, afterData: { email } });
      return { state: "accepted" as const, delivery: "ready" as const };
    }),

    verifyCode: publicProcedure.input(codePurposeInput.extend({ code: z.string().trim().regex(/^\d{6}$/, "請輸入 6 位數認證碼。") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const user = await findClubUserByIdentifier(db, input.identifier);
      if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "認證碼或帳號資訊不正確。" });
      const [record] = await db
        .select()
        .from(verificationCodes)
        .where(and(eq(verificationCodes.userId, user.id), eq(verificationCodes.purpose, input.purpose), isNull(verificationCodes.consumedAt), gte(verificationCodes.expiresAt, new Date())))
        .orderBy(desc(verificationCodes.createdAt))
        .limit(1);
      if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "認證碼已失效或尚未寄送。" });
      const isCorrect = record.codeHash === hashVerificationCode(input.code, ENV.cookieSecret);
      if (!isCorrect) {
        const attempts = record.attempts + 1;
        await db.update(verificationCodes).set({ attempts, consumedAt: attempts >= record.maxAttempts ? new Date() : null }).where(eq(verificationCodes.id, record.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: attempts >= record.maxAttempts ? "認證碼嘗試次數已達上限，請重新申請。" : "認證碼不正確。" });
      }
      await db.update(verificationCodes).set({ consumedAt: new Date() }).where(eq(verificationCodes.id, record.id));
      await setClubSetupSession(ctx.res, ctx.req, user.id);
      return { success: true };
    }),

    setPassword: publicProcedure.input(z.object({ password: z.string().min(12, "密碼至少需 12 個字元。").max(128), confirmPassword: z.string() })).mutation(async ({ ctx, input }) => {
      if (input.password !== input.confirmPassword) throw new TRPCError({ code: "BAD_REQUEST", message: "兩次輸入的密碼不一致。" });
      const setupUserId = await getClubSetupUserId(ctx.req);
      if (!setupUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "請先完成 Email 認證碼驗證。" });
      const db = await getDb();
      assertDatabase(db);
      const [userById] = await db.select().from(users).where(eq(users.id, setupUserId)).limit(1);
      if (!userById || userById.accountType === "oauth") throw new TRPCError({ code: "BAD_REQUEST", message: "此帳號無法設定社團密碼。" });
      const passwordHash = hashPassword(input.password);
      await db.update(users).set({ passwordHash, accountStatus: "active", lastSignedIn: new Date() }).where(eq(users.id, setupUserId));
      await setClubSession(ctx.res, ctx.req, { ...userById, passwordHash, accountStatus: "active" });
      clearClubSetupSession(ctx.res, ctx.req);
      await db.insert(auditLogs).values({ actorUserId: setupUserId, action: "account.password_set", targetType: "user", targetId: setupUserId });
      return { success: true };
    }),

    login: publicProcedure.input(accountIdentifierInput.extend({ password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      assertDatabase(db);
      const user = await findClubUserByIdentifier(db, input.identifier);
      if (!user || user.accountStatus !== "active" || user.accountType === "oauth" || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼不正確。" });
      }
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      await setClubSession(ctx.res, ctx.req, user);
      return { success: true };
    }),
  }),

  management: router({
    list: recruitmentReviewProcedure
      .input(z.object({ status: z.array(z.enum(["submitted", "document_review", "returned", "interview_scheduled", "interview_completed", "approved", "waitlisted", "rejected", "activation_pending", "withdrawn", "expired"])).optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        assertDatabase(db);
        const conditions = input?.status?.length ? inArray(membershipApplications.status, input.status) : undefined;
        return db
          .select({ application: membershipApplications, cycle: recruitmentCycles })
          .from(membershipApplications)
          .innerJoin(recruitmentCycles, eq(membershipApplications.cycleId, recruitmentCycles.id))
          .where(conditions)
          .orderBy(desc(membershipApplications.submittedAt));
      }),

    reviews: recruitmentReviewProcedure.input(z.object({ applicationId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      assertDatabase(db);
      const reviews = await db.select().from(applicationReviews).where(eq(applicationReviews.applicationId, input.applicationId)).orderBy(desc(applicationReviews.createdAt));
      const interviews = await db.select().from(interviewSchedules).where(eq(interviewSchedules.applicationId, input.applicationId)).orderBy(desc(interviewSchedules.startsAt));
      return { reviews, interviews };
    }),

    addReview: recruitmentReviewProcedure
      .input(z.object({ applicationId: z.number().int().positive(), stage: z.enum(["document", "interview"]), result: z.enum(["pass", "return", "fail", "waitlist", "recommend"]), comment: z.string().trim().max(5000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const actor = ctx.user;
        if (!actor) throw new TRPCError({ code: "UNAUTHORIZED", message: "請先登入。" });
        const db = await getDb();
        assertDatabase(db);
        const [application] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, input.applicationId)).limit(1);
        if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此申請。" });
        if (["approved", "rejected", "activation_pending"].includes(application.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "此申請已完成最終決策，不能再新增審核。" });

        await db.insert(applicationReviews).values({ applicationId: input.applicationId, stage: input.stage, reviewerUserId: actor.id, result: input.result, comment: input.comment ?? null });
        const nextStatus = input.stage === "interview" ? "interview_completed" : input.result === "return" ? "returned" : "document_review";
        await db.update(membershipApplications).set({ status: nextStatus }).where(eq(membershipApplications.id, input.applicationId));
        await db.insert(auditLogs).values({ actorUserId: actor.id, action: "recruitment.review_added", targetType: "membership_application", targetId: input.applicationId, afterData: { stage: input.stage, result: input.result } });
        return { success: true };
      }),

    scheduleInterview: recruitmentReviewProcedure
      .input(z.object({ applicationId: z.number().int().positive(), startsAt: z.date(), endsAt: z.date(), format: z.enum(["online", "in_person"]), locationOrLink: z.string().trim().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        const actor = ctx.user;
        if (!actor) throw new TRPCError({ code: "UNAUTHORIZED", message: "請先登入。" });
        if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "面試結束時間必須晚於開始時間。" });
        const db = await getDb();
        assertDatabase(db);
        const [application] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, input.applicationId)).limit(1);
        if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此申請。" });
        await db.insert(interviewSchedules).values({ applicationId: input.applicationId, startsAt: input.startsAt, endsAt: input.endsAt, format: input.format, locationOrLink: input.locationOrLink ?? null, createdByUserId: actor.id });
        await db.update(membershipApplications).set({ status: "interview_scheduled" }).where(eq(membershipApplications.id, input.applicationId));
        await db.insert(auditLogs).values({ actorUserId: actor.id, action: "recruitment.interview_scheduled", targetType: "membership_application", targetId: input.applicationId, afterData: { startsAt: input.startsAt.toISOString(), format: input.format } });
        return { success: true };
      }),

    finalize: adminProcedure
      .input(z.object({ applicationId: z.number().int().positive(), decision: z.enum(["approved", "waitlisted", "rejected"]), note: z.string().trim().max(5000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        assertDatabase(db);
        const [application] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, input.applicationId)).limit(1);
        if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此申請。" });
        if (["approved", "activation_pending", "rejected"].includes(application.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "此申請已完成最終決策。" });

        if (input.decision !== "approved") {
          await db.update(membershipApplications).set({ status: input.decision, finalDecisionNote: input.note ?? null, finalizedByUserId: ctx.user.id, finalizedAt: new Date() }).where(eq(membershipApplications.id, input.applicationId));
          await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: `recruitment.final_${input.decision}`, targetType: "membership_application", targetId: input.applicationId, afterData: { decision: input.decision } });
          return { decision: input.decision, activationDelivery: "not_applicable" as const };
        }

        const email = application.applicantType === "internal" ? application.schoolEmail : application.externalEmail;
        if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "核准帳號需有可驗證的 Email。" });

        const userResult = await db.insert(users).values({
          openId: `club:${randomUUID()}`,
          name: application.applicantName,
          email,
          loginMethod: "club_email",
          role: "user",
          accountType: application.applicantType,
          studentNumber: application.applicantType === "internal" ? application.studentNumber : null,
          accountStatus: "pending_activation",
          lastSignedIn: new Date(),
        });
        const userId = userResult[0].insertId;
        await db.insert(memberships).values({ userId, status: "active", cohort: application.grade });
        await db.update(membershipApplications).set({ status: "activation_pending", finalDecisionNote: input.note ?? null, finalizedByUserId: ctx.user.id, finalizedAt: new Date(), accountUserId: userId }).where(eq(membershipApplications.id, input.applicationId));
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "recruitment.final_approved", targetType: "membership_application", targetId: input.applicationId, afterData: { accountUserId: userId, activationDelivery: getEmailDeliveryState() } });
        return { decision: "approved" as const, activationDelivery: getEmailDeliveryState() };
      }),
  }),
});
