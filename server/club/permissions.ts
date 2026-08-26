export const DEPARTMENTS = [
  {
    code: "talent",
    name: "人才發展部",
    englishName: "Talent Acquisition & Engagement",
    description: "招生、書審、面試與社員互動。",
  },
  {
    code: "project",
    name: "專案開發部",
    englishName: "Project Development & Management",
    description: "專案建立、專案生指派與專案營運。",
  },
  {
    code: "external",
    name: "對外發展部",
    englishName: "External Affairs",
    description: "對外合作、對外活動與聯絡窗口。",
  },
  {
    code: "academic",
    name: "學術營運部",
    englishName: "Academic Operations",
    description: "社課、學術活動、教材與學習資源。",
  },
  {
    code: "marketing",
    name: "行銷策略部",
    englishName: "Marketing Strategy",
    description: "公開內容、品牌資訊、宣傳與公開頁維護。",
  },
] as const;

export const PERMISSION_GROUPS = {
  recruitmentReview: "recruitment.review",
  projectManageDepartment: "project.manage.department",
  eventManageDepartment: "event.manage.department",
  resourceManageDepartment: "resource.manage.department",
  contentManagePublic: "content.manage.public",
  officerAssign: "officer.assign",
  auditReadGlobal: "audit.read.global",
} as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS];

export function canUsePermission(
  options: { isPresident: boolean; permissionGroups: readonly string[] },
  permission: PermissionGroup
) {
  return options.isPresident || options.permissionGroups.includes(permission);
}
