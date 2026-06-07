"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { InternalNotesPanel } from "@/components/internal-notes-panel";
import { currencies, expenseCategories, expenseLinkTypes, reconciliationStatuses } from "@/lib/options";
import { parseMoneyInput } from "@/lib/money-utils";
import type { ApprovalStatus, Expense, ReimbursementStatus } from "@/types";

type ExpenseFormModalProps = {
  expense?: Expense;
  expenseIdPreview: string;
  events: string[];
  people: string[];
  peopleRecords: Array<{ id: string; fullName: string }>;
  eventRecords: Array<{ id: string; eventName: string }>;
  costCenters: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (expense: Omit<Expense, "id"> | Expense, receiptFiles: File[], receiptNotes: string) => void | Promise<void>;
};

const approvalStatuses: ApprovalStatus[] = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Reimbursed", "Closed"];
const reimbursementStatuses: ReimbursementStatus[] = ["Outstanding", "Approved", "Partially Reimbursed", "Fully Reimbursed", "Disputed", "Closed"];

function defaultExpense(events: string[], people: string[], costCenters: Array<{ id: string; name: string }>, peopleRecords: Array<{ id: string; fullName: string }>): Omit<Expense, "id"> {
  const firstPerson = peopleRecords[0];
  return {
    date: new Date().toISOString().slice(0, 10),
    paidBy: firstPerson?.fullName ?? people[0] ?? "",
    paidByPersonId: firstPerson?.id,
    paidByPersonName: firstPerson?.fullName ?? people[0] ?? "",
    linkType: "General Operations",
    event: events[0] ?? "General Operations",
    costCenterId: costCenters[0]?.id,
    costCenter: costCenters[0]?.name ?? "General Operations",
    category: "General Operations",
    expensePurpose: "",
    description: "",
    amount: 0,
    currency: "AED",
    paymentMethod: "Bank transfer",
    vendor: "",
    receiptAttachment: "No receipt attached",
    reimbursable: false,
    reimbursementStatus: "Not Reimbursable",
    approvalStatus: "Draft",
    submittedBy: people[0] ?? "",
    submittedDate: "",
    reviewedBy: "",
    reviewedDate: "",
    approvedBy: "",
    approvalDate: "",
    rejectionReason: "",
    internalNotes: "",
    reconciliationStatus: "Not Reconciled",
    reconciledBy: "",
    reconciliationDate: "",
    reconciliationNotes: "",
    notes: ""
  };
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-steel">
      {children} {required ? <span className="text-red-600">*</span> : null}
    </span>
  );
}

