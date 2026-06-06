"use client";

import { useMemo, useState } from "react";
import { Edit, FileCheck2, Plus, ReceiptText, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getNextSequentialId } from "@/lib/id-utils";
import { currencies, licenseApplicationOrigins, licenseApplicationSources, licenseCategories, licenseInvoiceStatuses, licensePaidToOptions, licensePaymentMethods, licensePaymentStatuses, licenseReviewStatuses, licenseStatuses, stampStatuses } from "@/lib/options";
import type { AuditAction, LicenseApplication, LicenseDocumentChecklistItem } from "@/types";

const LIN_PREFIX = "UAEAC2026";

function nextLin(applications: LicenseApplication[]) {
  const max = applications.reduce((highest, application) => {
    const match = application.licenseIssueNumber.match(/^UAEAC2026(\d{5})$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${LIN_PREFIX}${String(max + 1).padStart(5, "0")}`;
}

function emptyApplication(applications: LicenseApplication[]): LicenseApplication {
  const now = new Date().toISOString();
  return {
    id: getNextSequentialId(applications, "APP"),
    applicationOrigin: "Manual Entry",
    licenseIssueNumber: nextLin(applications),
    applicantFullName: "",
    applicantPhotoFileName: "",
    nationality: "",
    dateOfBirth: "",
    identificationNumber: "",
    phone: "",
    email: "",
    address: "",
    licenseCategory: "Professional Boxer",
    otherCategoryDescription: "",
    applicationSource: "Hard Copy",
    applicationScanFileName: "",
    supportingDocumentFileNames: [],
    amountDue: 0,
    amountPaid: 0,
    currency: "AED",
    paymentStatus: "Pending Payment",
    paymentMethod: "Cash",
    paidTo: "UAE Athletic Commission",
    paymentDate: "",
    paymentReference: "",
    paymentNotes: "",
    reviewStatus: "New",
    reviewedBy: "",
    chiefReviewer: "",
    reviewDate: "",
    approvalDate: "",
    rejectionReason: "",
    internalNotes: "",
    stampStatus: "Not Available Yet",
    stampDate: "",
    stampedBy: "",
    stampNotes: "",
    licenseStatus: "Application Registered",
    invoiceStatus: "Not Generated",
    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: 0,
    invoiceRecipient: "",
    invoiceNotes: "",
    completionChecklist: {
      photoReceived: false,
      identificationProvided: false,
      applicationFormReceived: false,
      medicalReceived: false,
      paymentReceived: false,
      chiefReviewComplete: false,
      stampComplete: false
    },
    createdAt: now,
    updatedAt: now
  };
}

function completionPercent(application: LicenseApplication) {
  const requiredDocuments = (application.documentChecklistSnapshot ?? []).filter((item) => item.required);
  if (requiredDocuments.length) {
    return Math.round((requiredDocuments.filter((item) => item.verificationStatus === "Verified").length / requiredDocuments.length) * 100);
  }
  const values = Object.values(application.completionChecklist);
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

function requiredFieldsComplete(application: LicenseApplication) {
  return Boolean(application.applicantFullName && application.nationality && application.dateOfBirth && application.identificationNumber && application.phone && application.email && application.address && (application.licenseCategory !== "Other" || application.otherCategoryDescription));
}

function paymentCleared(application: LicenseApplication) {
  return application.paymentStatus === "Paid" || application.paymentStatus === "Waived";
}

function categoryLabel(application: LicenseApplication) {
  return application.additionalOfficialCategories?.length ? application.additionalOfficialCategories.join(" / ") : application.licenseCategory === "Other" ? application.otherCategoryDescription || "Other" : application.licenseCategory;
}

function requiredDocumentsComplete(application: LicenseApplication) {
  const requiredDocuments = (application.documentChecklistSnapshot ?? []).filter((item) => item.required);
  if (!requiredDocuments.length) return application.completionChecklist.identificationProvided && application.completionChecklist.photoReceived;
  return requiredDocuments.every((item) => item.verificationStatus === "Verified");
}

const chiefReviewStatuses: LicenseApplication["reviewStatus"][] = ["Under Chief Review", "Pending Chief Review", "Approved by Chief", "Ready for Stamp", "License Issued"];

function ApplicationModal({
  application,
  onClose,
  onSubmit
}: {
  application: LicenseApplication;
  onClose: () => void;
  onSubmit: (application: LicenseApplication) => Promise<void>;
}) {
  const [form, setForm] = useState(application);
  const canProceedToChiefReview = paymentCleared(form) && requiredDocumentsComplete(form);
  const canReadyForStamp = canProceedToChiefReview && form.reviewStatus === "Approved by Chief" && requiredFieldsComplete(form);

  function setValue<K extends keyof LicenseApplication>(key: K, value: LicenseApplication[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.applicantFullName.trim()) {
      window.alert("Applicant full name is required.");
      return;
    }
    if (form.licenseCategory === "Other" && !form.otherCategoryDescription.trim()) {
      window.alert("Other category description is required.");
      return;
    }
    if ((chiefReviewStatuses.includes(form.reviewStatus) || form.reviewStatus === "Eligible For Chief Review") && !canProceedToChiefReview) {
      window.alert("Application cannot proceed to Chief Review until payment is verified or waived and required documents are complete.");
      return;
    }
    if (form.reviewStatus === "Ready for Stamp" && !canReadyForStamp) {
      window.alert("Ready for Stamp requires Paid or Waived payment, Approved by Chief review, and complete required fields.");
      return;
    }
    await onSubmit({
      ...form,
      amountDue: Number(form.amountDue),
      amountPaid: Number(form.amountPaid),
      invoiceAmount: Number(form.invoiceAmount),
      supportingDocumentFileNames: form.supportingDocumentFileNames.filter(Boolean)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">{application.id ? "Edit license application" : "Add license application"}</h3>
          <p className="mt-1 text-sm text-steel">{form.id} / LIN {form.licenseIssueNumber}</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-steel">Applicant full name<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicantFullName} onChange={(event) => setValue("applicantFullName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Applicant photo filename<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicantPhotoFileName} onChange={(event) => setValue("applicantPhotoFileName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Nationality<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.nationality} onChange={(event) => setValue("nationality", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Date of birth<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.dateOfBirth} onChange={(event) => setValue("dateOfBirth", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Passport / Emirates ID number<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.identificationNumber} onChange={(event) => setValue("identificationNumber", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Phone<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.phone} onChange={(event) => setValue("phone", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Email<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="email" value={form.email} onChange={(event) => setValue("email", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel md:col-span-2">Address<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.address} onChange={(event) => setValue("address", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">License category<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.licenseCategory} onChange={(event) => setValue("licenseCategory", event.target.value as LicenseApplication["licenseCategory"])}>{licenseCategories.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          {form.licenseCategory === "Other" ? <label className="text-sm font-medium text-steel md:col-span-2">Other category description<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.otherCategoryDescription} onChange={(event) => setValue("otherCategoryDescription", event.target.value)} /></label> : null}
          <label className="text-sm font-medium text-steel">Application source<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationSource} onChange={(event) => setValue("applicationSource", event.target.value as LicenseApplication["applicationSource"])}>{licenseApplicationSources.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Application origin<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationOrigin} onChange={(event) => setValue("applicationOrigin", event.target.value as LicenseApplication["applicationOrigin"])}>{licenseApplicationOrigins.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Application scan filename<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationScanFileName} onChange={(event) => setValue("applicationScanFileName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Supporting documents<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.supportingDocumentFileNames.join(", ")} onChange={(event) => setValue("supportingDocumentFileNames", event.target.value.split(",").map((item) => item.trim()))} /></label>
          <label className="text-sm font-medium text-steel">Amount due<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="number" value={form.amountDue} onChange={(event) => setValue("amountDue", Number(event.target.value))} /></label>
          <label className="text-sm font-medium text-steel">Amount paid<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="number" value={form.amountPaid} onChange={(event) => setValue("amountPaid", Number(event.target.value))} /></label>
          <label className="text-sm font-medium text-steel">Currency<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.currency} onChange={(event) => setValue("currency", event.target.value as LicenseApplication["currency"])}>{currencies.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Payment status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paymentStatus} onChange={(event) => setValue("paymentStatus", event.target.value as LicenseApplication["paymentStatus"])}>{licensePaymentStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Payment method<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paymentMethod} onChange={(event) => setValue("paymentMethod", event.target.value as LicenseApplication["paymentMethod"])}>{licensePaymentMethods.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Paid to<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paidTo} onChange={(event) => setValue("paidTo", event.target.value as LicenseApplication["paidTo"])}>{licensePaidToOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Payment date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.paymentDate} onChange={(event) => setValue("paymentDate", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Payment reference<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paymentReference} onChange={(event) => setValue("paymentReference", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Review status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reviewStatus} onChange={(event) => setValue("reviewStatus", event.target.value as LicenseApplication["reviewStatus"])}>{licenseReviewStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Reviewed by<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reviewedBy} onChange={(event) => setValue("reviewedBy", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Chief reviewer<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.chiefReviewer} onChange={(event) => setValue("chiefReviewer", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Review date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.reviewDate} onChange={(event) => setValue("reviewDate", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Approval date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.approvalDate} onChange={(event) => setValue("approvalDate", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Stamp status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.stampStatus} onChange={(event) => setValue("stampStatus", event.target.value as LicenseApplication["stampStatus"])}>{stampStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">License status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.licenseStatus} onChange={(event) => setValue("licenseStatus", event.target.value as LicenseApplication["licenseStatus"])}>{licenseStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Invoice status<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.invoiceStatus} onChange={(event) => setValue("invoiceStatus", event.target.value as LicenseApplication["invoiceStatus"])}>{licenseInvoiceStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Invoice number<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.invoiceNumber} onChange={(event) => setValue("invoiceNumber", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Invoice amount<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="number" value={form.invoiceAmount} onChange={(event) => setValue("invoiceAmount", Number(event.target.value))} /></label>
          <label className="text-sm font-medium text-steel md:col-span-3">Internal notes<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.internalNotes} onChange={(event) => setValue("internalNotes", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel md:col-span-3">Payment notes<textarea className="mt-1 min-h-20 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.paymentNotes} onChange={(event) => setValue("paymentNotes", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel md:col-span-3">Rejection reason<textarea className="mt-1 min-h-20 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.rejectionReason} onChange={(event) => setValue("rejectionReason", event.target.value)} /></label>
          <div className="rounded border border-black/10 bg-[#f7f7f5] p-4 md:col-span-3">
            <p className="text-sm font-semibold text-ink">Missing Information Checklist</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["photoReceived", "Photo received"],
                ["identificationProvided", "Identification Provided"],
                ["applicationFormReceived", "Application form received"],
                ["medicalReceived", "Medical received"],
                ["paymentReceived", "Payment received"],
                ["chiefReviewComplete", "Chief review complete"],
                ["stampComplete", "Stamp complete"]
              ].map(([key, label]) => (
                <label className="flex items-center gap-2 text-sm text-steel" key={key}>
                  <input
                    checked={form.completionChecklist[key as keyof LicenseApplication["completionChecklist"]]}
                    className="h-4 w-4 accent-gold"
                    type="checkbox"
                    onChange={(event) => setValue("completionChecklist", { ...form.completionChecklist, [key]: event.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        {form.paymentStatus !== "Paid" && form.paymentStatus !== "Waived" ? <div className="mx-5 mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Payment warning: license cannot be ready for issue until payment is Paid or Waived.</div> : null}
        {!canProceedToChiefReview ? <div className="mx-5 mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Application cannot proceed to Chief Review until payment is verified or waived and required documents are complete.</div> : null}
        {!canReadyForStamp ? <div className="mx-5 mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-steel">Ready for Stamp requires cleared payment, chief approval, and complete required fields.</div> : null}
        <div className="flex justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose} type="button">Cancel</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void save()} type="button">Save</button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  application,
  onClose,
  onSubmit
}: {
  application: LicenseApplication;
  onClose: () => void;
  onSubmit: (application: LicenseApplication, auditAction?: AuditAction) => Promise<void>;
}) {
  const [form, setForm] = useState(application);
  const documentsVerified = requiredDocumentsComplete(form);
  const canChief = paymentCleared(form) && documentsVerified;

  function updateDocument(requirementId: string, verificationStatus: LicenseDocumentChecklistItem["verificationStatus"]) {
    setForm((current) => ({
      ...current,
      documentChecklistSnapshot: (current.documentChecklistSnapshot ?? []).map((item) => item.requirementId === requirementId ? { ...item, verificationStatus, received: verificationStatus !== "Not Received" } : item)
    }));
  }

  async function requestMoreDocuments() {
    const comment = window.prompt("Comment is required to request more documents.");
    if (!comment?.trim()) return;
    await onSubmit({
      ...form,
      reviewStatus: "Pending Documents",
      licenseStatus: form.licenseStatus === "Awaiting Payment" ? "Awaiting Payment" : "Awaiting Review",
      internalNotes: `${form.internalNotes ? `${form.internalNotes}\n` : ""}More documents requested: ${comment.trim()}`
    }, "More Documents Requested");
  }

  async function rejectApplication() {
    const reason = window.prompt("Rejection reason is required.");
    if (!reason?.trim()) return;
    await onSubmit({
      ...form,
      reviewStatus: "Rejected",
      licenseStatus: "Rejected",
      rejectionReason: reason.trim()
    }, "Application Rejected");
  }

  async function markEligible() {
    if (!canChief) {
      window.alert("Application cannot proceed to Chief Review until payment is verified or waived and required documents are complete.");
      return;
    }
    await onSubmit({ ...form, reviewStatus: "Eligible For Chief Review", licenseStatus: "Awaiting Review" }, "Chief review started");
  }

  async function approveOrIssue() {
    if (!canChief) {
      window.alert("Application cannot proceed to Chief Review until payment is verified or waived and required documents are complete.");
      return;
    }
    if (!form.chiefReviewer.trim() || !form.approvalDate) {
      window.alert("Chief reviewer and approval date are required.");
      return;
    }
    await onSubmit({
      ...form,
      reviewStatus: "Approved by Chief",
      licenseStatus: "Approved Awaiting Stamp",
      stampStatus: form.stampStatus === "Stamped" ? "Stamped" : "Awaiting Stamp",
      completionChecklist: { ...form.completionChecklist, chiefReviewComplete: true }
    }, "Chief approval granted");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">Review Application</h3>
          <p className="mt-1 text-sm text-steel">{form.id} / {form.licenseIssueNumber} / {form.applicantFullName}</p>
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-[1fr_1.2fr]">
          <section className="rounded border border-black/10 bg-[#f7f7f5] p-4">
            <h4 className="font-semibold text-ink">Application Summary</h4>
            <dl className="mt-3 space-y-2 text-sm">
              <Info label="Applicant" value={form.applicantFullName} />
              <Info label="Category" value={categoryLabel(form)} />
              <Info label="APP ID" value={form.id} />
              <Info label="LIN" value={form.licenseIssueNumber} />
              <Info label="Invoice Status" value={form.invoiceStatus} />
              <Info label="Payment Status" value={form.paymentStatus} />
              <Info label="Receipt" value={form.receiptNumber || "Not generated"} />
              <Info label="License Status" value={form.licenseStatus} />
            </dl>
            {!canChief ? <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Application cannot proceed to Chief Review until payment is verified or waived and required documents are complete.</div> : null}
          </section>
          <section className="rounded border border-black/10 p-4">
            <h4 className="font-semibold text-ink">Required Document Checklist</h4>
            <div className="mt-3 space-y-3">
              {(form.documentChecklistSnapshot ?? []).map((item) => (
                <div className="grid gap-3 rounded border border-black/10 p-3 md:grid-cols-[1fr_1fr_220px]" key={item.requirementId}>
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.documentName}{item.required ? <span className="text-red-700"> *</span> : null}</p>
                    <p className="text-xs text-steel">{item.fileName || "No file uploaded"}</p>
                  </div>
                  <StatusBadge value={item.verificationStatus} />
                  <select className="rounded border border-black/10 px-3 py-2 text-sm text-ink" value={item.verificationStatus} onChange={(event) => updateDocument(item.requirementId, event.target.value as typeof item.verificationStatus)}>
                    {["Received", "Verified", "Needs Clarification", "Rejected"].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded border border-black/10 p-4 xl:col-span-2">
            <h4 className="font-semibold text-ink">Section 8 UAEAC Internal Use</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-steel">Chief reviewer<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.chiefReviewer} onChange={(event) => setForm((current) => ({ ...current, chiefReviewer: event.target.value }))} /></label>
              <label className="text-sm font-medium text-steel">Approval date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={form.approvalDate} onChange={(event) => setForm((current) => ({ ...current, approvalDate: event.target.value }))} /></label>
              <label className="text-sm font-medium text-steel">Reviewed by<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.reviewedBy} onChange={(event) => setForm((current) => ({ ...current, reviewedBy: event.target.value }))} /></label>
              <label className="text-sm font-medium text-steel md:col-span-3">Internal comments<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.internalNotes} onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))} /></label>
            </div>
          </section>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose}>Close</button>
          <button className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100" onClick={() => void requestMoreDocuments()}>Request More Documents</button>
          <button className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={() => void rejectApplication()}>Reject Application</button>
          <button className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => void markEligible()}>Mark Eligible For Chief Review</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void approveOrIssue()}>Approve Application</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="font-medium text-steel">{label}</dt><dd className="text-right font-semibold text-ink">{value || "Not set"}</dd></div>;
}

export default function LicenseApplicationsPage() {
  const { documents, licenseApplications, licenseReceipts, generatedLicenses, addLicenseApplication, updateLicenseApplication, deleteLicenseApplication, generateLicenseReceipt, generateLicenseDraft, addAuditLog } = useFinanceData();
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [paidToFilter, setPaidToFilter] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("");
  const [stampFilter, setStampFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [specialFilter, setSpecialFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<LicenseApplication | null>(null);
  const [reviewing, setReviewing] = useState<LicenseApplication | null>(null);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return licenseApplications.filter((application) => {
      const matchesQuery = normalizedQuery ? Object.values(application).join(" ").toLowerCase().includes(normalizedQuery) : true;
      const matchesPayment = paymentFilter ? application.paymentStatus === paymentFilter : true;
      const matchesPaidTo = paidToFilter ? application.paidTo === paidToFilter : true;
      const matchesInvoice = invoiceFilter ? application.invoiceStatus === invoiceFilter : true;
      const matchesReview = reviewFilter ? application.reviewStatus === reviewFilter : true;
      const matchesLicense = licenseFilter ? application.licenseStatus === licenseFilter : true;
      const matchesStamp = stampFilter ? application.stampStatus === stampFilter : true;
      const matchesSource = sourceFilter ? application.applicationSource === sourceFilter : true;
      const matchesOrigin = originFilter ? application.applicationOrigin === originFilter : true;
      const matchesCategory = categoryFilter ? application.licenseCategory === categoryFilter : true;
      const missingRequiredDocuments = (application.documentChecklistSnapshot ?? []).filter((item) => item.required).some((item) => item.verificationStatus !== "Verified");
      const identificationMissing = !application.passportNumber && !application.nationalIdNumber && !application.identificationNumber;
      const awaitingPayment = application.paymentStatus === "Pending Payment" || application.paymentStatus === "Partially Paid";
      const readyForChiefReview = !awaitingPayment && !missingRequiredDocuments && ["New", "Pending Documents", "Awaiting Payment", "Pending Payment"].includes(application.reviewStatus);
      const readyForStamp = application.paymentStatus === "Paid" && application.reviewStatus === "Approved by Chief";
      const matchesSpecial =
        specialFilter === "Missing Required Documents" ? missingRequiredDocuments
          : specialFilter === "Identification Missing" ? identificationMissing
            : specialFilter === "Awaiting Payment" ? awaitingPayment
              : specialFilter === "Ready for Chief Review" ? readyForChiefReview
                : specialFilter === "Ready for Stamp" ? readyForStamp
                  : true;
      return matchesQuery && matchesPayment && matchesPaidTo && matchesInvoice && matchesReview && matchesLicense && matchesStamp && matchesSource && matchesOrigin && matchesCategory && matchesSpecial;
    });
  }, [categoryFilter, invoiceFilter, licenseApplications, licenseFilter, originFilter, paidToFilter, paymentFilter, query, reviewFilter, sourceFilter, specialFilter, stampFilter]);

  const summary = {
    total: licenseApplications.length,
    pendingPayment: licenseApplications.filter((application) => application.paymentStatus === "Pending Payment" || application.paymentStatus === "Partially Paid").length,
    pendingChief: licenseApplications.filter((application) => application.reviewStatus === "Pending Chief Review").length,
    awaitingStamp: licenseApplications.filter((application) => application.licenseStatus === "Approved Awaiting Stamp").length,
    issued: licenseApplications.filter((application) => application.licenseStatus === "Issued" || application.reviewStatus === "License Issued").length,
    rejected: licenseApplications.filter((application) => application.reviewStatus === "Rejected" || application.licenseStatus === "Rejected").length
  };

  async function saveApplication(application: LicenseApplication) {
    if (licenseApplications.some((item) => item.id === application.id)) {
      await updateLicenseApplication(application);
    } else {
      await addLicenseApplication(application);
    }
    setEditing(null);
  }

  async function saveReview(application: LicenseApplication, auditAction?: AuditAction) {
    await updateLicenseApplication(application);
    if (auditAction) {
      addAuditLog({
        module: "License Applications",
        recordId: application.id,
        recordLabel: application.applicantFullName,
        action: auditAction,
        changedBy: "Internal Reviewer",
        previousValueSummary: "",
        newValueSummary: `${application.reviewStatus}; ${application.licenseStatus}`,
        notes: application.internalNotes || application.rejectionReason
      });
    }
    setReviewing(null);
  }

  async function verifyPayment(application: LicenseApplication) {
    const documentsComplete = requiredDocumentsComplete(application);
    const updated = await updateLicenseApplication({
      ...application,
      paymentStatus: "Paid",
      invoiceStatus: "Paid",
      amountPaid: application.amountPaid || application.amountDue,
      totalFeesPaid: application.totalFeesPaid || application.amountDue,
      reviewStatus: documentsComplete ? "Eligible For Chief Review" : "Pending Documents",
      licenseStatus: documentsComplete ? "Awaiting Review" : "Awaiting Payment",
      completionChecklist: {
        ...application.completionChecklist,
        paymentReceived: true
      },
      paymentNotes: `${application.paymentNotes ? `${application.paymentNotes}\n` : ""}Payment verified by Finance Admin.`,
      updatedAt: new Date().toISOString()
    });
    if (!licenseReceipts.some((receipt) => receipt.applicationId === updated.id)) {
      await generateLicenseReceipt(updated);
    }
  }

  async function rejectPayment(application: LicenseApplication) {
    const note = window.prompt("Payment rejection note is required.");
    if (!note?.trim()) {
      window.alert("Payment rejection note is required.");
      return;
    }
    await updateLicenseApplication({
      ...application,
      paymentStatus: "Rejected",
      reviewStatus: "Awaiting Payment",
      licenseStatus: "Awaiting Payment",
      completionChecklist: {
        ...application.completionChecklist,
        paymentReceived: false
      },
      paymentNotes: `${application.paymentNotes ? `${application.paymentNotes}\n` : ""}Payment rejected: ${note.trim()}`,
      updatedAt: new Date().toISOString()
    });
  }

  async function waivePayment(application: LicenseApplication) {
    const reason = window.prompt("Waiver reason is required.");
    if (!reason?.trim()) {
      window.alert("Waiver reason is required.");
      return;
    }
    const documentsComplete = requiredDocumentsComplete(application);
    await updateLicenseApplication({
      ...application,
      paymentStatus: "Waived",
      invoiceStatus: "Waived",
      reviewStatus: documentsComplete ? "Eligible For Chief Review" : "Pending Documents",
      licenseStatus: documentsComplete ? "Awaiting Review" : "Awaiting Payment",
      completionChecklist: {
        ...application.completionChecklist,
        paymentReceived: true
      },
      paymentNotes: `${application.paymentNotes ? `${application.paymentNotes}\n` : ""}Payment waived: ${reason.trim()}`,
      updatedAt: new Date().toISOString()
    });
  }

  async function generateReceipt(application: LicenseApplication) {
    try {
      await generateLicenseReceipt(application);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to generate receipt.");
    }
  }

  async function generateLicense(application: LicenseApplication) {
    if (!requiredDocumentsComplete(application) || !paymentCleared(application)) {
      window.alert("Cannot generate final license until payment is Paid/Waived and mandatory documents are Verified.");
      return;
    }
    try {
      await generateLicenseDraft(application);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to generate license draft.");
    }
  }

  return (
    <>
      <PageHeader title="License Applications" description="UAE Athletic Commission professional boxing participant license application registry." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Total applications", summary.total],
          ["Pending payment", summary.pendingPayment],
          ["Pending chief review", summary.pendingChief],
          ["Approved awaiting stamp", summary.awaitingStamp],
          ["Licenses issued", summary.issued],
          ["Rejected", summary.rejected]
        ].map(([label, value]) => (
          <div className="rounded border border-black/10 bg-white p-4 shadow-soft" key={label}>
            <p className="text-sm text-steel">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="space-y-3 border-b border-black/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-steel" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search applications by APP ID, LIN, applicant, source, payment, or notes" value={query} />
            </div>
            <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => setEditing(emptyApplication(licenseApplications))}>
              <Plus className="h-4 w-4" />
              Add application
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Category</option>{licenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="">Payment status</option>{licensePaymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={paidToFilter} onChange={(event) => setPaidToFilter(event.target.value)}><option value="">Paid To</option>{licensePaidToOptions.map((paidTo) => <option key={paidTo} value={paidTo}>{paidTo}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={invoiceFilter} onChange={(event) => setInvoiceFilter(event.target.value)}><option value="">Invoice Status</option>{licenseInvoiceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}><option value="">Review status</option>{licenseReviewStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={licenseFilter} onChange={(event) => setLicenseFilter(event.target.value)}><option value="">License Status</option>{licenseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={stampFilter} onChange={(event) => setStampFilter(event.target.value)}><option value="">Stamp Status</option>{stampStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="">Application Source</option>{licenseApplicationSources.map((source) => <option key={source} value={source}>{source}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={originFilter} onChange={(event) => setOriginFilter(event.target.value)}><option value="">Origin</option>{licenseApplicationOrigins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}</select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={specialFilter} onChange={(event) => setSpecialFilter(event.target.value)}><option value="">Workflow Filter</option>{["Missing Required Documents", "Identification Missing", "Awaiting Payment", "Ready for Chief Review", "Ready for Stamp"].map((filter) => <option key={filter} value={filter}>{filter}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["APP ID", "LIN", "Applicant Name", "Category", "Amount Due", "Amount Paid", "Payment Status", "Paid To", "Invoice Number", "Receipt Number", "Invoice Status", "Review Status", "License Status", "Stamp Status", "Required Documents Completion %", "Application Source", "Origin", "Created Date", "Warnings", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((application) => {
                const documentCount = documents.filter((document) => document.linkedModule === "License Application" && document.linkedRecordId === application.id).length;
                return (
                  <tr className="align-top hover:bg-[#fafaf8]" key={application.id}>
                    <td className="px-4 py-4 font-medium text-ink">{application.id}</td>
                    <td className="px-4 py-4 font-medium text-ink">{application.licenseIssueNumber}</td>
                    <td className="px-4 py-4 text-steel">{application.applicantFullName}</td>
                    <td className="px-4 py-4 text-steel">{categoryLabel(application)}</td>
                    <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(application.amountDue, application.currency)}</td>
                    <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(application.amountPaid, application.currency)}</td>
                    <td className="px-4 py-4"><StatusBadge value={application.paymentStatus} /></td>
                    <td className="px-4 py-4 text-steel">{application.paidTo}</td>
                    <td className="px-4 py-4 font-medium text-ink">{application.invoiceNumber || "Not generated"}</td>
                    <td className="px-4 py-4 font-medium text-ink">{application.receiptNumber || licenseReceipts.find((receipt) => receipt.applicationId === application.id)?.id || "Not generated"}</td>
                    <td className="px-4 py-4"><StatusBadge value={application.invoiceStatus} /></td>
                    <td className="px-4 py-4"><StatusBadge value={application.reviewStatus} /></td>
                    <td className="px-4 py-4"><StatusBadge value={application.licenseStatus} /></td>
                    <td className="px-4 py-4"><StatusBadge value={application.stampStatus} /></td>
                    <td className="px-4 py-4">
                      <div className="h-2 w-28 rounded bg-black/10">
                        <div className="h-2 rounded bg-gold" style={{ width: `${completionPercent(application)}%` }} />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-ink">{completionPercent(application)}%</p>
                    </td>
                    <td className="px-4 py-4 text-steel">{application.applicationSource}</td>
                    <td className="px-4 py-4 text-steel">{application.applicationOrigin}</td>
                    <td className="px-4 py-4 text-steel">{formatDate(application.createdAt)}</td>
                    <td className="max-w-[260px] px-4 py-4 text-steel">
                      {!paymentCleared(application) ? <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Payment warning</span> : null}
                      {application.reviewStatus === "Approved by Chief" && !requiredFieldsComplete(application) ? <span className="ml-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Missing fields</span> : null}
                      {documentCount ? <span className="ml-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">{documentCount} docs</span> : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {application.paymentStatus === "Payment Submitted" ? (
                          <>
                            <button className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => void verifyPayment(application)} type="button">Verify Payment</button>
                            <button className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => void rejectPayment(application)} type="button">Reject Payment</button>
                          </>
                        ) : null}
                        {application.paymentStatus !== "Paid" && application.paymentStatus !== "Waived" ? (
                          <button className="rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" onClick={() => void waivePayment(application)} type="button">Mark Payment Waived</button>
                        ) : null}
                        {paymentCleared(application) && !licenseReceipts.some((receipt) => receipt.applicationId === application.id) ? (
                          <button className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100" onClick={() => void generateReceipt(application)} type="button"><ReceiptText className="h-3 w-3" />Generate Receipt</button>
                        ) : null}
                        {application.licenseStatus !== "Rejected" && !generatedLicenses.some((license) => license.applicationId === application.id) ? (
                          <button className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => void generateLicense(application)} type="button"><FileCheck2 className="h-3 w-3" />Generate License Draft</button>
                        ) : null}
                        <button className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => setReviewing(application)} type="button"><ShieldCheck className="h-3 w-3" />Review Application</button>
                        <button className="rounded border border-black/10 p-2 text-steel hover:border-gold hover:text-ink" onClick={() => setEditing(application)} title="Edit"><Edit className="h-4 w-4" /></button>
                        <button className="rounded border border-black/10 p-2 text-steel hover:border-red-300 hover:text-red-700" onClick={() => void deleteLicenseApplication(application)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-black/10 px-4 py-3 text-sm text-steel">Showing {filtered.length} of {licenseApplications.length} license applications</div>
      </section>
      {editing ? <ApplicationModal application={editing} onClose={() => setEditing(null)} onSubmit={saveApplication} /> : null}
      {reviewing ? <ReviewModal application={reviewing} onClose={() => setReviewing(null)} onSubmit={saveReview} /> : null}
    </>
  );
}
