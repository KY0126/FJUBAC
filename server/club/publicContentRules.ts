export function hasPublicProjectConsent(input: { isPublic: boolean; publicSummary?: string; confirmPublicConsent: boolean }) {
  return !input.isPublic || (Boolean(input.publicSummary?.trim()) && input.confirmPublicConsent);
}

export function hasPublicResourceConsent(input: { visibility: "public" | "member" | "project" | "officer"; confirmPublicConsent: boolean }) {
  return input.visibility !== "public" || input.confirmPublicConsent;
}
