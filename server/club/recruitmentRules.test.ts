import { describe, expect, it } from "vitest";
import { getApplicationEmail, isApplicationCycleOpen, isInternalApplicationComplete } from "./recruitmentRules";

describe("recruitment rules", () => {
  it("requires both a student number and school email for internal applications", () => {
    expect(isInternalApplicationComplete({ studentNumber: "411234567", schoolEmail: "student@mail.fju.edu.tw" })).toBe(true);
    expect(isInternalApplicationComplete({ studentNumber: "411234567" })).toBe(false);
  });

  it("uses and normalizes the email that matches the applicant type", () => {
    expect(getApplicationEmail({ applicantType: "internal", schoolEmail: " Student@Mail.FJU.edu.tw " })).toBe("student@mail.fju.edu.tw");
    expect(getApplicationEmail({ applicantType: "external", externalEmail: "Guest@Example.com" })).toBe("guest@example.com");
  });

  it("only accepts recruitment cycles during their configured open window", () => {
    const cycle = { status: "open", opensAt: new Date("2026-08-01T00:00:00Z"), documentDeadlineAt: new Date("2026-08-31T23:59:59Z") };
    expect(isApplicationCycleOpen(cycle, new Date("2026-08-15T00:00:00Z"))).toBe(true);
    expect(isApplicationCycleOpen(cycle, new Date("2026-09-01T00:00:00Z"))).toBe(false);
  });
});
