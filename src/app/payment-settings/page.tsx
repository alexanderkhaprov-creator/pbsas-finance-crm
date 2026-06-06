"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useFinanceData } from "@/components/finance-data-provider";
import { currencies } from "@/lib/options";
import type { CurrencyCode, PaymentSettings } from "@/types";

export default function PaymentSettingsPage() {
  const { paymentSettings, updatePaymentSettings } = useFinanceData();
  const [form, setForm] = useState<PaymentSettings>(paymentSettings);
  const [message, setMessage] = useState("");

  function save() {
    updatePaymentSettings(form);
    setMessage("Payment instructions updated locally.");
  }

  return (
    <>
      <PageHeader title="Payment Settings" description="Local payment instruction settings for UAE Athletic Commission license applications." />
      <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        These details are local placeholders. Verify official bank instructions before using them for operational payment requests.
      </div>
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</div> : null}
      <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Bank Name" value={form.bankName} onChange={(value) => setForm((current) => ({ ...current, bankName: value }))} />
          <Input label="Account Name" value={form.accountName} onChange={(value) => setForm((current) => ({ ...current, accountName: value }))} />
          <Input label="IBAN" value={form.iban} onChange={(value) => setForm((current) => ({ ...current, iban: value }))} />
          <Input label="SWIFT" value={form.swift} onChange={(value) => setForm((current) => ({ ...current, swift: value }))} />
          <label className="text-sm font-medium text-steel">
            Account Currency
            <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.accountCurrency} onChange={(event) => setForm((current) => ({ ...current, accountCurrency: event.target.value as CurrencyCode }))}>
              {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-steel md:col-span-2">
            Additional Instructions
            <textarea className="mt-1 min-h-28 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.additionalInstructions} onChange={(event) => setForm((current) => ({ ...current, additionalInstructions: event.target.value }))} />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black" onClick={save}>Save Payment Settings</button>
        </div>
      </section>
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-steel">
      {label}
      <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
