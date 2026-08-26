import { describe, expect, it } from "vitest";
import { governanceWindow, isEligibleForReminder } from "./governanceRules";

describe("governance reminder windows", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");

  it("calculates reminder boundaries in UTC", () => {
    expect(governanceWindow(now, 7).toISOString()).toBe("2026-09-02T00:00:00.000Z");
    expect(governanceWindow(now, 30).toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("includes upcoming assignments inside the reminder window but excludes expired and distant terms", () => {
    expect(isEligibleForReminder(new Date("2026-09-02T00:00:00.000Z"), now, 7)).toBe(true);
    expect(isEligibleForReminder(new Date("2026-09-03T00:00:00.000Z"), now, 7)).toBe(false);
    expect(isEligibleForReminder(new Date("2026-08-25T23:59:59.000Z"), now, 30)).toBe(false);
  });
});
