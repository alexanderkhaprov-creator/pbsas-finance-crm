const explicitLabels: Record<string, string> = {
  applications: "Applications",
  generatedLicenses: "Generated Licenses",
  issuedLicenses: "Issued Licenses",
  licenseApplications: "License Applications",
  licenseIntake: "License Intake",
  licenseReceipts: "License Receipts",
  expenses: "Expenses",
  receipts: "Receipts",
  reimbursements: "Reimbursements",
  revenues: "Revenue",
  revenue: "Revenue",
  people: "People",
  events: "Events",
  documents: "Documents",
  auditLogs: "Audit Logs",
  costCenters: "Cost Centers",
  totalExpenses: "Total Expenses",
  totalRevenue: "Total Revenue",
  netPosition: "Net Position",
  outstandingReimbursements: "Outstanding Reimbursements",
  activeLicenses: "Active Licenses",
  expiringLicenses: "Expiring Licenses",
  expiredLicenses: "Expired Licenses"
};

const financialWords = [
  "amount",
  "balance",
  "cost",
  "deficit",
  "due",
  "expense",
  "expenses",
  "fee",
  "income",
  "invoice",
  "owed",
  "outstanding",
  "paid",
  "payment",
  "profit",
  "reimbursed",
  "reimbursement",
  "reimbursements",
  "revenue",
  "spend",
  "surplus"
];

const countKeys = [
  "active licenses",
  "applications",
  "audit logs",
  "cost centers",
  "documents",
  "events",
  "expired licenses",
  "expiring licenses",
  "expenses",
  "generated licenses",
  "issued licenses",
  "license applications",
  "license intake",
  "license receipts",
  "people",
  "receipts",
  "reimbursements",
  "revenue",
  "revenues"
];

const countWords = [
  "applications",
  "awaiting",
  "cancelled",
  "complete",
  "count",
  "documents",
  "expired",
  "generated",
  "imports",
  "issued",
  "licenses",
  "missing",
  "pending",
  "ready",
  "records",
  "rejected",
  "renewals",
  "receipts",
  "sent",
  "views"
];

export function humanizeReportLabel(label: string) {
  if (explicitLabels[label]) return explicitLabels[label];
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatAed(value: number) {
  const formatted = formatNumber(Math.abs(value));
  return value < 0 ? `AED (${formatted})` : `AED ${formatted}`;
}

export function isFinancialReportLabel(label: string) {
  const normalized = humanizeReportLabel(label).toLowerCase();
  if (normalized.includes("net position") || normalized.includes("p&l")) return true;
  return financialWords.some((word) => normalized.includes(word));
}

export function isCountReportLabel(label: string) {
  const normalized = humanizeReportLabel(label).toLowerCase();
  if (countKeys.includes(normalized)) return true;
  return countWords.some((word) => normalized.includes(word));
}

export function formatReportValue(label: string, value: number, currencyDefault = false) {
  const normalized = humanizeReportLabel(label).toLowerCase();
  if (normalized.includes("rate")) return `${formatNumber(value).replace(/\.00$/, "")}%`;
  if (countKeys.includes(normalized)) return formatCount(value);
  if (isCountReportLabel(label) && !isFinancialReportLabel(label)) return formatCount(value);
  if (currencyDefault || isFinancialReportLabel(label)) return formatAed(value);
  return formatCount(value);
}

export function netPositionTone(label: string, value: number) {
  const normalized = humanizeReportLabel(label).toLowerCase();
  if (!normalized.includes("net position") && !normalized.includes("surplus") && !normalized.includes("deficit") && !normalized.includes("p&l")) {
    return "neutral";
  }
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function netPositionClass(label: string, value: number) {
  const tone = netPositionTone(label, value);
  if (tone === "positive") return "text-emerald-700";
  if (tone === "negative") return "text-red-700";
  return "text-ink";
}
