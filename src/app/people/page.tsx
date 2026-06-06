"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { RecordFormModal } from "@/components/record-form-modal";
import type { Person } from "@/types";

const emptyPerson: Person = {
  id: "",
  fullName: "",
  role: "",
  organization: "",
  email: "",
  phone: "",
  notes: ""
};

export default function PeoplePage() {
  const { people, documents, addPerson, updatePerson, deletePerson } = useFinanceData();
  const [editing, setEditing] = useState<Person | null>(null);

  return (
    <>
      <PageHeader title="People" description="Stakeholders, staff, vendors, commission contacts, and finance owners." />
      <DataTable
        addLabel="Add person"
        columns={[
          { key: "fullName", header: "Full name", render: (row) => <span className="font-medium text-ink">{row.fullName}</span> },
          { key: "role", header: "Role", render: (row) => row.role },
          { key: "organization", header: "Organization", render: (row) => row.organization },
          { key: "email", header: "Email", render: (row) => row.email },
          { key: "phone", header: "Phone", render: (row) => row.phone },
          { key: "documents", header: "Documents", render: (row) => documents.filter((document) => document.linkedModule === "Person" && document.linkedRecordId === row.id).length },
          { key: "notes", header: "Notes", render: (row) => row.notes }
        ]}
        filters={[
          { key: "organization", label: "Organization", options: [...new Set(people.map((person) => person.organization))], getValue: (row) => row.organization },
          { key: "role", label: "Role", options: [...new Set(people.map((person) => person.role))], getValue: (row) => row.role }
        ]}
        getSearchText={(row) => Object.values(row).join(" ")}
        onAdd={() => setEditing(emptyPerson)}
        onDelete={(row) => void deletePerson(row)}
        onEdit={(row) => setEditing(row)}
        rows={people}
        searchPlaceholder="Search people by name, role, organization, email, or phone"
      />
      {editing ? (
        <RecordFormModal
          fields={[
            { key: "fullName", label: "Full name" },
            { key: "role", label: "Role" },
            { key: "organization", label: "Organization" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Phone", type: "tel" },
            { key: "notes", label: "Notes", type: "textarea" }
          ]}
          onClose={() => setEditing(null)}
          onSubmit={async (person) => {
            if (person.id) {
              await updatePerson(person);
            } else {
              await addPerson(person);
            }
            setEditing(null);
          }}
          record={editing}
          title={editing.id ? "Edit person" : "Add person"}
        />
      ) : null}
    </>
  );
}
