"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Eye, Plus, Search, Trash2, XCircle } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { InternalNotesPanel } from "@/components/internal-notes-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getNextSequentialId } from "@/lib/id-utils";
import { currencies, expenseCategories, expenseLinkTypes } from "@/lib/options";
import type { ReceiptIntake } from "@/types";

const statuses: ReceiptIntake["status"][] = ["New", "Needs Review", "Converted to Expense", "Rejected"];
const checklistLabels: Array<[keyof ReceiptIntake["checklist"], string]> = [
  ["amountVisible", "Amount visible"],
  ["dateVisible", "Date visible"],
  ["vendorVisible", "Vendor visible"],
  ["paymentMethodConfirmed", "Payment method confirmed"],
  ["paidByConfirmed", "Paid by confirmed"],
  ["eventCategoryConfirmed", "Event/category confirmed"],
  ["reimbursementConfirmed", "Reimbursement status confirmed"]
];

function emptyReceipt(receipts: ReceiptIntake[], people: string[], events: string[], costCenters: Array<{ id: string; name: string }>): ReceiptIntake {
  return {
    id: getNextSequentialId(receipts, "RCT"),
    uploadDate: new Date().toISOString().slice(0, 10),
    uploadedBy: people[0] ?? "",
    fileName: "",
    fileUrl: "",
    fileType: "",
    vendor: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: "AED",
    paymentMethod: "Card",
    paidBy: people[0] ?? "",
    linkType: "General Operations",
    event: events[0] ?? "General Operations",
    costCenterId: costCenters[0]?.id,
    costCenter: costCenters[0]?.name ?? "",
    suggestedCategory: "Miscellaneous",
    reimbursable: false,
    notes: "",
    status: "New",
    checklist: {
      amountVisible: false,
      dateVisible: false,
      vendorVisible: false,
      paymentMethodConfirmed: false,
      paidByConfirmed: false,
      eventCategoryConfirmed: false,
      reimbursementConfirmed: false
    }
  };
}

