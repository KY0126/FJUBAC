export type ApplicantType = "internal" | "external";

export function getApplicationEmail(input: {
  applicantType: ApplicantType;
  schoolEmail?: string | null;
  externalEmail?: string | null;
}) {
  return input.applicantType === "internal" ? input.schoolEmail?.trim().toLowerCase() ?? "" : input.externalEmail?.trim().toLowerCase() ?? "";
}

export function isInternalApplicationComplete(input: {
  studentNumber?: string | null;
  schoolEmail?: string | null;
}) {
  return Boolean(input.studentNumber?.trim() && input.schoolEmail?.trim());
}

export function isApplicationCycleOpen(input: { status: string; opensAt: Date; documentDeadlineAt: Date }, now: Date) {
  return input.status === "open" && input.opensAt <= now && input.documentDeadlineAt >= now;
}
