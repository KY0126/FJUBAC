export type ManagedAccountSnapshot = {
  id: number;
  accountType: "internal" | "external" | "oauth" | null;
};

export function canManageAccount(actorUserId: number, account: ManagedAccountSnapshot) {
  return actorUserId !== account.id && account.accountType !== "oauth";
}

export function toAccountAuditData(account: { name: string | null; email: string | null; studentNumber: string | null; accountStatus: string }, membershipStatus: string | null) {
  return { name: account.name, email: account.email, studentNumber: account.studentNumber, accountStatus: account.accountStatus, membershipStatus };
}
