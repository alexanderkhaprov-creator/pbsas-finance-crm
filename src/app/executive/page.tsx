"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { getLicenseOperationalStatus } from "@/lib/license-utils";
import { formatAed, formatCount, formatReportValue, humanizeReportLabel, netPositionClass } from "@/lib/report-format";
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

function ExecutiveKpiCard({ title, value, subtitle, tone = "neutral" }: { title: string; value: string; subtitle?: string; tone?: "positive" | "negative" | "neutral" }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-ink";
  return (
    <div className="min-w-0 overflow-hidden rounded border border-black/10 bg-white p-5 shadow-soft">
      <p className="min-w-0 break-words text-sm font-semibold text-steel">{title}</p>
      <p className={`mt-3 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(1rem,1.6vw,1.8rem)] font-semibold leading-tight tabular-nums ${valueClass}`}>{value}</p>
      {subtitle ? <p className="mt-2 min-w-0 break-words text-xs uppercase tracking-[0.16em] text-gold">{subtitle}</p> : null}
    </div>
  );
}

function ExecutiveSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-black/10 bg-[#f7f7f5] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-steel">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  );
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
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
    const netPosition = totalRevenue - totalExpenses;
    const outstandingReimbursements = reimbursements.reduce((sum, reimbursement) => sum + (reimbursement.outstandingBalance ?? 0), 0);
    const activeLicenses = issuedLicenses.filter((license) => getLicenseOperationalStatus(license) === "Active");
    const expiringLicenses = issuedLicenses.filter((license) => getLicenseOperationalStatus(license) === "Expiring Soon");
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
      totalExpenses,
      totalRevenue,
      netPosition,
      outstandingReimbursements,
      activeLicenses,
      expiringLicenses,
      reports: snapshot?.reports ?? {
        applications: applications.length,
        generatedLicenses: licenses.length,
        issuedLicenses: issuedLicenses.length,
        expenses: expenses.length,
        receipts: receipts.length,
        reimbursements: reimbursements.length,
        revenues: revenues.length,
        totalExpenses,
        totalRevenue,
        netPosition,
        outstandingReimbursements
      }
    };
  }, [snapshot]);

  return (
    <>
      <PageHeader title="Executive Review" description="Read-only executive snapshot for applications, licenses, finance, and reports." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-gold/50 bg-ink p-4 text-white shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Executive Review Mode</p>
          <h2 className="text-xl font-semibold">Read Only</h2>
        </div>
        <div className="text-right text-sm text-white/75">
          <p>Data Source: {dataSource}</p>
          <p>Last Snapshot Published: {snapshot?.generatedAt || snapshot?.exportedAt ? new Date(snapshot.generatedAt || snapshot.exportedAt || "").toLocaleString() : "Not published"}</p>
          <p>Generated by: {snapshot?.generatedBy || "Not recorded"}</p>
        </div>
      </div>

      {hasLoaded && !snapshot ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          No executive snapshot has been published yet. Please publish one from Data Management.
        </div>
      ) : null}

      {snapshot ? <div className="space-y-5">
        <ExecutiveSection title="Licensing">
          <ExecutiveKpiCard title="Applications" value={formatCount(metrics.applications.length)} subtitle="Records" />
          <ExecutiveKpiCard title="Generated Licenses" value={formatCount(metrics.licenses.length)} subtitle="Licenses" />
          <ExecutiveKpiCard title="Issued Licenses" value={formatCount(metrics.issuedLicenses.length)} subtitle="Active records" />
        </ExecutiveSection>
        <ExecutiveSection title="Finance">
          <ExecutiveKpiCard title="Revenue" value={formatAed(metrics.totalRevenue)} subtitle={`${formatCount(metrics.revenues.length)} records`} />
          <ExecutiveKpiCard title="Expenses" value={formatAed(metrics.totalExpenses)} subtitle={`${formatCount(metrics.expenses.length)} records`} />
          <ExecutiveKpiCard
            title="Net Position"
            value={formatAed(metrics.netPosition)}
            subtitle={metrics.netPosition >= 0 ? "Net surplus" : "Net deficit"}
            tone={metrics.netPosition > 0 ? "positive" : metrics.netPosition < 0 ? "negative" : "neutral"}
          />
          <ExecutiveKpiCard title="Outstanding Reimbursements" value={formatAed(metrics.outstandingReimbursements)} subtitle="Amount owed" />
        </ExecutiveSection>
        <ExecutiveSection title="Operations">
          <ExecutiveKpiCard title="Reimbursements" value={formatCount(metrics.reimbursements.length)} subtitle="Records" />
          <ExecutiveKpiCard title="Active Licenses" value={formatCount(metrics.activeLicenses.length)} subtitle="Currently valid" />
          <ExecutiveKpiCard title="Expiring Licenses" value={formatCount(metrics.expiringLicenses.length)} subtitle="Within 90 days" />
        </ExecutiveSection>
      </div> : null}

      {snapshot?.recordCounts ? <section className="mt-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Record Counts</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(snapshot.recordCounts).map(([label, value]) => (
            <div className="rounded border border-black/10 bg-[#f7f7f5] p-4" key={label}>
              <p className="text-sm text-steel">{humanizeReportLabel(label)}</p>
              <p className="mt-2 text-2xl font-semibold text-ink tabular-nums">{formatCount(value)}</p>
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
              <p className="text-sm text-steel">{humanizeReportLabel(label)}</p>
              <p className={`mt-2 min-w-0 overflow-hidden whitespace-nowrap text-[clamp(1rem,1.4vw,1.5rem)] font-semibold tabular-nums ${netPositionClass(label, value)}`}>
                {formatReportValue(label, value)}
              </p>
            </div>
          ))}
        </div>
      </section> : null}
    </>
  );
}
