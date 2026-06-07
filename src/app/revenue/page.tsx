"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLicenseRevenueSummary } from "@/lib/license-revenue";
import { parseMoneyInput } from "@/lib/money-utils";
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
  const { events, costCenters, documents, revenues, licenseApplications, addRevenue, updateRevenue, deleteRevenue } = useFinanceData();
  const [editing, setEditing] = useState<Revenue | null>(null);
  const eventNames = events.map((event) => event.eventName);
  const costCenterNames = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => costCenter.name);
  const licenseRevenue = getLicenseRevenueSummary(licenseApplications);

  return (
    <>
      <PageHeader title="Revenue" description="Future-ready revenue register for sponsorship, ticketing, invoices, and event income." />
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Auto-Calculated License Revenue</h3>
        <p className="mt-1 text-sm text-steel">Calculated from confirmed paid license applications. Manual revenue records remain separate.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SummaryCard label="Total license revenue" value={formatCurrency(licenseRevenue.totalRevenue)} detail={`${licenseRevenue.paidApplications.length} paid applications`} />
          <div className="rounded border border-black/10 bg-[#f7f7f5] p-4 lg:col-span-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-steel">By paid-to destination</h4>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {["UAE Boxing Federation", "UAE Athletic Commission", "PBSAS", "Other"].map((destination) => (
                <div className="flex items-center justify-between gap-3 rounded bg-white px-3 py-2 text-sm" key={destination}>
                  <span className="text-steel">{destination}</span>
                  <span className="font-semibold text-ink">{formatCurrency(licenseRevenue.byPaidTo[destination] ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["License category", "Paid applications", "Average fee", "Total income"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {licenseRevenue.byCategory.map((row) => (
                <tr key={row.category}>
                  <td className="px-4 py-4 font-medium text-ink">{row.category}</td>
                  <td className="px-4 py-4 text-steel">{row.paidCount}</td>
                  <td className="px-4 py-4 text-steel">{formatCurrency(row.feeAmount)}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(row.totalIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
            const normalized = { ...revenue, amount: typeof revenue.amount === "number" ? revenue.amount : parseMoneyInput(String(revenue.amount)) };
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

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-4">
      <p className="text-sm text-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-steel">{detail}</p>
    </div>
  );
}
