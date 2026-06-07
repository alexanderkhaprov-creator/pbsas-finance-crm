"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { parseMoneyInput } from "@/lib/money-utils";
import { confidentialityLevels, currencies, documentLinkedModules, documentTypes, documentVerificationStatuses } from "@/lib/options";
import type { SupportingDocument } from "@/types";

const emptyDocument: SupportingDocument = {
  id: "",
  documentType: "Receipt",
  title: "",
  linkedModule: "Expense",
  linkedRecordId: "",
  fileName: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  issuedBy: "",
  receivedFrom: "",
  currency: "AED",
  amount: 0,
  verificationStatus: "Unchecked",
  confidentialityLevel: "Finance Only",
  notes: ""
};

export default function DocumentRegisterPage() {
  const { documents, addDocument, updateDocument, deleteDocument } = useFinanceData();
  const [editing, setEditing] = useState<SupportingDocument | null>(null);

  return (
    <>
      <PageHeader title="Document Register" description="Central register for receipts, invoices, agreements, permits, certificates, payment proofs, and supporting records." />
      <DataTable
        addLabel="Add document"
        columns={[
          { key: "id", header: "Document ID", render: (row) => <span className="font-medium text-ink">{row.id}</span> },
          { key: "documentType", header: "Type", render: (row) => row.documentType },
          { key: "title", header: "Title", render: (row) => <span className="font-medium text-ink">{row.title}</span> },
          { key: "linkedModule", header: "Linked module", render: (row) => row.linkedModule },
          { key: "linkedRecordId", header: "Linked record ID", render: (row) => row.linkedRecordId },
          { key: "fileName", header: "File", render: (row) => row.fileName || "No file placeholder" },
          { key: "receivedDate", header: "Received date", render: (row) => formatDate(row.receivedDate) },
          { key: "issuedBy", header: "Issued by", render: (row) => row.issuedBy },
          { key: "receivedFrom", header: "Received from", render: (row) => row.receivedFrom },
          { key: "amount", header: "Amount", render: (row) => row.amount ? formatCurrency(row.amount, row.currency) : "Not applicable" },
          { key: "verificationStatus", header: "Verification", render: (row) => <StatusBadge value={row.verificationStatus} /> },
          { key: "confidentialityLevel", header: "Confidentiality", render: (row) => <StatusBadge value={row.confidentialityLevel} /> },
          { key: "notes", header: "Notes", render: (row) => row.notes }
        ]}
        filters={[
          { key: "documentType", label: "Document type", options: documentTypes, getValue: (row) => row.documentType },
          { key: "linkedModule", label: "Linked module", options: documentLinkedModules, getValue: (row) => row.linkedModule },
          { key: "verificationStatus", label: "Verification", options: documentVerificationStatuses, getValue: (row) => row.verificationStatus },
          { key: "confidentialityLevel", label: "Confidentiality", options: confidentialityLevels, getValue: (row) => row.confidentialityLevel }
        ]}
        getSearchText={(row) => Object.values(row).join(" ")}
        onAdd={() => setEditing(emptyDocument)}
        onDelete={(row) => void deleteDocument(row)}
        onEdit={(row) => setEditing(row)}
        rows={documents}
        searchPlaceholder="Search documents by ID, title, file, linked record, issuer, source, or notes"
      />
      {editing ? (
        <RecordFormModal
          fields={[
            { key: "documentType", label: "Document type", type: "select", options: documentTypes },
            { key: "title", label: "Title" },
            { key: "linkedModule", label: "Linked module", type: "select", options: documentLinkedModules },
            { key: "linkedRecordId", label: "Linked record ID" },
            { key: "fileName", label: "File name placeholder" },
            { key: "receivedDate", label: "Upload / received date", type: "date" },
            { key: "issuedBy", label: "Issued by" },
            { key: "receivedFrom", label: "Received from" },
            { key: "currency", label: "Currency", type: "select", options: currencies },
            { key: "amount", label: "Amount if applicable", type: "number" },
            { key: "verificationStatus", label: "Verification status", type: "select", options: documentVerificationStatuses },
            { key: "confidentialityLevel", label: "Confidentiality level", type: "select", options: confidentialityLevels },
            { key: "notes", label: "Notes", type: "textarea" }
          ]}
          onClose={() => setEditing(null)}
          onSubmit={async (document) => {
            const normalized = { ...document, amount: typeof document.amount === "number" ? document.amount : parseMoneyInput(String(document.amount)) };
            if (normalized.id) {
              await updateDocument(normalized);
            } else {
              await addDocument(normalized);
            }
            setEditing(null);
          }}
          record={editing}
          title={editing.id ? "Edit document" : "Add document"}
        />
      ) : null}
    </>
  );
}
