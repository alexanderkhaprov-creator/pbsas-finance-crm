"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

const CURRENT_DAY_TIME = new Date("2026-06-01T00:00:00.000Z").getTime();

function ActionCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-steel">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export default function DataManagementPage() {
  const { people, events, costCenters, expenses, reimbursements, revenues, receipts, auditLogs, documents, licenseApplications, licenseIntake, licenseReceipts, generatedLicenses, licenseFeeSchedule, licenseDocumentRequirements, stampSettings, appSettings, financialPeriods, exportBackup, validateBackupData, importBackup, resetDemoData, clearLocalData, removeDemoRecordsOnly, markBackupCompleted, setDataMode, updateFinancialPeriod } = useFinanceData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function exportJson() {
    const backup = exportBackup();
    downloadFile(`pbsas-finance-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
    setMessage("Backup JSON exported.");
    setError("");
  }

  function exportCsv(label: string, rows: Array<Record<string, unknown>>) {
    downloadFile(`pbsas-${label}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv");
    setMessage(`${label} CSV exported.`);
    setError("");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");
    setError("");

    try {
      const parsed = JSON.parse(await file.text());
      const result = validateBackupData(parsed);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      const confirmed = window.confirm("Importing this backup will replace all current local PBSAS data. Continue?");
      if (!confirmed) {
        setMessage("Import cancelled. Existing data was not changed.");
        return;
      }

      importBackup(parsed);
      setMessage("Backup imported successfully.");
    } catch {
      setError("Invalid JSON file. Please select a valid PBSAS backup.");
    }
  }

  function resetData() {
    if (!window.confirm("Reset all local records to the demo PBSAS data?")) return;
    resetDemoData();
    setMessage("Demo data restored.");
    setError("");
  }

  function clearData() {
    const warning = appSettings.mode === "real"
      ? "REAL DATA MODE ACTIVE. Clearing may remove operational records from this browser. Type OK in the next prompt only if you have a current backup."
      : "Clear all local PBSAS data from this browser? This cannot be undone unless you have a backup.";
    if (!window.confirm(warning)) return;
    if (appSettings.mode === "real" && window.prompt("Type CLEAR REAL DATA to confirm clearing local operational records.") !== "CLEAR REAL DATA") return;
    clearLocalData();
    setMessage("Local data cleared.");
    setError("");
  }

  const lastBackupAt = appSettings.lastBackupAt || auditLogs.find((log) => log.action === "Exported" && log.module === "Data Management")?.timestamp || "";
  const backupAgeDays = lastBackupAt ? Math.max(0, Math.floor((CURRENT_DAY_TIME - new Date(lastBackupAt).getTime()) / 86400000)) : null;
  const backupWarning = !lastBackupAt ? "No completed backup has been recorded." : backupAgeDays !== null && backupAgeDays > 7 ? `Last backup is ${backupAgeDays} days old.` : "";

  return (
    <>
      <PageHeader title="Data Management" description="Browser-local backup, import, reset, and cleanup tools for mock PBSAS finance data." />
      <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This app currently stores data in this browser only. Export a backup before clearing data, switching browsers, or testing major changes.
      </div>
      {appSettings.mode === "real" ? (
        <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          Real Data Entry Mode is active. Entries may represent operational records. Maintain backups before daily entry and before clearing or importing data.
        </div>
      ) : null}
      {backupWarning ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{backupWarning}</div> : null}
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["People", people.length],
          ["Events", events.length],
          ["Cost Centers", costCenters.length],
          ["Expenses", expenses.length],
          ["Receipts", receipts.length],
          ["Reimbursements", reimbursements.length],
          ["Revenues", revenues.length],
          ["Documents", documents.length],
          ["License Applications", licenseApplications.length],
          ["License Intake", licenseIntake.length],
          ["License Receipts", licenseReceipts.length],
          ["Generated Licenses", generatedLicenses.length],
          ["License Fee Schedule", licenseFeeSchedule.length],
          ["License Document Requirements", licenseDocumentRequirements.length],
          ["Audit Logs", auditLogs.length]
        ].map(([label, value]) => (
          <div className="rounded border border-black/10 bg-white p-4 shadow-soft" key={label}>
            <p className="text-sm text-steel">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <ActionCard title="Backup Reminder" description={lastBackupAt ? `Last backup completed ${new Date(lastBackupAt).toLocaleString()}.` : "No backup completion is recorded yet."}>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => {
              markBackupCompleted();
              setMessage("Backup marked as completed.");
              setError("");
            }}>
              Mark Backup Completed
            </button>
            <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={exportJson}>
              <Download className="h-4 w-4" />
              Export Full Backup JSON
            </button>
          </div>
        </ActionCard>
        <ActionCard title="Data Entry Mode" description={appSettings.mode === "real" ? "Real Data Entry Mode is active. Demo records are still retained but operational entry warnings are shown." : "Demo Mode is active for mock/local testing."}>
          <div className="flex flex-wrap gap-2">
            <button className={`rounded px-4 py-2 text-sm font-semibold ${appSettings.mode === "demo" ? "bg-ink text-white" : "border border-black/10 bg-white text-steel"}`} onClick={() => setDataMode("demo")}>Demo Mode</button>
            <button className={`rounded px-4 py-2 text-sm font-semibold ${appSettings.mode === "real" ? "bg-red-700 text-white" : "border border-red-200 bg-red-50 text-red-700"}`} onClick={() => {
              if (window.confirm("Enable Real Data Entry Mode? Entered records may be operational records and should be backed up daily.")) setDataMode("real");
            }}>Real Data Entry Mode</button>
          </div>
        </ActionCard>
        <ActionCard title="Remove Demo Records Only" description="Remove known demo licensing records without touching manually entered operational records in this browser.">
          <button className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={() => {
            if (!window.confirm("Remove known demo license applications, demo intake rows, and their generated demo receipt/license records only?")) return;
            removeDemoRecordsOnly();
            setMessage("Known demo licensing records removed. Real localStorage records were left untouched.");
            setError("");
          }}>
            Remove Demo Records Only
          </button>
        </ActionCard>
        <ActionCard title="Stamp Settings Summary" description="Current UAEAC license stamping setup. Edit details from the Stamp Settings page.">
          <div className="space-y-2 text-sm text-steel">
            <p>Stamp Available: <span className="font-semibold text-ink">{stampSettings.stampAvailable}</span></p>
            <p>Stamp Label: <span className="font-semibold text-ink">{stampSettings.stampName}</span></p>
            <p>Default Stamped By: <span className="font-semibold text-ink">{stampSettings.defaultStampedBy || "Not set"}</span></p>
          </div>
        </ActionCard>
      </div>
      <section className="mb-6 rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-4">
          <h3 className="text-base font-semibold text-ink">Financial Periods</h3>
          <p className="mt-1 text-sm text-steel">Monthly status and period closing checklist.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Period", "Status", "Receipts reviewed", "Reimbursements reviewed", "Expenses reconciled", "Reports exported", "Backup completed"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {financialPeriods.map((period) => (
                <tr key={period.id}>
                  <td className="px-4 py-4 font-medium text-ink">{period.year}-{String(period.month).padStart(2, "0")}</td>
                  <td className="px-4 py-4">
                    <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={period.status} onChange={(event) => updateFinancialPeriod({ ...period, status: event.target.value as typeof period.status })}>
                      {["Open", "Under Review", "Closed"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <span className="ml-2"><StatusBadge value={period.status} /></span>
                  </td>
                  {[
                    ["receiptsReviewed", "All receipts reviewed"],
                    ["reimbursementsReviewed", "All reimbursements reviewed"],
                    ["expensesReconciled", "All expenses reconciled"],
                    ["reportsExported", "Reports exported"],
                    ["backupCompleted", "Backup completed"]
                  ].map(([key, label]) => (
                    <td className="px-4 py-4" key={key}>
                      <label className="inline-flex items-center gap-2 text-sm text-steel">
                        <input
                          checked={period.checklist[key as keyof typeof period.checklist]}
                          className="h-4 w-4 accent-gold"
                          type="checkbox"
                          onChange={(event) => updateFinancialPeriod({ ...period, checklist: { ...period.checklist, [key]: event.target.checked } })}
                        />
                        {label}
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <ActionCard title="Export Full Backup JSON" description="Download people, events, cost centers, expenses, receipts, reimbursements, revenues, audit logs, timestamp, and app version.">
          <button className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={exportJson}>
            <Download className="h-4 w-4" />
            Export Full Backup JSON
          </button>
        </ActionCard>
        <ActionCard title="Import Full Backup JSON" description="Validate and import a PBSAS backup file. Existing local data is replaced only after confirmation.">
          <input accept="application/json" className="hidden" onChange={handleImport} ref={fileInputRef} type="file" />
          <button className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import Full Backup JSON
          </button>
        </ActionCard>
        <ActionCard title="Export Expenses CSV" description="Download the current expense register as CSV.">
          <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => exportCsv("expenses", expenses as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Export Expenses CSV</button>
        </ActionCard>
        <ActionCard title="Export Reimbursements CSV" description="Download reimbursement liabilities as CSV.">
          <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => exportCsv("reimbursements", reimbursements as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Export Reimbursements CSV</button>
        </ActionCard>
        <ActionCard title="Export Receipts CSV" description="Download receipt intake records as CSV.">
          <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => exportCsv("receipts", receipts as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Export Receipts CSV</button>
        </ActionCard>
        <ActionCard title="Export Documents CSV" description="Download the document register as CSV.">
          <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => exportCsv("documents", documents as unknown as Array<Record<string, unknown>>)}><Download className="h-4 w-4" />Export Documents CSV</button>
        </ActionCard>
        <ActionCard title="Reset Demo Data" description="Restore the original PBSAS demo records and resync reimbursement records.">
          <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={resetData}>
            <RotateCcw className="h-4 w-4" />
            Reset Demo Data
          </button>
        </ActionCard>
        <ActionCard title="Clear Local Data" description="Remove all saved browser-local records from this app instance.">
          <button className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={clearData}>
            <Trash2 className="h-4 w-4" />
            Clear Local Data
          </button>
        </ActionCard>
      </div>
    </>
  );
}
