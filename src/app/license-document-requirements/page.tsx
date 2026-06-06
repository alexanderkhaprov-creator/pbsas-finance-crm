"use client";

import { useState } from "react";
import { Archive, Plus, RotateCcw } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getNextSequentialId } from "@/lib/id-utils";
import { licenseCategories } from "@/lib/options";
import type { LicenseDocumentRequirement } from "@/types";

export default function LicenseDocumentRequirementsPage() {
  const { licenseDocumentRequirements, addLicenseDocumentRequirement, updateLicenseDocumentRequirement, restoreDefaultLicenseDocumentRequirements } = useFinanceData();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Professional Boxer"]);
  const [draft, setDraft] = useState<LicenseDocumentRequirement>({
    id: getNextSequentialId(licenseDocumentRequirements, "LDR"),
    documentName: "",
    appliesToCategories: ["Professional Boxer"],
    required: true,
    notes: "",
    status: "Active"
  });

  function toggleCategory(category: string) {
    setSelectedCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]));
  }

  async function addRequirement() {
    if (!draft.documentName.trim()) {
      window.alert("Document name is required.");
      return;
    }
    await addLicenseDocumentRequirement({ ...draft, appliesToCategories: selectedCategories as LicenseDocumentRequirement["appliesToCategories"] });
    setDraft((current) => ({ ...current, id: getNextSequentialId(licenseDocumentRequirements, "LDR"), documentName: "", notes: "" }));
  }

  return (
    <>
      <PageHeader title="License Document Requirements" description="Configurable role-based document requirements for UAEAC license applications." />
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Add Document Requirement</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={draft.documentName} onChange={(event) => setDraft((current) => ({ ...current, documentName: event.target.value }))} placeholder="Document name" />
          <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={draft.required ? "Required" : "Optional"} onChange={(event) => setDraft((current) => ({ ...current, required: event.target.value === "Required" }))}>
            <option>Required</option>
            <option>Optional</option>
          </select>
          <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink md:col-span-2" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {licenseCategories.map((category) => (
            <button className={`rounded border px-3 py-2 text-xs font-semibold ${selectedCategories.includes(category) ? "border-gold bg-gold text-ink" : "border-black/10 bg-white text-steel"}`} key={category} onClick={() => toggleCategory(category)} type="button">
              {category}
            </button>
          ))}
        </div>
        <button className="mt-4 inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => void addRequirement()}>
          <Plus className="h-4 w-4" />
          Add requirement
        </button>
      </section>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
          <p className="text-sm text-steel">{licenseDocumentRequirements.length} document requirements</p>
          <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={restoreDefaultLicenseDocumentRequirements}>
            <RotateCcw className="h-4 w-4" />
            Restore defaults
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["ID", "Document", "Applies To", "Requirement", "Status", "Notes", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {licenseDocumentRequirements.map((requirement) => (
                <tr className="align-top" key={requirement.id}>
                  <td className="px-4 py-4 font-medium text-ink">{requirement.id}</td>
                  <td className="px-4 py-4 text-steel">{requirement.documentName}</td>
                  <td className="max-w-[420px] px-4 py-4 text-steel">{requirement.appliesToCategories.join(", ")}</td>
                  <td className="px-4 py-4"><StatusBadge value={requirement.required ? "Required" : "Optional"} /></td>
                  <td className="px-4 py-4"><StatusBadge value={requirement.status} /></td>
                  <td className="max-w-[320px] px-4 py-4 text-steel">{requirement.notes}</td>
                  <td className="px-4 py-4">
                    <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => void updateLicenseDocumentRequirement({ ...requirement, status: requirement.status === "Active" ? "Archived" : "Active" })}>
                      <Archive className="h-3.5 w-3.5" />
                      {requirement.status === "Active" ? "Archive" : "Restore"}
                    </button>
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
