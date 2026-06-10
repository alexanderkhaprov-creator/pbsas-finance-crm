"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { formatCurrency, formatDate } from "@/lib/format";
import { getFinancialReporting } from "@/lib/financial-reporting";
import { getLicenseRevenueSummary } from "@/lib/license-revenue";
import { parseMoneyInput } from "@/lib/money-utils";
import { currencies, expenseLinkTypes, revenueCategories } from "@/lib/options";
import type { Revenue } from "@/types";

const emptyRevenue: Revenue = {
  id: "",
  revenueDate: new Date().toISOString().slice(0, 10),
  event: "",
  linkType: "Event",
  costCenterId: "",
  costCenter: "",
  revenueCategory: "Other Revenue",
  source: "",
  amount: 0,
  expectedRevenue: 0,
  receivedRevenue: 0,
  outstandingRevenue: 0,
  currency: "AED",
  paymentMethod: "",
  invoiceReference: "",
  notes: ""
};

export default function RevenuePage() {
  const { events, expenses, costCenters, documents, revenues, licenseApplications, addRevenue, updateRevenue, deleteRevenue } = useFinanceData();
  const [editing, setEditing] = useState<Revenue | null>(null);
  const eventNames = events.map((event) => event.eventName);
  const costCenterNames = costCenters.filter((costCenter) => costCenter.status !== "Archived").map((costCenter) => costCenter.name);
  const licenseRevenue = getLicenseRevenueSummary(licenseApplications);
  const financialReporting = getFinancialReporting({ expenses, revenues, licenseApplications });

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
                  <span className="min-w-0 overflow-hidden whitespace-nowrap text-[clamp(0.8rem,1vw,1rem)] font-semibold text-ink tabular-nums">{formatCurrency(licenseRevenue.byPaidTo[destination] ?? 0)}</span>
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
      <section className="mb-6 rounded border border-black/10 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-ink">Revenue Receivables</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Expected Revenue" value={formatCurrency(financialReporting.expectedRevenue)} detail="Invoices and manual expected revenue" />
          <SummaryCard label="Received Revenue" value={formatCurrency(financialReporting.receivedRevenue)} detail="Confirmed collections" />
          <SummaryCard label="Outstanding Revenue" value={formatCurrency(financialReporting.outstandingRevenue)} detail="Expected minus received" />
          <SummaryCard label="Collection Rate" value={`${financialReporting.collectionRate.toFixed(1)}%`} detail="Received / expected" />
          <SummaryCard label="Net Position" value={formatCurrency(financialReporting.netPosition)} detail={financialReporting.netPosition >= 0 ? "Net surplus" : "Net deficit"} />
        </div>
      </section>
      <DataTable
        addLabel="Add revenue"
        columns={[
          { key: "revenueDate", header: "Revenue date", render: (row) => formatDate(row.revenueDate) },
          { key: "event", header: "Event", render: (row) => <span className="font-medium text-ink">{row.event}</span> },
          { key: "costCenter", header: "Cost center", render: (row) => row.costCenter || "No cost center" },
          { key: "linkType", header: "Operational link", render: (row) => row.linkType ?? "Event" },
          { key: "revenueCategory", header: "Category", render: (row) => row.revenueCategory || "Other Revenue" },
          { key: "source", header: "Source", render: (row) => row.source },
          { key: "expectedRevenue", header: "Expected", render: (row) => formatCurrency(row.expectedRevenue ?? row.amount, row.currency) },
          { key: "receivedRevenue", header: "Received", render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.receivedRevenue ?? row.amount, row.currency)}</span> },
          { key: "outstandingRevenue", header: "Outstanding", render: (row) => formatCurrency(row.outstandingRevenue ?? Math.max(0, (row.expectedRevenue ?? row.amount) - (row.receivedRevenue ?? row.amount)), row.currency) },
          { key: "currency", header: "Currency", render: (row) => row.currency },
          { key: "paymentMethod", header: "Payment method", render: (row) => row.paymentMethod },
          { key: "invoiceReference", header: "Invoice reference", render: (row) => row.invoiceReference },
          { key: "documents", header: "Documents", render: (row) => documents.filter((document) => document.linkedModule === "Revenue" && document.linkedRecordId === row.id).length },
          { key: "notes", header: "Notes", render: (row) => row.notes }
        ]}
        filters={[
          { key: "event", label: "Event", options: eventNames, getValue: (row) => row.event },
          { key: "costCenter", label: "Cost center", options: costCenterNames, getValue: (row) => row.costCenter ?? "" },
          { key: "revenueCategory", label: "Category", options: revenueCategories, getValue: (row) => row.revenueCategory ?? "Other Revenue" },
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
            { key: "revenueCategory", label: "Revenue category", type: "select", options: revenueCategories },
            { key: "source", label: "Source" },
            { key: "expectedRevenue", label: "Expected Revenue", type: "number" },
            { key: "receivedRevenue", label: "Received Revenue", type: "number" },
            { key: "currency", label: "Currency", type: "select", options: currencies },
            { key: "paymentMethod", label: "Payment method" },
            { key: "invoiceReference", label: "Invoice reference" },
            { key: "notes", label: "Notes", type: "textarea" }
          ]}
          onClose={() => setEditing(null)}
          onSubmit={async (revenue) => {
            const expectedRevenue = typeof revenue.expectedRevenue === "number" ? revenue.expectedRevenue : parseMoneyInput(String(revenue.expectedRevenue ?? revenue.amount));
            const receivedRevenue = typeof revenue.receivedRevenue === "number" ? revenue.receivedRevenue : parseMoneyInput(String(revenue.receivedRevenue ?? revenue.amount));
            const normalized = {
              ...revenue,
              amount: receivedRevenue,
              expectedRevenue,
              receivedRevenue,
              outstandingRevenue: Math.max(0, expectedRevenue - receivedRevenue)
            };
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
    <div className="min-w-0 overflow-hidden rounded border border-black/10 bg-[#f7f7f5] p-4">
      <p className="min-w-0 break-words text-sm text-steel">{label}</p>
      <p className="mt-2 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(0.8rem,1vw,1.5rem)] font-semibold leading-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1 min-w-0 break-words text-xs text-steel">{detail}</p>
    </div>
  );
}
