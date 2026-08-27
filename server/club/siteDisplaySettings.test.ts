import { describe, expect, it } from "vitest";
import {
  DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS,
  DEPARTMENT_CAROUSEL_MAX_INTERVAL_MS,
  DEPARTMENT_CAROUSEL_MIN_INTERVAL_MS,
  isAllowedDepartmentCarouselInterval,
} from "./siteDisplaySettings";

describe("department carousel display settings", () => {
  it("uses the confirmed 3.8-second default inside an intentionally bounded range", () => {
    expect(DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS).toBe(3800);
    expect(isAllowedDepartmentCarouselInterval(DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS)).toBe(true);
    expect(isAllowedDepartmentCarouselInterval(DEPARTMENT_CAROUSEL_MIN_INTERVAL_MS)).toBe(true);
    expect(isAllowedDepartmentCarouselInterval(DEPARTMENT_CAROUSEL_MAX_INTERVAL_MS)).toBe(true);
  });

  it("rejects non-integer and out-of-range intervals", () => {
    expect(isAllowedDepartmentCarouselInterval(2499)).toBe(false);
    expect(isAllowedDepartmentCarouselInterval(12_001)).toBe(false);
    expect(isAllowedDepartmentCarouselInterval(3800.5)).toBe(false);
  });
});
