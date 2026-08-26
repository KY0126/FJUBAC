import { describe, expect, it } from "vitest";
import { hasPublicProjectConsent, hasPublicResourceConsent } from "./publicContentRules";

describe("公開內容同意規則", () => {
  it("公開專案成果必須同時具公開摘要與明確同意", () => {
    expect(hasPublicProjectConsent({ isPublic: true, publicSummary: "", confirmPublicConsent: true })).toBe(false);
    expect(hasPublicProjectConsent({ isPublic: true, publicSummary: "可公開的專案摘要", confirmPublicConsent: false })).toBe(false);
    expect(hasPublicProjectConsent({ isPublic: true, publicSummary: "可公開的專案摘要", confirmPublicConsent: true })).toBe(true);
  });

  it("公開資源必須明確確認同意，非公開資源不需要公開同意", () => {
    expect(hasPublicResourceConsent({ visibility: "public", confirmPublicConsent: false })).toBe(false);
    expect(hasPublicResourceConsent({ visibility: "public", confirmPublicConsent: true })).toBe(true);
    expect(hasPublicResourceConsent({ visibility: "member", confirmPublicConsent: false })).toBe(true);
  });
});
