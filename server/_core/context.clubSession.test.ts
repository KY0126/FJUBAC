import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

vi.mock("../club/clubSession", () => ({
  getClubSessionUser: vi.fn(),
}));

import { createContext } from "./context";
import { sdk } from "./sdk";
import { getClubSessionUser } from "../club/clubSession";

const mockedAuthenticateRequest = vi.mocked(sdk.authenticateRequest);
const mockedGetClubSessionUser = vi.mocked(getClubSessionUser);

describe("createContext 社團帳號工作階段", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("在 OAuth 無法識別身分時採用有效 club_session 的社員帳號", async () => {
    mockedAuthenticateRequest.mockRejectedValueOnce(new Error("No OAuth session"));
    mockedGetClubSessionUser.mockResolvedValueOnce({
      id: 77,
      openId: "club-member-77",
      name: "測試社員",
      email: "member77@example.com",
      loginMethod: "club_password",
      role: "user",
      accountType: "club",
      studentNumber: "411001234",
      passwordHash: "scrypt$not-exposed-to-client",
      accountStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const ctx = await createContext({
      req: { headers: { cookie: "club_session=valid-token" } } as never,
      res: {} as never,
    });

    expect(mockedGetClubSessionUser).toHaveBeenCalledWith(expect.objectContaining({ headers: { cookie: "club_session=valid-token" } }));
    expect(ctx.user).toMatchObject({
      id: 77,
      role: "user",
      accountType: "club",
      accountStatus: "active",
    });
  });
});
