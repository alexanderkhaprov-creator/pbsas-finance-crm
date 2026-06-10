import { getLicenseRevenueSummary } from "@/lib/license-revenue";
import type { Expense, LicenseApplication, Revenue } from "@/types";

type FinancialInputs = {
  expenses: Expense[];
  revenues: Revenue[];
  licenseApplications: LicenseApplication[];
};

function monthKey(date: string | undefined) {
  return date?.slice(0, 7) || "No month";
}

function revenueCategory(revenue: Revenue) {
  return revenue.revenueCategory || "Other Revenue";
}

function manualExpectedRevenue(revenue: Revenue) {
  return revenue.expectedRevenue ?? revenue.amount ?? 0;
}

function manualReceivedRevenue(revenue: Revenue) {
  return revenue.receivedRevenue ?? revenue.amount ?? 0;
}

function isSubmittedInvoice(application: LicenseApplication) {
  return ["Generated", "Invoice Sent", "Sent", "Paid"].includes(application.invoiceStatus);
}

function expectedLicenseRevenue(application: LicenseApplication) {
  if (!isSubmittedInvoice(application)) return 0;
  return application.invoiceAmount || application.amountDue || 0;
}

export function getFinancialReporting(inputs: FinancialInputs) {
  const { expenses, revenues, licenseApplications } = inputs;
  const licenseRevenue = getLicenseRevenueSummary(licenseApplications);
  const expectedLicenseRevenueTotal = licenseApplications.reduce((sum, application) => sum + expectedLicenseRevenue(application), 0);
  const manualExpectedRevenueTotal = revenues.reduce((sum, revenue) => sum + manualExpectedRevenue(revenue), 0);
  const manualReceivedRevenueTotal = revenues.reduce((sum, revenue) => sum + manualReceivedRevenue(revenue), 0);
  const expectedRevenue = expectedLicenseRevenueTotal + manualExpectedRevenueTotal;
  const receivedRevenue = licenseRevenue.totalRevenue + manualReceivedRevenueTotal;
  const outstandingRevenue = Math.max(0, expectedRevenue - receivedRevenue);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netPosition = receivedRevenue - totalExpenses;
  const collectionRate = expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;

  const categoryRows = new Map<string, { category: string; count: number; amount: number }>();
  categoryRows.set("License Revenue", {
    category: "License Revenue",
    count: licenseRevenue.paidApplications.length,
    amount: licenseRevenue.totalRevenue
  });

  for (const revenue of revenues) {
    const category = revenueCategory(revenue);
    const current = categoryRows.get(category) ?? { category, count: 0, amount: 0 };
    current.count += 1;
    current.amount += manualReceivedRevenue(revenue);
    categoryRows.set(category, current);
  }

  const revenueByCategory = [...categoryRows.values()].filter((row) => row.amount > 0 || row.count > 0).sort((a, b) => b.amount - a.amount);
  const topRevenueSource = revenueByCategory[0]?.category ?? "None";

  const monthlyRows = new Map<string, { month: string; revenue: number; expenses: number; netPosition: number }>();
  const ensureMonth = (month: string) => {
    const current = monthlyRows.get(month) ?? { month, revenue: 0, expenses: 0, netPosition: 0 };
    monthlyRows.set(month, current);
    return current;
  };

  for (const revenue of revenues) ensureMonth(monthKey(revenue.revenueDate)).revenue += manualReceivedRevenue(revenue);
  for (const item of licenseRevenue.paidApplications) {
    ensureMonth(monthKey(item.application.paymentDate || item.application.invoiceDate || item.application.updatedAt)).revenue += item.amount;
  }
  for (const expense of expenses) ensureMonth(monthKey(expense.date)).expenses += expense.amount;
  for (const row of monthlyRows.values()) row.netPosition = row.revenue - row.expenses;

  const eventRows = new Map<string, { event: string; revenue: number; expenses: number; netPosition: number }>();
  const ensureEvent = (event: string) => {
    const current = eventRows.get(event) ?? { event, revenue: 0, expenses: 0, netPosition: 0 };
    eventRows.set(event, current);
    return current;
  };
  for (const revenue of revenues) ensureEvent(revenue.event || "No event").revenue += manualReceivedRevenue(revenue);
  for (const expense of expenses) ensureEvent(expense.linkedEventName || expense.event || "No event").expenses += expense.amount;
  for (const row of eventRows.values()) row.netPosition = row.revenue - row.expenses;

  return {
    expectedRevenue,
    receivedRevenue,
    outstandingRevenue,
    totalExpenses,
    netPosition,
    collectionRate,
    topRevenueSource,
    revenueByCategory,
    revenueByMonth: [...monthlyRows.values()].sort((a, b) => b.month.localeCompare(a.month)),
    eventProfitability: [...eventRows.values()].sort((a, b) => b.revenue - a.revenue),
    licenseRevenue
  };
}
