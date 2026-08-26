import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getUserClubContext } from "../db";
import { canUsePermission, PERMISSION_GROUPS, type PermissionGroup } from "../club/permissions";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const recruitmentReviewProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const user = ctx.user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (user.role === "admin") return next({ ctx: { ...ctx, user } });
    const clubContext = await getUserClubContext(user.id);
    const canReview = canUsePermission(
      { isPresident: false, permissionGroups: clubContext?.permissionGroups ?? [] },
      PERMISSION_GROUPS.recruitmentReview
    );
    if (!canReview) {
      throw new TRPCError({ code: "FORBIDDEN", message: "目前帳號未具招生審核權限" });
    }
    return next({ ctx: { ...ctx, user } });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

function permissionProcedure(permission: PermissionGroup, deniedMessage: string) {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      if (user.role === "admin") return next({ ctx: { ...ctx, user } });
      const clubContext = await getUserClubContext(user.id);
      if (!canUsePermission({ isPresident: false, permissionGroups: clubContext?.permissionGroups ?? [] }, permission)) {
        throw new TRPCError({ code: "FORBIDDEN", message: deniedMessage });
      }
      return next({ ctx: { ...ctx, user } });
    })
  );
}

export const contentManageProcedure = permissionProcedure(PERMISSION_GROUPS.contentManagePublic, "目前帳號未具公開內容管理權限");
export const eventManageProcedure = permissionProcedure(PERMISSION_GROUPS.eventManageDepartment, "目前帳號未具活動管理權限");
export const projectManageProcedure = permissionProcedure(PERMISSION_GROUPS.projectManageDepartment, "目前帳號未具專案管理權限");
export const resourceManageProcedure = permissionProcedure(PERMISSION_GROUPS.resourceManageDepartment, "目前帳號未具資源管理權限");