export function ExpenseFormModal({ expense, expenseIdPreview, events, people, peopleRecords, eventRecords, costCenters, onClose, onSubmit }: ExpenseFormModalProps) {
  const [form, setForm] = useState<Expense | Omit<Expense, "id">>(expense ?? defaultExpense(events, people, costCenters, peopleRecords));
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(expense);

  function update<K extends keyof Omit<Expense, "id">>(key: K, value: Omit<Expense, "id">[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.date) nextErrors.date = "Date is required.";
    if (!form.paidBy) nextErrors.paidBy = "Paid by is required.";
    if (!form.category) nextErrors.category = "Category is required.";
    if (!form.expensePurpose?.trim()) nextErrors.expensePurpose = "Expense purpose is required.";
    if (!form.costCenterId && form.costCenter !== "General Operations") nextErrors.costCenter = "Select a cost center or General Operations.";
    if (!form.description.trim()) nextErrors.description = "Description is required.";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Enter an amount greater than zero.";
    if (!form.currency) nextErrors.currency = "Currency is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    await onSubmit(
      {
        ...form,
        amount: typeof form.amount === "number" ? form.amount : parseMoneyInput(String(form.amount)),
        receiptAttachment: receiptFiles[0]?.name ?? form.receiptAttachment,
        reimbursementStatus: form.reimbursable ? form.reimbursementStatus : "Not Reimbursable"
      },
      receiptFiles,
      receiptNotes
    );
  }

  const selectedFiles = receiptFiles.length ? receiptFiles : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 border-b border-black/10 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">{isEditing ? "Edit expense" : "Add expense"}</h3>
            <p className="mt-1 text-sm text-steel">Record daily accounting activity for federation and event operations.</p>
          </div>
          <div className="rounded border border-gold/40 bg-amber-50 px-3 py-2 text-sm">
            <span className="text-steel">Expense ID</span>
            <p className="font-semibold text-ink">{isEditing && "id" in form ? form.id : expenseIdPreview}</p>
          </div>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Core Details</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label>
                <FieldLabel required>Date</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
                {errors.date ? <p className="mt-1 text-xs text-red-700">{errors.date}</p> : null}
              </label>
              <label>
                <FieldLabel required>Paid by</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paidByPersonId ?? ""} onChange={(event) => {
                  const person = peopleRecords.find((item) => item.id === event.target.value);
                  setForm((current) => ({ ...current, paidByPersonId: person?.id, paidByPersonName: person?.fullName ?? "", paidBy: person?.fullName ?? "" }));
                }}>
                  <option value="">Select person</option>
                  {peopleRecords.map((person) => (
                    <option key={person.id} value={person.id}>{person.fullName}</option>
                  ))}
                </select>
                {errors.paidBy ? <p className="mt-1 text-xs text-red-700">{errors.paidBy}</p> : null}
              </label>
              <label>
                <FieldLabel>Operational link</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.linkType} onChange={(event) => update("linkType", event.target.value as Expense["linkType"])}>
                  {expenseLinkTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Event / activity</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.linkedEventId ?? ""} onChange={(event) => {
                  const linkedEvent = eventRecords.find((item) => item.id === event.target.value);
                  setForm((current) => ({ ...current, linkedEventId: linkedEvent?.id, linkedEventName: linkedEvent?.eventName ?? "", eventRecordId: linkedEvent?.id, event: linkedEvent?.eventName ?? "General Operations" }));
                }}>
                  <option value="">General Operations / no event</option>
                  {eventRecords.map((eventRecord) => (
                    <option key={eventRecord.id} value={eventRecord.id}>{eventRecord.eventName}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel required>Cost center</FieldLabel>
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink"
                  value={form.costCenterId ?? (form.costCenter === "General Operations" ? "GENERAL" : "")}
                  onChange={(event) => {
                    if (event.target.value === "GENERAL") {
                      setForm((current) => ({ ...current, costCenterId: undefined, costCenter: "General Operations" }));
                      return;
                    }
                    const costCenter = costCenters.find((item) => item.id === event.target.value);
                    setForm((current) => ({ ...current, costCenterId: costCenter?.id, costCenter: costCenter?.name ?? "General Operations" }));
                  }}
                >
                  <option value="GENERAL">General Operations</option>
                  {costCenters.map((costCenter) => (
                    <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
                  ))}
                </select>
                {errors.costCenter ? <p className="mt-1 text-xs text-red-700">{errors.costCenter}</p> : null}
              </label>
              <label>
                <FieldLabel required>Category</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.category} onChange={(event) => update("category", event.target.value as Expense["category"])}>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Vendor</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.vendor} onChange={(event) => update("vendor", event.target.value)} />
              </label>
              <label className="md:col-span-2 xl:col-span-3">
                <FieldLabel required>Expense Purpose</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" placeholder="Workshop lunch, referee transport, hotel accommodation..." value={form.expensePurpose ?? ""} onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({ ...current, expensePurpose: value, description: current.description || value }));
                }} />
                {errors.expensePurpose ? <p className="mt-1 text-xs text-red-700">{errors.expensePurpose}</p> : null}
              </label>
              <label className="md:col-span-2 xl:col-span-3">
                <FieldLabel required>Description</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.description} onChange={(event) => update("description", event.target.value)} />
                {errors.description ? <p className="mt-1 text-xs text-red-700">{errors.description}</p> : null}
              </label>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Payment</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label>
                <FieldLabel required>Amount</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" inputMode="decimal" value={form.amount} onChange={(event) => update("amount", parseMoneyInput(event.target.value))} />
                {errors.amount ? <p className="mt-1 text-xs text-red-700">{errors.amount}</p> : null}
              </label>
              <label>
                <FieldLabel required>Currency</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.currency} onChange={(event) => update("currency", event.target.value as Expense["currency"])}>
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Payment method</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} />
              </label>
              <label>
                <FieldLabel>Approval status</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.approvalStatus} onChange={(event) => update("approvalStatus", event.target.value as ApprovalStatus)}>
                  {approvalStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Submitted by</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.submittedBy ?? ""} onChange={(event) => update("submittedBy", event.target.value)}>
                  <option value="">Not submitted</option>
                  {people.map((person) => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Reviewed by</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reviewedBy ?? ""} onChange={(event) => update("reviewedBy", event.target.value)}>
                  <option value="">Not reviewed</option>
                  {people.map((person) => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Submitted date</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.submittedDate ?? ""} onChange={(event) => update("submittedDate", event.target.value)} />
              </label>
              <label>
                <FieldLabel>Reviewed date</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.reviewedDate ?? ""} onChange={(event) => update("reviewedDate", event.target.value)} />
              </label>
              <label>
                <FieldLabel>Approved by</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.approvedBy ?? ""} onChange={(event) => update("approvedBy", event.target.value)}>
                  <option value="">Not approved</option>
                  {people.map((person) => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Approval date</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.approvalDate ?? ""} onChange={(event) => update("approvalDate", event.target.value)} />
              </label>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Reimbursement & Receipts</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded border border-black/10 bg-[#f7f7f5] px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-ink">Reimbursable</span>
                  <span className="text-xs text-steel">Creates or updates a reimbursement record.</span>
                </span>
                <input
                  checked={form.reimbursable}
                  className="h-5 w-5 accent-gold"
                  onChange={(event) => {
                    const reimbursable = event.target.checked;
                    setForm((current) => ({
                      ...current,
                      reimbursable,
                      reimbursementStatus: reimbursable ? "Outstanding" : "Not Reimbursable"
                    }));
                  }}
                  type="checkbox"
                />
              </label>
              <label>
                <FieldLabel>Reimbursement status</FieldLabel>
                <select
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink disabled:bg-zinc-100 disabled:text-zinc-500"
                  disabled={!form.reimbursable}
                  value={form.reimbursable ? form.reimbursementStatus : "Not Reimbursable"}
                  onChange={(event) => update("reimbursementStatus", event.target.value as ReimbursementStatus)}
                >
                  {!form.reimbursable ? <option value="Not Reimbursable">Not Reimbursable</option> : null}
                  {reimbursementStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Local receipt placeholder</FieldLabel>
                <input
                  accept="image/*,application/pdf"
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                  multiple
                  onChange={(event) => setReceiptFiles(Array.from(event.target.files ?? []))}
                  type="file"
                />
              </label>
              <label>
                <FieldLabel>Receipt notes</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={receiptNotes} onChange={(event) => setReceiptNotes(event.target.value)} />
              </label>
              {selectedFiles.length ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm md:col-span-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    Receipt Attached
                  </div>
                  <p className="mt-1 text-emerald-800">{selectedFiles.map((file) => file.name).join(", ")}</p>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Reconciliation</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label>
                <FieldLabel>Reconciliation status</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reconciliationStatus ?? "Not Reconciled"} onChange={(event) => update("reconciliationStatus", event.target.value as Expense["reconciliationStatus"])}>
                  {reconciliationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <FieldLabel>Reconciled by</FieldLabel>
                <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reconciledBy ?? ""} onChange={(event) => update("reconciledBy", event.target.value)}>
                  <option value="">Not reconciled</option>
                  {people.map((person) => <option key={person} value={person}>{person}</option>)}
                </select>
              </label>
              <label>
                <FieldLabel>Reconciliation date</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.reconciliationDate ?? ""} onChange={(event) => update("reconciliationDate", event.target.value)} />
              </label>
              <label className="xl:col-span-1">
                <FieldLabel>Reconciliation notes</FieldLabel>
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reconciliationNotes ?? ""} onChange={(event) => update("reconciliationNotes", event.target.value)} />
              </label>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Notes</h4>
            <label className="block">
              <FieldLabel>Rejection reason</FieldLabel>
              <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.rejectionReason ?? ""} onChange={(event) => update("rejectionReason", event.target.value)} />
            </label>
            <label className="mt-3 block">
              <FieldLabel>Internal notes</FieldLabel>
              <textarea className="mt-1 min-h-20 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.internalNotes ?? ""} onChange={(event) => update("internalNotes", event.target.value)} />
            </label>
            <textarea className="mt-3 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </section>
          {expense ? <InternalNotesPanel module="Expenses" recordId={expense.id} notes={expense.noteHistory} /> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" type="submit">
            Save expense
          </button>
        </div>
      </form>
    </div>
  );
}
