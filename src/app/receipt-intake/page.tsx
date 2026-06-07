"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Eye, Plus, Search, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { InternalNotesPanel } from "@/components/internal-notes-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getNextSequentialId } from "@/lib/id-utils";
import { parseMoneyInput } from "@/lib/money-utils";
import { parseReceiptText } from "@/lib/ocr-import";
import { currencies, expenseCategories } from "@/lib/options";
import type { ReceiptIntake, Reimbursement } from "@/types";

const statuses: ReceiptIntake["status"][] = ["New", "Needs Review", "Converted to Expense", "Rejected"];
const paymentMethods = ["Bank Transfer", "Cash", "Card", "Online Payment", "Other"];
const registerExpenseTooltip = "Create an official accounting record and reimbursement entry from this receipt.";

function displayReceiptStatus(status: ReceiptIntake["status"]) {
  return status === "Converted to Expense" ? "Expense Registered" : status;
}

function emptyReceipt(receipts: ReceiptIntake[], people: Array<{ id: string; fullName: string }>, costCenters: Array<{ id: string; name: string }>): ReceiptIntake {
  const firstPerson = people[0];
  return {
    id: getNextSequentialId(receipts, "RCT"),
    uploadDate: new Date().toISOString().slice(0, 10),
    uploadedBy: firstPerson?.fullName ?? "",
    fileName: "",
    fileUrl: "",
    fileType: "",
    sourceFileName: "",
    ocrStatus: "Uploaded",
    extractedRawText: "",
    confidenceLevel: "Manual Review Required",
    mappingReviewed: false,
    referenceNumber: "",
    vatTrn: "",
    vendor: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: "AED",
    paymentMethod: "Card",
    paidBy: firstPerson?.fullName ?? "",
    paidByPersonId: firstPerson?.id,
    paidByPersonName: firstPerson?.fullName ?? "",
    personToReimburseId: firstPerson?.id,
    personToReimburseName: firstPerson?.fullName ?? "",
    linkType: "General Operations",
    event: "General Operations",
    costCenterId: costCenters[0]?.id,
    costCenter: costCenters[0]?.name ?? "General Operations",
    suggestedCategory: "General Operations",
    expensePurpose: "",
    reimbursable: true,
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

function getReceiptWorkflow(receipt: ReceiptIntake, reimbursements: Reimbursement[]) {
  const linkedReimbursements = reimbursements.filter((reimbursement) => {
    return reimbursement.sourceReceiptId === receipt.id || (receipt.convertedExpenseId && reimbursement.linkedExpense === receipt.convertedExpenseId);
  });
  const expenseRegistered = receipt.status === "Converted to Expense" || Boolean(receipt.convertedExpenseId);
  const reimbursementCreated = linkedReimbursements.length > 0;
  const reimbursementPaid = linkedReimbursements.some((reimbursement) => reimbursement.outstandingBalance <= 0 || reimbursement.status === "Fully Reimbursed" || reimbursement.status === "Closed");
  const closed = receipt.status === "Rejected" || (expenseRegistered && (!receipt.reimbursable || reimbursementPaid));

  return [
    { label: "Receipt Uploaded", active: true },
    { label: "Expense Registered", active: expenseRegistered },
    { label: "Reimbursement Created", active: reimbursementCreated },
    { label: "Reimbursement Paid", active: reimbursementPaid },
    { label: "Closed", active: closed }
  ];
}

function ReceiptWorkflow({ receipt, reimbursements }: { receipt: ReceiptIntake; reimbursements: Reimbursement[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getReceiptWorkflow(receipt, reimbursements).map((step) => (
        <span
          className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${
            step.active ? "border-gold/60 bg-gold/15 text-ink" : "border-zinc-200 bg-zinc-50 text-zinc-400"
          }`}
          key={step.label}
        >
          {step.label}
        </span>
      ))}
    </div>
  );
}

export default function ReceiptIntakePage() {
  const { people, events, costCenters, documents, receipts, reimbursements, addReceipt, updateReceipt, deleteReceipt, convertReceiptToExpense } = useFinanceData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<ReceiptIntake | null>(null);
  const [preview, setPreview] = useState<ReceiptIntake | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [error, setError] = useState("");
  const peopleOptions = people.map((person) => ({ id: person.id, fullName: person.fullName }));
  const costCenterOptions = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => ({ id: costCenter.id, name: costCenter.name }));

  const filteredReceipts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const search = [
        receipt.id,
        receipt.vendor,
        receipt.receiptDate,
        receipt.amount,
        receipt.currency,
        receipt.paidBy,
        receipt.paidByPersonId,
        receipt.personToReimburseName,
        receipt.expensePurpose,
        receipt.costCenter,
        receipt.linkedEventName,
        receipt.event,
        receipt.paymentMethod,
        receipt.fileName,
        receipt.notes
      ].join(" ");
      const matchesQuery = normalizedQuery ? search.toLowerCase().includes(normalizedQuery) : true;
      const matchesStatus = statusFilter ? receipt.status === statusFilter : true;
      return matchesQuery && matchesStatus;
    });
  }, [query, receipts, statusFilter]);

  function startEditing(receipt: ReceiptIntake) {
    setEditing(receipt);
    setAmountInput(receipt.amount ? String(receipt.amount) : "");
    setAmountTouched(Boolean(receipt.amount));
    setError("");
  }

  async function saveReceipt() {
    if (!editing) return;
    const parsedAmount = parseMoneyInput(amountInput || String(editing.amount));
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!editing.currency) {
      setError("Currency is required.");
      return;
    }
    if (!editing.paidByPersonId || !editing.paidBy) {
      setError("Paid By must be selected from People.");
      return;
    }
    if (editing.reimbursable && (!editing.personToReimburseId || !editing.personToReimburseName)) {
      setError("Select the person to reimburse.");
      return;
    }
    if (!editing.expensePurpose?.trim()) {
      setError("Expense Purpose is required.");
      return;
    }
    const normalized: ReceiptIntake = {
      ...editing,
      amount: parsedAmount,
      costCenter: editing.costCenter || "General Operations",
      personToReimburseId: editing.reimbursable ? editing.personToReimburseId : "",
      personToReimburseName: editing.reimbursable ? editing.personToReimburseName : ""
    };
    if (receipts.some((receipt) => receipt.id === normalized.id)) await updateReceipt(normalized);
    else await addReceipt(normalized);
    setEditing(null);
    setAmountInput("");
    setAmountTouched(false);
    setError("");
  }

  function applyExtractedReceiptText(rawText: string) {
    if (!editing) return;
    const parsed = parseReceiptText(rawText);
    setEditing({
      ...editing,
      extractedRawText: rawText,
      ocrStatus: rawText.trim() ? "Mapping Review" : "Uploaded",
      confidenceLevel: rawText.trim() ? "Medium" : "Manual Review Required",
      vendor: parsed.vendor || editing.vendor,
      receiptDate: parsed.receiptDate || editing.receiptDate,
      amount: amountTouched ? editing.amount : parsed.amount || editing.amount,
      currency: parsed.currency || editing.currency,
      paymentMethod: parsed.paymentMethod || editing.paymentMethod,
      referenceNumber: parsed.referenceNumber || editing.referenceNumber,
      vatTrn: parsed.vatTrn || editing.vatTrn,
      suggestedCategory: parsed.suggestedCategory || editing.suggestedCategory
    });
    if (!amountTouched && parsed.amount) setAmountInput(String(parsed.amount));
  }

  return (
    <>
      <PageHeader title="Receipt Register" description="Register proof of payment and reimbursement details before registering official expenses." />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Summary label="Total receipts" value={receipts.length} />
        <Summary label="Pending reimbursement" value={receipts.filter((receipt) => receipt.reimbursable && receipt.status !== "Converted to Expense").length} />
        <Summary label="Expenses registered" value={receipts.filter((receipt) => receipt.status === "Converted to Expense").length} />
        <Summary label="Total proof amount" value={formatCurrency(receipts.reduce((sum, receipt) => sum + receipt.amount, 0))} />
      </div>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-steel" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search receipts by ID, vendor, paid by, purpose, cost center, event, or file" value={query} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{displayReceiptStatus(status)}</option>)}
            </select>
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => startEditing(emptyReceipt(receipts, peopleOptions, costCenterOptions))}>
              <Plus className="h-4 w-4" />
              Register receipt
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>
                {["Receipt ID", "Vendor", "Receipt Date", "Amount", "Paid By", "Person ID", "Reimburse", "Purpose", "Cost Center", "Linked Event", "Method", "Proof", "Workflow", "Status", "Actions"].map((heading) => (
                  <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredReceipts.map((receipt) => (
                <tr className="align-top hover:bg-[#fafaf8]" key={receipt.id}>
                  <td className="px-4 py-4 font-medium text-ink">{receipt.id}</td>
                  <td className="px-4 py-4 text-steel">{receipt.vendor || "No vendor"}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(receipt.amount, receipt.currency)}</td>
                  <td className="px-4 py-4 text-steel">{receipt.paidBy}</td>
                  <td className="px-4 py-4 text-steel">{receipt.paidByPersonId || "Legacy"}</td>
                  <td className="px-4 py-4 text-steel">{receipt.reimbursable ? receipt.personToReimburseName || receipt.paidBy : "No"}</td>
                  <td className="max-w-[240px] px-4 py-4 font-medium text-ink">{receipt.expensePurpose || receipt.notes || "No purpose"}</td>
                  <td className="px-4 py-4 text-steel">{receipt.costCenterId ? `${receipt.costCenterId} · ${receipt.costCenter}` : receipt.costCenter || "General Operations"}</td>
                  <td className="px-4 py-4 text-steel">{receipt.linkedEventName || (receipt.event === "General Operations" ? "No event" : receipt.event)}</td>
                  <td className="px-4 py-4 text-steel">{receipt.paymentMethod}</td>
                  <td className="px-4 py-4 text-steel">
                    <div className="font-medium text-ink">{receipt.fileName || "No file"}</div>
                    {receipt.fileType.startsWith("image/") && receipt.fileUrl ? (
                      <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold" onClick={() => setPreview(receipt)}>
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                    ) : null}
                  </td>
                  <td className="min-w-[260px] px-4 py-4"><ReceiptWorkflow receipt={receipt} reimbursements={reimbursements} /></td>
                  <td className="px-4 py-4"><StatusBadge value={receipt.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => startEditing(receipt)}>Edit</button>
                      <button className="rounded bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445] disabled:cursor-not-allowed disabled:opacity-60" disabled={receipt.status === "Converted to Expense"} onClick={() => void convertReceiptToExpense(receipt)} title={registerExpenseTooltip}>Register Expense</button>
                      <button className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void deleteReceipt(receipt)}><Trash2 className="h-4 w-4" /></button>
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
              <h3 className="text-lg font-semibold text-ink">{receipts.some((receipt) => receipt.id === editing.id) ? "Edit receipt proof" : "Register receipt proof"}</h3>
              <p className="mt-1 text-sm text-steel">Receipt ID: {editing.id}</p>
            </div>
            {error ? <div className="mx-5 mt-5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <section className="mx-5 mt-5 rounded border border-black/10 bg-[#f7f7f5] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-steel">Receipt summary</h4>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <SummaryItem label="Vendor" value={editing.vendor || "No vendor"} />
                    <SummaryItem label="Amount" value={formatCurrency(editing.amount, editing.currency)} />
                    <SummaryItem label="Paid By" value={editing.paidBy || "No person selected"} />
                    <SummaryItem label="Person To Reimburse" value={editing.reimbursable ? editing.personToReimburseName || "Select person" : "Not reimbursable"} />
                    <SummaryItem label="Purpose" value={editing.expensePurpose || "No purpose entered"} />
                    <SummaryItem label="Cost Center" value={editing.costCenterId ? `${editing.costCenterId} · ${editing.costCenter}` : editing.costCenter || "General Operations"} />
                    <SummaryItem label="Linked Event" value={editing.linkedEventName || (editing.event === "General Operations" ? "No event" : editing.event)} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-steel">Current Status</p>
                      <div className="mt-1"><StatusBadge value={editing.status} /></div>
                    </div>
                  </div>
                </div>
                <ReceiptWorkflow receipt={editing} reimbursements={reimbursements} />
              </div>
            </section>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium text-steel">Vendor<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.vendor} onChange={(event) => setEditing({ ...editing, vendor: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Receipt Date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={editing.receiptDate} onChange={(event) => setEditing({ ...editing, receiptDate: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Amount<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" inputMode="decimal" placeholder="10,586.00" value={amountInput} onChange={(event) => {
                setAmountTouched(true);
                setAmountInput(event.target.value);
                setEditing({ ...editing, amount: parseMoneyInput(event.target.value) });
              }} /></label>
              <label className="text-sm font-medium text-steel">Currency<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value as ReceiptIntake["currency"] })}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Paid By<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.paidByPersonId ?? ""} onChange={(event) => {
                const person = peopleOptions.find((item) => item.id === event.target.value);
                setEditing({ ...editing, paidByPersonId: person?.id, paidByPersonName: person?.fullName ?? "", paidBy: person?.fullName ?? "", personToReimburseId: editing.personToReimburseId || person?.id, personToReimburseName: editing.personToReimburseName || person?.fullName });
              }}><option value="">Select person</option>{peopleOptions.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Person ID<input className="mt-1 w-full rounded border border-black/10 bg-zinc-100 px-3 py-2 text-ink" readOnly value={editing.paidByPersonId ?? ""} /></label>
              <label className="text-sm font-medium text-steel xl:col-span-2">Expense Purpose<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" placeholder="Workshop lunch, referee transport, hotel accommodation..." value={editing.expensePurpose ?? ""} onChange={(event) => setEditing({ ...editing, expensePurpose: event.target.value })} /></label>
              <label className="text-sm font-medium text-steel">Cost Center<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.costCenterId ?? ""} onChange={(event) => {
                const costCenter = costCenterOptions.find((item) => item.id === event.target.value);
                setEditing({ ...editing, costCenterId: costCenter?.id, costCenter: costCenter?.name ?? "General Operations" });
              }}><option value="">General Operations</option>{costCenterOptions.map((costCenter) => <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Linked Event<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.linkedEventId ?? ""} onChange={(event) => {
                const linkedEvent = events.find((item) => item.id === event.target.value);
                setEditing({ ...editing, linkedEventId: linkedEvent?.id, linkedEventName: linkedEvent?.eventName ?? "", event: linkedEvent?.eventName ?? "General Operations" });
              }}><option value="">No event</option>{events.map((eventRecord) => <option key={eventRecord.id} value={eventRecord.id}>{eventRecord.eventName}</option>)}</select></label>
              <label className="flex items-center justify-between rounded border border-black/10 bg-[#f7f7f5] px-4 py-3 text-sm font-medium text-steel">Reimbursable<input checked={editing.reimbursable} className="h-5 w-5 accent-gold" onChange={(event) => setEditing({ ...editing, reimbursable: event.target.checked })} type="checkbox" /></label>
              <label className="text-sm font-medium text-steel">Person To Reimburse<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink disabled:bg-zinc-100" disabled={!editing.reimbursable} value={editing.personToReimburseId ?? ""} onChange={(event) => {
                const person = peopleOptions.find((item) => item.id === event.target.value);
                setEditing({ ...editing, personToReimburseId: person?.id, personToReimburseName: person?.fullName ?? "" });
              }}><option value="">Select person</option>{peopleOptions.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Payment Method<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.paymentMethod} onChange={(event) => setEditing({ ...editing, paymentMethod: event.target.value })}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
              <label className="text-sm font-medium text-steel">Receipt File / Proof Upload<input accept="image/*,application/pdf" className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setEditing({ ...editing, fileName: file.name, sourceFileName: file.name, fileType: file.type || "local file", fileUrl: URL.createObjectURL(file), ocrStatus: "Uploaded" });
              }} type="file" /><span className="mt-1 block text-xs text-steel">{editing.fileName || "No proof uploaded"}</span></label>
              <label className="text-sm font-medium text-steel md:col-span-2 xl:col-span-3">Notes<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} /></label>

              <details className="rounded border border-black/10 bg-[#f7f7f5] p-4 md:col-span-2 xl:col-span-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink"><ChevronDown className="h-4 w-4" />Secondary details</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm font-medium text-steel">Category<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.suggestedCategory} onChange={(event) => setEditing({ ...editing, suggestedCategory: event.target.value as ReceiptIntake["suggestedCategory"] })}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label className="text-sm font-medium text-steel">Reference number<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.referenceNumber ?? ""} onChange={(event) => setEditing({ ...editing, referenceNumber: event.target.value })} /></label>
                  <label className="text-sm font-medium text-steel">VAT / TRN<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.vatTrn ?? ""} onChange={(event) => setEditing({ ...editing, vatTrn: event.target.value })} /></label>
                  <label className="text-sm font-medium text-steel">OCR confidence<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.confidenceLevel ?? "Manual Review Required"} onChange={(event) => setEditing({ ...editing, confidenceLevel: event.target.value as ReceiptIntake["confidenceLevel"] })}>{["High", "Medium", "Low", "Manual Review Required"].map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                  <label className="flex items-center justify-between rounded border border-black/10 bg-white px-4 py-3 text-sm font-medium text-steel">Mapping reviewed<input checked={Boolean(editing.mappingReviewed)} className="h-5 w-5 accent-gold" onChange={(event) => setEditing({ ...editing, mappingReviewed: event.target.checked, ocrStatus: event.target.checked ? "Ready To Convert Receipt" : editing.ocrStatus })} type="checkbox" /></label>
                  <label className="text-sm font-medium text-steel">Processing status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as ReceiptIntake["status"] })}>{statuses.map((status) => <option key={status} value={status}>{displayReceiptStatus(status)}</option>)}</select></label>
                  <label className="text-sm font-medium text-steel md:col-span-2 xl:col-span-3">OCR raw text / manual paste<textarea className="mt-1 min-h-28 w-full rounded border border-black/10 px-3 py-2 font-mono text-sm text-ink" value={editing.extractedRawText ?? ""} onChange={(event) => applyExtractedReceiptText(event.target.value)} /></label>
                  {receipts.some((receipt) => receipt.id === editing.id) ? <div className="md:col-span-2 xl:col-span-3"><InternalNotesPanel module="Receipt Intake" recordId={editing.id} notes={editing.noteHistory} /></div> : null}
                </div>
              </details>
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

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-black/10 bg-white p-4 shadow-soft">
      <p className="text-sm text-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
