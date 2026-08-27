import { describe, expect, it } from "vitest";
import { DEPARTMENT_ROTATE_INTERVAL_MS, getCircularOffset, getDepartmentStackLayout } from "./stackedDepartmentCards";

describe("五部門疊加焦點卡片", () => {
  it("將目前焦點維持在最大、最前層且完全不透明", () => {
    expect(getDepartmentStackLayout(2, 2, 5)).toEqual({
      offset: 0,
      scale: 1,
      opacity: 1,
      zIndex: 5,
      shift: "0%",
      rotateY: 0,
      depth: 68,
    });
  });

  it("讓兩側卡片以循環順序依距離縮放、降低層級、淡化並沿相反方向 RotateY", () => {
    const near = getDepartmentStackLayout(3, 2, 5);
    const far = getDepartmentStackLayout(4, 2, 5);
    expect(near.offset).toBe(1);
    expect(far.offset).toBe(2);
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.opacity).toBeGreaterThan(far.opacity);
    expect(near.zIndex).toBeGreaterThan(far.zIndex);
    expect(near.rotateY).toBeGreaterThan(0);
    expect(getDepartmentStackLayout(1, 2, 5).rotateY).toBeLessThan(0);
    expect(near.depth).toBeGreaterThan(far.depth);
  });

  it("可從首尾卡片循環切換，避免五張卡片出現死角", () => {
    expect(getCircularOffset(0, 4, 5)).toBe(1);
    expect(getCircularOffset(4, 0, 5)).toBe(-1);
  });

  it("使用一致且低干擾的前端輪播週期", () => {
    expect(DEPARTMENT_ROTATE_INTERVAL_MS).toBe(4800);
  });
});
