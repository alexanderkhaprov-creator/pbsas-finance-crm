"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useFinanceData } from "@/components/finance-data-provider";
import type { StampSettings } from "@/types";

export default function StampSettingsPage() {
  const { stampSettings, updateStampSettings } = useFinanceData();
  const [form, setForm] = useState<StampSettings>(stampSettings);
  const [message, setMessage] = useState("");

  function save() {
    updateStampSettings(form);
    setMessage("Stamp settings saved locally.");
  }

  return (
    <>
      <PageHeader title="Stamp Settings" description="Control whether approved UAEAC licenses can be finalized as stamped and issued." />
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
      <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-steel">Stamp Available<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.stampAvailable} onChange={(event) => setForm((current) => ({ ...current, stampAvailable: event.target.value as StampSettings["stampAvailable"] }))}><option value="No">No</option><option value="Yes">Yes</option></select></label>
          <Input label="Stamp Name / Label" value={form.stampName} onChange={(value) => setForm((current) => ({ ...current, stampName: value }))} />
          <Input label="Stamp Image Placeholder / Filename" value={form.stampImageFileName} onChange={(value) => setForm((current) => ({ ...current, stampImageFileName: value }))} />
          <Input label="Default Stamped By" value={form.defaultStampedBy} onChange={(value) => setForm((current) => ({ ...current, defaultStampedBy: value }))} />
          <label className="text-sm font-medium text-steel md:col-span-2">Stamp Notes<textarea className="mt-1 min-h-28 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.stampNotes} onChange={(event) => setForm((current) => ({ ...current, stampNotes: event.target.value }))} /></label>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black" onClick={save}>Save Stamp Settings</button>
        </div>
      </section>
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium text-steel">{label}<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
