"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Edit, Plus, Search, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getNextSequentialId } from "@/lib/id-utils";
import { licenseApplicationSources, licenseCategories, licenseIntakeStatuses } from "@/lib/options";
import type { LicenseIntake } from "@/types";

function emptyIntake(intake: LicenseIntake[]): LicenseIntake {
  const now = new Date().toISOString();
  return {
    id: getNextSequentialId(intake, "INT"),
    applicantName: "",
    applicationSource: "Hard Copy",
    dateReceived: now.slice(0, 10),
    licenseCategory: "Professional Boxer",
    applicationScanFileName: "",
    supportingDocumentFileNames: [],
    paymentProofFileName: "",
    intakeNotes: "",
    intakeStatus: "New",
    createdAt: now,
    updatedAt: now
  };
}

function IntakeModal({
  intake,
  onClose,
  onSubmit
}: {
  intake: LicenseIntake;
  onClose: () => void;
  onSubmit: (intake: LicenseIntake) => Promise<void>;
}) {
  const [form, setForm] = useState(intake);

  function setValue<K extends keyof LicenseIntake>(key: K, value: LicenseIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.applicantName.trim()) {
      window.alert("Applicant name is required.");
      return;
    }
    await onSubmit({
      ...form,
      supportingDocumentFileNames: form.supportingDocumentFileNames.filter(Boolean)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">{form.id ? "Edit intake record" : "Add intake record"}</h3>
          <p className="mt-1 text-sm text-steel">{form.id}</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="text-sm font-medium text-steel">Applicant Name<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicantName} onChange={(event) => setValue("applicantName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Application Source<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationSource} onChange={(event) => setValue("applicationSource", event.target.value as LicenseIntake["applicationSource"])}>{licenseApplicationSources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Date Received<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.dateReceived} onChange={(event) => setValue("dateReceived", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">License Category<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.licenseCategory} onChange={(event) => setValue("licenseCategory", event.target.value as LicenseIntake["licenseCategory"])}>{licenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Uploaded Application Scan Placeholder<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationScanFileName} onChange={(event) => setValue("applicationScanFileName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Uploaded Supporting Documents Placeholder<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.supportingDocumentFileNames.join(", ")} onChange={(event) => setValue("supportingDocumentFileNames", event.target.value.split(",").map((item) => item.trim()))} /></label>
          <label className="text-sm font-medium text-steel">Payment Proof Placeholder<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paymentProofFileName} onChange={(event) => setValue("paymentProofFileName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Intake Status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.intakeStatus} onChange={(event) => setValue("intakeStatus", event.target.value as LicenseIntake["intakeStatus"])}>{licenseIntakeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-sm font-medium text-steel md:col-span-2">Intake Notes<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.intakeNotes} onChange={(event) => setValue("intakeNotes", event.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose} type="button">Cancel</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void save()} type="button">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationIntakePage() {
  const { licenseIntake, addLicenseIntake, updateLicenseIntake, deleteLicenseIntake, convertLicenseIntakeToApplication } = useFinanceData();
  const [editing, setEditing] = useState<LicenseIntake | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return licenseIntake.filter((intake) => {
      const matchesQuery = normalizedQuery ? Object.values(intake).join(" ").toLowerCase().includes(normalizedQuery) : true;
      const matchesStatus = statusFilter ? intake.intakeStatus === statusFilter : true;
      const matchesSource = sourceFilter ? intake.applicationSource === sourceFilter : true;
      return matchesQuery && matchesStatus && matchesSource;
    });
  }, [licenseIntake, query, sourceFilter, statusFilter]);

  async function saveIntake(intake: LicenseIntake) {
    if (licenseIntake.some((item) => item.id === intake.id)) {
      await updateLicenseIntake(intake);
    } else {
      await addLicenseIntake(intake);
    }
    setEditing(null);
  }

  return (
    <>
      <PageHeader title="Application Intake" description="Temporary staging queue for hard-copy and soft-copy license applications before registry conversion." />
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        {licenseIntakeStatuses.map((status) => (
          <div className="rounded border border-black/10 bg-white p-4 shadow-soft" key={status}>
            <p className="text-sm text-steel">{status}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{licenseIntake.filter((intake) => intake.intakeStatus === status).length}</p>
          </div>
        ))}
      </div>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="space-y-3 border-b border-black/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-steel" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search intake by applicant, source, category, documents, or notes" value={query} />
            </div>
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => setEditing(emptyIntake(licenseIntake))}>
              <Plus className="h-4 w-4" />
              Add intake
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Intake Status</option>{licenseIntakeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="">Application Source</option>{licenseApplicationSources.map((source) => <option key={source} value={source}>{source}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Intake ID", "Applicant", "Source", "Date Received", "Category", "Application Scan", "Supporting Documents", "Payment Proof", "Status", "Notes", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((intake) => (
                <tr className="align-top hover:bg-[#fafaf8]" key={intake.id}>
                  <td className="px-4 py-4 font-medium text-ink">{intake.id}</td>
                  <td className="px-4 py-4 text-steel">{intake.applicantName}</td>
                  <td className="px-4 py-4 text-steel">{intake.applicationSource}</td>
                  <td className="px-4 py-4 text-steel">{intake.dateReceived}</td>
                  <td className="px-4 py-4 text-steel">{intake.licenseCategory}</td>
                  <td className="px-4 py-4 text-steel">{intake.applicationScanFileName || "Missing"}</td>
                  <td className="max-w-[260px] px-4 py-4 text-steel">{intake.supportingDocumentFileNames.join(", ") || "Missing"}</td>
                  <td className="px-4 py-4 text-steel">{intake.paymentProofFileName || "Missing"}</td>
                  <td className="px-4 py-4"><StatusBadge value={intake.intakeStatus} /></td>
                  <td className="max-w-[260px] px-4 py-4 text-steel">{intake.intakeNotes}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => setEditing(intake)} title="Edit"><Edit className="h-4 w-4" /></button>
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-emerald-300 hover:text-emerald-700" disabled={intake.intakeStatus === "Converted to Application"} onClick={() => void convertLicenseIntakeToApplication(intake)} title="Convert to License Application"><CheckCircle2 className="h-4 w-4" /></button>
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700" onClick={() => void deleteLicenseIntake(intake)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-black/10 px-4 py-3 text-sm text-steel">Showing {filtered.length} of {licenseIntake.length} intake records</div>
      </section>
      {editing ? <IntakeModal intake={editing} onClose={() => setEditing(null)} onSubmit={saveIntake} /> : null}
    </>
  );
}
