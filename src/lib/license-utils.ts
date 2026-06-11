import type { GeneratedLicense } from "@/types";

export type LicenseOperationalStatus = "Active" | "Expiring Soon" | "Expired" | "Cancelled" | "Rejected" | "Awaiting Stamp" | "Draft";

export function daysUntil(date: string, now = new Date()) {
  if (!date) return null;
  const expiry = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

export function getLicenseOperationalStatus(license: Pick<GeneratedLicense, "approvalStatus" | "stampStatus" | "expiryDate">): LicenseOperationalStatus {
  if (license.approvalStatus === "Cancelled") return "Cancelled";
  if (license.approvalStatus === "Rejected") return "Rejected";
  const days = daysUntil(license.expiryDate);
  if (days !== null && days < 0) return "Expired";
  const issuedOrStamped = license.approvalStatus === "Issued" || license.approvalStatus === "Stamped / Certified" || license.stampStatus === "Stamped";
  if (issuedOrStamped && days !== null && days <= 90) return "Expiring Soon";
  if (issuedOrStamped) return "Active";
  if (license.approvalStatus === "Approved Awaiting Stamp") return "Awaiting Stamp";
  return "Draft";
}

export function getLicenseExpiryText(expiryDate: string) {
  const days = daysUntil(expiryDate);
  if (days === null) return "No expiry date";
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} days`;
}

export function getLicenseStatusForDisplay(license: GeneratedLicense) {
  const operational = getLicenseOperationalStatus(license);
  return operational === "Awaiting Stamp" ? license.approvalStatus ?? "Approved Awaiting Stamp" : operational;
}

export function addYears(date: string, years: number) {
  const base = date ? new Date(`${date.slice(0, 10)}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  base.setFullYear(base.getFullYear() + years);
  return base.toISOString().slice(0, 10);
}
