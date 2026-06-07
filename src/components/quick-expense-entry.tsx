"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatCurrency } from "@/lib/format";
import { parseMoneyInput } from "@/lib/money-utils";
import { currencies, expenseCategories } from "@/lib/options";
import type { CurrencyCode, ExpenseCategory } from "@/types";

const CURRENT_DATE = "2026-06-02";

export function QuickExpenseEntry({ compact = false }: { compact?: boolean }) {
  const { people, costCenters, appSettings, expenses, addExpense } = useFinanceData();
  const costCenterOptions = costCenters.filter((costCenter) => costCenter.status !== "Archived");
  const [date, setDate] = useState(CURRENT_DATE);
  const [paidBy, setPaidBy] = useState(people[0]?.fullName ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(appSettings.lastQuickCategory ?? "Miscellaneous");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>(appSettings.lastQuickCurrency ?? "AED");
  const [costCenterId, setCostCenterId] = useState(appSettings.lastQuickCostCenterId ?? costCenterOptions[0]?.id ?? "");
  const [reimbursable, setReimbursable] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const selectedCostCenter = costCenterOptions.find((costCenter) => costCenter.id === costCenterId);
  const possibleDuplicate = expenses.find((expense) => {
    const sameAmount = Number(expense.amount) === Number(amount);
    const sameDate = expense.date === date;
    const sameNotes = Boolean(notes && expense.notes.trim().toLowerCase() === notes.trim().toLowerCase());
    return amount > 0 && sameAmount && (sameDate || sameNotes);
  });

  async function submitQuickExpense() {
    setMessage("");
    if (!paidBy || !amount || amount <= 0) {
      setMessage("Enter paid by and an amount greater than zero.");
      return;
    }
    const saved = await addExpense({
      date,
      paidBy,
      linkType: "General Operations",
      event: "General Operations",
      costCenterId: selectedCostCenter?.id,
      costCenter: selectedCostCenter?.name ?? "",
      category,
      description: notes || `Quick ${category} expense`,
      amount: Number(amount),
      currency,
      paymentMethod: "Quick entry",
      vendor: "",
      receiptAttachment: "Quick entry receipt pending",
      reimbursable,
      reimbursementStatus: reimbursable ? "Pending" : "Not Reimbursable",
      approvalStatus: "Submitted",
      submittedBy: paidBy,
      reviewedBy: "",
      approvedBy: "",
      approvalDate: "",
      rejectionReason: "",
      internalNotes: "Created from quick expense entry.",
      reconciliationStatus: "Not Reconciled",
      reconciledBy: "",
      reconciliationDate: "",
      reconciliationNotes: "",
      notes
    });
    setAmount(0);
    setNotes("");
    setMessage(`${saved.id} created${saved.possibleDuplicateOfId ? `; possible duplicate of ${saved.possibleDuplicateOfId}` : ""}.`);
  }

  return (
    <section className="rounded border border-black/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Quick Expense Entry</h3>
          <p className="text-sm text-steel">Fast entry for small or common accounting items.</p>
        </div>
        {possibleDuplicate ? (
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
            Possible Duplicate: {possibleDuplicate.id}
          </span>
        ) : null}
      </div>
      <div className={`mt-4 grid gap-3 ${compact ? "md:grid-cols-4 xl:grid-cols-8" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
          {people.map((person) => <option key={person.id} value={person.fullName}>{person.fullName}</option>)}
        </select>
        <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
          {expenseCategories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" inputMode="decimal" value={amount || ""} onChange={(event) => setAmount(parseMoneyInput(event.target.value))} placeholder="Amount" />
        <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
          {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={costCenterId} onChange={(event) => setCostCenterId(event.target.value)}>
          {costCenterOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm text-steel">
          <input checked={reimbursable} className="h-4 w-4 accent-gold" type="checkbox" onChange={(event) => setReimbursable(event.target.checked)} />
          Reimbursable
        </label>
        <button className="inline-flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => void submitQuickExpense()}>
          <Plus className="h-4 w-4" />
          Add {amount > 0 ? formatCurrency(amount, currency) : "expense"}
        </button>
      </div>
      <input className="mt-3 w-full rounded border border-black/10 px-3 py-2 text-sm text-ink" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
      {message ? <p className="mt-3 text-sm font-medium text-steel">{message}</p> : null}
    </section>
  );
}
