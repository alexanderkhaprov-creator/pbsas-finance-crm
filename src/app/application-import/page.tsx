"use client";

import { useMemo, useState } from "react";
import { FileUp, Plus, Search, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buildApplicationMappings } from "@/lib/ocr-import";
import { getNextSequentialId } from "@/lib/id-utils";
import type { ApplicationImport, LicenseApplicationOrigin, OcrConfidenceLevel, OcrStatus } from "@/types";

const origins: LicenseApplicationOrigin[] = ["Historical Migration", "Manual Entry", "Online Application", "New Application", "Online Form"];
const statuses: OcrStatus[] = ["Uploaded", "Text Extracted", "Mapping Review", "Ready To Create Application", "Converted To Application", "Rejected"];
const confidenceLevels: OcrConfidenceLevel[] = ["High", "Medium", "Low", "Manual Review Required"];

function newImport(imports: ApplicationImport[]): ApplicationImport {
  const now = new Date().toISOString();
  return {
    id: getNextSequentialId(imports, "AIMP"),
    uploadDate: now.slice(0, 10),
    uploadedBy: "Local User",
    fileName: "",
    fileType: "",
    ocrStatus: "Uploaded",
    extractedRawText: "",
    confidenceLevel: "Manual Review Required",
    notes: "",
    mappedFields: buildApplicationMappings(""),
    applicationOrigin: "Historical Migration",
    createdAt: now,
    updatedAt: now
  };
}

