export const DAILY_GOVERNANCE_JOB_KEY = "daily-governance";

export function governanceWindow(now: Date, days: number) {
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + days);
  return until;
}

export function isEligibleForReminder(endsOn: Date, now: Date, days: number) {
  const until = governanceWindow(now, days);
  return endsOn > now && endsOn <= until;
}
