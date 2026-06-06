"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatCurrency } from "@/lib/format";
import type { LicenseApplication, LicensePaymentMethod } from "@/types";

const draftStorageKey = "pbsas_pending_license_application_draft_v1";

function readDraft() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(draftStorageKey);
  return raw ? JSON.parse(raw) as Partial<LicenseApplication> : null;
}

export default function PaymentSubmissionPage() {
  const { addLicenseApplication } = useFinanceData();
  const [draft, setDraft] = useState<Partial<LicenseApplication> | null>(() => readDraft());
  const [paymentMethod, setPaymentMethod] = useState<LicensePaymentMethod>("Bank Transfer");
  const [amountPaid, setAmountPaid] = useState(() => String(readDraft()?.amountDue ?? ""));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofFileName, setPaymentProofFileName] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
    if (!draft) return;
    if (!amountPaid || !paymentDate || !paymentReference.trim() || !paymentProofFileName.trim()) {
      setMessage("Payment method, amount, date, reference number, and payment proof are required.");
      return;
    }
    const now = new Date().toISOString();
    const saved = await addLicenseApplication({
      ...draft,
      paymentMethod,
      amountPaid: Number(amountPaid),
      totalFeesPaid: Number(amountPaid),
      paymentDate,
      paymentReference,
      paymentProofFileName,
      paymentStatus: "Payment Submitted",
      reviewStatus: "Awaiting Payment Verification",
      licenseStatus: "Awaiting Payment",
      paymentNotes: `Payment proof submitted: ${paymentProofFileName}`,
      completionChecklist: {
        photoReceived: Boolean(draft.applicantPhotoFileName),
        identificationProvided: Boolean(draft.passportNumber || draft.nationalIdNumber || draft.identificationNumber),
        applicationFormReceived: Boolean(draft.applicationScanFileName),
        medicalReceived: Boolean(draft.documentChecklistSnapshot?.some((item) => item.documentName.toLowerCase().includes("medical") && (item.received || item.verificationStatus === "Received" || item.verificationStatus === "Verified"))),
        paymentReceived: true,
        chiefReviewComplete: false,
        stampComplete: false
      },
      updatedAt: now
    } as LicenseApplication);
    window.localStorage.removeItem(draftStorageKey);
    setDraft(null);
    setMessage(`${saved.id} created with LIN ${saved.licenseIssueNumber}. Payment proof is awaiting verification.`);
  }

  return (
    <>
      <PageHeader title="Payment Submission" description="Submit payment details and proof for the pending license application." />
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</div> : null}
      {!draft ? (
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <p className="text-sm text-steel">No pending application draft is available.</p>
          <Link className="mt-4 inline-flex rounded bg-ink px-4 py-2 text-sm font-semibold text-white" href="/license-application-form">Start Application</Link>
        </section>
      ) : (
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <Summary label="Applicant" value={draft.applicantFullName ?? ""} />
            <Summary label="Category" value={draft.licenseCategory ?? ""} />
            <Summary label="Amount Due" value={formatCurrency(draft.amountDue ?? 0, draft.currency ?? "AED")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-steel">
              Payment Method
              <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as LicensePaymentMethod)}>
                {["Bank Transfer", "Cash", "Other"].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            <Input label="Amount Paid" type="number" value={amountPaid} onChange={setAmountPaid} />
            <Input label="Payment Date" type="date" value={paymentDate} onChange={setPaymentDate} />
            <Input label="Reference Number" value={paymentReference} onChange={setPaymentReference} />
            <label className="text-sm font-medium text-steel md:col-span-2">
              Payment Proof
              <input accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="file" onChange={(event) => setPaymentProofFileName(event.target.files?.[0]?.name ?? "")} />
              <span className={`mt-1 inline-flex rounded border px-2 py-1 text-xs ${paymentProofFileName ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                {paymentProofFileName ? `Uploaded: ${paymentProofFileName}` : "No proof uploaded"}
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="rounded bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-black" onClick={() => void submit()}>Submit Payment Proof</button>
          </div>
        </section>
      )}
    </>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm font-medium text-steel">
      {label}
      <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value || "Not provided"}</p>
    </div>
  );
}
