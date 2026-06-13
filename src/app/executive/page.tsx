"use client";

import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLicenseOperationalStatus } from "@/lib/license-utils";
import type { AuditLog, CostCenter, Event, Expense, GeneratedLicense, LicenseApplication, LicenseIntake, LicenseReceipt, Person, ReceiptIntake, Reimbursement, Revenue, SupportingDocument } from "@/types";

const EXECUTIVE_SNAPSHOT_KEY = "executiveSnapshot";

type ExecutiveSnapshot = {
  generatedAt?: string;
  generatedBy?: string;
  recordCounts?: Record<string, number>;
  people?: Person[];
  events?: Event[];
  costCenters?: CostCenter[];
  auditLogs?: AuditLog[];
  documents?: SupportingDocument[];
  receipts?: ReceiptIntake[];
  licenseIntake?: LicenseIntake[];
  licenseReceipts?: LicenseReceipt[];
  applications?: LicenseApplication[];
  expenses?: Expense[];
  reimbursements?: Reimbursement[];
  revenues?: Revenue[];
  licenseApplications?: LicenseApplication[];
  generatedLicenses?: GeneratedLicense[];
  issuedLicenses?: GeneratedLicense[];
  reports?: Record<string, number>;
  dashboardSummary?: Record<string, number>;
  snapshotType?: string;
  exportedAt?: string;
  appVersion?: string;
};

function isValidExecutiveSnapshot(value: unknown): value is ExecutiveSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as ExecutiveSnapshot;
  return Boolean(snapshot.generatedAt || snapshot.exportedAt || snapshot.snapshotType === "executive-review" || snapshot.reports || snapshot.licenseApplications || snapshot.expenses);
}

