"use client";

import { useMemo, useState } from "react";
import { Camera, Edit, FileCheck2, Plus, ReceiptText, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getNextSequentialId } from "@/lib/id-utils";
import { parseMoneyInput } from "@/lib/money-utils";
import { currencies, licenseApplicationOrigins, licenseApplicationSources, licenseCategories, licenseInvoiceStatuses, licensePaidToOptions, licensePaymentMethods, licensePaymentStatuses, licenseReviewStatuses, licenseStatuses, stampStatuses } from "@/lib/options";
import type { ApplicantPhotoStatus, AuditAction, CoachCertification, GeneratedLicense, LicenseApplication, LicenseDocumentChecklistItem, LicenseEmailStatus, LicensePendingFlag, NotableFighter } from "@/types";

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

function photoStatusFor(application: LicenseApplication, license?: GeneratedLicense): ApplicantPhotoStatus {
  if (license?.photoStatus) return license.photoStatus;
  if (application.photoStatus) return application.photoStatus;
  if (license?.applicantPhotoFileName || application.applicantPhotoFileName) return "Photo Uploaded to License";
  if (application.completionChecklist.photoReceived) return "Photo Received";
  return "Photo Missing";
}

function paymentReadyForSend(application: LicenseApplication) {
  return application.paymentStatus === "Paid" || application.paymentStatus === "Waived" || application.paymentConfirmationType === "Manually Paid" || application.paymentConfirmationType === "Cash Paid" || application.paymentConfirmationType === "Admin Ready Override";
}

function idVerifiedForSend(application: LicenseApplication) {
  const core = coreDocumentStatus(application);
  return core.idVerified || application.completionChecklist.identificationProvided;
}

function licenseReadyToSend(application: LicenseApplication, license?: GeneratedLicense) {
  if (!license) return { ready: false, reason: "Not ready to send — generated license missing." };
  const certifiedOrIssued = license.approvalStatus === "Issued" || license.approvalStatus === "Stamped / Certified" || application.licenseStatus === "Issued";
  if (!certifiedOrIssued) return { ready: false, reason: "Not ready to send — license is not issued or certified." };
  if (license.stampStatus !== "Stamped" && application.stampStatus !== "Stamped") return { ready: false, reason: "Not ready to send — stamp not applied." };
  if (!paymentReadyForSend(application)) return { ready: false, reason: "Not ready to send — payment not confirmed." };
  if (!idVerifiedForSend(application)) return { ready: false, reason: "Not ready to send — passport or National ID not verified." };
  if (photoStatusFor(application, license) !== "Photo Uploaded to License") return { ready: false, reason: "Not ready to send — applicant photo missing." };
  if ((application.summaryReviewStatus ?? license.summaryReviewStatus) !== "Complete") return { ready: false, reason: "Not ready to send — summary review not completed." };
  return { ready: true, reason: "Ready To Send" };
}

function validPhotoFileName(fileName: string) {
  return /\.(jpe?g|png|webp)$/i.test(fileName.trim());
}

function requiredDocumentsComplete(application: LicenseApplication) {
  const requiredDocuments = (application.documentChecklistSnapshot ?? []).filter((item) => item.required);
  if (!requiredDocuments.length) return application.completionChecklist.identificationProvided && application.completionChecklist.photoReceived;
  return requiredDocuments.every((item) => item.verificationStatus === "Verified");
}

function coreDocumentStatus(application: LicenseApplication) {
  const documents = application.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  const photoDocument = documents.find((item) => item.documentName.toLowerCase().includes("photograph") || item.documentName.toLowerCase().includes("photo"));
  return {
    idDocument,
    photoDocument,
    idVerified: idDocument?.verificationStatus === "Verified",
    photoVerified: photoDocument?.verificationStatus === "Verified"
  };
}

function coreDocumentsVerified(application: LicenseApplication) {
  const core = coreDocumentStatus(application);
  return core.idVerified && core.photoVerified;
}

function paymentConfirmed(application: LicenseApplication) {
  return paymentCleared(application) || application.paymentStatus === "Payment Verified" || Boolean(application.paymentConfirmationType === "Cash Paid" || application.paymentConfirmationType === "Manually Paid" || application.paymentConfirmationType === "Admin Ready Override" || application.paymentConfirmationType === "Waived");
}

function licenseIssueBlockers(application: LicenseApplication) {
  const hasIdentity = Boolean(application.passportNumber || application.nationalIdNumber || application.identificationNumber);
  return [
    ...(!hasIdentity ? ["Passport Number or National ID field is required before license generation."] : []),
    ...(!(application.fullLegalName || application.applicantFullName).trim() ? ["Full Legal Name is required before license generation."] : []),
    ...(!categoryLabel(application) ? ["License category is required before license generation."] : []),
    ...(!paymentConfirmed(application) ? ["Payment must be verified, waived, or manually confirmed before license issuance."] : []),
  ];
}

function pendingFlagsForApplication(application: LicenseApplication): LicensePendingFlag[] {
  const core = coreDocumentStatus(application);
  const requiredDocumentsPending = (application.documentChecklistSnapshot ?? []).filter((item) => item.required).some((item) => item.verificationStatus !== "Verified");
  return [
    ...(photoStatusFor(application) !== "Photo Uploaded to License" ? ["Photo Pending" as const] : []),
    ...(!core.idVerified || requiredDocumentsPending ? ["Documents Pending" as const] : []),
    ...((application.summaryReviewStatus ?? "Pending") !== "Complete" ? ["Summary Review Pending" as const] : []),
    ...(application.stampStatus !== "Stamped" ? ["Stamp Pending" as const] : []),
    ...((application.licenseEmailStatus ?? "Not Sent") !== "Sent" ? ["Email Pending" as const] : [])
  ];
}

const chiefReviewStatuses: LicenseApplication["reviewStatus"][] = ["Under Chief Review", "Pending Chief Review", "Approved by Chief", "Ready for Stamp", "License Issued"];

