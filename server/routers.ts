import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { clearClubSession } from "./club/clubSession";
import { clubRouter } from "./routers/club";
import { recruitmentRouter } from "./routers/recruitment";
import { contentRouter } from "./routers/content";
import { workspaceRouter } from "./routers/workspace";
import { governanceRouter } from "./routers/governance";
import { accountsRouter } from "./routers/accounts";
import { personalRouter } from "./routers/personal";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  club: clubRouter,
  recruitment: recruitmentRouter,
  content: contentRouter,
  workspace: workspaceRouter,
  governance: governanceRouter,
  accounts: accountsRouter,
  personal: personalRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearClubSession(ctx.res, ctx.req);
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
