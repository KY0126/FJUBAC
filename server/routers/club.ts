import { TRPCError } from "@trpc/server";
import { getDepartmentDirectory, getUserClubContext } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const clubRouter = router({
  directory: router({
    departments: publicProcedure.query(async () => getDepartmentDirectory()),
  }),
  me: protectedProcedure.query(async ({ ctx }) => {
    const context = await getUserClubContext(ctx.user.id);
    if (!context) {
      throw new TRPCError({ code: "NOT_FOUND", message: "找不到目前使用者的社團資料" });
    }
    return context;
  }),
});
