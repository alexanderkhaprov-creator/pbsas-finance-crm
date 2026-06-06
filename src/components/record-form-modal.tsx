"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

export type RecordField<T> = {
  key: keyof T;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select";
  options?: string[];
};

export function RecordFormModal<T extends { id: string }>({
  title,
  record,
  fields,
  onClose,
  onSubmit,
  children
}: {
  title: string;
  record: T;
  fields: RecordField<T>[];
  onClose: () => void;
  onSubmit: (record: T) => void | Promise<void>;
  children?: ReactNode;
}) {
  const [form, setForm] = useState<T>(record);

  function setValue(field: keyof T, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form className="w-full max-w-3xl rounded border border-black/10 bg-white shadow-soft" onSubmit={handleSubmit}>
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {fields.map((field) => {
            const value = String(form[field.key] ?? "");
            if (field.type === "textarea") {
              return (
                <label className="text-sm font-medium text-steel md:col-span-2" key={String(field.key)}>
                  {field.label}
                  <textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={value} onChange={(event) => setValue(field.key, event.target.value)} />
                </label>
              );
            }

            if (field.type === "select") {
              return (
                <label className="text-sm font-medium text-steel" key={String(field.key)}>
                  {field.label}
                  <select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={value} onChange={(event) => setValue(field.key, event.target.value)}>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            return (
              <label className="text-sm font-medium text-steel" key={String(field.key)}>
                {field.label}
                <input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type={field.type ?? "text"} value={value} onChange={(event) => setValue(field.key, event.target.value)} />
              </label>
            );
          })}
        </div>
        {children ? <div className="border-t border-black/10 p-5">{children}</div> : null}
        <div className="flex justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
