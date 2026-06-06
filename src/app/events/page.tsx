"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import type { Event } from "@/types";

const emptyEvent: Event = {
  id: "",
  eventName: "",
  eventType: "",
  location: "",
  startDate: "",
  endDate: "",
  status: "Planning"
};

export default function EventsPage() {
  const { events, documents, addEvent, updateEvent, deleteEvent } = useFinanceData();
  const [editing, setEditing] = useState<Event | null>(null);

  return (
    <>
      <PageHeader title="Events" description="Event register for fights, title events, commission operations, and related projects." />
      <DataTable
        addLabel="Add event"
        columns={[
          { key: "eventName", header: "Event name", render: (row) => <span className="font-medium text-ink">{row.eventName}</span> },
          { key: "eventType", header: "Event type", render: (row) => row.eventType },
          { key: "location", header: "Location", render: (row) => row.location },
          { key: "startDate", header: "Start date", render: (row) => formatDate(row.startDate) },
          { key: "endDate", header: "End date", render: (row) => formatDate(row.endDate) },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "documents", header: "Documents", render: (row) => documents.filter((document) => document.linkedModule === "Event" && document.linkedRecordId === row.id).length }
        ]}
        filters={[
          { key: "status", label: "Status", options: [...new Set(events.map((event) => event.status))], getValue: (row) => row.status },
          { key: "eventType", label: "Event type", options: [...new Set(events.map((event) => event.eventType))], getValue: (row) => row.eventType }
        ]}
        getSearchText={(row) => Object.values(row).join(" ")}
        onAdd={() => setEditing(emptyEvent)}
        onDelete={(row) => void deleteEvent(row)}
        onEdit={(row) => setEditing(row)}
        rows={events}
        searchPlaceholder="Search events by name, type, location, or status"
      />
      {editing ? (
        <RecordFormModal
          fields={[
            { key: "eventName", label: "Event name" },
            { key: "eventType", label: "Event type" },
            { key: "location", label: "Location" },
            { key: "startDate", label: "Start date", type: "date" },
            { key: "endDate", label: "End date", type: "date" },
            { key: "status", label: "Status", type: "select", options: ["Planning", "Confirmed", "Completed", "Cancelled"] }
          ]}
          onClose={() => setEditing(null)}
          onSubmit={async (event) => {
            if (event.id) {
              await updateEvent(event);
            } else {
              await addEvent(event);
            }
            setEditing(null);
          }}
          record={editing}
          title={editing.id ? "Edit event" : "Add event"}
        />
      ) : null}
    </>
  );
}
