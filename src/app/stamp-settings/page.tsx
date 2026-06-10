"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useFinanceData } from "@/components/finance-data-provider";
import { stampPositions, stampSizes } from "@/lib/options";
import type { StampSettings } from "@/types";

const officialStampDefaults: Pick<StampSettings, "stampAvailable" | "stampName" | "stampImageFileName" | "stampDisplayLabel" | "stampPositionDefault" | "stampSize" | "defaultStampTitle" | "stampNotes"> = {
  stampAvailable: "Yes",
  stampName: "UAEAC Red Official Stamp",
  stampImageFileName: "/uaeac-stamp-red.jpeg",
  stampDisplayLabel: "Red Official UAEAC Stamp",
  stampPositionDefault: "Bottom Right",
  stampSize: "Medium",
  defaultStampTitle: "UAE Athletic Commission",
  stampNotes: "Red Official UAEAC Stamp"
};

export default function StampSettingsPage() {
  const { stampSettings, updateStampSettings } = useFinanceData();
  const [form, setForm] = useState<StampSettings>({
    ...officialStampDefaults,
    ...stampSettings,
    stampAvailable: stampSettings.stampAvailable || officialStampDefaults.stampAvailable,
    stampName: stampSettings.stampName || officialStampDefaults.stampName,
    stampImageFileName: stampSettings.stampImageFileName || officialStampDefaults.stampImageFileName,
    stampDisplayLabel: stampSettings.stampDisplayLabel || officialStampDefaults.stampDisplayLabel,
    stampNotes: stampSettings.stampNotes || officialStampDefaults.stampNotes
  });
  const [message, setMessage] = useState("");

  function save() {
    updateStampSettings(form);
    setMessage("Stamp settings saved locally.");
  }

  return (
    <>
      <PageHeader title="Stamp Settings" description="Control whether approved UAEAC documents can be certified, stamped, and officially issued." />
      {message ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
      <section className="rounded border border-black/10 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-steel">Stamp Available<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.stampAvailable} onChange={(event) => setForm((current) => ({ ...current, stampAvailable: event.target.value as StampSettings["stampAvailable"] }))}><option value="No">No</option><option value="Yes">Yes</option></select></label>
          <Input label="Stamp Name / Label" value={form.stampName} onChange={(value) => setForm((current) => ({ ...current, stampName: value }))} />
          <Input label="Stamp Color / Display Label" value={form.stampDisplayLabel ?? ""} onChange={(value) => setForm((current) => ({ ...current, stampDisplayLabel: value }))} />
          <Input label="Stamp Image Upload Placeholder / Filename" value={form.stampImageFileName} onChange={(value) => setForm((current) => ({ ...current, stampImageFileName: value }))} />
          <label className="text-sm font-medium text-steel">Stamp Position Default<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.stampPositionDefault ?? "Bottom Right"} onChange={(event) => setForm((current) => ({ ...current, stampPositionDefault: event.target.value as StampSettings["stampPositionDefault"] }))}>{stampPositions.map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Stamp Size<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.stampSize ?? "Medium"} onChange={(event) => setForm((current) => ({ ...current, stampSize: event.target.value as StampSettings["stampSize"] }))}>{stampSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <Input label="Default Stamped By" value={form.defaultStampedBy} onChange={(value) => setForm((current) => ({ ...current, defaultStampedBy: value }))} />
          <Input label="Default Stamp Title" value={form.defaultStampTitle ?? ""} onChange={(value) => setForm((current) => ({ ...current, defaultStampTitle: value }))} />
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
