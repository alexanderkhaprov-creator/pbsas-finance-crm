"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import { getDashboardMetrics, sumOutstanding, totalExpensesByField } from "@/lib/finance-calculations";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { QuickExpenseEntry } from "@/components/quick-expense-entry";
import { StatusBadge } from "@/components/status-badge";
import { useFinanceData } from "@/components/finance-data-provider";
import { getLicenseRevenueSummary } from "@/lib/license-revenue";

function SummaryList({ title, totals }: { title: string; totals: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(totals));

  return (
    <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-4">
        {Object.entries(totals).map(([label, amount]) => (
          <div key={label}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-steel">{label}</span>
              <span className="font-semibold text-ink">{formatCurrency(amount)}</span>
            </div>
            <div className="mt-2 h-2 rounded bg-black/5">
              <div className="h-2 rounded bg-gold" style={{ width: `${Math.max(12, (amount / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityFeed({ expenses }: { expenses: ReturnType<typeof useFinanceData>["expenses"] }) {
  return (
    <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
      <h3 className="text-base font-semibold text-ink">Recent activity feed</h3>
      <div className="mt-4 space-y-3">
        {expenses.slice(0, 5).map((expense) => (
          <div className="border-l-2 border-gold pl-3" key={expense.id}>
            <p className="text-sm font-semibold text-ink">{expense.description}</p>
            <p className="text-xs text-steel">{expense.id} · {expense.category} · {formatCurrency(expense.amount, expense.currency)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function coreDocumentsVerified(application: ReturnType<typeof useFinanceData>["licenseApplications"][number]) {
  const documents = application.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  const photoDocument = documents.find((item) => item.documentName.toLowerCase().includes("photograph") || item.documentName.toLowerCase().includes("photo"));
  return idDocument?.verificationStatus === "Verified" && photoDocument?.verificationStatus === "Verified";
}

export default function DashboardPage() {
  const { expenses, reimbursements, receipts, costCenters, auditLogs, documents, appSettings, applicationImports, licenseApplications, licenseIntake, licenseReceipts } = useFinanceData();
  const dashboardMetrics = getDashboardMetrics(expenses, reimbursements);
  const byEvent = totalExpensesByField(expenses, "event");
  const byCategory = totalExpensesByField(expenses, "category");
  const byPaidBy = totalExpensesByField(expenses, "paidBy");
  const byCostCenter = totalExpensesByField(expenses, "costCenter");
  const recentExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const byMonth = expenses.reduce<Record<string, number>>((totals, expense) => {
    const key = expense.date.slice(0, 7);
    totals[key] = (totals[key] ?? 0) + expense.amount;
    return totals;
  }, {});
  const pendingReimbursements = reimbursements.filter((item) => item.outstandingBalance > 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const pendingReceipts = receipts.filter((receipt) => receipt.status === "New" || receipt.status === "Needs Review");
  const receiptsConvertedThisMonth = receipts.filter((receipt) => receipt.status === "Converted to Expense" && receipt.uploadDate.startsWith(currentMonth));
  const applicationImportsAwaitingMapping = applicationImports.filter((item) => ["Uploaded", "Text Extracted", "Mapping Review"].includes(item.ocrStatus));
  const receiptImportsAwaitingMapping = receipts.filter((receipt) => receipt.ocrStatus && ["Uploaded", "Text Extracted", "Mapping Review"].includes(receipt.ocrStatus));
  const importsConvertedThisMonth = applicationImports.filter((item) => item.ocrStatus === "Converted To Application" && item.updatedAt.startsWith(currentMonth)).length + receipts.filter((receipt) => receipt.ocrStatus === "Converted To Expense" && receipt.uploadDate.startsWith(currentMonth)).length;
  const lowConfidenceImports = applicationImports.filter((item) => ["Low", "Manual Review Required"].includes(item.confidenceLevel)).length + receipts.filter((receipt) => receipt.confidenceLevel && ["Low", "Manual Review Required"].includes(receipt.confidenceLevel)).length;
  const pendingApprovals = expenses.filter((expense) => expense.approvalStatus === "Submitted" || expense.approvalStatus === "Pending Review");
  const awaitingApproval = expenses.filter((expense) => expense.approvalStatus === "Submitted" || expense.approvalStatus === "Under Review");
  const awaitingReview = expenses.filter((expense) => expense.approvalStatus === "Pending Review" || expense.approvalStatus === "Under Review");
  const receiptsAwaitingReview = receipts.filter((receipt) => receipt.status === "New" || receipt.status === "Needs Review");
  const costCentersOverBudget = costCenters.filter((costCenter) => (byCostCenter[costCenter.name] ?? 0) > costCenter.budgetAmount);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const auditEventsThisWeek = auditLogs.filter((log) => new Date(log.timestamp) >= weekAgo).length;
  const lastBackup = auditLogs.find((log) => log.action === "Exported" && log.module === "Data Management");
  const unreconciledExpenses = expenses.filter((expense) => !expense.reconciliationStatus || expense.reconciliationStatus === "Not Reconciled" || expense.reconciliationStatus === "In Review");
  const disputedExpenses = expenses.filter((expense) => expense.reconciliationStatus === "Disputed");
  const approvedReimbursements = reimbursements.filter((item) => item.status === "Approved for Reimbursement" || item.status === "Partially Reimbursed");
  const reconciledExpenses = expenses.filter((expense) => expense.reconciliationStatus === "Reconciled");
  const expensesByCurrency = expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.amount;
    return totals;
  }, {});
  const largestCostCenterSpend = Object.entries(byCostCenter).sort((a, b) => b[1] - a[1])[0];
  const licenseRevenue = getLicenseRevenueSummary(licenseApplications);
  const overdueReimbursements = reimbursements.filter((item) => item.dueDate && item.outstandingBalance > 0 && item.dueDate < "2026-06-02");
  const reimbursementsDue = reimbursements.filter((item) => item.outstandingBalance > 0 && item.status !== "Closed");
  const missingDocumentExpenses = expenses.filter((expense) => !documents.some((document) => document.linkedModule === "Expense" && document.linkedRecordId === expense.id));
  const licenseSummary = {
    pendingPayment: licenseApplications.filter((application) => application.paymentStatus === "Pending Payment" || application.paymentStatus === "Partially Paid").length,
    paymentSubmittedAwaitingVerification: licenseApplications.filter((application) => application.paymentStatus === "Payment Submitted" || application.reviewStatus === "Awaiting Payment Verification").length,
    paymentProofRejected: licenseApplications.filter((application) => application.paymentStatus === "Rejected").length,
    pendingPaymentSectionReview: licenseApplications.filter((application) => application.reviewStatus === "Pending Review - Payment Section").length,
    manualPaymentConfirmations: licenseApplications.filter((application) => application.paymentConfirmationType === "Cash Paid" || application.paymentConfirmationType === "Manually Paid").length,
    blockedByCoreDocuments: licenseApplications.filter((application) => !coreDocumentsVerified(application)).length,
    paidApplications: licenseApplications.filter((application) => application.paymentStatus === "Paid" || application.paymentStatus === "Waived").length,
    eligibleForChiefReview: licenseApplications.filter((application) => application.reviewStatus === "Eligible For Chief Review").length,
    blockedByMissingPayment: licenseApplications.filter((application) => application.paymentStatus !== "Paid" && application.paymentStatus !== "Waived" && ["Eligible For Chief Review", "Under Chief Review", "Pending Chief Review", "Approved by Chief"].includes(application.reviewStatus)).length,
    receiptsGenerated: licenseReceipts.length,
    awaitingDocumentVerification: licenseApplications.filter((application) => (application.documentChecklistSnapshot ?? []).some((item) => item.fileName && item.verificationStatus === "Received")).length,
    awaitingDocuments: licenseApplications.filter((application) => !application.completionChecklist.photoReceived || !application.completionChecklist.identificationProvided || !application.completionChecklist.applicationFormReceived || !application.completionChecklist.medicalReceived).length,
    pendingChiefReview: licenseApplications.filter((application) => application.reviewStatus === "Pending Chief Review").length,
    approvedAwaitingStamp: licenseApplications.filter((application) => application.licenseStatus === "Approved Awaiting Stamp").length,
    issued: licenseApplications.filter((application) => application.licenseStatus === "Issued" || application.reviewStatus === "License Issued").length,
    rejected: licenseApplications.filter((application) => application.licenseStatus === "Rejected" || application.reviewStatus === "Rejected").length,
    issuedThisMonth: licenseApplications.filter((application) => (application.licenseStatus === "Issued" || application.reviewStatus === "License Issued") && application.updatedAt.startsWith(currentMonth)).length,
    historicalImported: licenseApplications.filter((application) => application.applicationOrigin === "Historical Migration").length
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Finance overview for expenses, reimbursements, event costs, and recent operational activity."
      />
      <div className="mb-6">
        <QuickExpenseEntry />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total expenses" value={formatCurrency(dashboardMetrics.totalExpenses)} detail="All tracked spend" />
        <MetricCard label="Approved expenses" value={formatCurrency(dashboardMetrics.totalApprovedExpenses)} detail="Approved spend" />
        <MetricCard label="Pending expenses" value={formatCurrency(dashboardMetrics.totalPendingExpenses)} detail="Pending review" />
        <MetricCard label="Reimbursable amount" value={formatCurrency(dashboardMetrics.totalReimbursableAmount)} detail="Eligible for repayment" />
        <MetricCard label="Pending reimbursement" value={formatCurrency(dashboardMetrics.totalPendingReimbursement)} detail="Open reimbursements" />
        <MetricCard label="Reimbursed amount" value={formatCurrency(dashboardMetrics.totalReimbursedAmount)} detail="Paid back" />
        <MetricCard label="New receipts pending review" value={String(pendingReceipts.length)} detail="Receipt register queue" />
        <MetricCard label="Receipts converted this month" value={String(receiptsConvertedThisMonth.length)} detail="Converted to expenses" />
        <MetricCard label="Application imports awaiting mapping review" value={String(applicationImportsAwaitingMapping.length)} detail="OCR-ready application queue" />
        <MetricCard label="Receipt imports awaiting mapping review" value={String(receiptImportsAwaitingMapping.length)} detail="Receipt OCR queue" />
        <MetricCard label="Imports converted this month" value={String(importsConvertedThisMonth)} detail="Application and receipt imports" />
        <MetricCard label="Low-confidence imports" value={String(lowConfidenceImports)} detail="Manual review required" />
        <MetricCard label="Outstanding reimbursements" value={formatCurrency(sumOutstanding(reimbursements))} detail="Current amount owed" />
        <MetricCard label="Expenses Awaiting Approval" value={String(awaitingApproval.length)} detail={formatCurrency(awaitingApproval.reduce((sum, expense) => sum + expense.amount, 0))} />
        <MetricCard label="Expenses Awaiting Review" value={String(awaitingReview.length)} detail={formatCurrency(awaitingReview.reduce((sum, expense) => sum + expense.amount, 0))} />
        <MetricCard label="Pending approvals" value={String(pendingApprovals.length)} detail="Submitted or pending review" />
        <MetricCard label="Receipts awaiting review" value={String(receiptsAwaitingReview.length)} detail="Register queue" />
        <MetricCard label="Cost centers over budget" value={String(costCentersOverBudget.length)} detail="Budget exceptions" />
        <MetricCard label="Unreconciled expenses" value={String(unreconciledExpenses.length)} detail={formatCurrency(unreconciledExpenses.reduce((sum, expense) => sum + expense.amount, 0))} />
        <MetricCard label="Disputed expenses" value={String(disputedExpenses.length)} detail={formatCurrency(disputedExpenses.reduce((sum, expense) => sum + expense.amount, 0))} />
        <MetricCard label="Audit events this week" value={String(auditEventsThisWeek)} detail="Local activity log" />
        <MetricCard label="Last data backup" value={lastBackup ? formatDate(lastBackup.timestamp) : "None"} detail={lastBackup ? lastBackup.timestamp.slice(11, 16) : "No export logged"} />
        <MetricCard label="Total license applications" value={String(licenseApplications.length)} detail="Application registry" />
        <MetricCard label="Applications awaiting payment" value={String(licenseSummary.pendingPayment)} detail="Payment follow-up" />
        <MetricCard label="Payment submitted awaiting verification" value={String(licenseSummary.paymentSubmittedAwaitingVerification)} detail="Finance verification queue" />
        <MetricCard label="Payment Proof Rejected" value={String(licenseSummary.paymentProofRejected)} detail="Rejected proof requires payment review" />
        <MetricCard label="Pending Payment Section Review" value={String(licenseSummary.pendingPaymentSectionReview)} detail="Payment section queue" />
        <MetricCard label="Manual Payment Confirmations" value={String(licenseSummary.manualPaymentConfirmations)} detail="Cash or manually paid" />
        <MetricCard label="Applications Blocked by Core Documents" value={String(licenseSummary.blockedByCoreDocuments)} detail="Passport/ID or photo not verified" />
        <MetricCard label="Receipts generated" value={String(licenseSummary.receiptsGenerated)} detail="License payment receipts" />
        <MetricCard label="Awaiting document verification" value={String(licenseSummary.awaitingDocumentVerification)} detail="Received but not verified" />
        <MetricCard label="Paid applications" value={String(licenseSummary.paidApplications)} detail="Paid or waived" />
        <MetricCard label="Eligible for Chief Review" value={String(licenseSummary.eligibleForChiefReview)} detail="Payment cleared and ready" />
        <MetricCard label="Blocked by missing payment" value={String(licenseSummary.blockedByMissingPayment)} detail="Cannot advance to Chief Review" />
        <MetricCard label="Applications awaiting documents" value={String(licenseSummary.awaitingDocuments)} detail="Missing information" />
        <MetricCard label="Applications awaiting chief review" value={String(licenseSummary.pendingChiefReview)} detail="Chief workflow" />
        <MetricCard label="Applications awaiting stamp" value={String(licenseSummary.approvedAwaitingStamp)} detail="Stamp workflow" />
        <MetricCard label="Licenses issued this month" value={String(licenseSummary.issuedThisMonth)} detail={`${licenseSummary.issued} total issued`} />
        <MetricCard label="Historical applications imported" value={String(licenseSummary.historicalImported)} detail={`${licenseIntake.filter((intake) => intake.intakeStatus === "Converted to Application").length} converted intakes`} />
        <MetricCard label="Applications rejected" value={String(licenseSummary.rejected)} detail="Rejected applications" />
        <MetricCard label="Reimbursements Due" value={String(reimbursementsDue.length)} detail={formatCurrency(reimbursementsDue.reduce((sum, item) => sum + item.outstandingBalance, 0))} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Unreviewed receipts" value={String(receiptsAwaitingReview.length)} detail="Needs intake action" />
        <MetricCard label="Unreconciled expenses" value={String(unreconciledExpenses.length)} detail={formatCurrency(unreconciledExpenses.reduce((sum, expense) => sum + expense.amount, 0))} />
        <MetricCard label="Overdue reimbursements" value={String(overdueReimbursements.length)} detail={formatCurrency(overdueReimbursements.reduce((sum, item) => sum + item.outstandingBalance, 0))} />
        <MetricCard label="Missing linked documents" value={String(missingDocumentExpenses.length)} detail="Expense records without documents" />
        <MetricCard label="Closed-period edit attempts" value={String(appSettings.closedPeriodEditAttempts ?? 0)} detail="Warnings triggered" />
      </div>
      <section className="mt-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Treasury Summary</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Outstanding reimbursements" value={formatCurrency(sumOutstanding(reimbursements))} detail="Total amount owed" />
          <MetricCard label="Approved reimbursements" value={formatCurrency(approvedReimbursements.reduce((sum, item) => sum + item.outstandingBalance, 0))} detail={`${approvedReimbursements.length} approved records`} />
          <MetricCard label="Pending expenses" value={formatCurrency(dashboardMetrics.totalPendingExpenses)} detail="Pending review spend" />
          <MetricCard label="Reconciled expenses" value={formatCurrency(reconciledExpenses.reduce((sum, expense) => sum + expense.amount, 0))} detail={`${reconciledExpenses.length} records`} />
          <MetricCard label="Largest cost center" value={largestCostCenterSpend?.[0] ?? "None"} detail={largestCostCenterSpend ? formatCurrency(largestCostCenterSpend[1]) : "No spend"} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SummaryList title="Expenses by currency" totals={expensesByCurrency} />
          <SummaryList title="Monthly totals" totals={byMonth} />
        </div>
      </section>
      <section className="mt-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">License Revenue</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total license revenue received" value={formatCurrency(licenseRevenue.totalRevenue)} detail={`${licenseRevenue.paidApplications.length} confirmed paid applications`} />
          {licenseRevenue.byCategory.slice(0, 3).map((row) => (
            <MetricCard key={row.category} label={row.category} value={formatCurrency(row.totalIncome)} detail={`${row.paidCount} paid · avg ${formatCurrency(row.feeAmount)}`} />
          ))}
        </div>
      </section>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <SummaryList title="Monthly expense overview" totals={byMonth} />
        <SummaryList title="Expenses by event" totals={byEvent} />
        <SummaryList title="Expenses by category" totals={byCategory} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <SummaryList title="Expenses by cost center" totals={byCostCenter} />
        <SummaryList title="Expenses by paid-by person" totals={byPaidBy} />
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold text-ink">Pending reimbursement widget</h3>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(pendingReimbursements.reduce((sum, item) => sum + item.outstandingBalance, 0))}</p>
          <div className="mt-4 space-y-2">
            {pendingReimbursements.map((item) => (
              <div className="flex items-center justify-between gap-3 text-sm" key={item.id}>
                <span className="text-steel">{item.personOwed}</span>
                <span className="font-semibold text-ink">{formatCurrency(item.outstandingBalance)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <ActivityFeed expenses={recentExpenses} />
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft xl:col-span-2">
          <h3 className="text-base font-semibold text-ink">Cost centers over budget</h3>
          <div className="mt-4 space-y-2">
            {costCentersOverBudget.length ? costCentersOverBudget.map((costCenter) => (
              <div className="flex items-center justify-between gap-4 rounded border border-red-100 bg-red-50 px-3 py-2 text-sm" key={costCenter.id}>
                <span className="font-medium text-red-800">{costCenter.name}</span>
                <span className="font-semibold text-red-800">{formatCurrency(byCostCenter[costCenter.name] ?? 0, costCenter.currency)} / {formatCurrency(costCenter.budgetAmount, costCenter.currency)}</span>
              </div>
            )) : <p className="text-sm text-steel">No cost centers are over budget.</p>}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-base font-semibold text-ink">Recent expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reimbursement</th>
                <th className="px-4 py-3">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {recentExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-4 font-medium text-ink">{expense.id}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(expense.date)}</td>
                  <td className="px-4 py-4 text-steel">{expense.event}</td>
                  <td className="px-4 py-4 text-steel">{expense.category}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(expense.amount, expense.currency)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge value={expense.reimbursementStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={expense.approvalStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
