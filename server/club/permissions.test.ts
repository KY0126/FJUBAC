import { describe, expect, it } from "vitest";
import { canUsePermission, PERMISSION_GROUPS } from "./permissions";

describe("canUsePermission", () => {
  it("allows a department officer to use an assigned permission", () => {
    expect(
      canUsePermission(
        { isPresident: false, permissionGroups: [PERMISSION_GROUPS.recruitmentReview] },
        PERMISSION_GROUPS.recruitmentReview
      )
    ).toBe(true);
  });

  it("does not allow an unrelated department permission", () => {
    expect(
      canUsePermission(
        { isPresident: false, permissionGroups: [PERMISSION_GROUPS.projectManageDepartment] },
        PERMISSION_GROUPS.recruitmentReview
      )
    ).toBe(false);
  });

  it("allows the president to perform governed operations", () => {
    expect(
      canUsePermission(
        { isPresident: true, permissionGroups: [] },
        PERMISSION_GROUPS.auditReadGlobal
      )
    ).toBe(true);
  });
});
