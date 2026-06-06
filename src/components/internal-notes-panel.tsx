"use client";

import { useState } from "react";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatDate } from "@/lib/format";
import type { InternalNote } from "@/types";

type InternalNotesPanelProps = {
  module: "Expenses" | "Reimbursements" | "Cost Centers" | "Receipt Intake";
  recordId: string;
  notes?: InternalNote[];
};

export function InternalNotesPanel({ module, recordId, notes = [] }: InternalNotesPanelProps) {
  const { people, addInternalNote } = useFinanceData();
  const [author, setAuthor] = useState(people[0]?.fullName ?? "Local User");
  const [text, setText] = useState("");

  if (!recordId) return null;

  return (
    <section className="rounded border border-black/10 bg-[#f7f7f5] p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Internal Note History</h4>
      <div className="mt-3 grid gap-2 md:grid-cols-[220px_1fr_auto]">
        <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={author} onChange={(event) => setAuthor(event.target.value)}>
          {people.map((person) => <option key={person.id} value={person.fullName}>{person.fullName}</option>)}
        </select>
        <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={text} onChange={(event) => setText(event.target.value)} placeholder="Add timestamped internal note" />
        <button
          className="rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite"
          onClick={() => {
            if (!text.trim()) return;
            addInternalNote(module, recordId, { author, text: text.trim() });
            setText("");
          }}
          type="button"
        >
          Add note
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {notes.length ? notes.map((note) => (
          <div className="rounded border border-black/10 bg-white p-3 text-sm" key={note.id}>
            <p className="font-medium text-ink">{note.author} · {formatDate(note.timestamp)} {note.timestamp.slice(11, 16)}</p>
            <p className="mt-1 text-steel">{note.text}</p>
          </div>
        )) : <p className="text-sm text-steel">No internal note history yet.</p>}
      </div>
    </section>
  );
}
