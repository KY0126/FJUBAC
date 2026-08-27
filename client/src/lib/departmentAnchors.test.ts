import { describe, expect, it } from "vitest";
import { getDepartmentAnchorId } from "./departmentAnchors";

describe("getDepartmentAnchorId", () => {
  it("將五個首頁部門導向既有部門介紹的對應錨點", () => {
    expect(getDepartmentAnchorId("人才發展部")).toBe("department-talent");
    expect(getDepartmentAnchorId("專案開發部")).toBe("department-project");
    expect(getDepartmentAnchorId("對外發展部")).toBe("department-external");
    expect(getDepartmentAnchorId("學術營運部")).toBe("department-academic");
    expect(getDepartmentAnchorId("行銷策略部")).toBe("department-marketing");
  });

  it("未知名稱回到安全的部門總覽錨點", () => {
    expect(getDepartmentAnchorId("未定義部門")).toBe("department-overview");
  });
});
