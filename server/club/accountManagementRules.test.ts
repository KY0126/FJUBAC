import { describe, expect, it } from "vitest";
import { canManageAccount, toAccountAuditData } from "./accountManagementRules";

describe("帳號管理治理規則", () => {
  it("禁止管理者停用或編修自己的帳號，並禁止處理 OAuth 治理帳號", () => {
    expect(canManageAccount(1, { id: 1, accountType: "internal" })).toBe(false);
    expect(canManageAccount(1, { id: 2, accountType: "oauth" })).toBe(false);
    expect(canManageAccount(1, { id: 2, accountType: "external" })).toBe(true);
  });

  it("稽核資料不包含密碼雜湊或認證碼", () => {
    expect(toAccountAuditData({ name: "王小明", email: "member@example.edu.tw", studentNumber: "411000001", accountStatus: "active" }, "active")).toEqual({ name: "王小明", email: "member@example.edu.tw", studentNumber: "411000001", accountStatus: "active", membershipStatus: "active" });
  });
});
