"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { parseMoneyInput } from "@/lib/money-utils";
import { confidentialityLevels, currencies, documentApprovalStatuses, documentLinkedModules, documentTypes, documentVerificationStatuses, stampStatuses } from "@/lib/options";
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
  approvalStatus: "Draft",
  stampStatus: "Not Available Yet",
  issuedDate: "",
  approvedBy: "",
  approvalTitle: "",
  approvalDate: "",
  rejectionReason: "",
  stampedBy: "",
  stampDate: "",
  confidentialityLevel: "Finance Only",
  notes: ""
};

export default function DocumentRegisterPage() {
  const { documents, stampSettings, addDocument, updateDocument, deleteDocument } = useFinanceData();
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
          { key: "approvalStatus", header: "Approval", render: (row) => <StatusBadge value={row.approvalStatus ?? "Draft"} /> },
          { key: "stampStatus", header: "Stamp", render: (row) => <StampCell approvalStatus={row.approvalStatus} stampStatus={row.stampStatus} /> },
          {
            key: "certify",
            header: "Certification",
            render: (row) => (
              <button
                className="rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel hover:border-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                disabled={stampSettings.stampAvailable !== "Yes"}
                onClick={() => void updateDocument({ ...row, approvalStatus: "Stamped / Certified", stampStatus: "Stamped", stampedBy: stampSettings.defaultStampedBy, stampDate: new Date().toISOString().slice(0, 10), notes: `${row.notes ? `${row.notes}\n` : ""}Stamp applied: ${stampSettings.stampDisplayLabel || stampSettings.stampName}` })}
              >
                Apply Stamp
              </button>
            )
          },
          { key: "issuedDate", header: "Issued date", render: (row) => row.issuedDate ? formatDate(row.issuedDate) : "Not issued" },
          { key: "approvedBy", header: "Approved by", render: (row) => row.approvedBy || "Not approved" },
          { key: "stampedBy", header: "Stamped by", render: (row) => row.stampedBy || "Not stamped" },
          { key: "confidentialityLevel", header: "Confidentiality", render: (row) => <StatusBadge value={row.confidentialityLevel} /> },
          { key: "notes", header: "Notes", render: (row) => row.notes }
        ]}
        filters={[
          { key: "documentType", label: "Document type", options: documentTypes, getValue: (row) => row.documentType },
          { key: "linkedModule", label: "Linked module", options: documentLinkedModules, getValue: (row) => row.linkedModule },
          { key: "verificationStatus", label: "Verification", options: documentVerificationStatuses, getValue: (row) => row.verificationStatus },
          { key: "approvalStatus", label: "Approval", options: documentApprovalStatuses, getValue: (row) => row.approvalStatus ?? "Draft" },
          { key: "stampStatus", label: "Stamp", options: stampStatuses, getValue: (row) => row.stampStatus ?? "Not Available Yet" },
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
            { key: "approvalStatus", label: "Approval status", type: "select", options: documentApprovalStatuses },
            { key: "stampStatus", label: "Stamp status", type: "select", options: stampStatuses },
            { key: "issuedDate", label: "Issued date", type: "date" },
            { key: "approvedBy", label: "Approved by" },
            { key: "approvalTitle", label: "Approval title" },
            { key: "approvalDate", label: "Approval date", type: "date" },
            { key: "stampedBy", label: "Stamped by" },
            { key: "stampDate", label: "Stamp date", type: "date" },
            { key: "rejectionReason", label: "Rejection reason" },
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

function StampCell({ approvalStatus, stampStatus }: { approvalStatus?: string; stampStatus?: string }) {
  const stamped = approvalStatus === "Stamped / Certified" || approvalStatus === "Issued" || stampStatus === "Stamped";
  if (!stamped) return <StatusBadge value={stampStatus ?? "Not Available Yet"} />;
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="UAEAC Red Official Stamp" className="h-10 w-10 object-contain" src="/uaeac-stamp-red.jpeg" />
      <StatusBadge value={approvalStatus === "Issued" ? "Issued" : "Stamped / Certified"} />
    </div>
  );
}
