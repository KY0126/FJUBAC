import { describe, expect, it } from "vitest";
import { generateVerificationCode, hashPassword, hashVerificationCode, verifyPassword } from "./passwords";

describe("club account credential helpers", () => {
  it("verifies only the password used to create the stored hash", () => {
    const stored = hashPassword("long-enough-secret");
    expect(verifyPassword("long-enough-secret", stored)).toBe(true);
    expect(verifyPassword("different-secret", stored)).toBe(false);
  });

  it("generates a six-digit verification code", () => {
    expect(generateVerificationCode()).toMatch(/^\d{6}$/);
  });

  it("binds verification code hashes to the project signing secret", () => {
    const code = "123456";
    expect(hashVerificationCode(code, "project-secret")).toBe(hashVerificationCode(code, "project-secret"));
    expect(hashVerificationCode(code, "project-secret")).not.toBe(hashVerificationCode(code, "other-secret"));
  });
});
