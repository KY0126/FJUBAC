import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("招生流程進度條", () => {
  it("以五個明確階段呈現申請、審查、面試、核准與帳號啟用", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/RecruitmentProgress.tsx"), "utf8");
    for (const label of ["申請送出", "書面審查", "面試安排", "最終結果", "帳號啟用"]) expect(source).toContain(label);
    expect(source).toContain("<ol>");
  });
});
