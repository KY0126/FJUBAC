import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("does not expose a club account password hash through auth.me", async () => {
    const { ctx } = createAuthContext();
    ctx.user = { ...ctx.user!, passwordHash: "scrypt$private-hash" };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toMatchObject({ id: 1, email: "sample@example.com" });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("clears governance and club account sessions and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies.map(cookie => cookie.name)).toEqual(expect.arrayContaining([COOKIE_NAME, "club_session", "club_setup"]));
    const governanceCookie = clearedCookies.find(cookie => cookie.name === COOKIE_NAME);
    expect(governanceCookie?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});