export default function ExecutivePage() {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [dataSource, setDataSource] = useState<"Shared Deployed Snapshot" | "Local Browser Snapshot" | "None">("None");

  useEffect(() => {
    async function loadSnapshot() {
      try {
        const response = await fetch("/executive-snapshot.json", { cache: "no-store" });
        if (response.ok) {
          const deployed = await response.json();
          if (isValidExecutiveSnapshot(deployed)) {
            setSnapshot(deployed);
            setDataSource("Shared Deployed Snapshot");
            setHasLoaded(true);
            return;
          }
        }
      } catch {
        // Fall back to local browser snapshot.
      }

      const stored = window.localStorage.getItem(EXECUTIVE_SNAPSHOT_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ExecutiveSnapshot;
          if (isValidExecutiveSnapshot(parsed)) {
            setSnapshot(parsed);
            setDataSource("Local Browser Snapshot");
            setHasLoaded(true);
            return;
          }
        } catch {
          window.localStorage.removeItem(EXECUTIVE_SNAPSHOT_KEY);
        }
      }

      setSnapshot(null);
      setDataSource("None");
      setHasLoaded(true);
    }

    void loadSnapshot();
  }, []);

  const metrics = useMemo(() => {
    const people = snapshot?.people ?? [];
    const events = snapshot?.events ?? [];
    const costCenters = snapshot?.costCenters ?? [];
    const auditLogs = snapshot?.auditLogs ?? [];
    const documents = snapshot?.documents ?? [];
    const receipts = snapshot?.receipts ?? [];
    const licenseIntake = snapshot?.licenseIntake ?? [];
    const licenseReceipts = snapshot?.licenseReceipts ?? [];
    const applications = snapshot?.applications ?? snapshot?.licenseApplications ?? [];
    const licenses = snapshot?.generatedLicenses ?? [];
    const expenses = snapshot?.expenses ?? [];
    const reimbursements = snapshot?.reimbursements ?? [];
    const revenues = snapshot?.revenues ?? [];
    const issuedLicenses = snapshot?.issuedLicenses ?? licenses.filter((license) => license.approvalStatus === "Issued" || license.approvalStatus === "Stamped / Certified" || license.stampStatus === "Stamped");
    return {
      applications,
      licenses,
      issuedLicenses,
      people,
      events,
      costCenters,
      auditLogs,
      documents,
      receipts,
      licenseIntake,
      licenseReceipts,
      expenses,
      reimbursements,
      revenues,
      totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      totalRevenue: revenues.reduce((sum, revenue) => sum + revenue.amount, 0),
      outstandingReimbursements: reimbursements.reduce((sum, reimbursement) => sum + (reimbursement.outstandingBalance ?? 0), 0),
      reports: snapshot?.reports ?? {
        applications: applications.length,
        generatedLicenses: licenses.length,
        issuedLicenses: issuedLicenses.length,
        expenses: expenses.length,
        receipts: receipts.length,
        reimbursements: reimbursements.length,
        revenues: revenues.length,
        totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
        totalRevenue: revenues.reduce((sum, revenue) => sum + revenue.amount, 0),
        outstandingReimbursements: reimbursements.reduce((sum, reimbursement) => sum + (reimbursement.outstandingBalance ?? 0), 0)
      }
    };
  }, [snapshot]);

  return (
    <>
      <PageHeader title="Executive Review" description="Read-only executive snapshot for applications, licenses, finance, and reports." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-gold/50 bg-ink p-4 text-white shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Executive Review Mode</p>
          <h2 className="text-xl font-semibold">{dataSource === "Shared Deployed Snapshot" ? "Shared Deployed Snapshot" : "Read Only"}</h2>
        </div>
        <div className="text-right text-sm text-white/75">
          <p>Data Source: {dataSource}</p>
          <p>{snapshot?.generatedAt || snapshot?.exportedAt ? new Date(snapshot.generatedAt || snapshot.exportedAt || "").toLocaleString() : "Not published"}</p>
          <p>Generated by: {snapshot?.generatedBy || "Not recorded"}</p>
        </div>
      </div>

      {hasLoaded && !snapshot ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          No executive snapshot has been published yet. Please publish one from Data Management.
        </div>
      ) : null}

      {snapshot ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Applications" value={String(metrics.applications.length)} detail="License applications" />
        <MetricCard label="Generated Licenses" value={String(metrics.licenses.length)} detail="Document records" />
        <MetricCard label="Issued Licenses" value={String(metrics.issuedLicenses.length)} detail="Certified or issued" />
        <MetricCard label="Expenses" value={formatCurrency(metrics.totalExpenses)} detail={`${metrics.expenses.length} records`} />
        <MetricCard label="Receipts" value={String(metrics.receipts.length)} detail="Receipt register" />
        <MetricCard label="Reimbursements" value={formatCurrency(metrics.outstandingReimbursements)} detail={`${metrics.reimbursements.length} records`} />
        <MetricCard label="Revenue" value={formatCurrency(metrics.totalRevenue)} detail={`${metrics.revenues.length} records`} />
        <MetricCard label="People" value={String(metrics.people.length)} detail="Registry records" />
        <MetricCard label="Events" value={String(metrics.events.length)} detail="Event records" />
        <MetricCard label="Documents" value={String(metrics.documents.length)} detail="Document register" />
        <MetricCard label="Audit Logs" value={String(metrics.auditLogs.length)} detail="Activity records" />
        <MetricCard label="Reports" value={String(Object.keys(metrics.reports).length)} detail="Snapshot report counters" />
      </div> : null}

      {snapshot?.recordCounts ? <section className="mt-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Record Counts</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(snapshot.recordCounts).map(([label, value]) => (
            <div className="rounded border border-black/10 bg-[#f7f7f5] p-4" key={label}>
              <p className="text-sm text-steel">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </section> : null}

      {snapshot ? <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold text-ink">Applications</h3>
          <div className="mt-4 space-y-3">
            {metrics.applications.slice(0, 8).map((application) => (
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-2 text-sm" key={application.id}>
                <span className="font-medium text-ink">{application.applicantFullName}</span>
                <StatusBadge value={application.licenseStatus} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold text-ink">Issued Licenses</h3>
          <div className="mt-4 space-y-3">
            {metrics.issuedLicenses.slice(0, 8).map((license) => (
              <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-2 text-sm" key={license.generatedLicenseRecordId || `${license.id}-${license.applicationId}`}>
                <span className="font-medium text-ink">{license.id} · {license.applicantName}</span>
                <StatusBadge value={getLicenseOperationalStatus(license)} />
              </div>
            ))}
          </div>
        </section>
      </div> : null}

      {snapshot ? <section className="mt-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Reports</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(metrics.reports).map(([label, value]) => (
            <div className="rounded border border-black/10 bg-[#f7f7f5] p-4" key={label}>
              <p className="text-sm text-steel">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </section> : null}
    </>
  );
}
