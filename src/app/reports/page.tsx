"use client";

import { Download } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { sumOutstanding, totalExpensesByField } from "@/lib/finance-calculations";
import { getFinancialReporting } from "@/lib/financial-reporting";
import { formatCurrency } from "@/lib/format";
import { getLicenseRevenueSummary } from "@/lib/license-revenue";

function ExportButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      {["CSV", "PDF", "Excel"].map((type) => (
        <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" key={type}>
          <Download className="h-4 w-4" />
          Export {type}
        </button>
      ))}
    </div>
  );
}

function SummaryPanel({ title, totals, currency = true }: { title: string; totals: Record<string, number>; currency?: boolean }) {
  return (
    <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-3">
        {Object.entries(totals).map(([label, amount]) => (
          <div className="flex min-w-0 items-center justify-between gap-4 border-b border-black/5 pb-2 text-sm" key={label}>
            <span className="min-w-0 break-words text-steel">{label}</span>
            <span className="min-w-0 shrink-0 overflow-hidden whitespace-nowrap text-[clamp(0.8rem,1vw,1rem)] font-semibold text-ink tabular-nums">{currency ? formatCurrency(amount) : amount}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function requiredLicenseDocumentsComplete(application: ReturnType<typeof useFinanceData>["licenseApplications"][number]) {
  const requiredDocuments = (application.documentChecklistSnapshot ?? []).filter((item) => item.required);
  if (!requiredDocuments.length) return application.completionChecklist.identificationProvided && application.completionChecklist.photoReceived;
  return requiredDocuments.every((item) => item.received || item.verificationStatus === "Received" || item.verificationStatus === "Verified");
}

function coreDocumentStatus(application: ReturnType<typeof useFinanceData>["licenseApplications"][number]) {
  const documents = application.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  const photoDocument = documents.find((item) => item.documentName.toLowerCase().includes("photograph") || item.documentName.toLowerCase().includes("photo"));
  return {
    idVerified: idDocument?.verificationStatus === "Verified",
    photoVerified: photoDocument?.verificationStatus === "Verified"
  };
}

export default function ReportsPage() {
  const { expenses, reimbursements, receipts, revenues, auditLogs, documents, applicationImports, licenseApplications, licenseFeeSchedule, licenseReceipts, generatedLicenses } = useFinanceData();
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const reimbursementTotal = reimbursements.reduce((sum, reimbursement) => sum + reimbursement.amount, 0);
  const revenueByCostCenter = revenues.reduce<Record<string, number>>((totals, revenue) => {
    const key = revenue.costCenter || "No cost center";
    totals[key] = (totals[key] ?? 0) + revenue.amount;
    return totals;
  }, {});
  const expenseByCostCenter = expenses.reduce<Record<string, number>>((totals, expense) => {
    const key = expense.costCenter || "No cost center";
    totals[key] = (totals[key] ?? 0) + expense.amount;
    return totals;
  }, {});
  const costCenterPnL = Object.fromEntries(
    [...new Set([...Object.keys(revenueByCostCenter), ...Object.keys(expenseByCostCenter)])].map((costCenter) => [
      costCenter,
      (revenueByCostCenter[costCenter] ?? 0) - (expenseByCostCenter[costCenter] ?? 0)
    ])
  );
  const amountOwedByPerson = reimbursements.reduce<Record<string, number>>((totals, reimbursement) => {
    totals[reimbursement.personOwed] = (totals[reimbursement.personOwed] ?? 0) + reimbursement.outstandingBalance;
    return totals;
  }, {});
  const receiptSummary = {
    "Total receipts uploaded": receipts.length,
    "Converted receipts": receipts.filter((receipt) => receipt.status === "Converted to Expense").length,
    "Rejected receipts": receipts.filter((receipt) => receipt.status === "Rejected").length,
    "Pending review receipts": receipts.filter((receipt) => receipt.status === "New" || receipt.status === "Needs Review").length
  };
  const monthlyExpenseSummary = expenses.reduce<Record<string, number>>((totals, expense) => {
    const key = expense.date.slice(0, 7) || "No month";
    totals[key] = (totals[key] ?? 0) + expense.amount;
    return totals;
  }, {});
  const reimbursementPayments = {
    "Reimbursement payments recorded": reimbursements.filter((reimbursement) => Boolean(reimbursement.settlementDate || reimbursement.settlementReference || reimbursement.amountReimbursed > 0)).length,
    "Amount reimbursed": reimbursements.reduce((sum, reimbursement) => sum + reimbursement.amountReimbursed, 0),
    "Outstanding Balance": sumOutstanding(reimbursements)
  };
  const applicationImportLog = {
    "Application imports uploaded": applicationImports.length,
    "Awaiting mapping review": applicationImports.filter((item) => ["Uploaded", "Text Extracted", "Mapping Review"].includes(item.ocrStatus)).length,
    "Ready to create application": applicationImports.filter((item) => item.ocrStatus === "Ready To Create Application").length,
    "Converted to application": applicationImports.filter((item) => item.ocrStatus === "Converted To Application").length,
    "Rejected imports": applicationImports.filter((item) => item.ocrStatus === "Rejected").length
  };
  const receiptImportLog = {
    "Receipt OCR records": receipts.filter((receipt) => Boolean(receipt.ocrStatus)).length,
    "Receipt imports awaiting mapping review": receipts.filter((receipt) => receipt.ocrStatus && ["Uploaded", "Text Extracted", "Mapping Review"].includes(receipt.ocrStatus)).length,
    "Receipt imports ready to register": receipts.filter((receipt) => receipt.ocrStatus === "Ready To Convert Receipt").length,
    "Receipt imports registered": receipts.filter((receipt) => receipt.ocrStatus === "Converted To Expense").length
  };
  const lowConfidenceReview = {
    "Low-confidence application imports": applicationImports.filter((item) => item.confidenceLevel === "Low" || item.confidenceLevel === "Manual Review Required").length,
    "Low-confidence receipt imports": receipts.filter((receipt) => receipt.confidenceLevel === "Low" || receipt.confidenceLevel === "Manual Review Required").length
  };
  const auditActivity = auditLogs.reduce<Record<string, number>>((totals, log) => {
    totals[log.action] = (totals[log.action] ?? 0) + 1;
    return totals;
  }, {});
  const reconciledByCostCenter = expenses
    .filter((expense) => expense.reconciliationStatus === "Reconciled")
    .reduce<Record<string, number>>((totals, expense) => {
      const key = expense.costCenter || "No cost center";
      totals[key] = (totals[key] ?? 0) + expense.amount;
      return totals;
    }, {});
  const batchEntrySummary = {
    "Batch-created expenses": auditLogs.filter((log) => log.module === "Batch Entry" && log.action === "Created").length
  };
  const licenseByCategory = licenseApplications.reduce<Record<string, number>>((totals, application) => {
    const key = application.licenseCategory === "Other" ? application.otherCategoryDescription || "Other" : application.licenseCategory;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});
  const licenseBySource = licenseApplications.reduce<Record<string, number>>((totals, application) => {
    totals[application.applicationSource] = (totals[application.applicationSource] ?? 0) + 1;
    return totals;
  }, {});
  const licenseReports = {
    "Payment pending list": licenseApplications.filter((application) => application.paymentStatus === "Pending Payment" || application.paymentStatus === "Partially Paid").length,
    "Approved awaiting stamp": licenseApplications.filter((application) => application.licenseStatus === "Approved Awaiting Stamp").length,
    "Applications pending chief review": licenseApplications.filter((application) => application.reviewStatus === "Pending Chief Review").length,
    "Issued licenses registry": licenseApplications.filter((application) => application.licenseStatus === "Issued" || application.reviewStatus === "License Issued").length,
    "LIN registry": licenseApplications.length,
    "Applications rejected": licenseApplications.filter((application) => application.reviewStatus === "Rejected" || application.licenseStatus === "Rejected").length
  };
  const missingDocumentReport = {
    "Missing photo": licenseApplications.filter((application) => !application.completionChecklist.photoReceived).length,
    "Missing passport / ID": licenseApplications.filter((application) => !application.completionChecklist.identificationProvided).length,
    "Missing application form": licenseApplications.filter((application) => !application.completionChecklist.applicationFormReceived).length,
    "Missing medical": licenseApplications.filter((application) => !application.completionChecklist.medicalReceived).length
  };
  const missingPaymentReport = {
    "Missing payment": licenseApplications.filter((application) => !application.completionChecklist.paymentReceived || application.paymentStatus === "Pending Payment" || application.paymentStatus === "Partially Paid").length,
    "Waived": licenseApplications.filter((application) => application.paymentStatus === "Waived").length,
    "Refunded": licenseApplications.filter((application) => application.paymentStatus === "Refunded").length
  };
  const paymentVerificationReport = {
    "Payment submitted awaiting verification": licenseApplications.filter((application) => application.paymentStatus === "Payment Submitted" || application.reviewStatus === "Awaiting Payment Verification").length,
    "Payment proof rejected": licenseApplications.filter((application) => application.paymentStatus === "Rejected").length,
    "Pending Review - Payment Section": licenseApplications.filter((application) => application.reviewStatus === "Pending Review - Payment Section").length,
    "Manually paid applications": licenseApplications.filter((application) => application.paymentConfirmationType === "Manually Paid").length,
    "Cash paid applications": licenseApplications.filter((application) => application.paymentConfirmationType === "Cash Paid").length,
    "Applications manually marked ready for chief review": licenseApplications.filter((application) => application.paymentConfirmationType === "Admin Ready Override" || Boolean(application.paymentReadyOverrideReason)).length,
    "Applications blocked by unverified passport/ID": licenseApplications.filter((application) => !coreDocumentStatus(application).idVerified).length,
    "Applications blocked by unverified photo": licenseApplications.filter((application) => !coreDocumentStatus(application).photoVerified).length,
    "Payment rejected": auditLogs.filter((log) => log.action === "Payment Rejected").length,
    "Payment waived": licenseApplications.filter((application) => application.paymentStatus === "Waived").length,
    "Combined officials applications": licenseApplications.filter((application) => (application.additionalOfficialCategories ?? []).length > 1).length,
    "Applications blocked from Chief Review": licenseApplications.filter((application) => (application.paymentStatus !== "Paid" && application.paymentStatus !== "Waived") || !requiredLicenseDocumentsComplete(application)).length
  };
  const licenseReceiptReport = {
    "License receipts generated": licenseReceipts.length,
    "Active receipts": licenseReceipts.filter((receipt) => receipt.status === "Active").length,
    "Cancelled receipts": licenseReceipts.filter((receipt) => receipt.status === "Cancelled").length,
    "Receipt amount total": licenseReceipts.reduce((sum, receipt) => sum + receipt.amountReceived, 0)
  };
  const licenseExceptionReport = {
    "Applications paid but documents not verified": licenseApplications.filter((application) => (application.paymentStatus === "Paid" || application.paymentStatus === "Waived") && !requiredLicenseDocumentsComplete(application)).length,
    "Documents received but not verified": licenseApplications.reduce((sum, application) => sum + (application.documentChecklistSnapshot ?? []).filter((item) => item.verificationStatus === "Received").length, 0),
    "Approved awaiting stamp": licenseApplications.filter((application) => application.licenseStatus === "Approved Awaiting Stamp" || application.stampStatus === "Awaiting Stamp").length,
    "Issued license registry": generatedLicenses.length,
    "Rejected applications with reasons": licenseApplications.filter((application) => (application.reviewStatus === "Rejected" || application.licenseStatus === "Rejected") && application.rejectionReason).length
  };
  const historicalMigrationReport = {
    "Historical migration": licenseApplications.filter((application) => application.applicationOrigin === "Historical Migration").length,
    "New application": licenseApplications.filter((application) => application.applicationOrigin === "New Application").length,
    "Online form": licenseApplications.filter((application) => application.applicationOrigin === "Online Form").length,
    "Manual entry": licenseApplications.filter((application) => application.applicationOrigin === "Manual Entry").length
  };
  const feeScheduleSummary = licenseFeeSchedule.reduce<Record<string, number>>((totals, item) => {
    if (item.status === "Active") totals[item.category] = item.amount;
    return totals;
  }, {});
  const applicationsByFeeCategory = licenseApplications.reduce<Record<string, number>>((totals, application) => {
    totals[application.licenseCategory] = (totals[application.licenseCategory] ?? 0) + 1;
    return totals;
  }, {});
  const amountDueByCategory = licenseApplications.reduce<Record<string, number>>((totals, application) => {
    totals[application.licenseCategory] = (totals[application.licenseCategory] ?? 0) + application.amountDue;
    return totals;
  }, {});
  const amountPaidByCategory = licenseApplications.reduce<Record<string, number>>((totals, application) => {
    totals[application.licenseCategory] = (totals[application.licenseCategory] ?? 0) + application.amountPaid;
    return totals;
  }, {});
  const licenseRevenue = getLicenseRevenueSummary(licenseApplications);
  const financialReporting = getFinancialReporting({ expenses, revenues, licenseApplications });
  const documentApprovalRegister = [
    ...documents.map((document) => ({ id: document.id, title: document.title, approvalStatus: document.approvalStatus ?? "Draft", stampStatus: document.stampStatus ?? "Not Available Yet", issuedDate: document.issuedDate ?? "", approvedBy: document.approvedBy ?? "", stampedBy: document.stampedBy ?? "" })),
    ...generatedLicenses.map((license) => ({ id: license.id, title: `${license.applicantName} · ${license.lin}`, approvalStatus: license.approvalStatus ?? "Draft", stampStatus: license.stampStatus, issuedDate: license.issuedDate ?? "", approvedBy: license.approvedBy ?? "", stampedBy: license.stampedBy ?? "" })),
    ...licenseReceipts.map((receipt) => ({ id: receipt.id, title: `${receipt.applicantName} receipt`, approvalStatus: receipt.approvalStatus ?? "Issued", stampStatus: receipt.stampStatus ?? "Not Available Yet", issuedDate: receipt.issuedDate ?? receipt.receiptDate, approvedBy: receipt.approvedBy ?? "", stampedBy: receipt.stampedBy ?? "" }))
  ];

  return (
    <>
      <PageHeader title="Reports" description="Operational accounting summaries for board review, federation workflows, and daily finance checks." />
      <div className="mb-6 flex justify-end">
        <ExportButtons />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold text-ink">Expense summaries</h3>
          <p className="mt-3 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(1rem,2vw,1.875rem)] font-semibold leading-tight text-ink tabular-nums">{formatCurrency(expenseTotal)}</p>
          <p className="mt-1 text-sm text-steel">{expenses.length} expense records</p>
        </section>
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold text-ink">Reimbursement summaries</h3>
          <p className="mt-3 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(1rem,2vw,1.875rem)] font-semibold leading-tight text-ink tabular-nums">{formatCurrency(reimbursementTotal)}</p>
          <p className="mt-1 text-sm text-steel">{reimbursements.length} reimbursement records</p>
        </section>
      </div>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Receipt processing summary</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(receiptSummary).map(([label, value]) => (
            <div className="rounded border border-black/10 bg-[#f7f7f5] p-4" key={label}>
              <p className="text-sm text-steel">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">License Income by Category</h3>
        <p className="mt-3 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(1rem,2vw,1.875rem)] font-semibold leading-tight text-ink tabular-nums">{formatCurrency(licenseRevenue.totalRevenue)}</p>
        <p className="mt-1 text-sm text-steel">Total Revenue from License Applications</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["License category", "Fee amount", "Paid application count", "Total income", "Calculation"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {licenseRevenue.byCategory.map((row) => (
                <tr key={row.category}>
                  <td className="px-4 py-4 font-medium text-ink">{row.category}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.feeAmount)}</td>
                  <td className="px-4 py-4 text-steel">{row.paidCount}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(row.totalIncome)}</td>
                  <td className="px-4 py-4 text-steel">{row.category} License Income = {formatCurrency(row.feeAmount)} x {row.paidCount} = {formatCurrency(row.totalIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Income Statement</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ReportMetric label="Total Revenue" value={formatCurrency(financialReporting.receivedRevenue)} />
          <ReportMetric label="Total Expenses" value={formatCurrency(financialReporting.totalExpenses)} />
          <ReportMetric label={financialReporting.netPosition >= 0 ? "Net Surplus" : "Net Deficit"} value={formatCurrency(financialReporting.netPosition)} />
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Revenue by Category</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Category", "Count", "Amount"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {financialReporting.revenueByCategory.map((row) => (
                <tr key={row.category}>
                  <td className="px-4 py-4 font-medium text-ink">{row.category}</td>
                  <td className="px-4 py-4 text-steel">{row.count}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Revenue by Month</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Month", "Revenue", "Expenses", "Net Position"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {financialReporting.revenueByMonth.map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-4 font-medium text-ink">{row.month}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.expenses)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(row.netPosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Revenue Outstanding & Collection Report</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <ReportMetric label="Expected Revenue" value={formatCurrency(financialReporting.expectedRevenue)} />
          <ReportMetric label="Received Revenue" value={formatCurrency(financialReporting.receivedRevenue)} />
          <ReportMetric label="Outstanding Revenue" value={formatCurrency(financialReporting.outstandingRevenue)} />
          <ReportMetric label="Collection Rate" value={`${financialReporting.collectionRate.toFixed(1)}%`} />
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Event Profitability</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Event", "Revenue", "Expenses", "Net Position"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {financialReporting.eventProfitability.map((row) => (
                <tr key={row.event}>
                  <td className="px-4 py-4 font-medium text-ink">{row.event}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.expenses)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(row.netPosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Document Approval Register</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ReportMetric label="Pending Approval" value={String(documentApprovalRegister.filter((item) => item.approvalStatus === "Pending Approval").length)} />
          <ReportMetric label="Awaiting Stamp" value={String(documentApprovalRegister.filter((item) => item.approvalStatus === "Approved Awaiting Stamp").length)} />
          <ReportMetric label="Issued Documents" value={String(documentApprovalRegister.filter((item) => item.approvalStatus === "Issued").length)} />
        </div>
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Stamped Documents Register</h3>
        <SummaryPanel title="Stamped documents" totals={{ "Stamped / Certified": documentApprovalRegister.filter((item) => item.approvalStatus === "Stamped / Certified" || item.stampStatus === "Stamped").length }} currency={false} />
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Issued Documents Register</h3>
        <SummaryPanel title="Issued documents" totals={{ Issued: documentApprovalRegister.filter((item) => item.approvalStatus === "Issued").length }} currency={false} />
      </section>
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">License Stamp Status</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ReportMetric label="Licenses Awaiting Stamp" value={String(generatedLicenses.filter((license) => (license.approvalStatus ?? "Draft") === "Approved Awaiting Stamp").length)} />
          <ReportMetric label="Licenses Issued" value={String(generatedLicenses.filter((license) => license.approvalStatus === "Issued").length)} />
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryPanel title="Cost Center P&L summary" totals={costCenterPnL} />
        <SummaryPanel title="Cost Center expense breakdown" totals={expenseByCostCenter} />
        <SummaryPanel title="Reimbursement amount owed by person" totals={amountOwedByPerson} />
        <SummaryPanel title="Outstanding reimbursements report" totals={{ "Outstanding reimbursements": sumOutstanding(reimbursements) }} />
        <SummaryPanel title="Reimbursements Paid" totals={{ "Amount reimbursed": reimbursements.reduce((sum, reimbursement) => sum + reimbursement.amountReimbursed, 0) }} />
        <SummaryPanel title="Reimbursement Payments" totals={reimbursementPayments} />
        <SummaryPanel title="Monthly Expense Summary" totals={monthlyExpenseSummary} />
        <SummaryPanel title="Unreconciled expenses report" totals={{ "Unreconciled expenses": expenses.filter((expense) => !expense.reconciliationStatus || expense.reconciliationStatus === "Not Reconciled" || expense.reconciliationStatus === "In Review").reduce((sum, expense) => sum + expense.amount, 0) }} />
        <SummaryPanel title="Disputed expenses report" totals={{ "Disputed expenses": expenses.filter((expense) => expense.reconciliationStatus === "Disputed").reduce((sum, expense) => sum + expense.amount, 0) }} />
        <SummaryPanel title="Reconciled totals by cost center" totals={reconciledByCostCenter} />
        <SummaryPanel title="Audit activity summary" totals={auditActivity} currency={false} />
        <SummaryPanel title="Batch entry summary" totals={batchEntrySummary} currency={false} />
        <SummaryPanel
          title="Approved but unpaid reimbursements"
          totals={{
            "Approved unpaid": reimbursements
              .filter((reimbursement) => reimbursement.status === "Approved for Reimbursement" || reimbursement.status === "Partially Reimbursed")
              .reduce((sum, reimbursement) => sum + reimbursement.outstandingBalance, 0)
          }}
        />
        <SummaryPanel title="Expenses pending review" totals={{ "Pending review": expenses.filter((expense) => expense.approvalStatus === "Pending Review" || expense.approvalStatus === "Submitted").reduce((sum, expense) => sum + expense.amount, 0) }} />
        <SummaryPanel title="Receipts pending registration" totals={{ "Receipt register items": receipts.filter((receipt) => receipt.status === "New" || receipt.status === "Needs Review").length }} currency={false} />
        <SummaryPanel title="Application import log" totals={applicationImportLog} currency={false} />
        <SummaryPanel title="Receipt import log" totals={receiptImportLog} currency={false} />
        <SummaryPanel title="OCR low-confidence review" totals={lowConfidenceReview} currency={false} />
        <SummaryPanel title="License applications by category" totals={licenseByCategory} currency={false} />
        <SummaryPanel title="Applications by source" totals={licenseBySource} currency={false} />
        <SummaryPanel title="License application workflow" totals={licenseReports} currency={false} />
        <SummaryPanel title="Missing document report" totals={missingDocumentReport} currency={false} />
        <SummaryPanel title="Missing payment report" totals={missingPaymentReport} currency={false} />
        <SummaryPanel title="Payment verification controls" totals={paymentVerificationReport} currency={false} />
        <SummaryPanel title="License receipts report" totals={licenseReceiptReport} />
        <SummaryPanel title="License workflow exceptions" totals={licenseExceptionReport} currency={false} />
        <SummaryPanel title="Fee schedule summary" totals={feeScheduleSummary} />
        <SummaryPanel title="Applications by fee category" totals={applicationsByFeeCategory} currency={false} />
        <SummaryPanel title="Amounts due by category" totals={amountDueByCategory} />
        <SummaryPanel title="Amounts paid by category" totals={amountPaidByCategory} />
        <SummaryPanel title="Outstanding invoices" totals={{ "Outstanding invoices": licenseApplications.filter((application) => ["Generated", "Sent", "Invoice Sent", "Draft"].includes(application.invoiceStatus)).reduce((sum, application) => sum + Math.max(0, application.invoiceAmount - application.amountPaid), 0) }} />
        <SummaryPanel title="Paid invoices" totals={{ "Paid invoices": licenseApplications.filter((application) => application.invoiceStatus === "Paid").length }} currency={false} />
        <SummaryPanel title="Applications blocked by missing payment" totals={{ "Blocked by missing payment": licenseApplications.filter((application) => (application.applicationOrigin === "Online Application" || application.applicationOrigin === "Online Form") && application.paymentStatus !== "Paid" && application.paymentStatus !== "Waived").length }} currency={false} />
        <SummaryPanel title="Applications ready for chief review" totals={{ "Ready for chief review": licenseApplications.filter((application) => (application.paymentStatus === "Paid" || application.paymentStatus === "Waived") && (application.documentChecklistSnapshot ?? []).filter((item) => item.required).every((item) => item.received || item.verificationStatus === "Received" || item.verificationStatus === "Verified")).length }} currency={false} />
        <SummaryPanel title="Paid to UAE Boxing Federation" totals={{ "Paid to UAE Boxing Federation": licenseApplications.filter((application) => application.paidTo === "UAE Boxing Federation").reduce((sum, application) => sum + application.amountPaid, 0) }} />
        <SummaryPanel title="Paid to UAE Athletic Commission" totals={{ "Paid to UAE Athletic Commission": licenseApplications.filter((application) => application.paidTo === "UAE Athletic Commission").reduce((sum, application) => sum + application.amountPaid, 0) }} />
        <SummaryPanel title="Paid to PBSAS" totals={{ "Paid to PBSAS": licenseApplications.filter((application) => application.paidTo === "PBSAS").reduce((sum, application) => sum + application.amountPaid, 0) }} />
        <SummaryPanel title="Required document completion report" totals={{ "Complete required documents": licenseApplications.filter((application) => (application.documentChecklistSnapshot ?? []).filter((item) => item.required).every((item) => item.received || item.verificationStatus === "Received" || item.verificationStatus === "Verified")).length }} currency={false} />
        <SummaryPanel title="Identification missing report" totals={{ "Identification missing": licenseApplications.filter((application) => !application.passportNumber && !application.nationalIdNumber && !application.identificationNumber).length }} currency={false} />
        <SummaryPanel title="Awaiting chief review report" totals={{ "Pending chief review": licenseApplications.filter((application) => application.reviewStatus === "Pending Chief Review").length }} currency={false} />
        <SummaryPanel title="Awaiting stamp report" totals={{ "Awaiting stamp": licenseApplications.filter((application) => application.licenseStatus === "Approved Awaiting Stamp" || application.stampStatus === "Awaiting Stamp").length }} currency={false} />
        <SummaryPanel title="License category statistics" totals={licenseByCategory} currency={false} />
        <SummaryPanel title="Historical migration report" totals={historicalMigrationReport} currency={false} />
        <SummaryPanel title="Expenses by person" totals={totalExpensesByField(expenses, "paidBy")} />
        <SummaryPanel title="Expenses by category" totals={totalExpensesByField(expenses, "category")} />
        <SummaryPanel title="Event financial summaries" totals={totalExpensesByField(expenses, "event")} />
        <SummaryPanel title="Expenses by operational link" totals={totalExpensesByField(expenses, "linkType")} />
      </div>
    </>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-black/10 bg-[#f7f7f5] p-4">
      <p className="min-w-0 break-words text-sm text-steel">{label}</p>
      <p className="mt-2 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(0.8rem,1vw,1.5rem)] font-semibold leading-tight text-ink tabular-nums">{value}</p>
    </div>
  );
}
