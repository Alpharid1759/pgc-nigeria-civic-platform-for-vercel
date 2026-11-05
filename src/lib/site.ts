export const SITE_NAME = "PGC Nigeria";
export const SITE_TAGLINE = "Democracy Beyond the Ballot";
export const SITE_DESCRIPTION =
  "The People's Governance Compact: a proposed, non-partisan, citizen-led institution for continuous participatory accountability in Nigeria.";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const CONTACT = {
  phone: process.env.PGC_CONTACT_PHONE ?? "09028748800",
  phoneHref: "tel:+2349028748800",
  whatsapp: process.env.PGC_CONTACT_WHATSAPP_URL ?? "https://wa.me/2349028748800",
  email: process.env.PGC_CONTACT_EMAIL ?? "harubutu@gmail.com",
};

export const NAV: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Institutional Governance", href: "/constitution" },
  { label: "Development Register", href: "/projects" },
  { label: "States & FCT", href: "/states" },
  { label: "Scorecards", href: "/scorecards" },
  { label: "Methodology", href: "/methodology" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Membership", href: "/membership" },
  { label: "Contact", href: "/contact" },
];

export const STAGES: { title: string; text: string }[] = [
  { title: "Community Needs Assessment", text: "Citizens identify and document development challenges." },
  { title: "Community Prioritisation", text: "Residents rank projects by urgency, impact, affordability and resources." },
  { title: "Development Compact Formulation", text: "Priorities become measurable commitments with costs, funding sources and timelines." },
  { title: "Candidate & Government Engagement", text: "Candidates respond to the compact and make public commitments." },
  { title: "Election & Public Mandate", text: "Citizens monitor commitments and the lawful duties of elected officials." },
  { title: "Quarterly Performance Monitoring", text: "Independent, evidence-based scorecards are published each quarter." },
  { title: "Public Accountability & Remedial Action", text: "Citizens request explanations, petition and engage oversight institutions lawfully." },
];

export const PROJECT_STATUSES: Record<string, string> = {
  proposed: "Proposed",
  community_review: "Under Community Review",
  prioritised: "Prioritised",
  submitted_government: "Submitted to Government",
  in_approved_budget: "Included in Approved Budget",
  funded: "Funded",
  procurement: "Procurement in Progress",
  ongoing: "Ongoing",
  delayed: "Delayed",
  suspended: "Suspended",
  completed: "Completed",
  verified: "Independently Verified",
  cancelled: "Cancelled",
};

export const SECTORS: Record<string, string> = {
  roads: "Roads and Transportation",
  energy: "Electricity and Renewable Energy",
  water: "Water Supply and Sanitation",
  health: "Healthcare",
  education: "Education",
  agriculture: "Agriculture and Food Security",
  security: "Security and Community Safety",
  housing: "Housing and Urban Development",
  environment: "Environmental Protection",
  waste: "Waste Management",
  markets: "Markets and Commercial Infrastructure",
  youth: "Youth Development and Employment",
  women: "Women Empowerment",
  welfare: "Social Welfare",
  sports: "Sports and Recreation",
  digital: "Digital Infrastructure",
  drainage: "Drainage and Flood Control",
  public_admin: "Public Administration",
  other: "Other Community Development Needs",
};
