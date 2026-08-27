const departmentAnchors = {
  "人才發展部": "department-talent",
  "專案開發部": "department-project",
  "對外發展部": "department-external",
  "學術營運部": "department-academic",
  "行銷策略部": "department-marketing",
} as const;

export function getDepartmentAnchorId(name: string) {
  return departmentAnchors[name as keyof typeof departmentAnchors] ?? "department-overview";
}
