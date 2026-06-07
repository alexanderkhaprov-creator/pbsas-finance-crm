import type { LicenseApplication } from "@/types";

export type LicenseRevenueRow = {
  category: string;
  feeAmount: number;
  paidCount: number;
  totalIncome: number;
};

function isConfirmedPaidApplication(application: LicenseApplication) {
  if (application.paymentStatus === "Refunded" || application.paymentStatus === "Rejected") return false;
  if (application.paymentStatus === "Waived") return application.amountPaid > 0;
  if (application.paymentStatus === "Paid" || application.paymentStatus === "Payment Verified") return true;
  return application.paymentConfirmationType === "Cash Paid" || application.paymentConfirmationType === "Manually Paid";
}

function licenseRevenueAmount(application: LicenseApplication) {
  if (!isConfirmedPaidApplication(application)) return 0;
  if (application.amountPaid > 0) return application.amountPaid;
  return application.invoiceAmount || application.amountDue || 0;
}

function licenseCategoryLabel(application: LicenseApplication) {
  if (application.additionalOfficialCategories?.length) return application.additionalOfficialCategories.join(" / ");
  return application.licenseCategory === "Other" ? application.otherCategoryDescription || "Other" : application.licenseCategory;
}

export function getPaidLicenseApplications(applications: LicenseApplication[]) {
  return applications
    .map((application) => ({ application, category: licenseCategoryLabel(application), amount: licenseRevenueAmount(application) }))
    .filter((item) => item.amount > 0);
}

export function getLicenseRevenueSummary(applications: LicenseApplication[]) {
  const paidApplications = getPaidLicenseApplications(applications);
  const byCategory = new Map<string, LicenseRevenueRow>();
  const byPaidTo = paidApplications.reduce<Record<string, number>>((totals, item) => {
    const paidTo = item.application.paidTo || "Other";
    totals[paidTo] = (totals[paidTo] ?? 0) + item.amount;
    return totals;
  }, {});

  for (const item of paidApplications) {
    const current = byCategory.get(item.category) ?? {
      category: item.category,
      feeAmount: item.amount,
      paidCount: 0,
      totalIncome: 0
    };
    current.paidCount += 1;
    current.totalIncome += item.amount;
    current.feeAmount = current.paidCount ? current.totalIncome / current.paidCount : item.amount;
    byCategory.set(item.category, current);
  }

  return {
    paidApplications,
    totalRevenue: paidApplications.reduce((sum, item) => sum + item.amount, 0),
    byCategory: [...byCategory.values()].sort((a, b) => b.totalIncome - a.totalIncome),
    byPaidTo
  };
}
