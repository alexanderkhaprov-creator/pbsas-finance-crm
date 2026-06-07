"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { InternalNotesPanel } from "@/components/internal-notes-panel";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import { parseMoneyInput } from "@/lib/money-utils";
import { costCenterTypes, currencies } from "@/lib/options";
import type { CostCenter } from "@/types";

const emptyCostCenter: CostCenter = {
  id: "",
  name: "",
  type: "General Admin",
  owner: "",
  status: "Active",
  budgetAmount: 0,
  currency: "AED",
  notes: ""
};

export default function CostCentersPage() {
  const { documents, costCenters, addCostCenter, updateCostCenter, deleteCostCenter, archiveCostCenter } = useFinanceData();
  const [editing, setEditing] = useState<CostCenter | null>(null);

  return (
    <>
      <PageHeader title="Cost Centers" description="Budget ownership and operational tracking for events, workshops, federation work, and administration." />
      <DataTable
        addLabel="Add cost center"
        columns={[
          { key: "id", header: "Cost Center ID", render: (row) => <span className="font-medium text-ink">{row.id}</span> },
          { key: "name", header: "Name", render: (row) => <span className="font-medium text-ink">{row.name}</span> },
          { key: "type", header: "Type", render: (row) => row.type },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "budgetAmount", header: "Budget", render: (row) => row.budgetAmount > 0 ? <span className="font-semibold text-ink">{formatCurrency(row.budgetAmount, row.currency)}</span> : <span className="text-steel">Open-ended</span> },
          { key: "documents", header: "Documents", render: (row) => documents.filter((document) => document.linkedModule === "Cost Center" && document.linkedRecordId === row.id).length },
          { key: "notes", header: "Notes", render: (row) => row.notes },
          {
            key: "archive",
            header: "Archive",
            render: (row) => (
              <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => void archiveCostCenter(row)}>
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            )
          }
        ]}
        filters={[
          { key: "type", label: "Type", options: costCenterTypes, getValue: (row) => row.type },
          { key: "status", label: "Status", options: ["Active", "Closed", "Archived"], getValue: (row) => row.status }
        ]}
        getSearchText={(row) => Object.values(row).join(" ")}
        onAdd={() => setEditing({ ...emptyCostCenter })}
        onDelete={(row) => void deleteCostCenter(row)}
        onEdit={(row) => setEditing(row)}
        rows={costCenters}
        searchPlaceholder="Search cost centers by ID, name, owner, type, status, or notes"
      />
      {editing ? (
        <RecordFormModal
          fields={[
            { key: "name", label: "Name" },
            { key: "type", label: "Type", type: "select", options: costCenterTypes },
            { key: "status", label: "Status", type: "select", options: ["Active", "Closed", "Archived"] },
            { key: "budgetAmount", label: "Budget amount", type: "number" },
            { key: "currency", label: "Currency", type: "select", options: currencies },
            { key: "notes", label: "Notes", type: "textarea" }
          ]}
          onClose={() => setEditing(null)}
          onSubmit={async (costCenter) => {
            const normalized = { ...costCenter, budgetAmount: typeof costCenter.budgetAmount === "number" ? costCenter.budgetAmount : parseMoneyInput(String(costCenter.budgetAmount)) };
            if (normalized.id) {
              await updateCostCenter(normalized);
            } else {
              await addCostCenter(normalized);
            }
            setEditing(null);
          }}
          record={editing}
          title={editing.id ? "Edit cost center" : "Add cost center"}
        >
          {editing.id ? <InternalNotesPanel module="Cost Centers" recordId={editing.id} notes={editing.noteHistory} /> : null}
        </RecordFormModal>
      ) : null}
    </>
  );
}
