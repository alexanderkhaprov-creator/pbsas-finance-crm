"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, Download, Edit, Eye, Plus, Search, Trash2, Upload } from "lucide-react";
import { ExpenseFormModal } from "@/components/expense-form-modal";
import { useFinanceData } from "@/components/finance-data-provider";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { QuickExpenseEntry } from "@/components/quick-expense-entry";
import { StatusBadge } from "@/components/status-badge";
import { sumExpenses, sumOutstanding, sumReimbursed } from "@/lib/finance-calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import { getNextSequentialId } from "@/lib/id-utils";
import { expenseCategories, reconciliationStatuses } from "@/lib/options";
import type { Expense, ReceiptFile } from "@/types";

type SortKey = "date" | "id" | "paidBy" | "event" | "costCenter" | "category" | "amount" | "approvalStatus" | "reimbursementStatus" | "reconciliationStatus";

export default function ExpensesPage() {
  const { people, events, costCenters, documents, expenses, reimbursements, addExpense, updateExpense, deleteExpense, uploadReceipt } = useFinanceData();
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [paidByFilter, setPaidByFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [costCenterFilter, setCostCenterFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [reimbursementFilter, setReimbursementFilter] = useState("");
  const [reconciliationFilter, setReconciliationFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptFile | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      const searchText = [
        expense.id,
        expense.date,
        expense.paidBy,
        expense.paidByPersonId,
        expense.expensePurpose,
        expense.linkType,
        expense.event,
        expense.linkedEventId,
        expense.costCenter,
        expense.costCenterId,
        expense.category,
        expense.description,
        expense.vendor,
        expense.paymentMethod,
        expense.notes,
        ...(expense.receiptFiles ?? []).map((receipt) => receipt.fileName)
      ].join(" ");
      const matchesQuery = normalizedQuery ? searchText.toLowerCase().includes(normalizedQuery) : true;
      const matchesEvent = eventFilter ? expense.event === eventFilter : true;
      const matchesPaidBy = paidByFilter ? expense.paidBy === paidByFilter : true;
      const matchesCategory = categoryFilter ? expense.category === categoryFilter : true;
      const matchesCostCenter = costCenterFilter ? expense.costCenter === costCenterFilter : true;
      const matchesApproval = approvalFilter ? expense.approvalStatus === approvalFilter : true;
      const matchesReimbursement = reimbursementFilter ? expense.reimbursementStatus === reimbursementFilter : true;
      const matchesReconciliation = reconciliationFilter ? expense.reconciliationStatus === reconciliationFilter : true;
      const matchesStart = startDate ? expense.date >= startDate : true;
      const matchesEnd = endDate ? expense.date <= endDate : true;
      return matchesQuery && matchesEvent && matchesPaidBy && matchesCategory && matchesCostCenter && matchesApproval && matchesReimbursement && matchesReconciliation && matchesStart && matchesEnd;
    });
  }, [approvalFilter, categoryFilter, costCenterFilter, endDate, eventFilter, expenses, paidByFilter, query, reimbursementFilter, reconciliationFilter, startDate]);

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredExpenses, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const paginatedExpenses = sortedExpenses.slice((page - 1) * pageSize, page * pageSize);

  const summary = {
    totalListed: sumExpenses(filteredExpenses),
    approved: sumExpenses(filteredExpenses.filter((expense) => expense.approvalStatus === "Approved")),
    pendingReview: sumExpenses(filteredExpenses.filter((expense) => expense.approvalStatus === "Pending Review")),
    pendingReimbursement: sumOutstanding(reimbursements.filter((item) => filteredExpenses.some((expense) => expense.id === item.linkedExpense))),
    reimbursed: sumReimbursed(reimbursements.filter((item) => filteredExpenses.some((expense) => expense.id === item.linkedExpense)))
  };

  const approvalStatuses = ["Draft", "Submitted", "Pending Review", "Approved", "Rejected"];
  const reimbursementStatuses = ["Not Reimbursable", "Pending", "Approved", "Reimbursed"];
  const eventNames = events.map((event) => event.eventName);
  const peopleNames = people.map((person) => person.fullName);
  const costCenterOptions = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => ({ id: costCenter.id, name: costCenter.name }));
  const costCenterNames = costCenterOptions.map((costCenter) => costCenter.name);

  function toggleSort(nextSortKey: SortKey) {
    setPage(1);
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection("asc");
  }

  const sortableHeaders: Array<{ label: string; key?: SortKey }> = [
    { label: "Expense ID", key: "id" },
    { label: "Date", key: "date" },
    { label: "Paid by", key: "paidBy" },
    { label: "Person ID" },
    { label: "Link" },
    { label: "Linked event", key: "event" },
    { label: "Cost center ID" },
    { label: "Cost center", key: "costCenter" },
    { label: "Category", key: "category" },
    { label: "Purpose" },
    { label: "Description" },
    { label: "Amount", key: "amount" },
    { label: "Currency" },
    { label: "Payment method" },
    { label: "Vendor" },
    { label: "Receipt ID" },
    { label: "Receipts" },
    { label: "Reimbursable" },
    { label: "Reimbursement", key: "reimbursementStatus" },
    { label: "Approval", key: "approvalStatus" },
    { label: "Reconciliation", key: "reconciliationStatus" },
    { label: "Period" },
    { label: "Duplicate" },
    { label: "Documents" },
    { label: "Notes" },
    { label: "Actions" }
  ];

  return (
    <>
      <PageHeader title="Expenses" description="Detailed expense register with reimbursement and approval tracking." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total listed expenses" value={formatCurrency(summary.totalListed)} detail={`${filteredExpenses.length} records`} />
        <MetricCard label="Approved amount" value={formatCurrency(summary.approved)} detail="Approved spend" />
        <MetricCard label="Pending review amount" value={formatCurrency(summary.pendingReview)} detail="Needs approval" />
        <MetricCard label="Pending reimbursement" value={formatCurrency(summary.pendingReimbursement)} detail="Open repayments" />
        <MetricCard label="Reimbursed amount" value={formatCurrency(summary.reimbursed)} detail="Paid back" />
      </div>
      <div className="mb-6">
        <QuickExpenseEntry compact />
      </div>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="space-y-3 border-b border-black/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-steel" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses by ID, person, event, category, vendor, or notes" value={query} />
            </div>
            <div className="flex flex-wrap gap-2">
              {["CSV", "PDF", "Excel"].map((type) => (
                <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" key={type}>
                  <Download className="h-4 w-4" />
                  Export {type}
                </button>
              ))}
              <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4" />
                Add expense
              </button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-9">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
              <option value="">Event</option>
              {eventNames.map((eventName) => (
                <option key={eventName} value={eventName}>{eventName}</option>
              ))}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={paidByFilter} onChange={(event) => setPaidByFilter(event.target.value)}>
              <option value="">Paid by</option>
              {peopleNames.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">Category</option>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={costCenterFilter} onChange={(event) => setCostCenterFilter(event.target.value)}>
              <option value="">Cost center</option>
              {costCenterNames.map((costCenter) => (
                <option key={costCenter} value={costCenter}>{costCenter}</option>
              ))}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)}>
              <option value="">Approval status</option>
              {approvalStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={reimbursementFilter} onChange={(event) => setReimbursementFilter(event.target.value)}>
              <option value="">Reimbursement status</option>
              {reimbursementStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={reconciliationFilter} onChange={(event) => setReconciliationFilter(event.target.value)}>
              <option value="">Reconciliation</option>
              {reconciliationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input aria-label="Start date" className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input aria-label="End date" className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>
                {sortableHeaders.map((heading) => (
                  <th className="whitespace-nowrap px-4 py-3 font-semibold" key={heading.label}>
                    {heading.key ? (
                      <button className="inline-flex items-center gap-2 hover:text-ink" onClick={() => toggleSort(heading.key!)}>
                        {heading.label}
                        <ArrowDownUp className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      heading.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {paginatedExpenses.map((expense) => (
                <tr className="align-top hover:bg-[#fafaf8]" key={expense.id}>
                  <td className="px-4 py-4 font-medium text-ink">{expense.id}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(expense.date)}</td>
                  <td className="px-4 py-4 text-steel">{expense.paidBy}</td>
                  <td className="px-4 py-4 text-steel">{expense.paidByPersonId || "Legacy"}</td>
                  <td className="px-4 py-4 text-steel">{expense.linkType}</td>
                  <td className="px-4 py-4 text-steel">{expense.linkedEventName || expense.event}</td>
                  <td className="px-4 py-4 text-steel">{expense.costCenterId || "General"}</td>
                  <td className="px-4 py-4 text-steel">{expense.costCenter || "No cost center"}</td>
                  <td className="px-4 py-4 text-steel">{expense.category}</td>
                  <td className="max-w-[240px] px-4 py-4 font-medium text-ink">{expense.expensePurpose || expense.description}</td>
                  <td className="max-w-[260px] px-4 py-4 text-steel">{expense.description}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(expense.amount, expense.currency)}</td>
                  <td className="px-4 py-4 text-steel">{expense.currency}</td>
                  <td className="px-4 py-4 text-steel">{expense.paymentMethod}</td>
                  <td className="px-4 py-4 text-steel">{expense.vendor}</td>
                  <td className="px-4 py-4">
                    {expense.sourceReceiptId ? (
                      <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/receipt-intake">
                        {expense.sourceReceiptId}
                      </Link>
                    ) : (
                      <span className="text-steel">Not linked</span>
                    )}
                  </td>
                  <td className="min-w-[260px] px-4 py-4 text-steel">
                    {expense.receiptFiles?.length ? (
                      <div className="space-y-2">
                        {expense.receiptFiles.map((receiptFile) => (
                          <div className="rounded border border-black/10 bg-white p-2" key={receiptFile.id}>
                            <span className="mb-2 inline-flex rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Receipt Attached</span>
                            <div className="flex items-start justify-between gap-2">
                              <a className="font-medium text-ink underline-offset-4 hover:underline" href={receiptFile.fileUrl} rel="noreferrer" target="_blank">
                                {receiptFile.fileName}
                              </a>
                              {receiptFile.fileType.startsWith("image/") ? (
                                <button className="rounded border border-black/10 p-1.5 text-steel hover:border-gold hover:text-ink" onClick={() => setPreviewReceipt(receiptFile)} title="Preview receipt">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-steel">{receiptFile.fileType || "file"} · {formatDate(receiptFile.uploadedAt)}</p>
                          </div>
                        ))}
                      </div>
                    ) : expense.receiptAttachment.startsWith("http") ? (
                      <a className="text-ink underline-offset-4 hover:underline" href={expense.receiptAttachment} rel="noreferrer" target="_blank">
                        Receipt link
                      </a>
                    ) : (
                      <span>{expense.receiptAttachment}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-steel">{expense.reimbursable ? "Yes" : "No"}</td>
                  <td className="px-4 py-4"><StatusBadge value={expense.reimbursementStatus} /></td>
                  <td className="px-4 py-4"><StatusBadge value={expense.approvalStatus} /></td>
                  <td className="px-4 py-4"><StatusBadge value={expense.reconciliationStatus ?? "Not Reconciled"} /></td>
                  <td className="px-4 py-4 text-steel">{expense.periodLabel ?? "Unassigned"}</td>
                  <td className="px-4 py-4">
                    {expense.possibleDuplicateOfId ? (
                      <Link className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:underline" href={`/expenses?duplicate=${expense.possibleDuplicateOfId}`}>
                        Possible Duplicate: {expense.possibleDuplicateOfId}
                      </Link>
                    ) : (
                      <span className="text-steel">No</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-steel">{documents.filter((document) => document.linkedModule === "Expense" && document.linkedRecordId === expense.id).length}</td>
                  <td className="max-w-[260px] px-4 py-4 text-steel">{expense.notes}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => setEditingExpense(expense)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => setEditingExpense(expense)} title="Upload or replace receipt">
                        <Upload className="h-4 w-4" />
                      </button>
                      <button className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700" onClick={() => void deleteExpense(expense)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 text-sm text-steel sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {paginatedExpenses.length} of {sortedExpenses.length} filtered records</span>
          <div className="flex items-center gap-2">
            <button className="rounded border border-black/10 px-3 py-2 font-semibold disabled:opacity-40" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="rounded border border-black/10 px-3 py-2 font-semibold disabled:opacity-40" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        </div>
      </section>
      {isAdding ? (
        <ExpenseFormModal
          events={eventNames}
          expenseIdPreview={getNextSequentialId(expenses, "EXP")}
          people={peopleNames}
          peopleRecords={people.map((person) => ({ id: person.id, fullName: person.fullName }))}
          eventRecords={events.map((event) => ({ id: event.id, eventName: event.eventName }))}
          costCenters={costCenterOptions}
          onClose={() => setIsAdding(false)}
          onSubmit={async (expense, receiptFiles, receiptNotes) => {
            const savedExpense = await addExpense(expense as Omit<Expense, "id">);
            for (const receiptFile of receiptFiles) {
              await uploadReceipt(savedExpense, receiptFile, receiptNotes);
            }
            setIsAdding(false);
          }}
        />
      ) : null}
      {editingExpense ? (
        <ExpenseFormModal
          expense={editingExpense}
          events={eventNames}
          expenseIdPreview={editingExpense.id}
          people={peopleNames}
          peopleRecords={people.map((person) => ({ id: person.id, fullName: person.fullName }))}
          eventRecords={events.map((event) => ({ id: event.id, eventName: event.eventName }))}
          costCenters={costCenterOptions}
          onClose={() => setEditingExpense(null)}
          onSubmit={async (expense, receiptFiles, receiptNotes) => {
            const savedExpense = await updateExpense(expense as Expense);
            for (const receiptFile of receiptFiles) {
              await uploadReceipt(savedExpense, receiptFile, receiptNotes);
            }
            setEditingExpense(null);
          }}
        />
      ) : null}
      {previewReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded border border-black/10 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-black/10 p-4">
              <div>
                <h3 className="font-semibold text-ink">{previewReceipt.fileName}</h3>
                <p className="text-sm text-steel">{previewReceipt.fileType} · {formatDate(previewReceipt.uploadedAt)}</p>
              </div>
              <button className="rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={() => setPreviewReceipt(null)}>
                Close
              </button>
            </div>
            <div className="flex max-h-[75vh] justify-center overflow-auto bg-[#f7f7f5] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={previewReceipt.fileName} className="max-h-[70vh] max-w-full rounded border border-black/10 object-contain" src={previewReceipt.fileUrl} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