function AdminCoachCertifications({ rows, onChange }: { rows: CoachCertification[]; onChange: (rows: CoachCertification[]) => void }) {
  const safeRows = rows.length ? rows : [{ certificationName: "", issuingOrganization: "", yearIssued: "", notes: "" }];
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-4 md:col-span-2 xl:col-span-3">
      <p className="text-sm font-semibold text-ink">Professional Certifications Held</p>
      <div className="mt-3 space-y-2">
        {safeRows.map((row, index) => (
          <div className="grid gap-2 md:grid-cols-4" key={index}>
            <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" placeholder="Certification name" value={row.certificationName} onChange={(event) => onChange(safeRows.map((item, itemIndex) => itemIndex === index ? { ...item, certificationName: event.target.value } : item))} />
            <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" placeholder="Issuing organization" value={row.issuingOrganization} onChange={(event) => onChange(safeRows.map((item, itemIndex) => itemIndex === index ? { ...item, issuingOrganization: event.target.value } : item))} />
            <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" placeholder="Year issued" value={row.yearIssued} onChange={(event) => onChange(safeRows.map((item, itemIndex) => itemIndex === index ? { ...item, yearIssued: event.target.value.replace(/\D/g, "").slice(0, 4) } : item))} />
            <div className="flex gap-2"><input className="min-w-0 flex-1 rounded border border-black/10 px-3 py-2 text-sm text-ink" placeholder="Notes" value={row.notes} onChange={(event) => onChange(safeRows.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item))} /><button className="rounded border border-red-200 px-2 text-xs font-semibold text-red-700" type="button" onClick={() => onChange(safeRows.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>
          </div>
        ))}
      </div>
      <button className="mt-3 rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel" type="button" onClick={() => onChange([...safeRows, { certificationName: "", issuingOrganization: "", yearIssued: "", notes: "" }])}>Add certification</button>
    </div>
  );
}

function AdminNotableFighters({ rows, onChange }: { rows: NotableFighter[]; onChange: (rows: NotableFighter[]) => void }) {
  const safeRows = rows.length ? rows : [{ fighterName: "", levelRecordNotes: "" }];
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-4 md:col-span-2 xl:col-span-3">
      <p className="text-sm font-semibold text-ink">Notable Fighters Trained</p>
      <div className="mt-3 space-y-2">
        {safeRows.map((row, index) => (
          <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]" key={index}>
            <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" placeholder="Fighter name" value={row.fighterName} onChange={(event) => onChange(safeRows.map((item, itemIndex) => itemIndex === index ? { ...item, fighterName: event.target.value } : item))} />
            <input className="rounded border border-black/10 px-3 py-2 text-sm text-ink" placeholder="Level / record / notes" value={row.levelRecordNotes} onChange={(event) => onChange(safeRows.map((item, itemIndex) => itemIndex === index ? { ...item, levelRecordNotes: event.target.value } : item))} />
            <button className="rounded border border-red-200 px-2 text-xs font-semibold text-red-700" type="button" onClick={() => onChange(safeRows.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
      </div>
      <button className="mt-3 rounded border border-black/10 px-3 py-2 text-xs font-semibold text-steel" type="button" onClick={() => onChange([...safeRows, { fighterName: "", levelRecordNotes: "" }])}>Add fighter</button>
    </div>
  );
}

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
      amountDue: typeof form.amountDue === "number" ? form.amountDue : parseMoneyInput(String(form.amountDue)),
      amountPaid: typeof form.amountPaid === "number" ? form.amountPaid : parseMoneyInput(String(form.amountPaid)),
      invoiceAmount: typeof form.invoiceAmount === "number" ? form.invoiceAmount : parseMoneyInput(String(form.invoiceAmount)),
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
          {form.licenseCategory === "Coach / Second" ? (
            <>
              <AdminCoachCertifications rows={form.coachCertifications ?? []} onChange={(rows) => setValue("coachCertifications", rows)} />
              <AdminNotableFighters rows={form.notableFighters ?? []} onChange={(rows) => setValue("notableFighters", rows)} />
            </>
          ) : null}
          <label className="text-sm font-medium text-steel">Application source<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationSource} onChange={(event) => setValue("applicationSource", event.target.value as LicenseApplication["applicationSource"])}>{licenseApplicationSources.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Application origin<select className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationOrigin} onChange={(event) => setValue("applicationOrigin", event.target.value as LicenseApplication["applicationOrigin"])}>{licenseApplicationOrigins.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-steel">Application scan filename<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.applicationScanFileName} onChange={(event) => setValue("applicationScanFileName", event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Supporting documents<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.supportingDocumentFileNames.join(", ")} onChange={(event) => setValue("supportingDocumentFileNames", event.target.value.split(",").map((item) => item.trim()))} /></label>
          <label className="text-sm font-medium text-steel">Amount due<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" inputMode="decimal" value={form.amountDue} onChange={(event) => setValue("amountDue", parseMoneyInput(event.target.value))} /></label>
          <label className="text-sm font-medium text-steel">Amount paid<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" inputMode="decimal" value={form.amountPaid} onChange={(event) => setValue("amountPaid", parseMoneyInput(event.target.value))} /></label>
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
          <label className="text-sm font-medium text-steel">Invoice amount<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" inputMode="decimal" value={form.invoiceAmount} onChange={(event) => setValue("invoiceAmount", parseMoneyInput(event.target.value))} /></label>
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
  stampAvailable,
  onClose,
  onSubmit
}: {
  application: LicenseApplication;
  stampAvailable: boolean;
  onClose: () => void;
  onSubmit: (application: LicenseApplication, auditAction?: AuditAction) => Promise<void>;
}) {
  const [form, setForm] = useState(application);
  const documentsVerified = requiredDocumentsComplete(form);
  const canChief = paymentCleared(form) && documentsVerified;
  const core = coreDocumentStatus(form);

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

  async function approveAwaitingStamp() {
    const blockers = licenseIssueBlockers(form);
    if (blockers.length) {
      window.alert(blockers.join("\n"));
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

  async function issueLicense() {
    if (!stampAvailable) {
      window.alert("Stamp is not available. Use Approve Awaiting Stamp.");
      return;
    }
    const blockers = licenseIssueBlockers(form);
    if (blockers.length) {
      window.alert(blockers.join("\n"));
      return;
    }
    if (!form.chiefReviewer.trim() || !form.approvalDate) {
      window.alert("Chief reviewer and approval date are required.");
      return;
    }
    await onSubmit({
      ...form,
      reviewStatus: "License Issued",
      licenseStatus: "Issued",
      stampStatus: "Stamped",
      stampDate: form.stampDate || form.approvalDate,
      completionChecklist: { ...form.completionChecklist, chiefReviewComplete: true, stampComplete: true }
    }, "License Issued With Stamp");
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
              <Info label="Receipt Status" value={form.receiptNumber ? `Generated: ${form.receiptNumber}` : "Not generated"} />
              <Info label="Required Documents" value={documentsVerified ? "Verified" : "Not fully verified"} />
              <Info label="License Status" value={form.licenseStatus} />
            </dl>
            {!canChief ? <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Application cannot proceed to Chief Review until payment is verified or waived and required documents are complete.</div> : null}
          </section>
          <section className="rounded border border-black/10 p-4">
            <h4 className="font-semibold text-ink">Core Documents Required For License Issue</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[core.idDocument, core.photoDocument].map((item, index) => (
                <div className="rounded border border-black/10 bg-[#f7f7f5] p-3" key={item?.requirementId ?? index}>
                  <p className="text-sm font-semibold text-ink">{item?.documentName ?? (index === 0 ? "Passport Copy OR National ID Document" : "Passport-Sized Photograph")}</p>
                  <p className="mt-1 text-xs text-steel">{item?.fileName || "No file uploaded"}</p>
                  <div className="mt-2"><StatusBadge value={item?.verificationStatus ?? "Not Received"} /></div>
                </div>
              ))}
            </div>
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
              <label className="text-sm font-medium text-steel md:col-span-3">Chief review notes / Internal comments<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={form.internalNotes} onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))} /></label>
            </div>
          </section>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose}>Close</button>
          <button className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100" onClick={() => void requestMoreDocuments()}>Request More Documents</button>
          <button className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={() => void rejectApplication()}>Reject Application</button>
          <button className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => void markEligible()}>Mark Eligible For Chief Review</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void approveAwaitingStamp()}>Approve Awaiting Stamp</button>
          <button className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600" disabled={!stampAvailable} onClick={() => void issueLicense()}>Issue License if stamp is available</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="font-medium text-steel">{label}</dt><dd className="text-right font-semibold text-ink">{value || "Not set"}</dd></div>;
}

