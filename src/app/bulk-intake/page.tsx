"use client";

import { useMemo, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { licenseApplicationSources, licenseCategories } from "@/lib/options";
import type { LicenseApplicationSource, LicenseCategory, LicenseIntake } from "@/types";

type BulkRow = {
  rowId: string;
  applicantName: string;
  applicationSource: LicenseApplicationSource;
  dateReceived: string;
  licenseCategory: LicenseCategory;
  applicationScanFileName: string;
  supportingDocumentFileNames: string;
  paymentProofFileName: string;
  intakeNotes: string;
};

function newRow(): BulkRow {
  return {
    rowId: crypto.randomUUID(),
    applicantName: "",
    applicationSource: "Hard Copy",
    dateReceived: new Date().toISOString().slice(0, 10),
    licenseCategory: "Professional Boxer",
    applicationScanFileName: "",
    supportingDocumentFileNames: "",
    paymentProofFileName: "",
    intakeNotes: ""
  };
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export default function BulkIntakePage() {
  const { addBulkLicenseIntake } = useFinanceData();
  const [rows, setRows] = useState<BulkRow[]>(() => [newRow()]);
  const [namesPaste, setNamesPaste] = useState("");
  const [categoriesPaste, setCategoriesPaste] = useState("");
  const [datesPaste, setDatesPaste] = useState("");
  const [message, setMessage] = useState("");

  const errors = useMemo(() => rows.flatMap((row, index) => {
    const rowErrors: string[] = [];
    if (!row.applicantName.trim()) rowErrors.push(`Row ${index + 1}: applicant name is required.`);
    if (!row.dateReceived) rowErrors.push(`Row ${index + 1}: received date is required.`);
    return rowErrors;
  }), [rows]);

  function updateRow(rowId: string, patch: Partial<BulkRow>) {
    setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  }

  function applyPaste() {
    const names = splitLines(namesPaste);
    const categories = splitLines(categoriesPaste);
    const dates = splitLines(datesPaste);
    const length = Math.max(names.length, categories.length, dates.length, rows.length, 1);
    setRows(Array.from({ length }).map((_, index) => ({
      ...newRow(),
      applicantName: names[index] ?? rows[index]?.applicantName ?? "",
      licenseCategory: (licenseCategories.includes(categories[index] as LicenseCategory) ? categories[index] : rows[index]?.licenseCategory ?? "Professional Boxer") as LicenseCategory,
      dateReceived: dates[index] ?? rows[index]?.dateReceived ?? new Date().toISOString().slice(0, 10),
      applicationSource: rows[index]?.applicationSource ?? "Hard Copy",
      applicationScanFileName: rows[index]?.applicationScanFileName ?? "",
      supportingDocumentFileNames: rows[index]?.supportingDocumentFileNames ?? "",
      paymentProofFileName: rows[index]?.paymentProofFileName ?? "",
      intakeNotes: rows[index]?.intakeNotes ?? "Bulk historical intake entry."
    })));
  }

  async function submit() {
    setMessage("");
    if (errors.length) return;
    const created = await addBulkLicenseIntake(rows.map((row) => ({
      applicantName: row.applicantName,
      applicationSource: row.applicationSource,
      dateReceived: row.dateReceived,
      licenseCategory: row.licenseCategory,
      applicationScanFileName: row.applicationScanFileName,
      supportingDocumentFileNames: row.supportingDocumentFileNames.split(",").map((item) => item.trim()).filter(Boolean),
      paymentProofFileName: row.paymentProofFileName,
      intakeNotes: row.intakeNotes,
      intakeStatus: "Awaiting Data Entry",
      convertedApplicationId: "",
      createdAt: "",
      updatedAt: ""
    })));
    setMessage(`${created.length} intake records created.`);
    setRows([newRow()]);
    setNamesPaste("");
    setCategoriesPaste("");
    setDatesPaste("");
  }

  return (
    <>
      <PageHeader title="Bulk Intake" description="Fast entry of historical hard-copy and soft-copy license applications into the intake queue." />
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
      {errors.length ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.join(" ")}</div> : null}
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Paste Historical Lists</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-steel">Paste names<textarea className="mt-1 min-h-32 w-full rounded border border-black/10 px-3 py-2 text-ink" value={namesPaste} onChange={(event) => setNamesPaste(event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Paste categories<textarea className="mt-1 min-h-32 w-full rounded border border-black/10 px-3 py-2 text-ink" value={categoriesPaste} onChange={(event) => setCategoriesPaste(event.target.value)} placeholder="Boxer&#10;Coach&#10;Judge" /></label>
          <label className="text-sm font-medium text-steel">Paste received dates<textarea className="mt-1 min-h-32 w-full rounded border border-black/10 px-3 py-2 text-ink" value={datesPaste} onChange={(event) => setDatesPaste(event.target.value)} placeholder="2026-05-01&#10;2026-05-02" /></label>
        </div>
        <button className="mt-4 inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={applyPaste}>
          Apply pasted rows
        </button>
      </section>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
          <p className="text-sm text-steel">{rows.length} intake rows ready</p>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => setRows((current) => [...current, newRow()])}>
              <Plus className="h-4 w-4" />
              Add row
            </button>
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => void submit()}>
              <Send className="h-4 w-4" />
              Submit batch
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Applicant Name", "Source", "Date Received", "Category", "Application Scan", "Supporting Documents", "Payment Proof", "Notes", "Actions"].map((heading) => <th className="px-3 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {rows.map((row) => (
                <tr key={row.rowId}>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.applicantName} onChange={(event) => updateRow(row.rowId, { applicantName: event.target.value })} /></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.applicationSource} onChange={(event) => updateRow(row.rowId, { applicationSource: event.target.value as LicenseApplicationSource })}>{licenseApplicationSources.map((source) => <option key={source} value={source}>{source}</option>)}</select></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" type="date" value={row.dateReceived} onChange={(event) => updateRow(row.rowId, { dateReceived: event.target.value })} /></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.licenseCategory} onChange={(event) => updateRow(row.rowId, { licenseCategory: event.target.value as LicenseCategory })}>{licenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.applicationScanFileName} onChange={(event) => updateRow(row.rowId, { applicationScanFileName: event.target.value })} /></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.supportingDocumentFileNames} onChange={(event) => updateRow(row.rowId, { supportingDocumentFileNames: event.target.value })} /></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.paymentProofFileName} onChange={(event) => updateRow(row.rowId, { paymentProofFileName: event.target.value })} /></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.intakeNotes} onChange={(event) => updateRow(row.rowId, { intakeNotes: event.target.value })} /></td>
                  <td className="px-3 py-3"><button className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700" onClick={() => setRows((current) => current.filter((item) => item.rowId !== row.rowId))} title="Delete row"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
