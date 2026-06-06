"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { InternalNotesPanel } from "@/components/internal-notes-panel";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { sumOutstanding, sumReimbursed } from "@/lib/finance-calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import { reconciliationStatuses, reimbursementLiabilityStatuses } from "@/lib/options";
import type { Reimbursement } from "@/types";

export default function ReimbursementsPage() {
  const { people, expenses, costCenters, documents, reimbursements, addReimbursement, updateReimbursement, deleteReimbursement } = useFinanceData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Reimbursement | null>(null);

  const filteredReimbursements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reimbursements.filter((reimbursement) => {
      const matchesQuery = normalizedQuery ? Object.values(reimbursement).join(" ").toLowerCase().includes(normalizedQuery) : true;
      const matchesStatus = statusFilter ? reimbursement.status === statusFilter : true;
      return matchesQuery && matchesStatus;
    });
  }, [query, reimbursements, statusFilter]);

  const liabilityByPerson = useMemo(() => {
    const rows = new Map<string, { person: string; totalPaid: number; totalApproved: number; totalReimbursed: number; outstandingBalance: number }>();
    for (const reimbursement of reimbursements) {
      const current = rows.get(reimbursement.personOwed) ?? {
        person: reimbursement.personOwed,
        totalPaid: 0,
        totalApproved: 0,
        totalReimbursed: 0,
        outstandingBalance: 0
      };
      current.totalPaid += reimbursement.amount;
      if (reimbursement.status === "Approved for Reimbursement" || reimbursement.status === "Partially Reimbursed" || reimbursement.status === "Fully Reimbursed") {
        current.totalApproved += reimbursement.amount;
      }
      current.totalReimbursed += reimbursement.amountReimbursed ?? 0;
      current.outstandingBalance += reimbursement.outstandingBalance ?? Math.max(0, reimbursement.amount - (reimbursement.amountReimbursed ?? 0));
      rows.set(reimbursement.personOwed, current);
    }
    return [...rows.values()].sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [reimbursements]);

  const totalOwed = reimbursements.reduce((sum, reimbursement) => sum + reimbursement.amount, 0);
  const totalApproved = reimbursements
    .filter((reimbursement) => ["Approved for Reimbursement", "Partially Reimbursed", "Fully Reimbursed"].includes(reimbursement.status))
    .reduce((sum, reimbursement) => sum + reimbursement.amount, 0);
  const highestOutstanding = liabilityByPerson[0];

  return (
    <>
      <PageHeader title="Reimbursements" description="Auto-created from reimbursable expenses and linked back to the original Expense ID." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total owed to all people" value={formatCurrency(totalOwed)} detail={`${reimbursements.length} liability records`} />
        <MetricCard label="Approved for reimbursement" value={formatCurrency(totalApproved)} detail="Approved liability" />
        <MetricCard label="Total outstanding" value={formatCurrency(sumOutstanding(reimbursements))} detail="Unpaid balance" />
        <MetricCard label="Total reimbursed" value={formatCurrency(sumReimbursed(reimbursements))} detail="Paid back" />
        <MetricCard label="Highest outstanding" value={highestOutstanding ? highestOutstanding.person : "None"} detail={highestOutstanding ? formatCurrency(highestOutstanding.outstandingBalance) : "No open balance"} />
      </div>
      <section className="mb-6 rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-4">
          <h3 className="text-base font-semibold text-ink">Person liability dashboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Person", "Total paid", "Total approved", "Total reimbursed", "Outstanding balance"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {liabilityByPerson.map((row) => (
                <tr key={row.person}>
                  <td className="px-4 py-4 font-medium text-ink">{row.person}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.totalPaid)}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.totalApproved)}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.totalReimbursed)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(row.outstandingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-steel" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search reimbursements by ID, person, expense, reference, or notes" value={query} />
          </div>
          <div className="flex gap-2">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Status</option>
              {reimbursementLiabilityStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button
              className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite"
              onClick={() =>
                setEditing({
                  id: "",
                  paidBy: expenses[0]?.paidBy ?? people[0]?.fullName ?? "",
                  personOwed: people[0]?.fullName ?? "",
                  responsiblePerson: people[0]?.fullName ?? "",
                  personOwedRecordId: people[0]?.recordId,
                  linkedExpense: expenses[0]?.id ?? "",
                  expenseRecordId: expenses[0]?.recordId,
                  costCenterId: expenses[0]?.costCenterId,
                  costCenter: expenses[0]?.costCenter,
                  amount: expenses[0]?.amount ?? 0,
                  amountReimbursed: 0,
                  outstandingBalance: expenses[0]?.amount ?? 0,
                  dueDate: "",
                  status: "Pending Review",
                  reimbursedDate: "",
                  paymentReference: "Pending",
                  reconciliationStatus: "Not Reconciled",
                  reconciledBy: "",
                  reconciliationDate: "",
                  reconciliationNotes: "",
                  notes: ""
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add reimbursement
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>
                {["Reimbursement ID", "Who paid", "Person owed", "Responsible", "Linked expense", "Cost center", "Amount owed", "Amount reimbursed", "Outstanding", "Due date", "Status", "Reconciliation", "Documents", "Payment reference", "Notes", "Actions"].map((heading) => (
                  <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredReimbursements.map((reimbursement) => (
                <tr key={reimbursement.id}>
                  <td className="px-4 py-4 font-medium text-ink">{reimbursement.id}</td>
                  <td className="px-4 py-4 text-steel">{reimbursement.paidBy}</td>
                  <td className="px-4 py-4 text-steel">{reimbursement.personOwed}</td>
                  <td className="px-4 py-4 text-steel">{reimbursement.responsiblePerson}</td>
                  <td className="px-4 py-4 font-medium text-ink">{reimbursement.linkedExpense}</td>
                  <td className="px-4 py-4 text-steel">{reimbursement.costCenter || "No cost center"}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(reimbursement.amount)}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(reimbursement.amountReimbursed)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(reimbursement.outstandingBalance)}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(reimbursement.dueDate)}</td>
                  <td className="px-4 py-4"><StatusBadge value={reimbursement.status} /></td>
                  <td className="px-4 py-4"><StatusBadge value={reimbursement.reconciliationStatus ?? "Not Reconciled"} /></td>
                  <td className="px-4 py-4 text-steel">{documents.filter((document) => document.linkedModule === "Reimbursement" && document.linkedRecordId === reimbursement.id).length}</td>
                  <td className="px-4 py-4 text-steel">{reimbursement.paymentReference}</td>
                  <td className="max-w-[280px] px-4 py-4 text-steel">{reimbursement.notes}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => setEditing(reimbursement)} title="Edit reimbursement">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700" onClick={() => void deleteReimbursement(reimbursement)} title="Delete reimbursement">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-black/10 px-4 py-3 text-sm text-steel">
          Showing {filteredReimbursements.length} of {reimbursements.length} records
        </div>
      </section>
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              if (editing.id) {
                void updateReimbursement(editing);
              } else {
                void addReimbursement(editing);
              }
              setEditing(null);
            }}
          >
            <div className="border-b border-black/10 p-5">
              <h3 className="text-lg font-semibold text-ink">Edit reimbursement</h3>
              <p className="mt-1 text-sm text-steel">{editing.id ? `Linked expense: ${editing.linkedExpense}` : "Create a reimbursement linked to an expense."}</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium text-steel">
                Who paid
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink"
                  value={editing.paidBy}
                  onChange={(event) => setEditing((current) => current ? { ...current, paidBy: event.target.value } : current)}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.fullName}>{person.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Person owed
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink"
                  value={editing.personOwed}
                  onChange={(event) => {
                    const person = people.find((item) => item.fullName === event.target.value);
                    setEditing((current) => current ? { ...current, personOwed: event.target.value, personOwedRecordId: person?.recordId } : current);
                  }}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.fullName}>{person.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Responsible for reimbursement
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink"
                  value={editing.responsiblePerson}
                  onChange={(event) => setEditing((current) => current ? { ...current, responsiblePerson: event.target.value } : current)}
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.fullName}>{person.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Linked expense
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink"
                  value={editing.linkedExpense}
                  onChange={(event) => {
                    const expense = expenses.find((item) => item.id === event.target.value);
                    setEditing((current) =>
                      current
                        ? {
                            ...current,
                            linkedExpense: event.target.value,
                            expenseRecordId: expense?.recordId,
                            paidBy: expense?.paidBy ?? current.paidBy,
                            costCenterId: expense?.costCenterId,
                            costCenter: expense?.costCenter,
                            amount: current.amount || expense?.amount || 0,
                            outstandingBalance: Math.max(0, (current.amount || expense?.amount || 0) - current.amountReimbursed)
                          }
                        : current
                    );
                  }}
                >
                  {expenses.map((expense) => (
                    <option key={expense.id} value={expense.id}>{expense.id}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Cost center
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink"
                  value={editing.costCenterId ?? ""}
                  onChange={(event) => {
                    const costCenter = costCenters.find((item) => item.id === event.target.value);
                    setEditing((current) => current ? { ...current, costCenterId: costCenter?.id, costCenter: costCenter?.name ?? "" } : current);
                  }}
                >
                  <option value="">No cost center</option>
                  {costCenters.map((costCenter) => (
                    <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Amount owed
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" min="0" step="0.01" type="number" value={editing.amount} onChange={(event) => setEditing((current) => current ? { ...current, amount: Number(event.target.value), outstandingBalance: Math.max(0, Number(event.target.value) - current.amountReimbursed) } : current)} />
              </label>
              <label className="text-sm font-medium text-steel">
                Amount reimbursed
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" min="0" step="0.01" type="number" value={editing.amountReimbursed} onChange={(event) => setEditing((current) => current ? { ...current, amountReimbursed: Number(event.target.value), outstandingBalance: Math.max(0, current.amount - Number(event.target.value)) } : current)} />
              </label>
              <label className="text-sm font-medium text-steel">
                Outstanding balance
                <input className="mt-1 w-full rounded border border-black/10 bg-zinc-100 px-3 py-2 text-ink" readOnly value={editing.outstandingBalance} />
              </label>
              <label className="text-sm font-medium text-steel">
                Status
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.status} onChange={(event) => setEditing((current) => current ? { ...current, status: event.target.value as Reimbursement["status"] } : current)}>
                  {reimbursementLiabilityStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Due date
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.dueDate} onChange={(event) => setEditing((current) => current ? { ...current, dueDate: event.target.value } : current)} />
              </label>
              <label className="text-sm font-medium text-steel">
                Reimbursed date
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.reimbursedDate} onChange={(event) => setEditing((current) => current ? { ...current, reimbursedDate: event.target.value } : current)} />
              </label>
              <label className="text-sm font-medium text-steel">
                Reconciliation status
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.reconciliationStatus ?? "Not Reconciled"} onChange={(event) => setEditing((current) => current ? { ...current, reconciliationStatus: event.target.value as Reimbursement["reconciliationStatus"] } : current)}>
                  {reconciliationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Reconciled by
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.reconciledBy ?? ""} onChange={(event) => setEditing((current) => current ? { ...current, reconciledBy: event.target.value } : current)}>
                  <option value="">Not reconciled</option>
                  {people.map((person) => <option key={person.id} value={person.fullName}>{person.fullName}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-steel">
                Reconciliation date
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.reconciliationDate ?? ""} onChange={(event) => setEditing((current) => current ? { ...current, reconciliationDate: event.target.value } : current)} />
              </label>
              <label className="text-sm font-medium text-steel">
                Payment reference
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.paymentReference} onChange={(event) => setEditing((current) => current ? { ...current, paymentReference: event.target.value } : current)} />
              </label>
              <label className="text-sm font-medium text-steel md:col-span-2">
                Reconciliation notes
                <textarea className="mt-1 min-h-20 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.reconciliationNotes ?? ""} onChange={(event) => setEditing((current) => current ? { ...current, reconciliationNotes: event.target.value } : current)} />
              </label>
              <label className="text-sm font-medium text-steel md:col-span-2">
                Notes
                <textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.notes} onChange={(event) => setEditing((current) => current ? { ...current, notes: event.target.value } : current)} />
              </label>
              {editing.id ? <div className="md:col-span-2"><InternalNotesPanel module="Reimbursements" recordId={editing.id} notes={editing.noteHistory} /></div> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-black/10 p-5">
              <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={() => setEditing(null)} type="button">
                Cancel
              </button>
              <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" type="submit">
                Save reimbursement
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
