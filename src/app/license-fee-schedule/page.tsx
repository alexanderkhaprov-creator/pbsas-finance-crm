"use client";

import { useState } from "react";
import { Archive, Download, Plus, RotateCcw } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import { getNextSequentialId } from "@/lib/id-utils";
import { parseMoneyInput } from "@/lib/money-utils";
import { currencies, licenseCategories } from "@/lib/options";
import type { LicenseFeeScheduleItem } from "@/types";

function downloadCsv(rows: LicenseFeeScheduleItem[]) {
  const headers = ["id", "category", "amount", "currency", "validityPeriod", "status", "effectiveDate", "notes"];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header as keyof LicenseFeeScheduleItem] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "pbsas-license-fee-schedule.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function LicenseFeeSchedulePage() {
  const { licenseFeeSchedule, addLicenseFeeScheduleItem, updateLicenseFeeScheduleItem, restoreDefaultLicenseFeeSchedule } = useFinanceData();
  const [draft, setDraft] = useState<LicenseFeeScheduleItem>({
    id: getNextSequentialId(licenseFeeSchedule, "LFS"),
    category: "Other",
    amount: 0,
    currency: "AED",
    validityPeriod: "Configurable",
    status: "Active",
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  return (
    <>
      <PageHeader title="License Fee Schedule" description="Editable UAEAC fee schedule used to generate invoice-first online applications." />
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Add Fee Category</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as LicenseFeeScheduleItem["category"] }))}>{licenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
          <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: parseMoneyInput(event.target.value) }))} />
          <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as LicenseFeeScheduleItem["currency"] }))}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select>
          <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={draft.validityPeriod} onChange={(event) => setDraft((current) => ({ ...current, validityPeriod: event.target.value }))} />
          <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" type="date" value={draft.effectiveDate} onChange={(event) => setDraft((current) => ({ ...current, effectiveDate: event.target.value }))} />
          <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink xl:col-span-2" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
          <button className="inline-flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => void addLicenseFeeScheduleItem(draft)}>
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </section>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
          <p className="text-sm text-steel">{licenseFeeSchedule.length} fee schedule entries</p>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => downloadCsv(licenseFeeSchedule)}><Download className="h-4 w-4" />Export CSV</button>
            <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={restoreDefaultLicenseFeeSchedule}><RotateCcw className="h-4 w-4" />Restore defaults</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["ID", "Category", "Amount", "Validity", "Effective Date", "Status", "Notes", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {licenseFeeSchedule.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-ink">{item.id}</td>
                  <td className="px-4 py-4 text-steel">{item.category}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(item.amount, item.currency)}</td>
                  <td className="px-4 py-4 text-steel">{item.validityPeriod}</td>
                  <td className="px-4 py-4 text-steel">{item.effectiveDate}</td>
                  <td className="px-4 py-4"><StatusBadge value={item.status} /></td>
                  <td className="max-w-[320px] px-4 py-4 text-steel">{item.notes}</td>
                  <td className="px-4 py-4">
                    <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => void updateLicenseFeeScheduleItem({ ...item, status: item.status === "Active" ? "Archived" : "Active" })}>
                      <Archive className="h-3.5 w-3.5" />
                      {item.status === "Active" ? "Archive" : "Restore"}
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