export default function ApplicationImportPage() {
  const { applicationImports, licenseApplications, addApplicationImport, updateApplicationImport, deleteApplicationImport, convertApplicationImportToApplication } = useFinanceData();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ApplicationImport | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return applicationImports.filter((item) => normalized ? JSON.stringify(item).toLowerCase().includes(normalized) : true);
  }, [applicationImports, query]);

  function remap(rawText: string, current: ApplicationImport) {
    return {
      ...current,
      extractedRawText: rawText,
      ocrStatus: rawText.trim() ? "Mapping Review" as const : "Uploaded" as const,
      mappedFields: buildApplicationMappings(rawText),
      confidenceLevel: rawText.trim() ? "Medium" as const : "Manual Review Required" as const
    };
  }

  function duplicateFor(applicationImport: ApplicationImport) {
    const get = (field: string) => applicationImport.mappedFields.find((item) => item.targetField === field && item.include)?.editedValue.trim().toLowerCase() ?? "";
    const name = get("applicantFullName");
    const passport = get("passportNumber");
    const nationalId = get("nationalIdNumber");
    const email = get("email");
    const phone = get("phone");
    return licenseApplications.find((application) =>
      Boolean(name && [application.applicantFullName.toLowerCase(), application.fullLegalName?.toLowerCase()].includes(name)) ||
      Boolean(passport && application.passportNumber?.toLowerCase() === passport) ||
      Boolean(nationalId && application.nationalIdNumber?.toLowerCase() === nationalId) ||
      Boolean(email && application.email.toLowerCase() === email) ||
      Boolean(phone && application.phone.toLowerCase() === phone)
    );
  }

  async function saveImport() {
    if (!editing) return;
    const exists = applicationImports.some((item) => item.id === editing.id);
    if (exists) await updateApplicationImport(editing);
    else await addApplicationImport(editing);
    setMessage("Application import saved for human review.");
    setError("");
    setEditing(null);
  }

  async function convertImport(applicationImport: ApplicationImport) {
    const duplicate = duplicateFor(applicationImport);
    if (duplicate && !window.confirm(`Possible duplicate found: ${duplicate.id} - ${duplicate.applicantFullName}. Continue creating a new application?`)) return;
    try {
      const converted = await convertApplicationImportToApplication({ ...applicationImport, duplicateWarning: duplicate?.id, ocrStatus: "Ready To Create Application" });
      setMessage(`Created application ${converted.id} / ${converted.licenseIssueNumber}.`);
      setError("");
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create application from import.");
      setMessage("");
    }
  }

  return (
    <>
      <PageHeader title="Application Import" description="OCR-ready intake for filled UAEAC license forms. Extracted data is reviewed and edited before creating records." />
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">{error}</div> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Summary label="Awaiting mapping review" value={applicationImports.filter((item) => ["Uploaded", "Text Extracted", "Mapping Review"].includes(item.ocrStatus)).length} />
        <Summary label="Ready to create" value={applicationImports.filter((item) => item.ocrStatus === "Ready To Create Application").length} />
        <Summary label="Converted" value={applicationImports.filter((item) => item.ocrStatus === "Converted To Application").length} />
        <Summary label="Low confidence" value={applicationImports.filter((item) => ["Low", "Manual Review Required"].includes(item.confidenceLevel)).length} />
      </div>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
            <Search className="h-4 w-4 text-steel" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Search imports by ID, file, extracted text, status, notes" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => setEditing(newImport(applicationImports))}>
            <Plus className="h-4 w-4" />
            New application import
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Import ID", "Upload date", "Uploaded by", "File", "OCR status", "Confidence", "Origin", "Linked APP", "Notes", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((item) => (
                <tr className="align-top hover:bg-[#fafaf8]" key={item.id}>
                  <td className="px-4 py-4 font-medium text-ink">{item.id}</td>
                  <td className="px-4 py-4 text-steel">{item.uploadDate}</td>
                  <td className="px-4 py-4 text-steel">{item.uploadedBy}</td>
                  <td className="px-4 py-4 text-steel">{item.fileName || "No file"}<div className="text-xs">{item.fileType}</div></td>
                  <td className="px-4 py-4"><StatusBadge value={item.ocrStatus} /></td>
                  <td className="px-4 py-4"><StatusBadge value={item.confidenceLevel} /></td>
                  <td className="px-4 py-4 text-steel">{item.applicationOrigin}</td>
                  <td className="px-4 py-4 text-steel">{item.linkedApplicationId || "Not converted"}</td>
                  <td className="max-w-[260px] px-4 py-4 text-steel">{item.notes}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => setEditing(item)}>Review</button>
                      <button className="rounded bg-gold px-3 py-2 text-xs font-semibold text-ink hover:bg-[#d7b445]" disabled={item.ocrStatus === "Converted To Application"} onClick={() => void convertImport(item)}>Create Application</button>
                      <button className="rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => void deleteApplicationImport(item)}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
            <div className="border-b border-black/10 p-5">
              <h3 className="text-lg font-semibold text-ink">Review application import</h3>
              <p className="mt-1 text-sm text-steel">{editing.id} · All mapped values require staff review before record creation.</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-steel">Upload date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.uploadDate} onChange={(event) => setEditing({ ...editing, uploadDate: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Uploaded by<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.uploadedBy} onChange={(event) => setEditing({ ...editing, uploadedBy: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Application origin<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.applicationOrigin} onChange={(event) => setEditing({ ...editing, applicationOrigin: event.target.value as LicenseApplicationOrigin })}>{origins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">OCR status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.ocrStatus} onChange={(event) => setEditing({ ...editing, ocrStatus: event.target.value as OcrStatus })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Upload form PDF/image<input accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" type="file" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setEditing({ ...editing, fileName: file.name, fileType: file.type || "local file", ocrStatus: "Uploaded" });
              }} /></label>
              <label className="text-sm font-medium text-steel">Confidence<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.confidenceLevel} onChange={(event) => setEditing({ ...editing, confidenceLevel: event.target.value as OcrConfidenceLevel })}>{confidenceLevels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
              <label className="text-sm font-medium text-steel xl:col-span-2">Notes<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel md:col-span-2 xl:col-span-4">Extracted raw text / manual OCR paste<textarea className="mt-1 min-h-36 w-full rounded border border-black/10 px-3 py-2 font-mono text-sm text-ink" value={editing.extractedRawText} onChange={(event) => setEditing(remap(event.target.value, editing))} /></label>
            </div>
            <div className="border-t border-black/10 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-ink">Field mapping preview</h4>
                {duplicateFor(editing) ? <span className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Possible duplicate: {duplicateFor(editing)?.id}</span> : null}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
                    <tr>{["Include", "Extracted value", "Target CRM field", "Confidence", "Edit field value"].map((heading) => <th className="px-3 py-2 font-semibold" key={heading}>{heading}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {editing.mappedFields.map((field) => (
                      <tr key={field.id}>
                        <td className="px-3 py-3"><input checked={field.include} className="h-4 w-4 accent-gold" type="checkbox" onChange={(event) => setEditing({ ...editing, mappedFields: editing.mappedFields.map((item) => item.id === field.id ? { ...item, include: event.target.checked } : item) })} /></td>
                        <td className="px-3 py-3 text-steel">{field.extractedValue || "No extracted value"}</td>
                        <td className="px-3 py-3 font-medium text-ink">{field.label}<div className="text-xs text-steel">{String(field.targetField)}</div></td>
                        <td className="px-3 py-3"><StatusBadge value={field.confidence} /></td>
                        <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-3 py-2 text-ink" value={field.editedValue} onChange={(event) => setEditing({ ...editing, mappedFields: editing.mappedFields.map((item) => item.id === field.id ? { ...item, editedValue: event.target.value, include: true } : item) })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 p-5">
              <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={() => setEditing(null)}>Cancel</button>
              <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => void saveImport()}>Save import</button>
              <button className="inline-flex items-center gap-2 rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void convertImport(editing)}><FileUp className="h-4 w-4" />Create Application From Import</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-black/10 bg-white p-4 shadow-soft">
      <p className="text-sm text-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
