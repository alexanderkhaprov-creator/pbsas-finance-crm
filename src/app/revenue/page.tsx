"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { formatCurrency, formatDate } from "@/lib/format";
import { currencies, expenseLinkTypes } from "@/lib/options";
import type { Revenue } from "@/types";

const emptyRevenue: Revenue = {
  id: "",
  revenueDate: new Date().toISOString().slice(0, 10),
  event: "",
  linkType: "Event",
  costCenterId: "",
  costCenter: "",
  source: "",
  amount: 0,
  currency: "AED",
  paymentMethod: "",
  invoiceReference: "",
  notes: ""
};

export default function RevenuePage() {
  const { events, costCenters, documents, revenues, addRevenue, updateRevenue, deleteRevenue } = useFinanceData();
  const [editing, setEditing] = useState<Revenue | null>(null);
  const eventNames = events.map((event) => event.eventName);
  const costCenterNames = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => costCenter.name);

  return (
    <>
      <PageHeader title="Revenue" description="Future-ready revenue register for sponsorship, ticketing, invoices, and event income." />
      <DataTable
        addLabel="Add revenue"
        columns={[
          { key: "revenueDate", header: "Revenue date", render: (row) => formatDate(row.revenueDate) },
          { key: "event", header: "Event", render: (row) => <span className="font-medium text-ink">{row.event}</span> },
          { key: "costCenter", header: "Cost center", render: (row) => row.costCenter || "No cost center" },
          { key: "linkType", header: "Operational link", render: (row) => row.linkType ?? "Event" },
          { key: "source", header: "Source", render: (row) => row.source },
          { key: "amount", header: "Amount", render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.amount, row.currency)}</span> },
          { key: "currency", header: "Currency", render: (row) => row.currency },
          { key: "paymentMethod", header: "Payment method", render: (row) => row.paymentMethod },
          { key: "invoiceReference", header: "Invoice reference", render: (row) => row.invoiceReference },
          { key: "documents", header: "Documents", render: (row) => documents.filter((document) => document.linkedModule === "Revenue" && document.linkedRecordId === row.id).length },
          { key: "notes", header: "Notes", render: (row) => row.notes }
        ]}
        filters={[
          { key: "event", label: "Event", options: eventNames, getValue: (row) => row.event },
          { key: "costCenter", label: "Cost center", options: costCenterNames, getValue: (row) => row.costCenter ?? "" },
          { key: "source", label: "Source", options: [...new Set(revenues.map((item) => item.source))], getValue: (row) => row.source }
        ]}
        getSearchText={(row) => Object.values(row).join(" ")}
        onAdd={() => setEditing({ ...emptyRevenue, event: eventNames[0] ?? "" })}
        onDelete={(row) => void deleteRevenue(row)}
        onEdit={(row) => setEditing(row)}
        rows={revenues}
        searchPlaceholder="Search revenue by event, source, invoice, payment method, or notes"
      />
      {editing ? (
        <RecordFormModal
          fields={[
            { key: "revenueDate", label: "Revenue date", type: "date" },
            { key: "event", label: "Event", type: "select", options: eventNames },
            { key: "costCenter", label: "Cost center", type: "select", options: costCenterNames },
            { key: "linkType", label: "Operational link", type: "select", options: expenseLinkTypes },
            { key: "source", label: "Source" },
            { key: "amount", label: "Amount", type: "number" },
            { key: "currency", label: "Currency", type: "select", options: currencies },
            { key: "paymentMethod", label: "Payment method" },
            { key: "invoiceReference", label: "Invoice reference" },
            { key: "notes", label: "Notes", type: "textarea" }
          ]}
          onClose={() => setEditing(null)}
          onSubmit={async (revenue) => {
            const normalized = { ...revenue, amount: Number(revenue.amount) };
            if (normalized.id) {
              await updateRevenue(normalized);
            } else {
              await addRevenue(normalized);
            }
            setEditing(null);
          }}
          record={editing}
          title={editing.id ? "Edit revenue" : "Add revenue"}
        />
      ) : null}
    </>
  );
}
