export const CONSENT_VERSION = "2026-11";

export const MEMBERSHIP_CATEGORIES: Record<string, string> = {
  ordinary: "Ordinary Member",
  ward_rep: "Ward Accountability Representative",
  community_rep: "Community Development Representative",
  lga_rep: "Local Government Accountability Representative",
  state_volunteer: "State Volunteer",
  national_volunteer: "National Volunteer",
  professional: "Professional and Technical Volunteer",
  research: "Research and Policy Volunteer",
};

export const PRIORITIES: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const VERIFICATION: Record<string, string> = {
  unverified: "Unverified",
  under_review: "Under review",
  verified: "Independently verified",
  disputed: "Disputed",
};

export const MILESTONE_STATUSES: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  missed: "Missed",
};

export interface OfficeInfo {
  label: string;
  level: "federal" | "state" | "local" | "ward";
  elected: boolean;
}

export const OFFICES: Record<string, OfficeInfo> = {
  president: { label: "President", level: "federal", elected: true },
  senator: { label: "Senator", level: "federal", elected: true },
  house_rep: { label: "Member, House of Representatives", level: "federal", elected: true },
  governor: { label: "State Governor", level: "state", elected: true },
  state_legislator: { label: "Member, State House of Assembly", level: "state", elected: true },
  lga_chair: { label: "LGA / Area Council Chairperson", level: "local", elected: true },
  councillor: { label: "Ward Councillor", level: "ward", elected: true },
  minister: { label: "Minister (appointed)", level: "federal", elected: false },
  commissioner: { label: "State Commissioner (appointed)", level: "state", elected: false },
  other_appointed: { label: "Other appointed official", level: "federal", elected: false },
};

export function officeLabel(office: string): string {
  return OFFICES[office]?.label ?? "";
}
