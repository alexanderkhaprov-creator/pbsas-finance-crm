"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatCurrency } from "@/lib/format";
import type { LicenseApplication } from "@/types";

const draftStorageKey = "pbsas_pending_license_application_draft_v1";

function readDraft() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(draftStorageKey);
  return raw ? JSON.parse(raw) as Partial<LicenseApplication> : null;
}

export default function PaymentInstructionsPage() {
  const router = useRouter();
  const { paymentSettings, addAuditLog } = useFinanceData();
  const [draft] = useState<Partial<LicenseApplication> | null>(() => readDraft());
  const amount = draft?.invoiceAmount ?? draft?.amountDue ?? 0;
  const currency = draft?.invoiceCurrency ?? draft?.currency ?? paymentSettings.accountCurrency;

  const reference = useMemo(() => draft?.invoiceNumber || `${draft?.applicantFullName ?? "Applicant"}-${draft?.licenseCategory ?? "License"}`, [draft]);

  function continueToPayment() {
    if (!draft) return;
    addAuditLog({
      module: "License Applications",
      recordId: draft.id || "DRAFT",
      recordLabel: draft.applicantFullName ?? "Online application draft",
      action: "Payment Instructions Viewed",
      changedBy: "Applicant",
      previousValueSummary: "",
      newValueSummary: `Amount: ${currency} ${amount}; Reference: ${reference}`,
      notes: "Applicant viewed payment instructions and continued to payment submission."
    });
    router.push("/payment-submission");
  }

  return (
    <>
      <PageHeader title="Payment Instructions" description="Review payment details before submitting payment proof." />
      {!draft ? (
        <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
          <p className="text-sm text-steel">No pending application draft was found.</p>
          <Link className="mt-4 inline-flex rounded bg-ink px-4 py-2 text-sm font-semibold text-white" href="/license-application-form">Start Application</Link>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
            <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Payment details are shown from local settings. Confirm the official bank account before requesting or sending operational funds.
            </div>
            <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <Info label="Applicant" value={draft.applicantFullName ?? ""} />
              <Info label="License Category" value={draft.licenseCategory ?? ""} />
              <Info label="Amount Due" value={formatCurrency(amount, currency)} />
              <Info label="Payment Reference" value={reference} />
              <Info label="Bank Name" value={paymentSettings.bankName} />
              <Info label="Account Name" value={paymentSettings.accountName} />
              <Info label="IBAN" value={paymentSettings.iban} />
              <Info label="SWIFT" value={paymentSettings.swift} />
              <Info label="Account Currency" value={paymentSettings.accountCurrency} />
              <Info label="Additional Instructions" value={paymentSettings.additionalInstructions} wide />
            </dl>
            <div className="mt-6 flex justify-end">
              <button className="rounded bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-black" onClick={continueToPayment}>Continue to Payment Submission</button>
            </div>
          </section>
          <aside className="rounded border border-black/10 bg-white p-5 shadow-soft">
            <h2 className="text-base font-semibold text-ink">Payment Gate</h2>
            <p className="mt-3 text-sm text-steel">The application will not enter Chief Review until payment is marked Paid or Waived by an administrator.</p>
            <p className="mt-4 text-sm text-steel">Next status after proof submission: <span className="font-semibold text-ink">Awaiting Payment Verification</span></p>
          </aside>
        </div>
      )}
    </>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-steel">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value || "Not provided"}</dd>
    </div>
  );
}
