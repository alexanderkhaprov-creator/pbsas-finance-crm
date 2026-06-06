"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import type { AuditAction, AuditModule } from "@/types";

const modules: AuditModule[] = ["People", "Events", "Cost Centers", "Receipt Intake", "Expenses", "Reimbursements", "Revenue", "Data Management", "Batch Entry", "Document Register", "License Applications", "Application Intake"];
const actions: AuditAction[] = ["Created", "Updated", "Deleted", "Status Changed", "Converted", "Imported", "Exported", "Reset", "Application created", "Application updated", "Application submitted", "Fee schedule created", "Fee schedule updated", "Fee schedule archived/restored", "Document requirement created", "Document requirement updated", "Document requirement archived/restored", "Invoice generated", "Invoice sent", "Payment recorded", "Payment waived", "Payment Waived", "Payment status changed", "Payment destination changed", "Payment Instructions Viewed", "Payment Submitted", "Payment Verified", "Payment Rejected", "Existing License Uploaded", "Returning Applicant Identified", "Document Uploaded", "Document Marked Received", "Document Verified", "Document Needs Clarification", "Document Rejected", "More Documents Requested", "Receipt Generated", "Receipt Downloaded", "Receipt Cancelled", "License Draft Generated", "License Previewed", "License Printed / Downloaded", "Document status changed", "Review status changed", "Chief review started", "Chief approval recorded", "Chief approval granted", "Application blocked by missing payment", "Internal UAEAC section updated", "License marked ready for stamp", "License issued", "Application rejected", "Application Rejected"];

export default function AuditTrailPage() {
  const { auditLogs } = useFinanceData();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [changedByFilter, setChangedByFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const changedByOptions = [...new Set(auditLogs.map((log) => log.changedBy).filter(Boolean))];
  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const logDate = log.timestamp.slice(0, 10);
      const matchesQuery = normalizedQuery ? Object.values(log).join(" ").toLowerCase().includes(normalizedQuery) : true;
      const matchesModule = moduleFilter ? log.module === moduleFilter : true;
      const matchesAction = actionFilter ? log.action === actionFilter : true;
      const matchesChangedBy = changedByFilter ? log.changedBy === changedByFilter : true;
      const matchesStart = startDate ? logDate >= startDate : true;
      const matchesEnd = endDate ? logDate <= endDate : true;
      return matchesQuery && matchesModule && matchesAction && matchesChangedBy && matchesStart && matchesEnd;
    });
  }, [actionFilter, auditLogs, changedByFilter, endDate, moduleFilter, query, startDate]);

  return (
    <>
      <PageHeader title="Audit Trail" description="Read-only record of local create, edit, delete, status, conversion, import, export, and reset actions." />
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="space-y-3 border-b border-black/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-steel" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search audit log by ID, module, record, action, changed by, or notes" value={query} />
            </div>
            <button className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              <option value="">Module</option>
              {modules.map((module) => <option key={module} value={module}>{module}</option>)}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="">Action</option>
              {actions.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={changedByFilter} onChange={(event) => setChangedByFilter(event.target.value)}>
              <option value="">Changed by</option>
              {changedByOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <input aria-label="Start date" className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input aria-label="End date" className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1700px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Audit ID", "Timestamp", "Module", "Record ID", "Record label", "Action", "Changed by", "Previous value summary", "New value summary", "Notes"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredLogs.map((log) => (
                <tr className="align-top hover:bg-[#fafaf8]" key={log.id}>
                  <td className="px-4 py-4 font-medium text-ink">{log.id}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(log.timestamp)} {log.timestamp.slice(11, 16)}</td>
                  <td className="px-4 py-4 text-steel">{log.module}</td>
                  <td className="px-4 py-4 font-medium text-ink">{log.recordId}</td>
                  <td className="px-4 py-4 text-steel">{log.recordLabel}</td>
                  <td className="px-4 py-4"><StatusBadge value={log.action} /></td>
                  <td className="px-4 py-4 text-steel">{log.changedBy}</td>
                  <td className="max-w-[320px] px-4 py-4 text-steel">{log.previousValueSummary || "None"}</td>
                  <td className="max-w-[320px] px-4 py-4 text-steel">{log.newValueSummary || "None"}</td>
                  <td className="max-w-[260px] px-4 py-4 text-steel">{log.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-black/10 px-4 py-3 text-sm text-steel">Showing {filteredLogs.length} of {auditLogs.length} audit records</div>
      </section>
    </>
  );
}