export default function ReceiptIntakePage() {
  const { people, events, costCenters, documents, receipts, addReceipt, updateReceipt, deleteReceipt, convertReceiptToExpense } = useFinanceData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<ReceiptIntake | null>(null);
  const [preview, setPreview] = useState<ReceiptIntake | null>(null);
  const peopleNames = people.map((person) => person.fullName);
  const eventNames = ["General Operations", ...events.map((event) => event.eventName)];
  const costCenterOptions = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => ({ id: costCenter.id, name: costCenter.name }));

  const filteredReceipts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const matchesQuery = normalizedQuery ? Object.values(receipt).join(" ").toLowerCase().includes(normalizedQuery) : true;
      const matchesStatus = statusFilter ? receipt.status === statusFilter : true;
      return matchesQuery && matchesStatus;
    });
  }, [query, receipts, statusFilter]);

  async function saveReceipt() {
    if (!editing) return;
    if (receipts.some((receipt) => receipt.id === editing.id)) {
      await updateReceipt(editing);
    } else {
      await addReceipt(editing);
    }
    setEditing(null);
  }

  return (
    <>
      <PageHeader title="Receipt Intake" description="Upload or register receipts before converting them into finalized expense records." />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded border border-black/10 bg-white p-4 shadow-soft">
          <p className="text-sm text-steel">Total receipts uploaded</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{receipts.length}</p>
        </div>
        <div className="rounded border border-black/10 bg-white p-4 shadow-soft">
          <p className="text-sm text-steel">New / needs review</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{receipts.filter((receipt) => ["New", "Needs Review"].includes(receipt.status)).length}</p>
        </div>
        <div className="rounded border border-black/10 bg-white p-4 shadow-soft">
          <p className="text-sm text-steel">Converted</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{receipts.filter((receipt) => receipt.status === "Converted to Expense").length}</p>
        </div>
        <div className="rounded border border-black/10 bg-white p-4 shadow-soft">
          <p className="text-sm text-steel">Rejected</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{receipts.filter((receipt) => receipt.status === "Rejected").length}</p>
        </div>
      </div>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-steel" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search receipts by ID, vendor, person, event, filename, or notes" value={query} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => setEditing(emptyReceipt(receipts, peopleNames, eventNames, costCenterOptions))}>
              <Plus className="h-4 w-4" />
              Register receipt
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>
                {["Receipt ID", "Upload date", "Uploaded by", "File", "Vendor", "Receipt date", "Amount", "Paid by", "Event / link", "Cost center", "Category", "Period", "Duplicate", "Documents", "Checklist", "Status", "Actions"].map((heading) => (
                  <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredReceipts.map((receipt) => (
                <tr className="align-top hover:bg-[#fafaf8]" key={receipt.id}>
                  <td className="px-4 py-4 font-medium text-ink">{receipt.id}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(receipt.uploadDate)}</td>
                  <td className="px-4 py-4 text-steel">{receipt.uploadedBy}</td>
                  <td className="px-4 py-4 text-steel">
                    <div className="font-medium text-ink">{receipt.fileName || "No file"}</div>
                    {receipt.fileType.startsWith("image/") && receipt.fileUrl ? (
                      <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold" onClick={() => setPreview(receipt)}>
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-steel">{receipt.vendor}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(receipt.amount, receipt.currency)}</td>
                  <td className="px-4 py-4 text-steel">{receipt.paidBy}</td>
                  <td className="px-4 py-4 text-steel">{receipt.linkType}: {receipt.event}</td>
                  <td className="px-4 py-4 text-steel">{receipt.costCenter || "No cost center"}</td>
                  <td className="px-4 py-4 text-steel">{receipt.suggestedCategory}</td>
                  <td className="px-4 py-4 text-steel">{receipt.periodLabel ?? "Unassigned"}</td>
                  <td className="px-4 py-4">
                    {receipt.possibleDuplicateOfId ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Possible Duplicate: {receipt.possibleDuplicateOfId}</span>
                    ) : (
                      <span className="text-steel">No</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-steel">{documents.filter((document) => document.linkedModule === "Receipt" && document.linkedRecordId === receipt.id).length}</td>
                  <td className="px-4 py-4">
                    <div className="grid grid-cols-2 gap-1">
                      {checklistLabels.map(([key, label]) => (
                        <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${receipt.checklist[key] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`} key={key}>
                          {receipt.checklist[key] ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4"><StatusBadge value={receipt.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => setEditing(receipt)}>Edit</button>
                      <button className="rounded bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" disabled={receipt.status === "Converted to Expense"} onClick={() => void convertReceiptToExpense(receipt)}>Convert to Expense</button>
                      <button className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void deleteReceipt(receipt)}>Delete</button>
                    </div>
                    {receipt.convertedExpenseId ? <p className="mt-2 text-xs text-steel">Expense: {receipt.convertedExpenseId}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
            <div className="border-b border-black/10 p-5">
              <h3 className="text-lg font-semibold text-ink">{receipts.some((receipt) => receipt.id === editing.id) ? "Edit receipt" : "Register receipt"}</h3>
              <p className="mt-1 text-sm text-steel">Receipt ID: {editing.id}</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium text-steel">Upload date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.uploadDate} onChange={(event) => setEditing({ ...editing, uploadDate: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Uploaded by<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.uploadedBy} onChange={(event) => setEditing({ ...editing, uploadedBy: event.target.value })}>{peopleNames.map((person) => <option key={person} value={person}>{person}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Receipt file<input accept="image/*,application/pdf" className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setEditing({ ...editing, fileName: file.name, fileType: file.type || "local file", fileUrl: URL.createObjectURL(file) });
              }} type="file" /></label>
              <label className="text-sm font-medium text-steel">Vendor / merchant<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.vendor} onChange={(event) => setEditing({ ...editing, vendor: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Receipt date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.receiptDate} onChange={(event) => setEditing({ ...editing, receiptDate: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Amount<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" min="0" step="0.01" type="number" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: Number(event.target.value) })} /></label>
              <label className="text-sm font-medium text-steel">Currency<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value as ReceiptIntake["currency"] })}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Payment method<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.paymentMethod} onChange={(event) => setEditing({ ...editing, paymentMethod: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Paid by<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.paidBy} onChange={(event) => setEditing({ ...editing, paidBy: event.target.value })}>{peopleNames.map((person) => <option key={person} value={person}>{person}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Operational link<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.linkType} onChange={(event) => setEditing({ ...editing, linkType: event.target.value as ReceiptIntake["linkType"] })}>{expenseLinkTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Event / operations<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.event} onChange={(event) => setEditing({ ...editing, event: event.target.value })}>{eventNames.map((eventName) => <option key={eventName} value={eventName}>{eventName}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Cost center<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.costCenterId ?? ""} onChange={(event) => {
                const costCenter = costCenterOptions.find((item) => item.id === event.target.value);
                setEditing({ ...editing, costCenterId: costCenter?.id, costCenter: costCenter?.name ?? "" });
              }}><option value="">No cost center</option>{costCenterOptions.map((costCenter) => <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Suggested category<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.suggestedCategory} onChange={(event) => setEditing({ ...editing, suggestedCategory: event.target.value as ReceiptIntake["suggestedCategory"] })}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Processing status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as ReceiptIntake["status"] })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="flex items-center justify-between rounded border border-black/10 bg-[#f7f7f5] px-4 py-3 text-sm font-medium text-steel">Reimbursable<input checked={editing.reimbursable} className="h-5 w-5 accent-gold" onChange={(event) => setEditing({ ...editing, reimbursable: event.target.checked })} type="checkbox" /></label>
              <div className="rounded border border-black/10 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-sm font-semibold text-ink">Receipt validation checklist</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {checklistLabels.map(([key, label]) => (
                    <label className="flex items-center gap-2 text-sm text-steel" key={key}>
                      <input checked={editing.checklist[key]} className="h-4 w-4 accent-gold" onChange={(event) => setEditing({ ...editing, checklist: { ...editing.checklist, [key]: event.target.checked } })} type="checkbox" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-sm font-medium text-steel md:col-span-2 xl:col-span-3">Notes<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} /></label>
              {receipts.some((receipt) => receipt.id === editing.id) ? <div className="md:col-span-2 xl:col-span-3"><InternalNotesPanel module="Receipt Intake" recordId={editing.id} notes={editing.noteHistory} /></div> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-black/10 p-5">
              <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={() => setEditing(null)} type="button">Cancel</button>
              <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void saveReceipt()} type="button">Save receipt</button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded border border-black/10 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-black/10 p-4">
              <div>
                <h3 className="font-semibold text-ink">{preview.fileName}</h3>
                <p className="text-sm text-steel">{preview.id}</p>
              </div>
              <button className="rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={() => setPreview(null)}>Close</button>
            </div>
            <div className="flex max-h-[75vh] justify-center overflow-auto bg-[#f7f7f5] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={preview.fileName} className="max-h-[70vh] max-w-full rounded border border-black/10 object-contain" src={preview.fileUrl} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