function SummaryReviewModal({
  application,
  license,
  receiptNumber,
  onClose,
  onComplete
}: {
  application: LicenseApplication;
  license?: GeneratedLicense;
  receiptNumber: string;
  onClose: () => void;
  onComplete: (reviewedBy: string, reviewDate: string, notes: string) => Promise<void>;
}) {
  const photoStatus = photoStatusFor(application, license);
  const readiness = licenseReadyToSend(application, license);
  const maskedApplicationId = maskIdentifier(application.passportNumber || application.nationalIdNumber || application.identificationNumber);
  const maskedLicenseId = maskIdentifier(license?.passportNumber);
  const crossChecks = [
    ["Full Name", application.fullLegalName || application.applicantFullName, license?.applicantName],
    ["Nationality", application.nationality, license?.nationality],
    ["Date of Birth", application.dateOfBirth, license?.dateOfBirth],
    ["Passport / National ID masked", maskedApplicationId, maskedLicenseId],
    ["License Category", categoryLabel(application), license?.categoryLabel],
    ["License Number", license?.id, license?.id],
    ["Issue Date", license?.issuedDate || license?.dateIssued, license?.issuedDate || license?.dateIssued],
    ["Expiry Date", application.licenseExpiryDate || license?.expiryDate, license?.expiryDate],
    ["Status", application.licenseStatus, displayLicenseStatus(license)]
  ];
  const warnings = [
    ...(photoStatus !== "Photo Uploaded to License" ? ["Missing Photo"] : []),
    ...(!license?.dateOfBirth ? ["DOB missing on license"] : []),
    ...(application.nationality && license?.nationality && application.nationality !== license.nationality ? ["Nationality mismatch"] : []),
    ...(categoryLabel(application) !== license?.categoryLabel ? ["Category mismatch"] : []),
    ...(!readiness.ready ? [readiness.reason] : [])
  ];

  async function complete() {
    const reviewedBy = window.prompt("Reviewed by")?.trim();
    const reviewDate = window.prompt("Review date", new Date().toISOString().slice(0, 10))?.trim();
    const notes = window.prompt("Optional review notes", application.summaryReviewNotes ?? "")?.trim() ?? "";
    if (!reviewedBy || !reviewDate) {
      window.alert("Reviewed by and review date are required.");
      return;
    }
    await onComplete(reviewedBy, reviewDate, notes);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 p-5">
          <div>
            <h3 className="text-lg font-semibold text-ink">Summary Review</h3>
            <p className="mt-1 text-sm text-steel">{application.id} / {application.applicantFullName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={photoStatus} />
            <StatusBadge value={application.summaryReviewStatus ?? "Pending"} />
            <StatusBadge value={readiness.ready ? "Ready To Send" : "Follow-up Required"} />
          </div>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <ReviewSection title="Section 1 — Personal Information" rows={[
              ["Full Legal Name", application.fullLegalName || application.applicantFullName],
              ["Date of Birth", application.dateOfBirth],
              ["Nationality", application.nationality],
              ["Passport Number", application.passportNumber ?? ""],
              ["National ID Number", application.nationalIdNumber ?? application.nationalIdFormatted ?? ""],
              ["Gender", application.gender ?? ""],
              ["Email", application.email],
              ["Phone", application.phone],
              ["Emergency Contact Name", application.emergencyContactName ?? ""],
              ["Emergency Contact Phone", application.emergencyContactPhone ?? ""]
            ]} />
            <ReviewSection title="Section 2 — Professional Information" rows={[
              ["License Category / Combined Categories", categoryLabel(application)],
              ["Years of Experience", application.yearsOfExperience ?? application.professionalBoxingExperienceYears ?? ""],
              ["Federation/Commission Memberships", application.currentMemberships ?? ""],
              ["Certifications", application.professionalCertificationsHeld ?? application.internationalCertifications ?? ""],
              ["Current Organization / Team", application.currentOrganizationTeam ?? application.currentGymOrTeam ?? ""],
              ["Relevant Experience Notes", application.relevantExperienceNotes ?? ""]
            ]} />
            <ReviewSection title="Section 3 — Background" rows={[
              ["Held previous license", application.heldPreviousLicense ?? ""],
              ["Existing license commission", application.existingLicenseCommission ?? ""],
              ["Suspended by commission", application.suspendedByCommission ?? ""],
              ["Suspension explanation", application.suspensionExplanation ?? ""],
              ["Denied license", application.deniedLicense ?? ""],
              ["Denied license explanation", application.deniedLicenseExplanation ?? ""],
              ["Under investigation", application.underInvestigation ?? ""],
              ["Criminal conviction", application.criminalConviction ?? ""]
            ]} />
            <ReviewSection title="Section 4 — Medical" rows={[
              ["Medical condition", application.medicalCondition ?? ""],
              ["Medical condition explanation", application.medicalConditionExplanation ?? ""],
              ["Concussion past 12 months", application.concussionPast12Months ?? ""],
              ["Prescribed medications", application.prescribedMedications ?? ""],
              ["Prescribed medications list", application.prescribedMedicationsList ?? ""],
              ["Blood Type", application.bloodType ?? ""],
              ["Allergies", application.allergies ?? ""]
            ]} />
            <ReviewSection title="Section 5 — Documents" rows={[
              ["Passport / ID document status", documentStatusText(application, "passport") || documentStatusText(application, "national id") || (application.completionChecklist.identificationProvided ? "Received" : "Not received")],
              ["Photo status", photoStatus],
              ["Existing License Copies status", application.heldPreviousLicense === "Yes" ? application.existingLicenseEvidenceFileName || documentStatusText(application, "existing license") || "Missing" : "Not applicable"],
              ["Other uploaded document statuses", (application.documentChecklistSnapshot ?? []).filter((item) => !/passport|national id|photo|photograph|existing license/i.test(item.documentName)).map((item) => `${item.documentName}: ${item.verificationStatus}`).join("; ")]
            ]} />
            <ReviewSection title="Section 6 — Payment" rows={[
              ["Payment Status", application.paymentStatus],
              ["Amount Paid", formatCurrency(application.amountPaid, application.currency)],
              ["Payment Method", application.paymentMethod],
              ["Payment Date", application.paymentDate],
              ["Receipt Number", receiptNumber],
              ["Paid To", application.paidTo]
            ]} />
            <ReviewSection title="Section 8 — UAEAC Internal" rows={[
              ["Reviewed By", application.reviewedBy],
              ["Chief Reviewer", application.chiefReviewer],
              ["Approval Date", application.approvalDate],
              ["Review Status", application.reviewStatus],
              ["License Status", application.licenseStatus],
              ["Stamp Status", application.stampStatus]
            ]} />
          </div>
          <aside className="space-y-4">
            <section className="rounded border border-black/10 bg-[#f7f7f5] p-4">
              <h4 className="font-semibold text-ink">License Cross-Check</h4>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="text-steel"><tr><th className="py-2">Application Field</th><th className="py-2">License Field</th><th className="py-2">Status</th></tr></thead>
                  <tbody className="divide-y divide-black/10">
                    {crossChecks.map(([label, applicationValue, licenseValue]) => {
                      const missing = !applicationValue || !licenseValue;
                      const mismatch = Boolean(applicationValue && licenseValue && applicationValue !== licenseValue);
                      return <tr key={label}><td className="py-2 text-steel">{label}: <span className="font-semibold text-ink">{applicationValue || "Missing"}</span></td><td className="py-2 text-steel">{licenseValue || "Missing"}</td><td className="py-2"><StatusBadge value={missing || mismatch ? "Needs Clarification" : "Verified"} /></td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded border border-black/10 bg-white p-4">
              <h4 className="font-semibold text-ink">Readiness</h4>
              <p className="mt-2 text-sm text-steel">{readiness.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {warnings.length ? warnings.map((warning) => <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800" key={warning}>{warning}</span>) : <StatusBadge value="Ready To Send" />}
              </div>
            </section>
          </aside>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose}>Close</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => void complete()}>Mark Summary Review Complete</button>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="rounded border border-black/10 bg-white p-4">
      <h4 className="font-semibold text-ink">{title}</h4>
      <dl className="mt-3 space-y-2 text-sm">{rows.map(([label, value]) => <Info key={label} label={label} value={value} />)}</dl>
    </section>
  );
}

function maskIdentifier(value: string | undefined) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, "");
  return normalized.length <= 4 ? normalized : `${"X".repeat(Math.max(4, normalized.length - 4))}${normalized.slice(-4)}`;
}

function documentStatusText(application: LicenseApplication, pattern: string) {
  const document = (application.documentChecklistSnapshot ?? []).find((item) => item.documentName.toLowerCase().includes(pattern));
  return document ? `${document.verificationStatus}${document.fileName ? ` · ${document.fileName}` : ""}` : "";
}

function displayLicenseStatus(license?: GeneratedLicense) {
  if (!license) return "";
  return license.approvalStatus === "Stamped / Certified" ? "Certified" : license.approvalStatus ?? "Draft";
}

function PaymentSectionModal({
  application,
  auditLogs,
  onClose,
  onSubmit
}: {
  application: LicenseApplication;
  auditLogs: ReturnType<typeof useFinanceData>["auditLogs"];
  onClose: () => void;
  onSubmit: (application: LicenseApplication, auditAction: AuditAction) => Promise<void>;
}) {
  const paymentAudit = auditLogs.filter((log) => log.module === "License Applications" && log.recordId === application.id && log.action.toLowerCase().includes("payment"));
  const documentsComplete = requiredDocumentsComplete(application);
  const coreComplete = coreDocumentsVerified(application);

  function basePaymentPatch(notes: string) {
    return `${application.paymentNotes ? `${application.paymentNotes}\n` : ""}${notes}`;
  }

  async function rejectPaymentProof() {
    const reason = window.prompt("Payment rejection reason is required.");
    if (!reason?.trim()) return;
    const rejectedBy = window.prompt("Rejected by")?.trim();
    if (!rejectedBy) return;
    await onSubmit({
      ...application,
      paymentStatus: "Rejected",
      reviewStatus: "Pending Review - Payment Section",
      licenseStatus: "Awaiting Payment",
      paymentRejectionReason: reason.trim(),
      paymentRejectedBy: rejectedBy,
      paymentRejectionDate: new Date().toISOString().slice(0, 10),
      completionChecklist: { ...application.completionChecklist, paymentReceived: false },
      paymentNotes: basePaymentPatch(`Payment proof rejected by ${rejectedBy}: ${reason.trim()}`)
    }, "Payment Proof Rejected");
  }

  async function markCashPaid() {
    const amount = parseMoneyInput(window.prompt("Amount paid") ?? "");
    const receivedBy = window.prompt("Received by")?.trim();
    const paymentDate = window.prompt("Payment date", new Date().toISOString().slice(0, 10))?.trim();
    const notes = window.prompt("Notes")?.trim();
    if (!amount || !receivedBy || !paymentDate || !notes) return;
    await onSubmit({
      ...application,
      amountPaid: amount,
      totalFeesPaid: amount,
      paymentMethod: "Cash",
      paymentStatus: "Paid",
      invoiceStatus: "Paid",
      paymentDate,
      paymentConfirmedBy: receivedBy,
      paymentConfirmationType: "Cash Paid",
      reviewStatus: documentsComplete ? "Eligible For Chief Review" : "Pending Documents",
      licenseStatus: documentsComplete ? "Awaiting Review" : "Awaiting Payment",
      completionChecklist: { ...application.completionChecklist, paymentReceived: true },
      paymentNotes: basePaymentPatch(`Cash payment marked paid by ${receivedBy}: ${notes}`)
    }, "Payment Marked Cash Paid");
  }

  async function markManuallyPaid() {
    const amount = parseMoneyInput(window.prompt("Amount paid") ?? "");
    const method = window.prompt("Payment method", application.paymentMethod)?.trim() as LicenseApplication["paymentMethod"] | undefined;
    const confirmedBy = window.prompt("Received / confirmed by")?.trim();
    const paymentDate = window.prompt("Payment date", new Date().toISOString().slice(0, 10))?.trim();
    const notes = window.prompt("Notes")?.trim();
    if (!amount || !method || !confirmedBy || !paymentDate || !notes) return;
    await onSubmit({
      ...application,
      amountPaid: amount,
      totalFeesPaid: amount,
      paymentMethod: method,
      paymentStatus: "Paid",
      invoiceStatus: "Paid",
      paymentDate,
      paymentConfirmedBy: confirmedBy,
      paymentConfirmationType: "Manually Paid",
      reviewStatus: documentsComplete ? "Eligible For Chief Review" : "Pending Documents",
      licenseStatus: documentsComplete ? "Awaiting Review" : "Awaiting Payment",
      completionChecklist: { ...application.completionChecklist, paymentReceived: true },
      paymentNotes: basePaymentPatch(`Manual payment confirmed by ${confirmedBy}: ${notes}`)
    }, "Payment Marked Manually Paid");
  }

  async function markWaived() {
    const reason = window.prompt("Waiver reason is required.")?.trim();
    const authorizedBy = window.prompt("Authorized by")?.trim();
    if (!reason || !authorizedBy) return;
    await onSubmit({
      ...application,
      paymentStatus: "Waived",
      invoiceStatus: "Waived",
      paymentConfirmedBy: authorizedBy,
      paymentConfirmationType: "Waived",
      reviewStatus: documentsComplete ? "Eligible For Chief Review" : "Pending Documents",
      licenseStatus: documentsComplete ? "Awaiting Review" : "Awaiting Payment",
      completionChecklist: { ...application.completionChecklist, paymentReceived: true },
      paymentNotes: basePaymentPatch(`Payment waived by ${authorizedBy}: ${reason}`)
    }, "Payment Waived");
  }

  async function markReadyForChiefReview() {
    if (!coreComplete) {
      window.alert("Passport Copy OR National ID Document and Passport-Sized Photograph must be Verified before Chief Review override.");
      return;
    }
    const reason = window.prompt("Override reason is required.")?.trim();
    const authorizedBy = window.prompt("Authorized by")?.trim();
    if (!reason || !authorizedBy) return;
    await onSubmit({
      ...application,
      reviewStatus: "Eligible For Chief Review",
      licenseStatus: "Awaiting Review",
      paymentConfirmationType: application.paymentConfirmationType || "Admin Ready Override",
      paymentReadyOverrideReason: reason,
      paymentReadyOverrideBy: authorizedBy,
      paymentNotes: basePaymentPatch(`Ready for Chief Review override by ${authorizedBy}: ${reason}`)
    }, "Application Manually Marked Ready For Chief Review");
  }

  async function verifyPayment() {
    await onSubmit({
      ...application,
      paymentStatus: "Paid",
      invoiceStatus: "Paid",
      reviewStatus: documentsComplete ? "Eligible For Chief Review" : "Pending Documents",
      licenseStatus: documentsComplete ? "Awaiting Review" : "Awaiting Payment",
      completionChecklist: { ...application.completionChecklist, paymentReceived: true },
      paymentNotes: basePaymentPatch("Payment verified from payment section review.")
    }, "Payment Verified");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">Review Payment Section</h3>
          <p className="mt-1 text-sm text-steel">{application.id} / {application.applicantFullName}</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Info label="Invoice number" value={application.invoiceNumber || "Not generated"} />
          <Info label="Invoice amount" value={formatCurrency(application.invoiceAmount || application.amountDue, application.invoiceCurrency ?? application.currency)} />
          <Info label="Payment proof filename" value={application.paymentProofFileName ?? "Not uploaded"} />
          <Info label="Payment method" value={application.paymentMethod} />
          <Info label="Amount paid" value={formatCurrency(application.amountPaid, application.currency)} />
          <Info label="Payment date" value={application.paymentDate} />
          <Info label="Reference number" value={application.paymentReference} />
          <Info label="Paid to" value={application.paidTo} />
          <Info label="Payment status" value={application.paymentStatus} />
          <Info label="Review status" value={application.reviewStatus} />
          <Info label="Rejection reason" value={application.paymentRejectionReason ?? "None"} />
          <Info label="Rejected by/date" value={application.paymentRejectedBy ? `${application.paymentRejectedBy} / ${application.paymentRejectionDate ?? ""}` : "None"} />
          <label className="md:col-span-2 text-sm font-medium text-steel">Payment notes<textarea readOnly className="mt-1 min-h-24 w-full rounded border border-black/10 bg-[#f7f7f5] px-3 py-2 text-ink" value={application.paymentNotes} /></label>
          <section className="md:col-span-2 rounded border border-black/10 bg-[#f7f7f5] p-4">
            <h4 className="font-semibold text-ink">Payment audit history</h4>
            <div className="mt-3 space-y-2">
              {paymentAudit.length ? paymentAudit.map((log, index) => <p className="text-sm text-steel" key={`audit-${log.id}-${index}`}>{formatDate(log.timestamp)} · {log.action} · {log.notes}</p>) : <p className="text-sm text-steel">No payment audit entries yet.</p>}
            </div>
          </section>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose}>Close</button>
          <button className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700" onClick={() => void verifyPayment()}>Verify Payment</button>
          <button className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => void rejectPaymentProof()}>Reject Payment</button>
          <button className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700" onClick={() => void markCashPaid()}>Mark as Cash Paid</button>
          <button className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700" onClick={() => void markManuallyPaid()}>Mark as Manually Paid</button>
          <button className="rounded border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700" onClick={() => void markWaived()}>Mark as Waived</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink" onClick={() => void markReadyForChiefReview()}>Mark as Ready for Chief Review</button>
        </div>
      </div>
    </div>
  );
}

export default function LicenseApplicationsPage() {
  const { documents, auditLogs, licenseApplications, licenseReceipts, generatedLicenses, stampSettings, addLicenseApplication, updateLicenseApplication, deleteLicenseApplication, generateLicenseReceipt, generateLicenseDraft, updateGeneratedLicense, addAuditLog } = useFinanceData();
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
  const [summaryReviewing, setSummaryReviewing] = useState<LicenseApplication | null>(null);
  const [paymentReviewing, setPaymentReviewing] = useState<LicenseApplication | null>(null);
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
      const linkedLicense = generatedLicenses.find((license) => license.applicationId === application.id);
      const readiness = licenseReadyToSend(application, linkedLicense);
      const photoStatus = photoStatusFor(application, linkedLicense);
      const matchesSpecial =
        specialFilter === "Missing Required Documents" ? missingRequiredDocuments
          : specialFilter === "Identification Missing" ? identificationMissing
            : specialFilter === "Awaiting Payment" ? awaitingPayment
              : specialFilter === "Ready for Chief Review" ? readyForChiefReview
                : specialFilter === "Ready for Stamp" ? readyForStamp
                  : specialFilter === "Photo Missing" ? photoStatus === "Photo Missing"
                    : specialFilter === "Photo Requested" ? photoStatus === "Photo Requested"
                      : specialFilter === "Ready To Send" ? readiness.ready
                        : specialFilter === "Sent" ? (application.licenseEmailStatus ?? linkedLicense?.licenseEmailStatus) === "Sent"
                          : specialFilter === "Summary Review Pending" ? (application.summaryReviewStatus ?? linkedLicense?.summaryReviewStatus) !== "Complete"
                            : specialFilter === "Payment Confirmed But License Not Generated" ? paymentConfirmed(application) && !linkedLicense
                              : true;
      return matchesQuery && matchesPayment && matchesPaidTo && matchesInvoice && matchesReview && matchesLicense && matchesStamp && matchesSource && matchesOrigin && matchesCategory && matchesSpecial;
    });
  }, [categoryFilter, generatedLicenses, invoiceFilter, licenseApplications, licenseFilter, originFilter, paidToFilter, paymentFilter, query, reviewFilter, sourceFilter, specialFilter, stampFilter]);

  const summary = {
    total: licenseApplications.length,
    pendingPayment: licenseApplications.filter((application) => application.paymentStatus === "Pending Payment" || application.paymentStatus === "Partially Paid").length,
    pendingChief: licenseApplications.filter((application) => application.reviewStatus === "Pending Chief Review").length,
    awaitingStamp: licenseApplications.filter((application) => application.licenseStatus === "Approved Awaiting Stamp").length,
    issued: licenseApplications.filter((application) => application.licenseStatus === "Issued" || application.reviewStatus === "License Issued").length,
    rejected: licenseApplications.filter((application) => application.reviewStatus === "Rejected" || application.licenseStatus === "Rejected").length
  };

  function linkedLicenseFor(application: LicenseApplication) {
    return generatedLicenses.find((license) => license.applicationId === application.id);
  }

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
    if (auditAction === "License Issued With Stamp") {
      try {
        const generated = await generateLicenseDraft(application);
        updateGeneratedLicense({
          ...generated,
          approvalStatus: "Issued",
          stampStatus: "Stamped",
          stampedBy: stampSettings.defaultStampedBy,
          stampDate: application.stampDate || application.approvalDate || new Date().toISOString().slice(0, 10),
          stampImageFileName: stampSettings.stampImageFileName || "/uaeac-stamp-red.jpeg",
          stampPosition: stampSettings.stampPositionDefault ?? "Bottom Right",
          stampSize: stampSettings.stampSize ?? "Medium",
          issuedDate: new Date().toISOString().slice(0, 10)
        });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Unable to issue stamped license document.");
      }
    }
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

  async function savePaymentSection(application: LicenseApplication, auditAction: AuditAction) {
    await updateLicenseApplication(application);
    addAuditLog({
      module: "License Applications",
      recordId: application.id,
      recordLabel: application.applicantFullName,
      action: "Payment Section Reviewed",
      changedBy: "Finance Admin",
      previousValueSummary: "",
      newValueSummary: `${application.paymentStatus}; ${application.reviewStatus}`,
      notes: "Payment section opened and reviewed."
    });
    addAuditLog({
      module: "License Applications",
      recordId: application.id,
      recordLabel: application.applicantFullName,
      action: auditAction,
      changedBy: "Finance Admin",
      previousValueSummary: "",
      newValueSummary: `${application.paymentStatus}; ${application.invoiceStatus}; ${application.reviewStatus}`,
      notes: application.paymentNotes || application.paymentRejectionReason || ""
    });
    setPaymentReviewing(null);
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
      reviewStatus: "Pending Review - Payment Section",
      licenseStatus: "Awaiting Payment",
      paymentRejectionReason: note.trim(),
      paymentRejectedBy: "Finance Admin",
      paymentRejectionDate: new Date().toISOString().slice(0, 10),
      completionChecklist: {
        ...application.completionChecklist,
        paymentReceived: false
      },
      paymentNotes: `${application.paymentNotes ? `${application.paymentNotes}\n` : ""}Payment rejected: ${note.trim()}`,
      updatedAt: new Date().toISOString()
    });
    addAuditLog({
      module: "License Applications",
      recordId: application.id,
      recordLabel: application.applicantFullName,
      action: "Payment Proof Rejected",
      changedBy: "Finance Admin",
      previousValueSummary: "",
      newValueSummary: "Payment Status: Rejected; Review Status: Pending Review - Payment Section",
      notes: note.trim()
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
    const blockers = licenseIssueBlockers(application);
    if (blockers.length) {
      addAuditLog({
        module: "License Applications",
        recordId: application.id,
        recordLabel: application.applicantFullName,
        action: "License Issue Blocked By Missing Core Document",
        changedBy: "Local User",
        previousValueSummary: "",
        newValueSummary: blockers.join(" "),
        notes: blockers.join(" ")
      });
      window.alert(blockers.join("\n"));
      return;
    }
    const pendingFlags = pendingFlagsForApplication(application);
    const core = coreDocumentStatus(application);
    const warnings = [
      ...pendingFlags,
      ...(!core.idVerified ? ["Passport / National ID proof is not verified yet."] : [])
    ];
    if (warnings.length && !window.confirm(`Generate license with pending administrative items?\n\n${warnings.join("\n")}\n\nLicense generated with pending administrative items. Review before final external sending.`)) {
      return;
    }
    try {
      await generateLicenseDraft(application);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to generate license draft.");
    }
  }

  async function markPhotoRequested(application: LicenseApplication) {
    const today = new Date().toISOString().slice(0, 10);
    const updated: LicenseApplication = {
      ...application,
      photoStatus: "Photo Requested",
      licenseEmailStatus: "Photo Requested",
      emailPreparedDate: application.emailPreparedDate || today,
      emailNotes: `${application.emailNotes ? `${application.emailNotes}\n` : ""}Photo requested on ${today}.`,
      updatedAt: new Date().toISOString()
    };
    await updateLicenseApplication(updated);
    const license = linkedLicenseFor(application);
    if (license) {
      updateGeneratedLicense({ ...license, photoStatus: "Photo Requested", licenseEmailStatus: "Photo Requested", emailPreparedDate: license.emailPreparedDate || today });
    }
  }

  async function uploadApplicantPhoto(application: LicenseApplication) {
    const fileName = window.prompt("Applicant photo filename or local placeholder path (.jpg, .jpeg, .png, .webp)", application.applicantPhotoFileName || "");
    if (!fileName?.trim()) return;
    if (!validPhotoFileName(fileName)) {
      window.alert("Photo must be JPG, JPEG, PNG, or WEBP.");
      return;
    }
    const license = linkedLicenseFor(application);
    const updatedApplication: LicenseApplication = {
      ...application,
      applicantPhotoFileName: fileName.trim(),
      photoStatus: "Photo Uploaded to License",
      completionChecklist: { ...application.completionChecklist, photoReceived: true },
      updatedAt: new Date().toISOString()
    };
    await updateLicenseApplication(updatedApplication);
    if (license) {
      updateGeneratedLicense({
        ...license,
        applicantPhotoFileName: fileName.trim(),
        photoStatus: "Photo Uploaded to License"
      });
    }
    addAuditLog({
      module: "License Applications",
      recordId: application.id,
      recordLabel: application.applicantFullName,
      action: "Applicant Photo Uploaded",
      changedBy: "Local User",
      previousValueSummary: application.applicantPhotoFileName || "No photo",
      newValueSummary: fileName.trim(),
      notes: "Applicant photo uploaded and linked to generated license if available."
    });
  }

  async function completeSummaryReview(application: LicenseApplication, reviewedBy: string, reviewDate: string, notes: string) {
    const license = linkedLicenseFor(application);
    const readiness = licenseReadyToSend({ ...application, summaryReviewStatus: "Complete", photoStatus: application.photoStatus }, license ? { ...license, summaryReviewStatus: "Complete" } : undefined);
    const emailStatus: LicenseEmailStatus = readiness.ready ? "Ready To Send" : application.licenseEmailStatus ?? "Not Sent";
    const updatedApplication: LicenseApplication = {
      ...application,
      summaryReviewStatus: "Complete",
      summaryReviewedBy: reviewedBy,
      summaryReviewedDate: reviewDate,
      summaryReviewNotes: notes,
      licenseEmailStatus: emailStatus,
      emailPreparedDate: readiness.ready ? new Date().toISOString().slice(0, 10) : application.emailPreparedDate,
      updatedAt: new Date().toISOString()
    };
    await updateLicenseApplication(updatedApplication);
    if (license) {
      updateGeneratedLicense({
        ...license,
        summaryReviewStatus: "Complete",
        summaryReviewedBy: reviewedBy,
        summaryReviewedDate: reviewDate,
        summaryReviewNotes: notes,
        licenseEmailStatus: emailStatus,
        emailPreparedDate: readiness.ready ? new Date().toISOString().slice(0, 10) : license.emailPreparedDate
      });
    }
    addAuditLog({
      module: "License Applications",
      recordId: application.id,
      recordLabel: application.applicantFullName,
      action: "Summary Review Completed",
      changedBy: reviewedBy,
      previousValueSummary: application.summaryReviewStatus ?? "Pending",
      newValueSummary: `Complete on ${reviewDate}`,
      notes
    });
    setSummaryReviewing(null);
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
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={specialFilter} onChange={(event) => setSpecialFilter(event.target.value)}><option value="">Workflow Filter</option>{["Missing Required Documents", "Identification Missing", "Awaiting Payment", "Ready for Chief Review", "Ready for Stamp", "Photo Missing", "Photo Requested", "Ready To Send", "Sent", "Summary Review Pending", "Payment Confirmed But License Not Generated"].map((filter) => <option key={filter} value={filter}>{filter}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["APP ID", "LIN", "Applicant Name", "Category", "Amount Due", "Amount Paid", "Payment Status", "Paid To", "Invoice Number", "Receipt Number", "Invoice Status", "Review Status", "License Status", "Stamp Status", "Photo Status", "Send Readiness", "Required Documents Completion %", "Application Source", "Origin", "Created Date", "Warnings", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((application) => {
                const documentCount = documents.filter((document) => document.linkedModule === "License Application" && document.linkedRecordId === application.id).length;
                const linkedLicense = linkedLicenseFor(application);
                const readiness = licenseReadyToSend(application, linkedLicense);
                const pendingFlags = linkedLicense?.pendingFlags?.length ? linkedLicense.pendingFlags : pendingFlagsForApplication(application);
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
                    <td className="px-4 py-4"><StatusBadge value={photoStatusFor(application, linkedLicense)} /></td>
                    <td className="max-w-[240px] px-4 py-4"><StatusBadge value={readiness.ready ? "Ready To Send" : "Follow-up Required"} /><p className="mt-1 text-xs text-steel">{readiness.reason}</p></td>
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
                      {pendingFlags.includes("Photo Pending") ? <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Photo Pending</span> : null}
                      {pendingFlags.includes("Summary Review Pending") ? <span className="ml-2 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Summary Review Pending</span> : null}
                      {linkedLicense?.approvalStatus === "Generated With Pending Items" ? <p className="mt-2 text-xs font-semibold text-amber-800">Generated with pending items *</p> : null}
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
                        <button className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100" onClick={() => setPaymentReviewing(application)} type="button"><ReceiptText className="h-3 w-3" />Review Payment Section</button>
                        <button className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100" onClick={() => setSummaryReviewing(application)} type="button"><FileCheck2 className="h-3 w-3" />Summary Review</button>
                        <button className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100" onClick={() => void markPhotoRequested(application)} type="button"><Camera className="h-3 w-3" />Mark Photo Requested</button>
                        <button className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => void uploadApplicantPhoto(application)} type="button"><Camera className="h-3 w-3" />Upload Applicant Photo</button>
                        {paymentCleared(application) && !licenseReceipts.some((receipt) => receipt.applicationId === application.id) ? (
                          <button className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100" onClick={() => void generateReceipt(application)} type="button"><ReceiptText className="h-3 w-3" />Generate Receipt</button>
                        ) : null}
                        {linkedLicense ? (
                          <a className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-xs font-semibold text-steel hover:border-gold hover:text-ink" href="/generated-licenses">Open Generated License</a>
                        ) : paymentConfirmed(application) && application.licenseStatus !== "Rejected" ? (
                          <button className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => void generateLicense(application)} type="button"><FileCheck2 className="h-3 w-3" />Generate License</button>
                        ) : (
                          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Payment Pending</span>
                        )}
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
      {reviewing ? <ReviewModal application={reviewing} stampAvailable={stampSettings.stampAvailable === "Yes"} onClose={() => setReviewing(null)} onSubmit={saveReview} /> : null}
      {summaryReviewing ? <SummaryReviewModal application={summaryReviewing} license={linkedLicenseFor(summaryReviewing)} receiptNumber={summaryReviewing.receiptNumber || licenseReceipts.find((receipt) => receipt.applicationId === summaryReviewing.id)?.id || "Not generated"} onClose={() => setSummaryReviewing(null)} onComplete={(reviewedBy, reviewDate, notes) => completeSummaryReview(summaryReviewing, reviewedBy, reviewDate, notes)} /> : null}
      {paymentReviewing ? <PaymentSectionModal application={paymentReviewing} auditLogs={auditLogs} onClose={() => setPaymentReviewing(null)} onSubmit={savePaymentSection} /> : null}
    </>
  );
}
