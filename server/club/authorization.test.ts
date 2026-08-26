import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getUserClubContext: vi.fn(),
}));

import { getUserClubContext } from "../db";
import { contentManageProcedure, eventManageProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { PERMISSION_GROUPS } from "./permissions";

const testRouter = router({
  managePublicContent: contentManageProcedure.query(() => ({ ok: true })),
  manageEvent: eventManageProcedure.mutation(() => ({ ok: true })),
});

const mockedGetUserClubContext = vi.mocked(getUserClubContext);

function createContext(role: "admin" | "user", id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: `test-${id}`,
      name: "測試使用者",
      email: `test-${id}@example.com`,
      loginMethod: "test",
      role,
      accountType: "club",
      studentNumber: null,
      passwordHash: null,
      accountStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("五部門後端授權程序", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("允許社長治理帳號管理公開內容", async () => {
    const caller = testRouter.createCaller(createContext("admin"));
    await expect(caller.managePublicContent()).resolves.toEqual({ ok: true });
    expect(mockedGetUserClubContext).not.toHaveBeenCalled();
  });

  it("允許具行銷策略部公開內容權限的幹部管理公開內容", async () => {
    mockedGetUserClubContext.mockResolvedValue({
      membership: null,
      assignments: [],
      permissionGroups: [PERMISSION_GROUPS.contentManagePublic],
    });

    const caller = testRouter.createCaller(createContext("user", 22));
    await expect(caller.managePublicContent()).resolves.toEqual({ ok: true });
    expect(mockedGetUserClubContext).toHaveBeenCalledWith(22);
  });

  it("拒絕未具部門權限的社員管理公開內容", async () => {
    mockedGetUserClubContext.mockResolvedValue({
      membership: null,
      assignments: [],
      permissionGroups: [],
    });

    const caller = testRouter.createCaller(createContext("user", 31));
    await expect(caller.managePublicContent()).rejects.toThrow("目前帳號未具公開內容管理權限");
  });

  it("允許具活動管理權限的幹部建立、編修與刪除活動", async () => {
    mockedGetUserClubContext.mockResolvedValue({
      membership: null,
      assignments: [],
      permissionGroups: [PERMISSION_GROUPS.eventManageDepartment],
    });

    const caller = testRouter.createCaller(createContext("user", 41));
    await expect(caller.manageEvent()).resolves.toEqual({ ok: true });
  });

  it("拒絕一般社員修改或刪除活動", async () => {
    mockedGetUserClubContext.mockResolvedValue({
      membership: null,
      assignments: [],
      permissionGroups: [],
    });

    const caller = testRouter.createCaller(createContext("user", 42));
    await expect(caller.manageEvent()).rejects.toThrow("目前帳號未具活動管理權限");
  });
});
