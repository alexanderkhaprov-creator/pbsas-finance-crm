"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, Send, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { currencies, expenseCategories } from "@/lib/options";
import type { CurrencyCode, ExpenseCategory } from "@/types";

type BatchRow = {
  rowId: string;
  date: string;
  paidBy: string;
  personOwed: string;
  responsiblePerson: string;
  costCenterId: string;
  costCenter: string;
  event: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: CurrencyCode;
  paymentMethod: string;
  reimbursable: boolean;
  notes: string;
};

function newRow(people: string[], events: string[], costCenters: Array<{ id: string; name: string }>): BatchRow {
  return {
    rowId: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    paidBy: people[0] ?? "",
    personOwed: people[0] ?? "",
    responsiblePerson: people[0] ?? "",
    costCenterId: costCenters[0]?.id ?? "",
    costCenter: costCenters[0]?.name ?? "",
    event: events[0] ?? "General Operations",
    category: "Miscellaneous",
    description: "",
    amount: 0,
    currency: "AED",
    paymentMethod: "Card",
    reimbursable: false,
    notes: ""
  };
}

export default function BatchEntryPage() {
  const { people, events, costCenters, addBatchExpenses } = useFinanceData();
  const peopleNames = people.map((person) => person.fullName);
  const eventNames = ["General Operations", ...events.map((event) => event.eventName)];
  const costCenterOptions = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => ({ id: costCenter.id, name: costCenter.name }));
  const [rows, setRows] = useState<BatchRow[]>(() => [newRow(peopleNames, eventNames, costCenterOptions)]);
  const [message, setMessage] = useState("");

  const errors = useMemo(() => {
    return rows.flatMap((row, index) => {
      const rowErrors: string[] = [];
      if (!row.date) rowErrors.push(`Row ${index + 1}: date is required.`);
      if (!row.paidBy) rowErrors.push(`Row ${index + 1}: paid by is required.`);
      if (!row.description.trim()) rowErrors.push(`Row ${index + 1}: description is required.`);
      if (!row.amount || row.amount <= 0) rowErrors.push(`Row ${index + 1}: amount must be greater than zero.`);
      return rowErrors;
    });
  }, [rows]);

  function updateRow(rowId: string, patch: Partial<BatchRow>) {
    setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
  }

  async function submitBatch() {
    setMessage("");
    if (errors.length) return;
    const created = await addBatchExpenses(
      rows.map((row) => ({
        date: row.date,
        paidBy: row.paidBy,
        linkType: "General Operations",
        event: row.event,
        costCenterId: row.costCenterId,
        costCenter: row.costCenter,
        category: row.category,
        description: row.description,
        amount: Number(row.amount),
        currency: row.currency,
        paymentMethod: row.paymentMethod,
        vendor: "",
        receiptAttachment: "Batch entry receipt pending",
        reimbursable: row.reimbursable,
        reimbursementStatus: row.reimbursable ? "Pending" : "Not Reimbursable",
        approvalStatus: "Submitted",
        submittedBy: row.paidBy,
        reviewedBy: "",
        approvedBy: "",
        approvalDate: "",
        rejectionReason: "",
        internalNotes: "Created from batch entry.",
        reconciliationStatus: "Not Reconciled",
        reconciledBy: "",
        reconciliationDate: "",
        reconciliationNotes: "",
        notes: row.notes,
        personOwed: row.personOwed,
        responsiblePerson: row.responsiblePerson
      }))
    );
    setMessage(`${created.length} expenses created from batch entry.`);
    setRows([newRow(peopleNames, eventNames, costCenterOptions)]);
  }

  return (
    <>
      <PageHeader title="Batch Entry" description="Fast entry of multiple expenses from receipts, with automatic expense IDs and reimbursement records." />
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
      {errors.length ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.join(" ")}</div>
      ) : null}
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
          <p className="text-sm text-steel">{rows.length} batch rows ready for validation</p>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => setRows((current) => [...current, newRow(peopleNames, eventNames, costCenterOptions)])}>
              <Plus className="h-4 w-4" />
              Add row
            </button>
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => void submitBatch()}>
              <Send className="h-4 w-4" />
              Submit batch
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[2100px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Date", "Paid by", "Person owed", "Responsible", "Cost Center", "Event", "Category", "Description", "Amount", "Currency", "Payment method", "Reimbursable", "Notes", "Actions"].map((heading) => <th className="px-3 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {rows.map((row) => (
                <tr key={row.rowId}>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" type="date" value={row.date} onChange={(event) => updateRow(row.rowId, { date: event.target.value })} /></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.paidBy} onChange={(event) => updateRow(row.rowId, { paidBy: event.target.value })}>{peopleNames.map((person) => <option key={person} value={person}>{person}</option>)}</select></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.personOwed} onChange={(event) => updateRow(row.rowId, { personOwed: event.target.value })}>{peopleNames.map((person) => <option key={person} value={person}>{person}</option>)}</select></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.responsiblePerson} onChange={(event) => updateRow(row.rowId, { responsiblePerson: event.target.value })}>{peopleNames.map((person) => <option key={person} value={person}>{person}</option>)}</select></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.costCenterId} onChange={(event) => {
                    const costCenter = costCenterOptions.find((item) => item.id === event.target.value);
                    updateRow(row.rowId, { costCenterId: costCenter?.id ?? "", costCenter: costCenter?.name ?? "" });
                  }}>{costCenterOptions.map((costCenter) => <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>)}</select></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.event} onChange={(event) => updateRow(row.rowId, { event: event.target.value })}>{eventNames.map((eventName) => <option key={eventName} value={eventName}>{eventName}</option>)}</select></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.category} onChange={(event) => updateRow(row.rowId, { category: event.target.value as ExpenseCategory })}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.description} onChange={(event) => updateRow(row.rowId, { description: event.target.value })} /></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" min="0" step="0.01" type="number" value={row.amount} onChange={(event) => updateRow(row.rowId, { amount: Number(event.target.value) })} /></td>
                  <td className="px-3 py-3"><select className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.currency} onChange={(event) => updateRow(row.rowId, { currency: event.target.value as CurrencyCode })}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.paymentMethod} onChange={(event) => updateRow(row.rowId, { paymentMethod: event.target.value })} /></td>
                  <td className="px-3 py-3"><input checked={row.reimbursable} className="h-5 w-5 accent-gold" type="checkbox" onChange={(event) => updateRow(row.rowId, { reimbursable: event.target.checked })} /></td>
                  <td className="px-3 py-3"><input className="w-full rounded border border-black/10 px-2 py-2 text-ink" value={row.notes} onChange={(event) => updateRow(row.rowId, { notes: event.target.value })} /></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => setRows((current) => [...current, { ...row, rowId: crypto.randomUUID() }])} title="Duplicate row"><Copy className="h-4 w-4" /></button>
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700" onClick={() => setRows((current) => current.filter((item) => item.rowId !== row.rowId))} title="Delete row"><Trash2 className="h-4 w-4" /></button>
                    </div>
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
