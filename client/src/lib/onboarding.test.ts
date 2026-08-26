import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getNextOnboardingStep, getPreviousOnboardingStep, shouldShowOnboarding } from "./onboarding";

describe("FJUBAC 功能導覽狀態", () => {
  it("在未完成或無法讀取本機狀態時顯示導覽，完成後不自動顯示", () => {
    expect(shouldShowOnboarding(null)).toBe(true);
    expect(shouldShowOnboarding("unavailable")).toBe(true);
    expect(shouldShowOnboarding("complete")).toBe(false);
  });

  it("在三步導覽中正確限制上一步與下一步範圍", () => {
    expect(getNextOnboardingStep(0, 3)).toBe(1);
    expect(getNextOnboardingStep(2, 3)).toBe(2);
    expect(getPreviousOnboardingStep(2)).toBe(1);
    expect(getPreviousOnboardingStep(0)).toBe(0);
  });

  it("提供鍵盤離開與減少動態偏好的無障礙支援", () => {
    const overlay = readFileSync(resolve(process.cwd(), "client/src/components/SiteOnboardingOverlay.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/components/SiteOnboardingOverlay.css"), "utf8");
    expect(overlay).toContain('event.key === "Escape"');
    expect(overlay).toContain('event.key === "ArrowRight"');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
