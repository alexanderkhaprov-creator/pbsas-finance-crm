"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  auditLogs as initialAuditLogs,
  applicationImports as initialApplicationImports,
  appSettings as initialAppSettings,
  costCenters as initialCostCenters,
  documents as initialDocuments,
  events as initialEvents,
  expenses as initialExpenses,
  financialPeriods as initialFinancialPeriods,
  generatedLicenses as initialGeneratedLicenses,
  licenseApplications as initialLicenseApplications,
  licenseDocumentRequirements as initialLicenseDocumentRequirements,
  licenseFeeSchedule as initialLicenseFeeSchedule,
  licenseIntake as initialLicenseIntake,
  licenseReceipts as initialLicenseReceipts,
  paymentSettings as initialPaymentSettings,
  people as initialPeople,
  receipts as initialReceipts,
  reimbursements as initialReimbursements,
  revenue as initialRevenues,
  stampSettings as initialStampSettings
} from "@/data/mock-data";
import { reimbursementIdForExpense } from "@/lib/finance-calculations";
import { ensureRecordIds, getNextSequentialId, isValidRecordId } from "@/lib/id-utils";
import { parseMoneyInput } from "@/lib/money-utils";
import { getMappedValue } from "@/lib/ocr-import";
import type { AppSettings, ApplicationImport, AuditAction, AuditLog, AuditModule, CostCenter, Event, Expense, FinancialPeriod, GeneratedLicense, InternalNote, LicenseApplication, LicenseCompletionChecklist, LicenseDocumentChecklistItem, LicenseDocumentRequirement, LicenseFeeScheduleItem, LicenseIntake, LicenseReceipt, PaymentSettings, Person, ReceiptFile, ReceiptIntake, Reimbursement, Revenue, StampSettings, SupportingDocument } from "@/types";

type ExpenseInput = Omit<Expense, "id">;
type BatchExpenseInput = ExpenseInput & {
  personOwed: string;
  responsiblePerson: string;
};
type EntityInput<T extends { id: string }> = Omit<T, "id"> & Partial<Pick<T, "id">>;
type BackupData = {
  people: Person[];
  events: Event[];
  expenses: Expense[];
  reimbursements: Reimbursement[];
  revenues: Revenue[];
  receipts: ReceiptIntake[];
  costCenters: CostCenter[];
  auditLogs: AuditLog[];
  documents: SupportingDocument[];
  applicationImports: ApplicationImport[];
  licenseApplications: LicenseApplication[];
  licenseIntake: LicenseIntake[];
  licenseReceipts: LicenseReceipt[];
  generatedLicenses: GeneratedLicense[];
  stampSettings: StampSettings;
  licenseFeeSchedule: LicenseFeeScheduleItem[];
  licenseDocumentRequirements: LicenseDocumentRequirement[];
  paymentSettings: PaymentSettings;
  appSettings: AppSettings;
  financialPeriods: FinancialPeriod[];
  exportedAt: string;
  appVersion: string;
};

const APP_VERSION = "1.0.0";
const storageKeys = {
  people: "pbsas_people_v1",
  events: "pbsas_events_v1",
  expenses: "pbsas_expenses_v1",
  reimbursements: "pbsas_reimbursements_v1",
  revenues: "pbsas_revenues_v1",
  receipts: "pbsas_receipts_v1",
  costCenters: "pbsas_cost_centers_v1",
  auditLogs: "pbsas_audit_logs_v1",
  documents: "pbsas_documents_v1",
  applicationImports: "pbsas_application_imports_v1",
  licenseApplications: "pbsas_license_applications_v1",
  licenseIntake: "pbsas_license_intake_v1",
  licenseReceipts: "pbsas_license_receipts_v1",
  generatedLicenses: "pbsas_generated_licenses_v1",
  stampSettings: "pbsas_stamp_settings_v1",
  licenseFeeSchedule: "pbsas_license_fee_schedule_v1",
  licenseDocumentRequirements: "pbsas_license_document_requirements_v1",
  paymentSettings: "pbsas_payment_settings_v1",
  appSettings: "pbsas_app_settings_v1",
  financialPeriods: "pbsas_financial_periods_v1"
} as const;

const LICENSE_YEAR_PREFIX = "UAEAC2026";
const UNIVERSAL_REQUIRED_LICENSE_DOCUMENTS = ["Copy of Passport OR National ID document", "Passport-Sized Photograph"];
const UNIVERSAL_OPTIONAL_LICENSE_DOCUMENTS = ["Current Medical Examination", "Professional Certifications Held", "Other Supporting Documents"];

function isLicenseDocumentRequired(documentName: string, category: LicenseApplication["licenseCategory"], heldPreviousLicense: LicenseApplication["heldPreviousLicense"]) {
  if (heldPreviousLicense === "Yes" && documentName === "Existing License Copies") return true;
  if (UNIVERSAL_REQUIRED_LICENSE_DOCUMENTS.includes(documentName)) return true;
  if (category === "Professional Boxer") return false;
  return false;
}

function normalizeLicenseCategory(category: string): LicenseApplication["licenseCategory"] {
  const mapping: Record<string, LicenseApplication["licenseCategory"]> = {
    Boxer: "Professional Boxer",
    Coach: "Coach / Second",
    Physician: "Ringside Physician / Doctor"
  };
  return mapping[category] ?? (category as LicenseApplication["licenseCategory"]);
}

function isOnlineApplication(application: Pick<LicenseApplication, "applicationOrigin">) {
  return application.applicationOrigin === "Online Form" || application.applicationOrigin === "Online Application";
}

function getNextInvoiceNumber(applications: Array<{ invoiceNumber?: string | null }>) {
  const highestNumber = applications.reduce((highest, application) => {
    const match = typeof application.invoiceNumber === "string" ? application.invoiceNumber.match(/^INV-2026-(\d{6})$/) : null;
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `INV-2026-${String(highestNumber + 1).padStart(6, "0")}`;
}

type FinanceDataContextValue = {
  people: Person[];
  events: Event[];
  expenses: Expense[];
  reimbursements: Reimbursement[];
  revenues: Revenue[];
  receipts: ReceiptIntake[];
  costCenters: CostCenter[];
  auditLogs: AuditLog[];
  documents: SupportingDocument[];
  applicationImports: ApplicationImport[];
  licenseApplications: LicenseApplication[];
  licenseIntake: LicenseIntake[];
  licenseReceipts: LicenseReceipt[];
  generatedLicenses: GeneratedLicense[];
  licenseFeeSchedule: LicenseFeeScheduleItem[];
  licenseDocumentRequirements: LicenseDocumentRequirement[];
  stampSettings: StampSettings;
  paymentSettings: PaymentSettings;
  appSettings: AppSettings;
  financialPeriods: FinancialPeriod[];
  isLoading: boolean;
  dataSource: "mock";
  error: string;
  addPerson: (person: EntityInput<Person>) => Promise<void>;
  updatePerson: (person: Person) => Promise<void>;
  deletePerson: (person: Person) => Promise<void>;
  addEvent: (event: EntityInput<Event>) => Promise<void>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (event: Event) => Promise<void>;
  addExpense: (expense: ExpenseInput) => Promise<Expense>;
  addBatchExpenses: (expenses: BatchExpenseInput[]) => Promise<Expense[]>;
  convertReceiptToExpense: (receipt: ReceiptIntake) => Promise<Expense>;
  updateExpense: (expense: Expense) => Promise<Expense>;
  deleteExpense: (expense: Expense) => Promise<void>;
  uploadReceipt: (expense: Expense, file: File, notes?: string) => Promise<ReceiptFile>;
  addReimbursement: (reimbursement: EntityInput<Reimbursement>) => Promise<void>;
  updateReimbursement: (reimbursement: Reimbursement) => Promise<void>;
  deleteReimbursement: (reimbursement: Reimbursement) => Promise<void>;
  addRevenue: (revenue: EntityInput<Revenue>) => Promise<void>;
  updateRevenue: (revenue: Revenue) => Promise<void>;
  deleteRevenue: (revenue: Revenue) => Promise<void>;
  addReceipt: (receipt: EntityInput<ReceiptIntake>) => Promise<void>;
  updateReceipt: (receipt: ReceiptIntake) => Promise<void>;
  deleteReceipt: (receipt: ReceiptIntake) => Promise<void>;
  addCostCenter: (costCenter: EntityInput<CostCenter>) => Promise<void>;
  updateCostCenter: (costCenter: CostCenter) => Promise<void>;
  deleteCostCenter: (costCenter: CostCenter) => Promise<void>;
  archiveCostCenter: (costCenter: CostCenter) => Promise<void>;
  addDocument: (document: EntityInput<SupportingDocument>) => Promise<void>;
  updateDocument: (document: SupportingDocument) => Promise<void>;
  deleteDocument: (document: SupportingDocument) => Promise<void>;
  addApplicationImport: (applicationImport: EntityInput<ApplicationImport>) => Promise<ApplicationImport>;
  updateApplicationImport: (applicationImport: ApplicationImport) => Promise<void>;
  deleteApplicationImport: (applicationImport: ApplicationImport) => Promise<void>;
  convertApplicationImportToApplication: (applicationImport: ApplicationImport) => Promise<LicenseApplication>;
  addLicenseApplication: (application: EntityInput<LicenseApplication>) => Promise<LicenseApplication>;
  updateLicenseApplication: (application: LicenseApplication) => Promise<LicenseApplication>;
  deleteLicenseApplication: (application: LicenseApplication) => Promise<void>;
  addLicenseIntake: (intake: EntityInput<LicenseIntake>) => Promise<LicenseIntake>;
  addBulkLicenseIntake: (intakeRows: Array<Omit<EntityInput<LicenseIntake>, "id">>) => Promise<LicenseIntake[]>;
  updateLicenseIntake: (intake: LicenseIntake) => Promise<void>;
  deleteLicenseIntake: (intake: LicenseIntake) => Promise<void>;
  convertLicenseIntakeToApplication: (intake: LicenseIntake) => Promise<LicenseApplication>;
  generateLicenseReceipt: (application: LicenseApplication) => Promise<LicenseReceipt>;
  markLicenseReceiptDownloaded: (receipt: LicenseReceipt) => void;
  generateLicenseDraft: (application: LicenseApplication) => Promise<GeneratedLicense>;
  updateGeneratedLicense: (license: GeneratedLicense) => void;
  updateStampSettings: (settings: StampSettings) => void;
  removeDemoRecordsOnly: () => void;
  addLicenseFeeScheduleItem: (item: EntityInput<LicenseFeeScheduleItem>) => Promise<void>;
  updateLicenseFeeScheduleItem: (item: LicenseFeeScheduleItem) => Promise<void>;
  restoreDefaultLicenseFeeSchedule: () => void;
  addLicenseDocumentRequirement: (requirement: EntityInput<LicenseDocumentRequirement>) => Promise<void>;
  updateLicenseDocumentRequirement: (requirement: LicenseDocumentRequirement) => Promise<void>;
  restoreDefaultLicenseDocumentRequirements: () => void;
  updatePaymentSettings: (settings: PaymentSettings) => void;
  markBackupCompleted: () => void;
  setDataMode: (mode: AppSettings["mode"]) => void;
  updateFinancialPeriod: (period: FinancialPeriod) => void;
  removeFaultyTestExpense: () => number;
  cleanupOrphanedReferences: () => { orphanedReimbursements: number; orphanedReceipts: number };
  addInternalNote: (module: "Expenses" | "Reimbursements" | "Cost Centers" | "Receipt Intake", recordId: string, note: Omit<InternalNote, "id" | "timestamp">) => void;
  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
  exportBackup: () => BackupData;
  validateBackupData: (backup: unknown) => { ok: true } | { ok: false; message: string };
  importBackup: (backup: unknown) => { ok: true } | { ok: false; message: string };
  resetDemoData: () => void;
  clearLocalData: () => void;
};

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

function buildReimbursement(expense: Expense, existing?: Reimbursement): Reimbursement {
  const existingStatus = existing?.status as string | undefined;
  const amount = existing?.amount ?? existing?.amountOwed ?? expense.amount;
  const amountReimbursed = existing?.amountReimbursed ?? (existingStatus === "Fully Reimbursed" || existingStatus === "Reimbursed" ? amount : 0);
  const outstandingBalance = Math.max(0, amount - amountReimbursed);
  const defaultStatus: Reimbursement["status"] =
    outstandingBalance <= 0 || expense.reimbursementStatus === "Reimbursed" || expense.reimbursementStatus === "Fully Reimbursed"
      ? "Fully Reimbursed"
      : expense.reimbursementStatus === "Approved" || expense.reimbursementStatus === "Approved for Reimbursement"
        ? "Approved"
        : "Outstanding";

  return {
    id: existing?.id ?? reimbursementIdForExpense(expense.id),
    paidBy: existing?.paidBy ?? expense.paidBy,
    sourceReceiptId: existing?.sourceReceiptId ?? expense.sourceReceiptId,
    personOwed: existing?.personOwed ?? expense.personToReimburseName ?? expense.paidBy,
    personOwedRecordId: existing?.personOwedRecordId ?? expense.personToReimburseId ?? expense.paidByPersonId,
    responsiblePerson: existing?.responsiblePerson ?? expense.approvedBy ?? "Finance Admin",
    linkedExpense: expense.id,
    costCenterId: expense.costCenterId,
    costCenter: expense.costCenter,
    linkedEventId: existing?.linkedEventId ?? expense.linkedEventId ?? expense.eventRecordId,
    linkedEventName: existing?.linkedEventName ?? expense.linkedEventName ?? expense.event,
    amount,
    amountOwed: amount,
    amountReimbursed,
    outstandingBalance,
    dueDate: existing?.dueDate ?? "",
    status: existingStatus && existingStatus !== "Pending" && existingStatus !== "Reimbursed" ? existing?.status ?? defaultStatus : defaultStatus,
    reimbursedDate: existing?.reimbursedDate ?? "",
    settlementDate: existing?.settlementDate ?? existing?.reimbursedDate ?? "",
    settlementMethod: existing?.settlementMethod ?? "",
    settlementReference: existing?.settlementReference ?? existing?.paymentReference ?? "",
    settledBy: existing?.settledBy ?? "",
    reimbursementProofFileName: existing?.reimbursementProofFileName ?? "",
    reimbursementProofUploadedAt: existing?.reimbursementProofUploadedAt ?? "",
    reimbursementProofNotes: existing?.reimbursementProofNotes ?? "",
    paymentReference: existing?.paymentReference ?? "Pending",
    reconciliationStatus: existing?.reconciliationStatus ?? expense.reconciliationStatus ?? "Not Reconciled",
    reconciledBy: existing?.reconciledBy ?? expense.reconciledBy ?? "",
    reconciliationDate: existing?.reconciliationDate ?? expense.reconciliationDate ?? "",
    reconciliationNotes: existing?.reconciliationNotes ?? expense.reconciliationNotes ?? "",
    notes: existing?.notes ?? `Auto-created from ${expense.id}`
  };
}

function syncReimbursements(expenses: Expense[], reimbursements: Reimbursement[]) {
  const byExpenseId = new Map(reimbursements.map((reimbursement) => [reimbursement.linkedExpense, reimbursement]));
  return expenses.filter((expense) => expense.reimbursable).map((expense) => buildReimbursement(expense, byExpenseId.get(expense.id)));
}

function isValidLicenseIssueNumber(value: string | null | undefined) {
  return typeof value === "string" && new RegExp(`^${LICENSE_YEAR_PREFIX}\\d{5}$`).test(value);
}

function getNextLicenseIssueNumber(applications: Array<{ licenseIssueNumber?: string | null }>) {
  const highestNumber = applications.reduce((highest, application) => {
    const match = typeof application.licenseIssueNumber === "string" ? application.licenseIssueNumber.match(new RegExp(`^${LICENSE_YEAR_PREFIX}(\\d{5})$`)) : null;
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `${LICENSE_YEAR_PREFIX}${String(highestNumber + 1).padStart(5, "0")}`;
}

function defaultCompletionChecklist(application?: Partial<LicenseApplication>): LicenseCompletionChecklist {
  const identificationProvided = Boolean(application?.passportNumber || application?.nationalIdNumber || application?.identificationNumber);
  return {
    photoReceived: Boolean(application?.applicantPhotoFileName),
    identificationProvided,
    applicationFormReceived: Boolean(application?.applicationScanFileName),
    medicalReceived: Boolean(application?.supportingDocumentFileNames?.some((fileName) => fileName.toLowerCase().includes("medical"))),
    paymentReceived: application?.paymentStatus === "Paid" || application?.paymentStatus === "Waived",
    chiefReviewComplete: application?.reviewStatus === "Approved by Chief" || application?.reviewStatus === "Ready for Stamp" || application?.reviewStatus === "License Issued",
    stampComplete: application?.stampStatus === "Stamped" || application?.stampStatus === "Not Required"
  };
}

function normalizeLicenseApplicationFields(application: LicenseApplication): LicenseApplication {
  const licenseCategory = normalizeLicenseCategory(application.licenseCategory);
  const heldPreviousLicense = application.heldPreviousLicense ?? "";
  return {
    ...application,
    licenseCategory,
    applicantFullName: application.applicantFullName || application.fullLegalName || "",
    fullLegalName: application.fullLegalName || application.applicantFullName,
    passportNumber: application.passportNumber || application.identificationNumber,
    identificationNumber: application.identificationNumber || application.passportNumber || application.nationalIdNumber || "",
    applicationOrigin: application.applicationOrigin ?? "Manual Entry",
    supportingDocumentFileNames: application.supportingDocumentFileNames ?? [],
    documentChecklistSnapshot: application.documentChecklistSnapshot?.map((item) => ({
      ...item,
      required: isLicenseDocumentRequired(item.documentName, licenseCategory, heldPreviousLicense)
    })),
    completionChecklist: {
      ...defaultCompletionChecklist(application),
      ...(application.completionChecklist ?? {})
    }
  };
}

function ensureLicenseApplicationNumbers(applications: LicenseApplication[]) {
  const withIds = ensureRecordIds(applications.map(normalizeLicenseApplicationFields), "APP");
  const usedLicenseNumbers = new Set<string>();
  let nextNumber = withIds.reduce((highest, application) => {
    const match = application.licenseIssueNumber.match(new RegExp(`^${LICENSE_YEAR_PREFIX}(\\d{5})$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  function nextUniqueLicenseIssueNumber() {
    let licenseIssueNumber = "";
    do {
      nextNumber += 1;
      licenseIssueNumber = `${LICENSE_YEAR_PREFIX}${String(nextNumber).padStart(5, "0")}`;
    } while (usedLicenseNumbers.has(licenseIssueNumber));
    usedLicenseNumbers.add(licenseIssueNumber);
    return licenseIssueNumber;
  }

  return withIds.map((application) => {
    if (isValidLicenseIssueNumber(application.licenseIssueNumber) && !usedLicenseNumbers.has(application.licenseIssueNumber)) {
      usedLicenseNumbers.add(application.licenseIssueNumber);
      return application;
    }

    return {
      ...application,
      licenseIssueNumber: nextUniqueLicenseIssueNumber()
    };
  });
}

function hasRequiredLicenseApplicationFields(application: LicenseApplication) {
  return Boolean(
    application.applicantFullName.trim() &&
      application.nationality.trim() &&
      application.dateOfBirth &&
      (application.passportNumber?.trim() || application.nationalIdNumber?.trim() || application.identificationNumber.trim()) &&
      application.phone.trim() &&
      application.email.trim() &&
      application.address.trim() &&
      (application.licenseCategory !== "Other" || application.otherCategoryDescription.trim())
  );
}

function isPaymentCleared(application: LicenseApplication) {
  return application.paymentStatus === "Paid" || application.paymentStatus === "Waived";
}

function canMoveToReadyForStamp(application: LicenseApplication) {
  const requiredDocumentsComplete = (application.documentChecklistSnapshot ?? []).filter((item) => item.required).every((item) => item.verificationStatus === "Verified");
  return licensePaymentConfirmed(application) && application.reviewStatus === "Approved by Chief" && hasRequiredLicenseApplicationFields(application) && requiredDocumentsComplete;
}

function normalizeLicenseWorkflow(application: LicenseApplication, previous?: LicenseApplication): LicenseApplication {
  const next = normalizeLicenseApplicationFields(application);
  const blockedOnlineStatuses: LicenseApplication["reviewStatus"][] = ["Eligible For Chief Review", "Under Chief Review", "Pending Chief Review", "Approved by Chief", "Ready for Stamp", "License Issued"];
  const requiredDocumentsComplete = (next.documentChecklistSnapshot ?? []).filter((item) => item.required).every((item) => item.verificationStatus === "Verified");

  if (isOnlineApplication(next) && blockedOnlineStatuses.includes(next.reviewStatus) && (!licensePaymentConfirmed(next) || !requiredDocumentsComplete)) {
    next.reviewStatus = previous?.reviewStatus ?? "Awaiting Payment";
    next.licenseStatus = "Awaiting Payment";
    next.internalNotes = `${next.internalNotes ? `${next.internalNotes}\n` : ""}Payment and required documents must be complete before Chief Review.`;
  }

  if (next.reviewStatus === "Ready for Stamp" && !canMoveToReadyForStamp({ ...next, reviewStatus: "Approved by Chief" })) {
    next.reviewStatus = previous?.reviewStatus === "Ready for Stamp" ? "Approved by Chief" : previous?.reviewStatus ?? "Approved by Chief";
    next.internalNotes = `${next.internalNotes ? `${next.internalNotes}\n` : ""}Ready for Stamp blocked: payment, chief approval, and required fields must be complete.`;
  }

  if (next.reviewStatus === "Rejected") {
    next.licenseStatus = "Rejected";
  } else if (next.reviewStatus === "License Issued") {
    next.licenseStatus = "Issued";
  } else if (!licensePaymentConfirmed(next)) {
    next.licenseStatus = "Awaiting Payment";
  } else if (next.reviewStatus === "Ready for Stamp" || next.reviewStatus === "Approved by Chief") {
    next.licenseStatus = "Approved Awaiting Stamp";
    next.stampStatus = next.stampStatus === "Not Available Yet" ? "Awaiting Stamp" : next.stampStatus;
  } else if (next.reviewStatus !== "New") {
    next.licenseStatus = "Awaiting Review";
  }

  return next;
}

function buildDocumentChecklistSnapshot(category: LicenseApplication["licenseCategory"], requirements: LicenseDocumentRequirement[], existing: LicenseDocumentChecklistItem[] = [], heldPreviousLicense: LicenseApplication["heldPreviousLicense"] = "") {
  const existingByRequirementId = new Map(existing.map((item) => [item.requirementId, item]));
  const existingByName = new Map(existing.map((item) => [item.documentName, item]));
  const rows = requirements
    .filter((requirement) => requirement.status === "Active" && requirement.appliesToCategories.includes(category))
    .map((requirement) => {
      const existingItem = existingByRequirementId.get(requirement.id);
      return {
        requirementId: requirement.id,
        documentName: requirement.documentName,
        required: isLicenseDocumentRequired(requirement.documentName, category, heldPreviousLicense),
        fileName: existingItem?.fileName ?? "",
        received: existingItem?.received ?? false,
        verificationStatus: existingItem?.verificationStatus ?? "Not Received",
        notes: existingItem?.notes ?? requirement.notes
      } satisfies LicenseDocumentChecklistItem;
    });

  [...UNIVERSAL_REQUIRED_LICENSE_DOCUMENTS, ...UNIVERSAL_OPTIONAL_LICENSE_DOCUMENTS].forEach((documentName) => {
    if (!rows.some((item) => item.documentName === documentName)) {
      const existingItem = existingByName.get(documentName);
      rows.push({
        requirementId: `LDR-${documentName.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "-")}`,
        documentName,
        required: isLicenseDocumentRequired(documentName, category, heldPreviousLicense),
        fileName: existingItem?.fileName ?? "",
        received: existingItem?.received ?? false,
        verificationStatus: existingItem?.verificationStatus ?? "Not Received",
        notes: existingItem?.notes ?? ""
      });
    }
  });

  if (heldPreviousLicense === "Yes" && !rows.some((item) => item.documentName === "Existing License Copies")) {
    const existingItem = existingByName.get("Existing License Copies");
    rows.push({
      requirementId: "LDR-EXISTING-LICENSE-CONDITIONAL",
      documentName: "Existing License Copies",
      required: true,
      fileName: existingItem?.fileName ?? "",
      received: existingItem?.received ?? false,
      verificationStatus: existingItem?.verificationStatus ?? "Not Received",
      notes: existingItem?.notes ?? "Required because applicant held a license from another commission."
    });
  }

  return Array.from(new Map(rows.filter((item) => {
    if (item.documentName === "Existing License Copies") return heldPreviousLicense === "Yes";
    if (UNIVERSAL_REQUIRED_LICENSE_DOCUMENTS.includes(item.documentName) || UNIVERSAL_OPTIONAL_LICENSE_DOCUMENTS.includes(item.documentName)) return true;
    return category !== "Manager";
  }).map((item) => [item.documentName, item])).values());
}

function currentFeeForCategory(category: LicenseApplication["licenseCategory"], feeSchedule: LicenseFeeScheduleItem[]) {
  return feeSchedule.find((item) => item.status === "Active" && item.category === category) ?? feeSchedule.find((item) => item.category === "Other");
}

function licenseCategoryLabel(application: Pick<LicenseApplication, "licenseCategory" | "otherCategoryDescription" | "additionalOfficialCategories">) {
  const combined = application.additionalOfficialCategories?.length ? application.additionalOfficialCategories.join(" / ") : "";
  return combined || (application.licenseCategory === "Other" ? application.otherCategoryDescription || "Other" : application.licenseCategory);
}

function addValidity(date: string, validityPeriod = "1 Year") {
  const issued = date ? new Date(date) : new Date();
  const years = Number(validityPeriod.match(/(\d+)/)?.[1] ?? 1);
  issued.setFullYear(issued.getFullYear() + years);
  return issued.toISOString().slice(0, 10);
}

function isKnownDemoLicenseApplication(application: LicenseApplication) {
  return ["Omar Al Mansoori", "Nikolai Petrov", "Layla Haddad"].includes(application.applicantFullName) || ["APP-000001", "APP-000002", "APP-000003"].includes(application.id);
}

function coreLicenseDocumentsVerified(application: LicenseApplication) {
  const documents = application.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  const photoDocument = documents.find((item) => item.documentName.toLowerCase().includes("photograph") || item.documentName.toLowerCase().includes("photo"));
  return idDocument?.verificationStatus === "Verified" && photoDocument?.verificationStatus === "Verified";
}

function licenseIssueBlockers(application: LicenseApplication) {
  const documents = application.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  const photoDocument = documents.find((item) => item.documentName.toLowerCase().includes("photograph") || item.documentName.toLowerCase().includes("photo"));
  const blockers: string[] = [];

  if (idDocument?.verificationStatus !== "Verified") {
    blockers.push("Passport or National ID document must be verified before license issuance.");
  }
  if (photoDocument?.verificationStatus !== "Verified") {
    blockers.push("Passport-sized photograph must be verified before license issuance.");
  }
  if (!licensePaymentConfirmed(application)) {
    blockers.push("Payment must be verified, waived, or manually confirmed before license issuance.");
  }
  if (!application.approvalDate || !application.chiefReviewer) {
    blockers.push("Chief approval information is incomplete.");
  }

  return blockers;
}

function licensePaymentConfirmed(application: LicenseApplication) {
  return application.paymentStatus === "Paid" || application.paymentStatus === "Waived" || application.paymentConfirmationType === "Cash Paid" || application.paymentConfirmationType === "Manually Paid" || application.paymentConfirmationType === "Admin Ready Override";
}

function nextNoteId() {
  return `NOTE-${crypto.randomUUID().slice(0, 8)}`;
}

function periodLabel(period: FinancialPeriod) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

function findPeriodForDate(periods: FinancialPeriod[], date: string) {
  const [year, month] = date.split("-").map(Number);
  return periods.find((period) => period.year === year && period.month === month);
}

function withPeriod<T extends { date?: string; revenueDate?: string; receiptDate?: string; dueDate?: string; periodId?: string; periodLabel?: string }>(record: T, periods: FinancialPeriod[]) {
  const date = record.date ?? record.revenueDate ?? record.receiptDate ?? record.dueDate ?? "";
  const period = date ? findPeriodForDate(periods, date) : undefined;
  return {
    ...record,
    periodId: period?.id ?? record.periodId,
    periodLabel: period ? periodLabel(period) : record.periodLabel
  };
}

function isPotentialExpenseDuplicate(input: Pick<Expense, "amount" | "date" | "vendor" | "notes" | "receiptAttachment">, existing: Expense) {
  const sameAmount = Number(input.amount) === Number(existing.amount);
  const sameDate = input.date === existing.date;
  const sameVendor = Boolean(input.vendor && existing.vendor && input.vendor.toLowerCase() === existing.vendor.toLowerCase());
  const sameReceipt = Boolean(input.receiptAttachment && existing.receiptAttachment && input.receiptAttachment.toLowerCase() === existing.receiptAttachment.toLowerCase());
  const sameNotes = Boolean(input.notes && existing.notes && input.notes.trim().toLowerCase() === existing.notes.trim().toLowerCase());
  return sameAmount && (sameDate || sameVendor || sameReceipt || sameNotes);
}

function isPotentialReceiptDuplicate(input: Pick<ReceiptIntake, "amount" | "receiptDate" | "vendor" | "fileName" | "notes">, existing: ReceiptIntake) {
  const sameAmount = Number(input.amount) === Number(existing.amount);
  const sameDate = input.receiptDate === existing.receiptDate;
  const sameVendor = Boolean(input.vendor && existing.vendor && input.vendor.toLowerCase() === existing.vendor.toLowerCase());
  const sameFile = Boolean(input.fileName && existing.fileName && input.fileName.toLowerCase() === existing.fileName.toLowerCase());
  const sameNotes = Boolean(input.notes && existing.notes && input.notes.trim().toLowerCase() === existing.notes.trim().toLowerCase());
  return sameAmount && (sameDate || sameVendor || sameFile || sameNotes);
}

function summary(value: unknown) {
  if (!value) return "";
  if (typeof value !== "object") return String(value);
  const record = value as Record<string, unknown>;
  return Object.entries(record)
    .filter(([key]) => !["receiptFiles", "checklist"].includes(key))
    .slice(0, 10)
    .map(([key, val]) => `${key}: ${String(val ?? "")}`)
    .join("; ");
}

function statusChanged(previousValue: unknown, nextValue: unknown) {
  if (!previousValue || !nextValue || typeof previousValue !== "object" || typeof nextValue !== "object") return false;
  const previous = previousValue as Record<string, unknown>;
  const next = nextValue as Record<string, unknown>;
  return (
    previous.status !== next.status ||
    previous.approvalStatus !== next.approvalStatus ||
    previous.reimbursementStatus !== next.reimbursementStatus ||
    previous.reconciliationStatus !== next.reconciliationStatus ||
    previous.intakeStatus !== next.intakeStatus ||
    previous.paymentStatus !== next.paymentStatus ||
    previous.reviewStatus !== next.reviewStatus ||
    previous.licenseStatus !== next.licenseStatus ||
    previous.stampStatus !== next.stampStatus
  );
}

function readStoredArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined" || !window.localStorage) return fallback;

  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function readStoredRecords<T extends { id: string }>(key: string, fallback: T[], prefix: string): T[] {
  return ensureRecordIds(backfillDemoFields(readStoredArray<T>(key, fallback), fallback), prefix);
}

function readStoredLicenseReceipts() {
  return ensureRecordIds(readStoredArray<LicenseReceipt>(storageKeys.licenseReceipts, initialLicenseReceipts), "RCT-2026");
}

function readStoredGeneratedLicenses() {
  return ensureRecordIds(readStoredArray<GeneratedLicense>(storageKeys.generatedLicenses, initialGeneratedLicenses), "LIC-2026");
}

function readStoredLicenseFeeSchedule() {
  return ensureRecordIds(backfillDemoFields(readStoredArray<LicenseFeeScheduleItem>(storageKeys.licenseFeeSchedule, initialLicenseFeeSchedule), initialLicenseFeeSchedule), "LFS");
}

function readStoredLicenseDocumentRequirements() {
  return ensureRecordIds(backfillDemoFields(readStoredArray<LicenseDocumentRequirement>(storageKeys.licenseDocumentRequirements, initialLicenseDocumentRequirements), initialLicenseDocumentRequirements), "LDR");
}

function saveStoredArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStoredObject<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredObject<T>(key: string, value: T) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function backfillDemoFields<T extends { id: string }>(stored: T[], demo: T[]) {
  const demoById = new Map(demo.map((item) => [item.id, item]));
  return stored.map((item) => ({ ...(demoById.get(item.id) ?? {}), ...item }));
}

function resolveNewRecordId<T extends { id?: string | null }>(records: T[], id: string | null | undefined, prefix: string) {
  const isUnique = typeof id === "string" && !records.some((record) => record.id === id);
  return isUnique && isValidRecordId(id, prefix) ? id : getNextSequentialId(records, prefix);
}

function sanitizeBackupRecords(backup: BackupData): BackupData {
  const expenses = ensureRecordIds(backup.expenses, "EXP");
  const reimbursements = syncReimbursements(expenses, ensureRecordIds(backup.reimbursements, "RMB"));

  return {
    ...backup,
    people: ensureRecordIds(backup.people, "PER"),
    events: ensureRecordIds(backup.events, "EVT"),
    expenses,
    reimbursements,
    revenues: ensureRecordIds(backup.revenues, "REV"),
    receipts: ensureRecordIds(backup.receipts, "RCT"),
    costCenters: ensureRecordIds(backup.costCenters, "CC"),
    auditLogs: ensureRecordIds(backup.auditLogs, "AUD"),
    documents: ensureRecordIds(backup.documents, "DOC"),
    applicationImports: ensureRecordIds(backup.applicationImports ?? [], "AIMP"),
    licenseApplications: ensureLicenseApplicationNumbers(backup.licenseApplications),
    licenseIntake: ensureRecordIds(backup.licenseIntake, "INT"),
    licenseReceipts: ensureRecordIds(backup.licenseReceipts ?? [], "RCT-2026"),
    generatedLicenses: ensureRecordIds(backup.generatedLicenses ?? [], "LIC-2026"),
    stampSettings: backup.stampSettings ?? initialStampSettings,
    licenseFeeSchedule: ensureRecordIds(backup.licenseFeeSchedule, "LFS"),
    licenseDocumentRequirements: ensureRecordIds(backup.licenseDocumentRequirements, "LDR"),
    paymentSettings: backup.paymentSettings ?? initialPaymentSettings
  };
}

function withPeriods<T extends { date?: string; revenueDate?: string; receiptDate?: string; dueDate?: string; periodId?: string; periodLabel?: string }>(records: T[], periods: FinancialPeriod[]) {
  return records.map((record) => withPeriod(record, periods));
}

function removeStoredData() {
  if (typeof window === "undefined" || !window.localStorage) return;
  Object.values(storageKeys).forEach((key) => window.localStorage.removeItem(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateBackup(value: unknown): { ok: true; backup: BackupData } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: "Backup must be a JSON object." };
  }

  const requiredArrays = ["people", "events", "expenses", "reimbursements", "revenues", "receipts", "costCenters", "auditLogs", "documents", "licenseApplications", "licenseIntake", "licenseFeeSchedule", "licenseDocumentRequirements", "financialPeriods"] as const;
  for (const key of requiredArrays) {
    if (!Array.isArray(value[key])) {
      return { ok: false, message: `Backup is missing a valid ${key} array.` };
    }
  }

  if (typeof value.exportedAt !== "string" || typeof value.appVersion !== "string") {
    return { ok: false, message: "Backup must include exportedAt and appVersion." };
  }

  const expenses = value.expenses as Expense[];
  const invalidExpense = expenses.find((expense) => !expense.id || !expense.date || !expense.paidBy || !expense.category);
  if (invalidExpense) {
    return { ok: false, message: "One or more expenses are missing required fields." };
  }

  return {
    ok: true,
    backup: {
      people: value.people as Person[],
      events: value.events as Event[],
      expenses,
      reimbursements: value.reimbursements as Reimbursement[],
      revenues: value.revenues as Revenue[],
      receipts: value.receipts as ReceiptIntake[],
      costCenters: value.costCenters as CostCenter[],
      auditLogs: value.auditLogs as AuditLog[],
      documents: value.documents as SupportingDocument[],
      applicationImports: Array.isArray(value.applicationImports) ? value.applicationImports as ApplicationImport[] : [],
      licenseApplications: value.licenseApplications as LicenseApplication[],
      licenseIntake: value.licenseIntake as LicenseIntake[],
      licenseReceipts: Array.isArray(value.licenseReceipts) ? value.licenseReceipts as LicenseReceipt[] : [],
      generatedLicenses: Array.isArray(value.generatedLicenses) ? value.generatedLicenses as GeneratedLicense[] : [],
      stampSettings: isRecord(value.stampSettings) ? (value.stampSettings as StampSettings) : initialStampSettings,
      licenseFeeSchedule: value.licenseFeeSchedule as LicenseFeeScheduleItem[],
      licenseDocumentRequirements: value.licenseDocumentRequirements as LicenseDocumentRequirement[],
      paymentSettings: isRecord(value.paymentSettings) ? (value.paymentSettings as PaymentSettings) : initialPaymentSettings,
      appSettings: isRecord(value.appSettings) ? (value.appSettings as AppSettings) : initialAppSettings,
      financialPeriods: value.financialPeriods as FinancialPeriod[],
      exportedAt: value.exportedAt,
      appVersion: value.appVersion
    }
  };
}

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [people, setPeople] = useState<Person[]>(() => ensureRecordIds(initialPeople, "PER"));
  const [events, setEvents] = useState<Event[]>(() => ensureRecordIds(initialEvents, "EVT"));
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>(initialFinancialPeriods);
  const [expenses, setExpenses] = useState<Expense[]>(() => withPeriods(ensureRecordIds(initialExpenses, "EXP"), initialFinancialPeriods));
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>(() =>
    syncReimbursements(
      withPeriods(ensureRecordIds(initialExpenses, "EXP"), initialFinancialPeriods),
      withPeriods(ensureRecordIds(initialReimbursements, "RMB"), initialFinancialPeriods)
    )
  );
  const [revenues, setRevenues] = useState<Revenue[]>(() => withPeriods(ensureRecordIds(initialRevenues, "REV"), initialFinancialPeriods));
  const [receipts, setReceipts] = useState<ReceiptIntake[]>(() => withPeriods(ensureRecordIds(initialReceipts, "RCT"), initialFinancialPeriods));
  const [costCenters, setCostCenters] = useState<CostCenter[]>(() => ensureRecordIds(initialCostCenters, "CC"));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => ensureRecordIds(initialAuditLogs, "AUD"));
  const [documents, setDocuments] = useState<SupportingDocument[]>(() => ensureRecordIds(initialDocuments, "DOC"));
  const [applicationImports, setApplicationImports] = useState<ApplicationImport[]>(() => ensureRecordIds(initialApplicationImports, "AIMP"));
  const [licenseApplications, setLicenseApplications] = useState<LicenseApplication[]>(() => ensureLicenseApplicationNumbers(initialLicenseApplications));
  const [licenseIntake, setLicenseIntake] = useState<LicenseIntake[]>(() => ensureRecordIds(initialLicenseIntake, "INT"));
  const [licenseReceipts, setLicenseReceipts] = useState<LicenseReceipt[]>(() => ensureRecordIds(initialLicenseReceipts, "RCT-2026"));
  const [generatedLicenses, setGeneratedLicenses] = useState<GeneratedLicense[]>(() => ensureRecordIds(initialGeneratedLicenses, "LIC-2026"));
  const [stampSettings, setStampSettings] = useState<StampSettings>(initialStampSettings);
  const [licenseFeeSchedule, setLicenseFeeSchedule] = useState<LicenseFeeScheduleItem[]>(() => ensureRecordIds(initialLicenseFeeSchedule, "LFS"));
  const [licenseDocumentRequirements, setLicenseDocumentRequirements] = useState<LicenseDocumentRequirement[]>(() => ensureRecordIds(initialLicenseDocumentRequirements, "LDR"));
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(initialPaymentSettings);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);

  const writeAuditLog = useCallback((log: Omit<AuditLog, "id" | "timestamp">) => {
    setAuditLogs((current) => [
      {
        ...log,
        id: getNextSequentialId(current, "AUD"),
        timestamp: new Date().toISOString()
      },
      ...current
    ]);
  }, []);

  const audit = useCallback((module: AuditModule, recordId: string, recordLabel: string, action: AuditAction, previousValue: unknown, newValue: unknown, notes = "", changedBy = "Local User") => {
    writeAuditLog({
      module,
      recordId,
      recordLabel,
      action,
      changedBy,
      previousValueSummary: summary(previousValue),
      newValueSummary: summary(newValue),
      notes
    });
  }, [writeAuditLog]);

  useEffect(() => {
    queueMicrotask(() => {
      const storedAppSettings = readStoredObject<AppSettings>(storageKeys.appSettings, initialAppSettings);
      const peopleFallback = storedAppSettings.mode === "real" ? [] : initialPeople;
      const receiptsFallback = storedAppSettings.mode === "real" ? [] : initialReceipts;
      const licensingFallback = storedAppSettings.mode === "real" ? [] : initialLicenseApplications;
      const intakeFallback = storedAppSettings.mode === "real" ? [] : initialLicenseIntake;
      const storedFinancialPeriods = readStoredArray<FinancialPeriod>(storageKeys.financialPeriods, initialFinancialPeriods);
      const storedExpenses = withPeriods(readStoredRecords<Expense>(storageKeys.expenses, initialExpenses, "EXP"), storedFinancialPeriods);

      setPeople(readStoredRecords<Person>(storageKeys.people, peopleFallback, "PER"));
      setEvents(readStoredRecords<Event>(storageKeys.events, initialEvents, "EVT"));
      setFinancialPeriods(storedFinancialPeriods);
      setExpenses(storedExpenses);
      setReimbursements(syncReimbursements(storedExpenses, withPeriods(readStoredRecords<Reimbursement>(storageKeys.reimbursements, initialReimbursements, "RMB"), storedFinancialPeriods)));
      setRevenues(withPeriods(readStoredRecords<Revenue>(storageKeys.revenues, initialRevenues, "REV"), storedFinancialPeriods));
      setReceipts(withPeriods(readStoredRecords<ReceiptIntake>(storageKeys.receipts, receiptsFallback, "RCT"), storedFinancialPeriods));
      setCostCenters(readStoredRecords<CostCenter>(storageKeys.costCenters, initialCostCenters, "CC"));
      setAuditLogs(readStoredRecords<AuditLog>(storageKeys.auditLogs, initialAuditLogs, "AUD"));
      setDocuments(readStoredRecords<SupportingDocument>(storageKeys.documents, initialDocuments, "DOC"));
      setApplicationImports(readStoredRecords<ApplicationImport>(storageKeys.applicationImports, [], "AIMP"));
      setLicenseApplications(ensureLicenseApplicationNumbers(backfillDemoFields(readStoredArray<LicenseApplication>(storageKeys.licenseApplications, licensingFallback), initialLicenseApplications)));
      setLicenseIntake(ensureRecordIds(backfillDemoFields(readStoredArray<LicenseIntake>(storageKeys.licenseIntake, intakeFallback), initialLicenseIntake), "INT"));
      setLicenseReceipts(readStoredLicenseReceipts());
      setGeneratedLicenses(readStoredGeneratedLicenses());
      setStampSettings(readStoredObject<StampSettings>(storageKeys.stampSettings, initialStampSettings));
      setLicenseFeeSchedule(readStoredLicenseFeeSchedule());
      setLicenseDocumentRequirements(readStoredLicenseDocumentRequirements());
      setPaymentSettings(readStoredObject<PaymentSettings>(storageKeys.paymentSettings, initialPaymentSettings));
      setAppSettings(storedAppSettings);
      setHasLoadedStorage(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.people, people);
  }, [hasLoadedStorage, people]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.events, events);
  }, [events, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.expenses, expenses);
  }, [expenses, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.reimbursements, reimbursements);
  }, [hasLoadedStorage, reimbursements]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.revenues, revenues);
  }, [hasLoadedStorage, revenues]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.receipts, receipts);
  }, [hasLoadedStorage, receipts]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.costCenters, costCenters);
  }, [costCenters, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.auditLogs, auditLogs);
  }, [auditLogs, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.documents, documents);
  }, [documents, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.applicationImports, applicationImports);
  }, [applicationImports, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.licenseApplications, licenseApplications);
  }, [hasLoadedStorage, licenseApplications]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.licenseIntake, licenseIntake);
  }, [hasLoadedStorage, licenseIntake]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.licenseReceipts, licenseReceipts);
  }, [hasLoadedStorage, licenseReceipts]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.generatedLicenses, generatedLicenses);
  }, [generatedLicenses, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredObject(storageKeys.stampSettings, stampSettings);
  }, [hasLoadedStorage, stampSettings]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.licenseFeeSchedule, licenseFeeSchedule);
  }, [hasLoadedStorage, licenseFeeSchedule]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.licenseDocumentRequirements, licenseDocumentRequirements);
  }, [hasLoadedStorage, licenseDocumentRequirements]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredObject(storageKeys.paymentSettings, paymentSettings);
  }, [hasLoadedStorage, paymentSettings]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredObject(storageKeys.appSettings, appSettings);
  }, [appSettings, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredArray(storageKeys.financialPeriods, financialPeriods);
  }, [financialPeriods, hasLoadedStorage]);

  const value = useMemo<FinanceDataContextValue>(
    () => ({
      people,
      events,
      expenses,
      reimbursements,
      revenues,
      receipts,
      costCenters,
      auditLogs,
      documents,
      applicationImports,
      licenseApplications,
      licenseIntake,
      licenseReceipts,
      generatedLicenses,
      stampSettings,
      licenseFeeSchedule,
      licenseDocumentRequirements,
      paymentSettings,
      appSettings,
      financialPeriods,
      isLoading: !hasLoadedStorage,
      dataSource: "mock",
      error: "",
      addPerson: async (personInput) => {
        const person: Person = { ...personInput, id: resolveNewRecordId(people, personInput.id, "PER") };
        setPeople((current) => [person, ...current]);
        audit("People", person.id, person.fullName, "Created", null, person);
      },
      updatePerson: async (person) => {
        const previous = people.find((item) => item.id === person.id);
        setPeople((current) => current.map((item) => (item.id === person.id ? person : item)));
        audit("People", person.id, person.fullName, statusChanged(previous, person) ? "Status Changed" : "Updated", previous, person);
      },
      deletePerson: async (person) => {
        setPeople((current) => current.filter((item) => item.id !== person.id));
        audit("People", person.id, person.fullName, "Deleted", person, null);
      },
      addEvent: async (eventInput) => {
        const event: Event = { ...eventInput, id: resolveNewRecordId(events, eventInput.id, "EVT") };
        setEvents((current) => [event, ...current]);
        audit("Events", event.id, event.eventName, "Created", null, event);
      },
      updateEvent: async (event) => {
        const previous = events.find((item) => item.id === event.id);
        setEvents((current) => current.map((item) => (item.id === event.id ? event : item)));
        audit("Events", event.id, event.eventName, statusChanged(previous, event) ? "Status Changed" : "Updated", previous, event);
      },
      deleteEvent: async (event) => {
        setEvents((current) => current.filter((item) => item.id !== event.id));
        audit("Events", event.id, event.eventName, "Deleted", event, null);
      },
      addExpense: async (expenseInput) => {
        const duplicate = expenses.find((expense) => isPotentialExpenseDuplicate(expenseInput, expense));
        const paidByPerson = people.find((person) => person.id === expenseInput.paidByPersonId || person.fullName === expenseInput.paidBy);
        const linkedEvent = events.find((event) => event.id === expenseInput.linkedEventId || event.eventName === expenseInput.event);
        const expense: Expense = {
          ...withPeriod(expenseInput, financialPeriods),
          id: getNextSequentialId(expenses, "EXP"),
          paidByPersonId: paidByPerson?.id ?? expenseInput.paidByPersonId,
          paidByPersonName: paidByPerson?.fullName ?? expenseInput.paidBy,
          linkedEventId: linkedEvent?.id ?? expenseInput.linkedEventId,
          linkedEventName: linkedEvent?.eventName ?? expenseInput.linkedEventName ?? (expenseInput.event === "General Operations" ? "" : expenseInput.event),
          eventRecordId: linkedEvent?.id ?? expenseInput.eventRecordId,
          expensePurpose: expenseInput.expensePurpose || expenseInput.description,
          costCenter: expenseInput.costCenter || "General Operations",
          reimbursementStatus: expenseInput.reimbursable ? expenseInput.reimbursementStatus === "Not Reimbursable" ? "Outstanding" : expenseInput.reimbursementStatus : "Not Reimbursable",
          reconciliationStatus: expenseInput.reconciliationStatus ?? "Not Reconciled",
          possibleDuplicateOfId: duplicate?.id
        };
        setExpenses((currentExpenses) => {
          const nextExpenses = [expense, ...currentExpenses];
          setReimbursements((currentReimbursements) => syncReimbursements(nextExpenses, currentReimbursements));
          return nextExpenses;
        });
        audit("Expenses", expense.id, expense.description, "Expense Created", null, expense);
        setAppSettings((current) => ({
          ...current,
          lastQuickCategory: expense.category,
          lastQuickCostCenterId: expense.costCenterId,
          lastQuickCostCenter: expense.costCenter,
          lastQuickCurrency: expense.currency
        }));
        return expense;
      },
      addBatchExpenses: async (expenseInputs) => {
        const firstExpenseNumber = Number(getNextSequentialId(expenses, "EXP").replace("EXP-", ""));
        const createdExpenses = expenseInputs.map((expenseInput, index) => {
          const paidByPerson = people.find((person) => person.id === expenseInput.paidByPersonId || person.fullName === expenseInput.paidBy);
          const linkedEvent = events.find((event) => event.id === expenseInput.linkedEventId || event.eventName === expenseInput.event);
          const expense: Expense = {
            ...withPeriod(expenseInput, financialPeriods),
            id: `EXP-${String(firstExpenseNumber + index).padStart(6, "0")}`,
            paidByPersonId: paidByPerson?.id ?? expenseInput.paidByPersonId,
            paidByPersonName: paidByPerson?.fullName ?? expenseInput.paidBy,
            linkedEventId: linkedEvent?.id ?? expenseInput.linkedEventId,
            linkedEventName: linkedEvent?.eventName ?? expenseInput.linkedEventName ?? (expenseInput.event === "General Operations" ? "" : expenseInput.event),
            eventRecordId: linkedEvent?.id ?? expenseInput.eventRecordId,
            expensePurpose: expenseInput.expensePurpose || expenseInput.description,
            costCenter: expenseInput.costCenter || "General Operations",
            reimbursementStatus: expenseInput.reimbursable ? "Outstanding" : "Not Reimbursable",
            reconciliationStatus: expenseInput.reconciliationStatus ?? "Not Reconciled",
            possibleDuplicateOfId: expenses.find((existing) => isPotentialExpenseDuplicate(expenseInput, existing))?.id
          };
          return expense;
        });

        const manualReimbursements = createdExpenses
          .map((expense, index) => ({ expense, input: expenseInputs[index] }))
          .filter(({ expense }) => expense.reimbursable)
          .map(({ expense, input }) => {
            return buildReimbursement(expense, {
              id: reimbursementIdForExpense(expense.id),
              paidBy: expense.paidBy,
              personOwed: input.personOwed,
              responsiblePerson: input.responsiblePerson,
              linkedExpense: expense.id,
              sourceReceiptId: expense.sourceReceiptId,
              costCenterId: expense.costCenterId,
              costCenter: expense.costCenter,
              linkedEventId: expense.linkedEventId,
              linkedEventName: expense.linkedEventName,
              amount: expense.amount,
              amountOwed: expense.amount,
              amountReimbursed: 0,
              outstandingBalance: expense.amount,
              dueDate: "",
              status: "Outstanding",
              reimbursedDate: "",
              settlementDate: "",
              settlementMethod: "",
              settlementReference: "",
              settledBy: "",
              paymentReference: "Pending",
              reconciliationStatus: "Not Reconciled",
              reconciledBy: "",
              reconciliationDate: "",
              reconciliationNotes: "",
              notes: `Auto-created from batch expense ${expense.id}`
            });
          });

        setExpenses((currentExpenses) => {
          const nextExpenses = [...createdExpenses, ...currentExpenses];
          setReimbursements((currentReimbursements) => syncReimbursements(nextExpenses, [...manualReimbursements, ...currentReimbursements]));
          return nextExpenses;
        });
        createdExpenses.forEach((expense) => audit("Batch Entry", expense.id, expense.description, "Created", null, expense, "Created from batch expense entry."));
        return createdExpenses;
      },
      convertReceiptToExpense: async (receipt) => {
        const paidByPerson = people.find((person) => person.id === receipt.paidByPersonId || person.fullName === receipt.paidBy);
        const linkedEvent = events.find((event) => event.id === receipt.linkedEventId || event.eventName === receipt.event);
        const expense: Expense = {
          id: getNextSequentialId(expenses, "EXP"),
          date: receipt.receiptDate || receipt.uploadDate,
          paidBy: receipt.paidBy,
          paidByPersonId: paidByPerson?.id ?? receipt.paidByPersonId,
          paidByPersonName: paidByPerson?.fullName ?? receipt.paidBy,
          personToReimburseId: receipt.personToReimburseId ?? paidByPerson?.id,
          personToReimburseName: receipt.personToReimburseName ?? receipt.paidBy,
          linkType: receipt.linkType,
          event: receipt.event,
          eventRecordId: linkedEvent?.id,
          linkedEventId: linkedEvent?.id ?? receipt.linkedEventId,
          linkedEventName: linkedEvent?.eventName ?? receipt.linkedEventName ?? (receipt.event === "General Operations" ? "" : receipt.event),
          costCenterId: receipt.costCenterId,
          costCenter: receipt.costCenter || "General Operations",
          category: receipt.suggestedCategory,
          expensePurpose: receipt.expensePurpose || receipt.notes || `Receipt register ${receipt.id}`,
          description: receipt.expensePurpose || `Receipt register ${receipt.id} - ${receipt.vendor || "Unspecified vendor"}`,
          amount: receipt.amount,
          currency: receipt.currency,
          paymentMethod: receipt.paymentMethod,
          vendor: receipt.vendor,
          receiptAttachment: receipt.fileName || "Receipt register record",
          receiptFiles: receipt.fileName
            ? [
                {
                  id: receipt.id,
                  linkedExpense: "",
                  fileName: receipt.fileName,
                  fileUrl: receipt.fileUrl,
                  fileType: receipt.fileType,
                  uploadedAt: receipt.uploadDate,
                  notes: `Linked from ${receipt.id}`
                }
              ]
            : [],
          sourceReceiptId: receipt.id,
          reimbursable: receipt.reimbursable,
          reimbursementStatus: receipt.reimbursable ? "Outstanding" : "Not Reimbursable",
          approvalStatus: "Pending Review",
          submittedBy: receipt.uploadedBy,
          submittedDate: new Date().toISOString().slice(0, 10),
          reviewedBy: "",
          approvedBy: "",
          approvalDate: "",
          rejectionReason: "",
          internalNotes: `Converted from receipt intake ${receipt.id}`,
          reconciliationStatus: "Not Reconciled",
          reconciledBy: "",
          reconciliationDate: "",
          reconciliationNotes: "",
          notes: receipt.notes
        };
        const duplicate = expenses.find((existing) => isPotentialExpenseDuplicate(expense, existing));
        expense.possibleDuplicateOfId = duplicate?.id;

        expense.receiptFiles = expense.receiptFiles?.map((file) => ({ ...file, linkedExpense: expense.id }));

        setExpenses((currentExpenses) => {
          const nextExpenses = [expense, ...currentExpenses];
          setReimbursements((currentReimbursements) => syncReimbursements(nextExpenses, currentReimbursements));
          return nextExpenses;
        });
        setReceipts((current) =>
          current.map((item) =>
            item.id === receipt.id
              ? {
                  ...item,
                  status: "Converted to Expense",
                  ocrStatus: receipt.ocrStatus ? "Converted To Expense" : item.ocrStatus,
                  mappingReviewed: true,
                  convertedExpenseId: expense.id
                }
              : item
          )
        );
        audit("Receipt Intake", receipt.id, receipt.vendor || receipt.id, "Converted", receipt, { ...receipt, status: "Converted to Expense", convertedExpenseId: expense.id }, `Converted to ${expense.id}.`);
        audit("Expenses", expense.id, expense.description, receipt.ocrStatus ? "Expense Created From Receipt OCR" : "Expense Created", null, expense, `Created from ${receipt.id}.`);

        return expense;
      },
      updateExpense: async (expense) => {
        const previous = expenses.find((item) => item.id === expense.id);
        const period = findPeriodForDate(financialPeriods, expense.date);
        if (period?.status === "Closed" && typeof window !== "undefined" && !window.confirm(`Financial period ${periodLabel(period)} is closed. Continue editing ${expense.id}?`)) {
          setAppSettings((current) => ({ ...current, closedPeriodEditAttempts: (current.closedPeriodEditAttempts ?? 0) + 1 }));
          audit("Expenses", expense.id, expense.description, "Updated", previous, expense, `Closed-period edit warning for ${periodLabel(period)} was not confirmed.`);
          return previous ?? expense;
        }
        const normalized: Expense = {
          ...withPeriod(expense, financialPeriods),
          expensePurpose: expense.expensePurpose || expense.description,
          costCenter: expense.costCenter || "General Operations",
          reimbursementStatus: expense.reimbursable ? expense.reimbursementStatus === "Not Reimbursable" ? "Outstanding" : expense.reimbursementStatus : "Not Reimbursable"
        };
        setExpenses((currentExpenses) => {
          const nextExpenses = currentExpenses.map((item) => (item.id === normalized.id ? normalized : item));
          setReimbursements((currentReimbursements) => syncReimbursements(nextExpenses, currentReimbursements));
          return nextExpenses;
        });
        const expenseAction: AuditAction =
          previous?.approvalStatus !== normalized.approvalStatus && normalized.approvalStatus === "Submitted"
            ? "Expense Submitted"
            : previous?.approvalStatus !== normalized.approvalStatus && normalized.approvalStatus === "Approved"
              ? "Expense Approved"
              : previous?.approvalStatus !== normalized.approvalStatus && normalized.approvalStatus === "Rejected"
                ? "Expense Rejected"
                : previous?.approvalStatus !== normalized.approvalStatus && normalized.approvalStatus === "Closed"
                  ? "Expense Closed"
                  : statusChanged(previous, normalized)
                    ? "Status Changed"
                    : "Updated";
        audit("Expenses", normalized.id, normalized.description, expenseAction, previous, normalized);
        return normalized;
      },
      deleteExpense: async (expense) => {
        setExpenses((currentExpenses) => {
          const nextExpenses = currentExpenses.filter((item) => item.id !== expense.id);
          setReimbursements((currentReimbursements) => currentReimbursements.filter((item) => item.linkedExpense !== expense.id));
          return nextExpenses;
        });
        audit("Expenses", expense.id, expense.description, "Deleted", expense, null);
      },
      uploadReceipt: async (expense, file, notes = "") => {
        const receiptFile: ReceiptFile = {
          id: crypto.randomUUID(),
          linkedExpense: expense.id,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileType: file.type || "local file",
          uploadedAt: new Date().toISOString(),
          notes
        };

        setExpenses((current) =>
          current.map((item) =>
            item.id === expense.id
              ? {
                  ...item,
                  receiptAttachment: receiptFile.fileName,
                  receiptFiles: [receiptFile, ...(item.receiptFiles ?? [])]
                }
              : item
          )
        );
        audit("Expenses", expense.id, expense.description, "Updated", expense, { ...expense, receiptAttachment: receiptFile.fileName }, `Uploaded local receipt placeholder ${receiptFile.fileName}.`);

        return receiptFile;
      },
      addReimbursement: async (reimbursementInput) => {
        const amount = typeof reimbursementInput.amount === "number" ? reimbursementInput.amount : parseMoneyInput(String(reimbursementInput.amount ?? 0));
        const amountReimbursed = typeof reimbursementInput.amountReimbursed === "number" ? reimbursementInput.amountReimbursed : parseMoneyInput(String(reimbursementInput.amountReimbursed ?? 0));
        const reimbursement: Reimbursement = {
          ...reimbursementInput,
          id: resolveNewRecordId(reimbursements, reimbursementInput.id, "RMB"),
          amount,
          amountOwed: amount,
          amountReimbursed,
          outstandingBalance: Math.max(0, amount - amountReimbursed),
          settlementDate: reimbursementInput.settlementDate ?? reimbursementInput.reimbursedDate ?? "",
          settlementMethod: reimbursementInput.settlementMethod ?? "",
          settlementReference: reimbursementInput.settlementReference ?? reimbursementInput.paymentReference ?? "",
          settledBy: reimbursementInput.settledBy ?? "",
          reimbursementProofFileName: reimbursementInput.reimbursementProofFileName ?? "",
          reimbursementProofUploadedAt: reimbursementInput.reimbursementProofUploadedAt ?? "",
          reimbursementProofNotes: reimbursementInput.reimbursementProofNotes ?? ""
        };
        setReimbursements((current) => [reimbursement, ...current]);
        audit("Reimbursements", reimbursement.id, reimbursement.personOwed, "Reimbursement Created", null, reimbursement);
      },
      updateReimbursement: async (reimbursement) => {
        const previous = reimbursements.find((item) => item.id === reimbursement.id);
        const period = reimbursement.periodId ? financialPeriods.find((item) => item.id === reimbursement.periodId) : findPeriodForDate(financialPeriods, reimbursement.dueDate);
        if (period?.status === "Closed" && typeof window !== "undefined" && !window.confirm(`Financial period ${periodLabel(period)} is closed. Continue editing ${reimbursement.id}?`)) {
          setAppSettings((current) => ({ ...current, closedPeriodEditAttempts: (current.closedPeriodEditAttempts ?? 0) + 1 }));
          audit("Reimbursements", reimbursement.id, reimbursement.personOwed, "Updated", previous, reimbursement, `Closed-period edit warning for ${periodLabel(period)} was not confirmed.`);
          return;
        }
        const normalized = {
          ...reimbursement,
          amount: typeof reimbursement.amount === "number" ? reimbursement.amount : parseMoneyInput(String(reimbursement.amount)),
          amountOwed: typeof reimbursement.amount === "number" ? reimbursement.amount : parseMoneyInput(String(reimbursement.amount)),
          amountReimbursed: typeof reimbursement.amountReimbursed === "number" ? reimbursement.amountReimbursed : parseMoneyInput(String(reimbursement.amountReimbursed)),
          outstandingBalance: Math.max(0, (typeof reimbursement.amount === "number" ? reimbursement.amount : parseMoneyInput(String(reimbursement.amount))) - (typeof reimbursement.amountReimbursed === "number" ? reimbursement.amountReimbursed : parseMoneyInput(String(reimbursement.amountReimbursed)))),
          settlementDate: reimbursement.settlementDate ?? reimbursement.reimbursedDate ?? "",
          settlementReference: reimbursement.settlementReference ?? reimbursement.paymentReference ?? "",
          reimbursementProofFileName: reimbursement.reimbursementProofFileName ?? "",
          reimbursementProofUploadedAt: reimbursement.reimbursementProofUploadedAt ?? "",
          reimbursementProofNotes: reimbursement.reimbursementProofNotes ?? ""
        };
        setReimbursements((current) => current.map((item) => (item.id === reimbursement.id ? normalized : item)));
        if (!previous?.reimbursementProofFileName && normalized.reimbursementProofFileName) {
          audit("Reimbursements", normalized.id, normalized.personOwed, "Reimbursement Proof Uploaded", previous, normalized, `Uploaded proof ${normalized.reimbursementProofFileName}.`);
        }
        const reimbursementAction: AuditAction =
          previous?.status !== normalized.status && normalized.status === "Approved"
            ? "Reimbursement Approved"
            : previous?.status !== normalized.status && (normalized.status === "Fully Reimbursed" || normalized.status === "Closed" || normalized.status === "Reimbursed")
              ? "Reimbursement Marked Paid"
              : previous?.amountReimbursed !== normalized.amountReimbursed && normalized.amountReimbursed > 0
                ? "Treasury Settlement Recorded"
                : statusChanged(previous, normalized)
                  ? "Status Changed"
                  : "Updated";
        audit("Reimbursements", normalized.id, normalized.personOwed, reimbursementAction, previous, normalized);
      },
      deleteReimbursement: async (reimbursement) => {
        setReimbursements((current) => current.filter((item) => item.id !== reimbursement.id));
        audit("Reimbursements", reimbursement.id, reimbursement.personOwed, "Deleted", reimbursement, null);
      },
      addRevenue: async (revenueInput) => {
        const revenue: Revenue = { ...withPeriod(revenueInput, financialPeriods), id: resolveNewRecordId(revenues, revenueInput.id, "REV") };
        setRevenues((current) => [revenue, ...current]);
        audit("Revenue", revenue.id, revenue.source, "Created", null, revenue);
      },
      updateRevenue: async (revenue) => {
        const previous = revenues.find((item) => item.id === revenue.id);
        const period = findPeriodForDate(financialPeriods, revenue.revenueDate);
        if (period?.status === "Closed" && typeof window !== "undefined" && !window.confirm(`Financial period ${periodLabel(period)} is closed. Continue editing ${revenue.id}?`)) {
          setAppSettings((current) => ({ ...current, closedPeriodEditAttempts: (current.closedPeriodEditAttempts ?? 0) + 1 }));
          audit("Revenue", revenue.id, revenue.source, "Updated", previous, revenue, `Closed-period edit warning for ${periodLabel(period)} was not confirmed.`);
          return;
        }
        const normalized = withPeriod(revenue, financialPeriods);
        setRevenues((current) => current.map((item) => (item.id === revenue.id ? normalized : item)));
        audit("Revenue", normalized.id, normalized.source, statusChanged(previous, normalized) ? "Status Changed" : "Updated", previous, normalized);
      },
      deleteRevenue: async (revenue) => {
        setRevenues((current) => current.filter((item) => item.id !== revenue.id));
        audit("Revenue", revenue.id, revenue.source, "Deleted", revenue, null);
      },
      addReceipt: async (receiptInput) => {
        const paidByPerson = people.find((person) => person.id === receiptInput.paidByPersonId || person.fullName === receiptInput.paidBy);
        const linkedEvent = events.find((event) => event.id === receiptInput.linkedEventId || event.eventName === receiptInput.event);
        const receipt: ReceiptIntake = {
          ...withPeriod(receiptInput, financialPeriods),
          id: resolveNewRecordId(receipts, receiptInput.id, "RCT"),
          paidByPersonId: paidByPerson?.id ?? receiptInput.paidByPersonId,
          paidByPersonName: paidByPerson?.fullName ?? receiptInput.paidBy,
          linkedEventId: linkedEvent?.id ?? receiptInput.linkedEventId,
          linkedEventName: linkedEvent?.eventName ?? receiptInput.linkedEventName ?? (receiptInput.event === "General Operations" ? "" : receiptInput.event),
          costCenter: receiptInput.costCenter || "General Operations",
          expensePurpose: receiptInput.expensePurpose || receiptInput.notes,
          possibleDuplicateOfId: receipts.find((existing) => isPotentialReceiptDuplicate(receiptInput, existing))?.id
        };
        setReceipts((current) => [receipt, ...current]);
        audit("Receipt Intake", receipt.id, receipt.vendor || receipt.id, "Created", null, receipt);
      },
      updateReceipt: async (receipt) => {
        const previous = receipts.find((item) => item.id === receipt.id);
        const paidByPerson = people.find((person) => person.id === receipt.paidByPersonId || person.fullName === receipt.paidBy);
        const linkedEvent = events.find((event) => event.id === receipt.linkedEventId || event.eventName === receipt.event);
        const normalized = withPeriod({
          ...receipt,
          paidByPersonId: paidByPerson?.id ?? receipt.paidByPersonId,
          paidByPersonName: paidByPerson?.fullName ?? receipt.paidBy,
          linkedEventId: linkedEvent?.id ?? receipt.linkedEventId,
          linkedEventName: linkedEvent?.eventName ?? receipt.linkedEventName ?? (receipt.event === "General Operations" ? "" : receipt.event),
          costCenter: receipt.costCenter || "General Operations",
          expensePurpose: receipt.expensePurpose || receipt.notes
        }, financialPeriods);
        setReceipts((current) => current.map((item) => (item.id === receipt.id ? normalized : item)));
        audit("Receipt Intake", normalized.id, normalized.vendor || normalized.id, statusChanged(previous, normalized) ? "Status Changed" : "Updated", previous, normalized);
      },
      deleteReceipt: async (receipt) => {
        setReceipts((current) => current.filter((item) => item.id !== receipt.id));
        audit("Receipt Intake", receipt.id, receipt.vendor || receipt.id, "Deleted", receipt, null);
      },
      addCostCenter: async (costCenterInput) => {
        const costCenter: CostCenter = { ...costCenterInput, id: resolveNewRecordId(costCenters, costCenterInput.id, "CC") };
        setCostCenters((current) => [costCenter, ...current]);
        audit("Cost Centers", costCenter.id, costCenter.name, "Created", null, costCenter);
      },
      updateCostCenter: async (costCenter) => {
        const previous = costCenters.find((item) => item.id === costCenter.id);
        setCostCenters((current) => current.map((item) => (item.id === costCenter.id ? costCenter : item)));
        audit("Cost Centers", costCenter.id, costCenter.name, statusChanged(previous, costCenter) ? "Status Changed" : "Updated", previous, costCenter);
      },
      deleteCostCenter: async (costCenter) => {
        setCostCenters((current) => current.filter((item) => item.id !== costCenter.id));
        audit("Cost Centers", costCenter.id, costCenter.name, "Deleted", costCenter, null);
      },
      archiveCostCenter: async (costCenter) => {
        const archived = { ...costCenter, status: "Archived" as const };
        setCostCenters((current) => current.map((item) => (item.id === costCenter.id ? archived : item)));
        audit("Cost Centers", costCenter.id, costCenter.name, "Status Changed", costCenter, archived, "Archived cost center.");
      },
      addDocument: async (documentInput) => {
        const document: SupportingDocument = { ...documentInput, id: resolveNewRecordId(documents, documentInput.id, "DOC") };
        setDocuments((current) => [document, ...current]);
        audit("Document Register", document.id, document.title, "Created", null, document, "Document register entry created.");
      },
      updateDocument: async (document) => {
        const previous = documents.find((item) => item.id === document.id);
        setDocuments((current) => current.map((item) => (item.id === document.id ? document : item)));
        audit("Document Register", document.id, document.title, statusChanged(previous, document) ? "Status Changed" : "Updated", previous, document, "Document register entry updated.");
      },
      deleteDocument: async (document) => {
        setDocuments((current) => current.filter((item) => item.id !== document.id));
        audit("Document Register", document.id, document.title, "Deleted", document, null, "Document register entry deleted.");
      },
      addApplicationImport: async (importInput) => {
        const now = new Date().toISOString();
        const applicationImport: ApplicationImport = {
          ...importInput,
          id: resolveNewRecordId(applicationImports, importInput.id, "AIMP"),
          createdAt: importInput.createdAt || now,
          updatedAt: now
        };
        setApplicationImports((current) => [applicationImport, ...current]);
        audit("Application Import", applicationImport.id, applicationImport.fileName || applicationImport.id, "Application Import Created", null, applicationImport, "OCR-ready application import created.");
        return applicationImport;
      },
      updateApplicationImport: async (applicationImport) => {
        const previous = applicationImports.find((item) => item.id === applicationImport.id);
        const normalized = { ...applicationImport, updatedAt: new Date().toISOString() };
        setApplicationImports((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
        audit("Application Import", normalized.id, normalized.fileName || normalized.id, statusChanged(previous, normalized) ? "Status Changed" : "Updated", previous, normalized);
      },
      deleteApplicationImport: async (applicationImport) => {
        setApplicationImports((current) => current.filter((item) => item.id !== applicationImport.id));
        audit("Application Import", applicationImport.id, applicationImport.fileName || applicationImport.id, "Deleted", applicationImport, null, "Application import deleted.");
      },
      convertApplicationImportToApplication: async (applicationImport) => {
        const now = new Date().toISOString();
        const category = normalizeLicenseCategory(getMappedValue(applicationImport.mappedFields, "licenseCategory") || "Professional Boxer");
        const fee = currentFeeForCategory(category, licenseFeeSchedule);
        const fullName = getMappedValue(applicationImport.mappedFields, "applicantFullName");
        const passportNumber = getMappedValue(applicationImport.mappedFields, "passportNumber");
        const nationalIdNumber = getMappedValue(applicationImport.mappedFields, "nationalIdNumber");
        const email = getMappedValue(applicationImport.mappedFields, "email");
        const phone = getMappedValue(applicationImport.mappedFields, "phone");
        if (!fullName || !getMappedValue(applicationImport.mappedFields, "dateOfBirth") || !getMappedValue(applicationImport.mappedFields, "nationality") || (!passportNumber && !nationalIdNumber)) {
          throw new Error("Full name, date of birth, nationality, and Passport OR National ID are required before creating an application.");
        }
        const duplicate = licenseApplications.find((existing) =>
          [existing.applicantFullName.toLowerCase(), existing.fullLegalName?.toLowerCase()].includes(fullName.toLowerCase()) ||
          Boolean(passportNumber && existing.passportNumber === passportNumber) ||
          Boolean(nationalIdNumber && existing.nationalIdNumber === nationalIdNumber) ||
          Boolean(email && existing.email.toLowerCase() === email.toLowerCase()) ||
          Boolean(phone && existing.phone === phone)
        );
        const application = normalizeLicenseWorkflow({
          id: getNextSequentialId(licenseApplications, "APP"),
          sourceImportId: applicationImport.id,
          applicationOrigin: applicationImport.applicationOrigin,
          licenseIssueNumber: getNextLicenseIssueNumber(licenseApplications),
          applicantFullName: fullName,
          fullLegalName: fullName,
          applicantPhotoFileName: "",
          placeOfBirth: getMappedValue(applicationImport.mappedFields, "placeOfBirth"),
          nationality: getMappedValue(applicationImport.mappedFields, "nationality"),
          dateOfBirth: getMappedValue(applicationImport.mappedFields, "dateOfBirth"),
          passportNumber,
          nationalIdNumber,
          identificationNumber: passportNumber || nationalIdNumber,
          gender: getMappedValue(applicationImport.mappedFields, "gender") as LicenseApplication["gender"],
          existingRegisteredLicenseNumber: getMappedValue(applicationImport.mappedFields, "existingRegisteredLicenseNumber"),
          phone,
          email,
          address: getMappedValue(applicationImport.mappedFields, "address"),
          city: getMappedValue(applicationImport.mappedFields, "city"),
          country: getMappedValue(applicationImport.mappedFields, "country"),
          postalCode: getMappedValue(applicationImport.mappedFields, "postalCode"),
          emergencyContactName: getMappedValue(applicationImport.mappedFields, "emergencyContactName"),
          emergencyContactRelationship: getMappedValue(applicationImport.mappedFields, "emergencyContactRelationship"),
          emergencyContactPhone: getMappedValue(applicationImport.mappedFields, "emergencyContactPhone"),
          licenseCategory: category,
          otherCategoryDescription: "",
          yearsOfExperience: getMappedValue(applicationImport.mappedFields, "yearsOfExperience"),
          currentOrganizationTeam: getMappedValue(applicationImport.mappedFields, "currentOrganizationTeam"),
          professionalCertificationsHeld: getMappedValue(applicationImport.mappedFields, "professionalCertificationsHeld"),
          deniedLicense: getMappedValue(applicationImport.mappedFields, "deniedLicense") as LicenseApplication["deniedLicense"],
          medicalCondition: getMappedValue(applicationImport.mappedFields, "medicalCondition") as LicenseApplication["medicalCondition"],
          applicationSource: "Soft Copy",
          applicationScanFileName: applicationImport.fileName,
          supportingDocumentFileNames: applicationImport.fileName ? [applicationImport.fileName] : [],
          documentChecklistSnapshot: buildDocumentChecklistSnapshot(category, licenseDocumentRequirements, [], ""),
          amountDue: fee?.amount || 0,
          amountPaid: parseMoneyInput(getMappedValue(applicationImport.mappedFields, "amountPaid")) || 0,
          currency: fee?.currency || "AED",
          paymentStatus: parseMoneyInput(getMappedValue(applicationImport.mappedFields, "amountPaid")) > 0 ? "Payment Submitted" : "Pending Payment",
          paymentMethod: "Other",
          paidTo: "UAE Athletic Commission",
          paymentDate: "",
          paymentReference: getMappedValue(applicationImport.mappedFields, "paymentReference"),
          paymentNotes: `Created from OCR-ready import ${applicationImport.id}. Human review required.`,
          reviewStatus: parseMoneyInput(getMappedValue(applicationImport.mappedFields, "amountPaid")) > 0 ? "Awaiting Payment Verification" : "New",
          reviewedBy: "",
          chiefReviewer: "",
          reviewDate: "",
          approvalDate: "",
          rejectionReason: "",
          internalNotes: applicationImport.notes,
          stampStatus: "Not Available Yet",
          stampDate: "",
          stampedBy: "",
          stampNotes: "",
          licenseStatus: "Application Registered",
          invoiceStatus: "Not Generated",
          invoiceNumber: "",
          invoiceDate: "",
          invoiceAmount: fee?.amount || 0,
          invoiceRecipient: fullName,
          invoiceNotes: "",
          completionChecklist: {
            photoReceived: false,
            identificationProvided: Boolean(passportNumber || nationalIdNumber),
            applicationFormReceived: Boolean(applicationImport.fileName),
            medicalReceived: false,
            paymentReceived: false,
            chiefReviewComplete: false,
            stampComplete: false
          },
          createdAt: now,
          updatedAt: now
        });
        setLicenseApplications((current) => [application, ...current]);
        setApplicationImports((current) => current.map((item) => (item.id === applicationImport.id ? { ...item, ocrStatus: "Converted To Application", linkedApplicationId: application.id, duplicateWarning: duplicate?.id, updatedAt: now } : item)));
        audit("Application Import", applicationImport.id, applicationImport.fileName || applicationImport.id, "Converted", applicationImport, { ...applicationImport, ocrStatus: "Converted To Application", linkedApplicationId: application.id }, `Created ${application.id} / ${application.licenseIssueNumber}.`);
        audit("License Applications", application.id, application.applicantFullName, "Application Created From OCR Import", null, application, duplicate ? `Possible duplicate: ${duplicate.id}.` : `Created from import ${applicationImport.id}.`);
        return application;
      },
      addLicenseApplication: async (applicationInput) => {
        const now = new Date().toISOString();
        const requestedLicenseIssueNumber = applicationInput.licenseIssueNumber;
        const licenseIssueNumberIsUnique = isValidLicenseIssueNumber(requestedLicenseIssueNumber) && !licenseApplications.some((application) => application.licenseIssueNumber === requestedLicenseIssueNumber);
        const category = normalizeLicenseCategory(applicationInput.licenseCategory);
        const fee = currentFeeForCategory(category, licenseFeeSchedule);
        const online = applicationInput.applicationOrigin === "Online Form" || applicationInput.applicationOrigin === "Online Application";
        const invoiceNumber = online ? applicationInput.invoiceNumber || getNextInvoiceNumber(licenseApplications) : applicationInput.invoiceNumber;
        const invoiceDate = online ? applicationInput.invoiceDate || now.slice(0, 10) : applicationInput.invoiceDate;
        const submittedPayment = online && applicationInput.paymentStatus === "Payment Submitted";
        const application = normalizeLicenseWorkflow({
          ...applicationInput,
          licenseCategory: category,
          id: resolveNewRecordId(licenseApplications, applicationInput.id, "APP"),
          licenseIssueNumber: licenseIssueNumberIsUnique ? requestedLicenseIssueNumber : getNextLicenseIssueNumber(licenseApplications),
          documentChecklistSnapshot: applicationInput.documentChecklistSnapshot?.length ? applicationInput.documentChecklistSnapshot : buildDocumentChecklistSnapshot(category, licenseDocumentRequirements, [], applicationInput.heldPreviousLicense),
          amountDue: applicationInput.amountDue || fee?.amount || 0,
          invoiceAmount: applicationInput.invoiceAmount || fee?.amount || 0,
          currency: applicationInput.currency || fee?.currency || "AED",
          invoiceCurrency: applicationInput.invoiceCurrency || applicationInput.currency || fee?.currency || "AED",
          validityPeriod: applicationInput.validityPeriod || fee?.validityPeriod || "",
          feeScheduleItemId: applicationInput.feeScheduleItemId || fee?.id || "",
          feeVersionDate: applicationInput.feeVersionDate || fee?.effectiveDate || now.slice(0, 10),
          paymentStatus: submittedPayment ? "Payment Submitted" : online ? "Pending Payment" : applicationInput.paymentStatus ?? "Pending Payment",
          reviewStatus: submittedPayment ? "Awaiting Payment Verification" : online ? "Awaiting Payment" : applicationInput.reviewStatus ?? "New",
          licenseStatus: online ? "Awaiting Payment" : applicationInput.licenseStatus ?? "Application Registered",
          invoiceStatus: online ? "Generated" : applicationInput.invoiceStatus,
          invoiceNumber,
          invoiceDate,
          invoiceDueDate: applicationInput.invoiceDueDate || (online ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) : ""),
          invoiceApplicantName: applicationInput.invoiceApplicantName || applicationInput.applicantFullName,
          invoiceLicenseCategory: applicationInput.invoiceLicenseCategory || category,
          createdAt: applicationInput.createdAt || now,
          updatedAt: now
        });
        setLicenseApplications((current) => [application, ...current]);
        audit("License Applications", application.id, application.applicantFullName, "Application created", null, application, `Registered LIN ${application.licenseIssueNumber}.`);
        if (application.declarationAccepted) {
          audit("License Applications", application.id, application.applicantFullName, "Declaration Accepted", null, application, "Applicant declaration completed with signature, name, and date.");
        }
        if (online) {
          audit("License Applications", application.id, application.applicantFullName, "Invoice generated", null, application, `Generated invoice ${application.invoiceNumber}.`);
          if (application.paymentStatus === "Payment Submitted") {
            audit("License Applications", application.id, application.applicantFullName, "Payment Submitted", null, application, "Applicant submitted payment proof.");
          }
        }
        return application;
      },
      updateLicenseApplication: async (application) => {
        const previous = licenseApplications.find((item) => item.id === application.id);
        const normalized = normalizeLicenseWorkflow({ ...application, updatedAt: new Date().toISOString() }, previous);
        setLicenseApplications((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
        const action: AuditAction =
          previous?.reviewStatus !== normalized.reviewStatus && normalized.reviewStatus === "License Issued"
            ? "License issued"
            : previous?.reviewStatus !== normalized.reviewStatus && normalized.reviewStatus === "Ready for Stamp"
              ? "License marked ready for stamp"
              : previous?.reviewStatus !== normalized.reviewStatus && normalized.reviewStatus === "Rejected"
                ? "Application rejected"
                : previous?.reviewStatus !== normalized.reviewStatus && normalized.reviewStatus === "Approved by Chief"
                  ? "Chief approval recorded"
                  : previous?.paymentStatus !== normalized.paymentStatus && normalized.paymentStatus === "Waived"
                    ? "Payment Waived"
                    : previous?.paymentStatus !== normalized.paymentStatus && (normalized.paymentStatus === "Payment Verified" || normalized.paymentStatus === "Paid")
                    ? "Payment Verified"
                    : previous?.paymentStatus !== normalized.paymentStatus && normalized.paymentStatus === "Pending Payment"
                      ? "Payment Rejected"
                      : previous?.paymentStatus !== normalized.paymentStatus
                        ? "Payment status changed"
                    : previous?.reviewStatus !== normalized.reviewStatus
                      ? "Review status changed"
                      : statusChanged(previous, normalized)
                        ? "Status Changed"
                        : "Application updated";
        setDocuments((current) => current.map((document) => (document.linkedModule === "License/Application future use" && document.linkedRecordId === normalized.id ? { ...document, linkedModule: "License Application" } : document)));
        audit("License Applications", normalized.id, normalized.applicantFullName, action, previous, normalized);
        return normalized;
      },
      deleteLicenseApplication: async (application) => {
        setLicenseApplications((current) => current.filter((item) => item.id !== application.id));
        audit("License Applications", application.id, application.applicantFullName, "Deleted", application, null, "License application deleted.");
      },
      addLicenseIntake: async (intakeInput) => {
        const now = new Date().toISOString();
        const intake: LicenseIntake = {
          ...intakeInput,
          id: resolveNewRecordId(licenseIntake, intakeInput.id, "INT"),
          supportingDocumentFileNames: intakeInput.supportingDocumentFileNames ?? [],
          intakeStatus: intakeInput.intakeStatus ?? "New",
          createdAt: intakeInput.createdAt || now,
          updatedAt: now
        };
        setLicenseIntake((current) => [intake, ...current]);
        audit("Application Intake", intake.id, intake.applicantName, "Created", null, intake, "License application intake record created.");
        return intake;
      },
      addBulkLicenseIntake: async (intakeRows) => {
        const now = new Date().toISOString();
        const firstNumber = Number(getNextSequentialId(licenseIntake, "INT").replace("INT-", ""));
        const created = intakeRows.map((intakeInput, index) => ({
          ...intakeInput,
          id: `INT-${String(firstNumber + index).padStart(6, "0")}`,
          supportingDocumentFileNames: intakeInput.supportingDocumentFileNames ?? [],
          intakeStatus: intakeInput.intakeStatus ?? "Awaiting Data Entry",
          createdAt: intakeInput.createdAt || now,
          updatedAt: now
        })) as LicenseIntake[];
        setLicenseIntake((current) => [...created, ...current]);
        created.forEach((intake) => audit("Application Intake", intake.id, intake.applicantName, "Created", null, intake, "Created from bulk intake entry."));
        return created;
      },
      updateLicenseIntake: async (intake) => {
        const previous = licenseIntake.find((item) => item.id === intake.id);
        const normalized = { ...intake, updatedAt: new Date().toISOString() };
        setLicenseIntake((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
        audit("Application Intake", normalized.id, normalized.applicantName, statusChanged(previous, normalized) ? "Status Changed" : "Updated", previous, normalized);
      },
      deleteLicenseIntake: async (intake) => {
        setLicenseIntake((current) => current.filter((item) => item.id !== intake.id));
        audit("Application Intake", intake.id, intake.applicantName, "Deleted", intake, null, "License intake record deleted.");
      },
      convertLicenseIntakeToApplication: async (intake) => {
        const now = new Date().toISOString();
        const application = normalizeLicenseWorkflow({
          id: getNextSequentialId(licenseApplications, "APP"),
          sourceIntakeId: intake.id,
          applicationOrigin: "Historical Migration",
          licenseIssueNumber: getNextLicenseIssueNumber(licenseApplications),
          applicantFullName: intake.applicantName,
          applicantPhotoFileName: "",
          nationality: "",
          dateOfBirth: "",
          identificationNumber: "",
          phone: "",
          email: "",
          address: "",
          licenseCategory: intake.licenseCategory,
          otherCategoryDescription: "",
          applicationSource: intake.applicationSource,
          applicationScanFileName: intake.applicationScanFileName,
          supportingDocumentFileNames: intake.supportingDocumentFileNames,
          amountDue: 0,
          amountPaid: 0,
          currency: "AED",
          paymentStatus: intake.paymentProofFileName ? "Pending Payment" : "Pending Payment",
          paymentMethod: "Other",
          paidTo: "UAE Athletic Commission",
          paymentDate: "",
          paymentReference: intake.paymentProofFileName,
          paymentNotes: intake.paymentProofFileName ? `Payment proof placeholder: ${intake.paymentProofFileName}` : "",
          reviewStatus: "New",
          reviewedBy: "",
          chiefReviewer: "",
          reviewDate: "",
          approvalDate: "",
          rejectionReason: "",
          internalNotes: intake.intakeNotes,
          stampStatus: "Not Available Yet",
          stampDate: "",
          stampedBy: "",
          stampNotes: "",
          licenseStatus: "Application Registered",
          invoiceStatus: "Not Generated",
          invoiceNumber: "",
          invoiceDate: "",
          invoiceAmount: 0,
          invoiceRecipient: intake.applicantName,
          invoiceNotes: "",
          completionChecklist: {
            photoReceived: false,
            identificationProvided: intake.supportingDocumentFileNames.some((fileName) => fileName.toLowerCase().includes("passport") || fileName.toLowerCase().includes("id")),
            applicationFormReceived: Boolean(intake.applicationScanFileName),
            medicalReceived: intake.supportingDocumentFileNames.some((fileName) => fileName.toLowerCase().includes("medical")),
            paymentReceived: Boolean(intake.paymentProofFileName),
            chiefReviewComplete: false,
            stampComplete: false
          },
          createdAt: now,
          updatedAt: now
        });
        setLicenseApplications((current) => [application, ...current]);
        setLicenseIntake((current) => current.map((item) => (item.id === intake.id ? { ...item, intakeStatus: "Converted to Application", convertedApplicationId: application.id, updatedAt: now } : item)));
        audit("Application Intake", intake.id, intake.applicantName, "Converted", intake, { ...intake, intakeStatus: "Converted to Application", convertedApplicationId: application.id }, `Converted to ${application.id} / ${application.licenseIssueNumber}.`);
        audit("License Applications", application.id, application.applicantFullName, "Application created", null, application, `Created from intake ${intake.id}.`);
        return application;
      },
      generateLicenseReceipt: async (application) => {
        if (!application.amountPaid || !application.paymentMethod || !application.paidTo || !application.paymentDate) {
          throw new Error("Receipt requires amount paid, payment method, paid to, and payment date.");
        }
        const receipt: LicenseReceipt = {
          id: getNextSequentialId(licenseReceipts, "RCT-2026"),
          receiptDate: new Date().toISOString().slice(0, 10),
          applicantName: application.applicantFullName,
          applicationId: application.id,
          lin: application.licenseIssueNumber,
          invoiceNumber: application.invoiceNumber,
          categoryLabel: licenseCategoryLabel(application),
          amountReceived: application.amountPaid,
          currency: application.currency,
          paymentMethod: application.paymentMethod,
          paymentDate: application.paymentDate,
          paymentReference: application.paymentReference,
          paidTo: application.paidTo,
          receivedBy: "Finance Admin",
          receivedFor: "UAEAC Professional Boxing License Fee",
          notes: application.paymentNotes,
          status: "Active",
          createdAt: new Date().toISOString()
        };
        setLicenseReceipts((current) => [receipt, ...current]);
        setLicenseApplications((current) => current.map((item) => (item.id === application.id ? { ...item, receiptNumber: receipt.id } : item)));
        audit("License Applications", application.id, application.applicantFullName, "Receipt Generated", null, receipt, `Generated receipt ${receipt.id}.`);
        return receipt;
      },
      markLicenseReceiptDownloaded: (receipt) => {
        audit("License Applications", receipt.applicationId, receipt.applicantName, "Receipt Downloaded", null, receipt, `Receipt ${receipt.id} downloaded or printed.`);
      },
      generateLicenseDraft: async (application) => {
        if (application.reviewStatus === "Rejected" || application.licenseStatus === "Rejected") {
          throw new Error("Cannot generate a license for a rejected application.");
        }
        const blockers = licenseIssueBlockers(application);
        if (blockers.length) {
          throw new Error(blockers.join("\n"));
        }
        const issueDate = application.approvalDate || new Date().toISOString().slice(0, 10);
        const generatedLicense: GeneratedLicense = {
          id: getNextSequentialId(generatedLicenses, "LIC-2026"),
          applicationId: application.id,
          lin: application.licenseIssueNumber,
          applicantName: application.applicantFullName,
          categoryLabel: licenseCategoryLabel(application),
          dateIssued: issueDate,
          expiryDate: addValidity(issueDate, application.validityPeriod),
          stampStatus: stampSettings.stampAvailable === "Yes" ? "Stamped" : "Awaiting Stamp",
          issuedBy: application.approvedBy || application.chiefReviewer,
          issuedByTitle: "UAE Athletic Commission",
          printStatus: "Draft",
          createdAt: new Date().toISOString()
        };
        setGeneratedLicenses((current) => [generatedLicense, ...current]);
        setLicenseApplications((current) => current.map((item) => (item.id === application.id ? {
          ...item,
          stampStatus: stampSettings.stampAvailable === "Yes" ? "Stamped" : "Awaiting Stamp",
          licenseStatus: stampSettings.stampAvailable === "Yes" ? "Issued" : "Approved Awaiting Stamp",
          reviewStatus: stampSettings.stampAvailable === "Yes" ? "License Issued" : item.reviewStatus,
          licenseExpiryDate: generatedLicense.expiryDate,
          stampDate: stampSettings.stampAvailable === "Yes" ? issueDate : item.stampDate,
          stampedBy: stampSettings.stampAvailable === "Yes" ? stampSettings.defaultStampedBy : item.stampedBy
        } : item)));
        audit("License Applications", application.id, application.applicantFullName, "License Draft Generated", null, generatedLicense, `Generated ${generatedLicense.id}.`);
        return generatedLicense;
      },
      updateGeneratedLicense: (license) => {
        setGeneratedLicenses((current) => current.map((item) => (item.id === license.id ? license : item)));
        audit("License Applications", license.applicationId, license.applicantName, license.printStatus === "Printed" ? "License Printed / Downloaded" : "License Previewed", null, license);
      },
      updateStampSettings: (settings) => {
        const nextSettings = { ...settings, updatedAt: new Date().toISOString() };
        setStampSettings(nextSettings);
        audit("Data Management", "STAMP-SETTINGS", "Stamp Settings", "Updated", stampSettings, nextSettings, "Updated UAEAC stamp settings.");
      },
      removeDemoRecordsOnly: () => {
        const demoApplicationIds = new Set(licenseApplications.filter(isKnownDemoLicenseApplication).map((application) => application.id));
        setLicenseApplications((current) => current.filter((application) => !demoApplicationIds.has(application.id)));
        setLicenseReceipts((current) => current.filter((receipt) => !demoApplicationIds.has(receipt.applicationId)));
        setGeneratedLicenses((current) => current.filter((license) => !demoApplicationIds.has(license.applicationId)));
        setLicenseIntake((current) => current.filter((intake) => !["INT-000001", "INT-000002"].includes(intake.id)));
        audit("Data Management", "DEMO-CLEANUP", "Remove Demo Records Only", "Deleted", null, { removedApplications: demoApplicationIds.size }, "Removed known demo licensing records only.");
      },
      removeFaultyTestExpense: () => {
        const faultyExpenses = expenses.filter((expense) => {
          const description = `${expense.description ?? ""} ${expense.expensePurpose ?? ""}`.toLowerCase();
          return expense.id === "EXP-000001" && (expense.amount === 10.59 || description.includes("accommodation for meydan event (4 rooms)"));
        });
        if (!faultyExpenses.length) return 0;

        const faultyExpenseIds = new Set(faultyExpenses.map((expense) => expense.id));
        const linkedReceiptIds = new Set(faultyExpenses.map((expense) => expense.sourceReceiptId).filter(Boolean));
        setExpenses((current) => current.filter((expense) => !faultyExpenseIds.has(expense.id)));
        setReimbursements((current) => current.filter((reimbursement) => !faultyExpenseIds.has(reimbursement.linkedExpense)));
        setReceipts((current) => current.filter((receipt) => !faultyExpenseIds.has(receipt.convertedExpenseId ?? "") && !linkedReceiptIds.has(receipt.id)));
        audit("Data Management", "EXP-000001", "Remove Faulty Test Expense EXP-000001", "Faulty Test Expense Removed", faultyExpenses, { removedExpenses: faultyExpenses.length }, "Removed faulty Meydan accommodation test expense and clearly linked local records.");
        return faultyExpenses.length;
      },
      cleanupOrphanedReferences: () => {
        const expenseIds = new Set(expenses.map((expense) => expense.id));
        const receiptIds = new Set(receipts.map((receipt) => receipt.id));
        const orphanedReimbursements = reimbursements.filter((reimbursement) => reimbursement.linkedExpense && !expenseIds.has(reimbursement.linkedExpense)).length;
        const orphanedReceipts = receipts.filter((receipt) => receipt.convertedExpenseId && !expenseIds.has(receipt.convertedExpenseId)).length;
        const expensesWithMissingReceipt = expenses.filter((expense) => expense.sourceReceiptId && !receiptIds.has(expense.sourceReceiptId)).length;

        setReimbursements((current) => current.filter((reimbursement) => !reimbursement.linkedExpense || expenseIds.has(reimbursement.linkedExpense)));
        setReceipts((current) => current.map((receipt) => receipt.convertedExpenseId && !expenseIds.has(receipt.convertedExpenseId) ? { ...receipt, convertedExpenseId: "", status: "Needs Review" } : receipt));
        setExpenses((current) => current.map((expense) => expense.sourceReceiptId && !receiptIds.has(expense.sourceReceiptId) ? { ...expense, sourceReceiptId: "", receiptAttachment: "" } : expense));
        audit("Data Management", "REFERENCE-CLEANUP", "Find Orphaned / Deleted References", "Updated", null, { orphanedReimbursements, orphanedReceipts, expensesWithMissingReceipt }, "Cleared local references to deleted expenses or receipts.");
        return { orphanedReimbursements, orphanedReceipts: orphanedReceipts + expensesWithMissingReceipt };
      },
      addLicenseFeeScheduleItem: async (itemInput) => {
        const item: LicenseFeeScheduleItem = { ...itemInput, category: normalizeLicenseCategory(itemInput.category), id: resolveNewRecordId(licenseFeeSchedule, itemInput.id, "LFS") };
        setLicenseFeeSchedule((current) => [item, ...current]);
        audit("License Applications", item.id, item.category, "Fee schedule created", null, item);
      },
      updateLicenseFeeScheduleItem: async (item) => {
        const previous = licenseFeeSchedule.find((current) => current.id === item.id);
        const normalized = { ...item, category: normalizeLicenseCategory(item.category) };
        setLicenseFeeSchedule((current) => current.map((entry) => (entry.id === normalized.id ? normalized : entry)));
        audit("License Applications", normalized.id, normalized.category, previous?.status !== normalized.status ? "Fee schedule archived/restored" : "Fee schedule updated", previous, normalized);
      },
      restoreDefaultLicenseFeeSchedule: () => {
        setLicenseFeeSchedule(ensureRecordIds(initialLicenseFeeSchedule, "LFS"));
        audit("License Applications", "FEE-SCHEDULE", "License Fee Schedule", "Fee schedule archived/restored", null, initialLicenseFeeSchedule, "Restored default fee schedule.");
      },
      addLicenseDocumentRequirement: async (requirementInput) => {
        const requirement: LicenseDocumentRequirement = {
          ...requirementInput,
          appliesToCategories: requirementInput.appliesToCategories.map(normalizeLicenseCategory),
          id: resolveNewRecordId(licenseDocumentRequirements, requirementInput.id, "LDR")
        };
        setLicenseDocumentRequirements((current) => [requirement, ...current]);
        audit("License Applications", requirement.id, requirement.documentName, "Document requirement created", null, requirement);
      },
      updateLicenseDocumentRequirement: async (requirement) => {
        const previous = licenseDocumentRequirements.find((current) => current.id === requirement.id);
        const normalized = { ...requirement, appliesToCategories: requirement.appliesToCategories.map(normalizeLicenseCategory) };
        setLicenseDocumentRequirements((current) => current.map((entry) => (entry.id === normalized.id ? normalized : entry)));
        audit("License Applications", normalized.id, normalized.documentName, previous?.status !== normalized.status ? "Document requirement archived/restored" : "Document requirement updated", previous, normalized);
      },
      restoreDefaultLicenseDocumentRequirements: () => {
        setLicenseDocumentRequirements(ensureRecordIds(initialLicenseDocumentRequirements, "LDR"));
        audit("License Applications", "DOCUMENT-REQUIREMENTS", "License Document Requirements", "Document requirement archived/restored", null, initialLicenseDocumentRequirements, "Restored default document requirements.");
      },
      updatePaymentSettings: (settings) => {
        const nextSettings = { ...settings, updatedAt: new Date().toISOString() };
        setPaymentSettings(nextSettings);
        audit("Data Management", "PAYMENT-SETTINGS", "Payment settings", "Updated", paymentSettings, nextSettings, "Payment instructions settings updated.");
      },
      markBackupCompleted: () => {
        const nextSettings = { ...appSettings, lastBackupAt: new Date().toISOString() };
        setAppSettings(nextSettings);
        audit("Data Management", "BACKUP", "Manual backup marker", "Updated", appSettings, nextSettings, "Manual backup completed marker set.");
      },
      setDataMode: (mode) => {
        const nextSettings = { ...appSettings, mode };
        setAppSettings(nextSettings);
        audit("Data Management", "MODE", "Data entry mode", "Status Changed", appSettings, nextSettings, `Switched to ${mode === "real" ? "Real Data Entry Mode" : "Demo Mode"}.`);
      },
      updateFinancialPeriod: (period) => {
        const previous = financialPeriods.find((item) => item.id === period.id);
        setFinancialPeriods((current) => current.map((item) => (item.id === period.id ? period : item)));
        audit("Data Management", period.id, periodLabel(period), statusChanged(previous, period) ? "Status Changed" : "Updated", previous, period, "Financial period updated.");
      },
      addInternalNote: (module, recordId, note) => {
        const nextNote: InternalNote = { ...note, id: nextNoteId(), timestamp: new Date().toISOString() };
        if (module === "Expenses") {
          const previous = expenses.find((item) => item.id === recordId);
          setExpenses((current) => current.map((item) => (item.id === recordId ? { ...item, noteHistory: [nextNote, ...(item.noteHistory ?? [])] } : item)));
          audit("Expenses", recordId, previous?.description ?? recordId, "Updated", previous, { note: nextNote }, "Internal note added.");
        }
        if (module === "Reimbursements") {
          const previous = reimbursements.find((item) => item.id === recordId);
          setReimbursements((current) => current.map((item) => (item.id === recordId ? { ...item, noteHistory: [nextNote, ...(item.noteHistory ?? [])] } : item)));
          audit("Reimbursements", recordId, previous?.personOwed ?? recordId, "Updated", previous, { note: nextNote }, "Internal note added.");
        }
        if (module === "Cost Centers") {
          const previous = costCenters.find((item) => item.id === recordId);
          setCostCenters((current) => current.map((item) => (item.id === recordId ? { ...item, noteHistory: [nextNote, ...((item as CostCenter & { noteHistory?: InternalNote[] }).noteHistory ?? [])] } as CostCenter : item)));
          audit("Cost Centers", recordId, previous?.name ?? recordId, "Updated", previous, { note: nextNote }, "Internal note added.");
        }
        if (module === "Receipt Intake") {
          const previous = receipts.find((item) => item.id === recordId);
          setReceipts((current) => current.map((item) => (item.id === recordId ? { ...item, noteHistory: [nextNote, ...(item.noteHistory ?? [])] } : item)));
          audit("Receipt Intake", recordId, previous?.vendor ?? recordId, "Updated", previous, { note: nextNote }, "Internal note added.");
        }
      },
      addAuditLog: (log) => writeAuditLog(log),
      exportBackup: () => {
        const exportedAt = new Date().toISOString();
        const nextSettings = { ...appSettings, lastBackupAt: exportedAt };
        setAppSettings(nextSettings);
        const backup = {
          people,
          events,
          expenses,
          reimbursements,
          revenues,
          receipts,
          costCenters,
          auditLogs,
          documents,
          applicationImports,
          licenseApplications,
          licenseIntake,
          licenseReceipts,
          generatedLicenses,
          stampSettings,
          licenseFeeSchedule,
          licenseDocumentRequirements,
          paymentSettings,
          appSettings: nextSettings,
          financialPeriods,
          exportedAt,
          appVersion: APP_VERSION
        };
        audit("Data Management", "BACKUP", "Full backup JSON", "Exported", null, { exportedAt, records: Object.values(backup).filter(Array.isArray).reduce((sum, item) => sum + item.length, 0) }, "Exported full local backup.");
        return backup;
      },
      validateBackupData: (backupInput) => {
        const validation = validateBackup(backupInput);
        return validation.ok ? { ok: true } : validation;
      },
      importBackup: (backupInput) => {
        const validation = validateBackup(backupInput);
        if (!validation.ok) {
          return validation;
        }

        const sanitizedBackup = sanitizeBackupRecords(validation.backup);

        setPeople(sanitizedBackup.people);
        setEvents(sanitizedBackup.events);
        setExpenses(sanitizedBackup.expenses);
        setReimbursements(sanitizedBackup.reimbursements);
        setRevenues(sanitizedBackup.revenues);
        setReceipts(sanitizedBackup.receipts);
        setCostCenters(sanitizedBackup.costCenters);
        setAuditLogs(sanitizedBackup.auditLogs);
        setDocuments(sanitizedBackup.documents);
        setApplicationImports(sanitizedBackup.applicationImports);
        setLicenseApplications(sanitizedBackup.licenseApplications);
        setLicenseIntake(sanitizedBackup.licenseIntake);
        setLicenseReceipts(sanitizedBackup.licenseReceipts);
        setGeneratedLicenses(sanitizedBackup.generatedLicenses);
        setStampSettings(sanitizedBackup.stampSettings);
        setLicenseFeeSchedule(sanitizedBackup.licenseFeeSchedule);
        setLicenseDocumentRequirements(sanitizedBackup.licenseDocumentRequirements);
        setPaymentSettings(sanitizedBackup.paymentSettings);
        setAppSettings(validation.backup.appSettings);
        setFinancialPeriods(validation.backup.financialPeriods);
        audit("Data Management", "BACKUP", "Full backup JSON", "Imported", null, sanitizedBackup, "Imported full local backup.");

        return { ok: true };
      },
      resetDemoData: () => {
        const sanitizedDemoData = sanitizeBackupRecords({
          people: initialPeople,
          events: initialEvents,
          expenses: initialExpenses,
          reimbursements: initialReimbursements,
          revenues: initialRevenues,
          receipts: initialReceipts,
          costCenters: initialCostCenters,
          auditLogs: initialAuditLogs,
          documents: initialDocuments,
          applicationImports: initialApplicationImports,
          licenseApplications: initialLicenseApplications,
          licenseIntake: initialLicenseIntake,
          licenseReceipts: initialLicenseReceipts,
          generatedLicenses: initialGeneratedLicenses,
          stampSettings: initialStampSettings,
          licenseFeeSchedule: initialLicenseFeeSchedule,
          licenseDocumentRequirements: initialLicenseDocumentRequirements,
          paymentSettings: initialPaymentSettings,
          appSettings: initialAppSettings,
          financialPeriods: initialFinancialPeriods,
          exportedAt: new Date().toISOString(),
          appVersion: APP_VERSION
        });
        setPeople(sanitizedDemoData.people);
        setEvents(sanitizedDemoData.events);
        setExpenses(sanitizedDemoData.expenses);
        setReimbursements(sanitizedDemoData.reimbursements);
        setRevenues(sanitizedDemoData.revenues);
        setReceipts(sanitizedDemoData.receipts);
        setCostCenters(sanitizedDemoData.costCenters);
        setAuditLogs(sanitizedDemoData.auditLogs);
        setDocuments(sanitizedDemoData.documents);
        setApplicationImports(sanitizedDemoData.applicationImports);
        setLicenseApplications(sanitizedDemoData.licenseApplications);
        setLicenseIntake(sanitizedDemoData.licenseIntake);
        setLicenseReceipts(sanitizedDemoData.licenseReceipts);
        setGeneratedLicenses(sanitizedDemoData.generatedLicenses);
        setStampSettings(initialStampSettings);
        setLicenseFeeSchedule(sanitizedDemoData.licenseFeeSchedule);
        setLicenseDocumentRequirements(sanitizedDemoData.licenseDocumentRequirements);
        setPaymentSettings(initialPaymentSettings);
        setAppSettings(initialAppSettings);
        setFinancialPeriods(initialFinancialPeriods);
        audit("Data Management", "DEMO", "Demo dataset", "Reset", null, { appVersion: APP_VERSION }, "Reset demo data.");
      },
      clearLocalData: () => {
        removeStoredData();
        setPeople([]);
        setEvents([]);
        setExpenses([]);
        setReimbursements([]);
        setRevenues([]);
        setReceipts([]);
        setCostCenters([]);
        setAuditLogs([]);
        setDocuments([]);
        setApplicationImports([]);
        setLicenseApplications([]);
        setLicenseIntake([]);
        setLicenseReceipts([]);
        setGeneratedLicenses([]);
        setStampSettings(initialStampSettings);
        setLicenseFeeSchedule([]);
        setLicenseDocumentRequirements([]);
        setPaymentSettings(initialPaymentSettings);
        setAppSettings(initialAppSettings);
        setFinancialPeriods([]);
      }
    }),
    [appSettings, applicationImports, audit, auditLogs, costCenters, documents, events, expenses, financialPeriods, generatedLicenses, hasLoadedStorage, licenseApplications, licenseDocumentRequirements, licenseFeeSchedule, licenseIntake, licenseReceipts, paymentSettings, people, receipts, reimbursements, revenues, stampSettings, writeAuditLog]
  );

  return <FinanceDataContext.Provider value={value}>{children}</FinanceDataContext.Provider>;
}

export function useFinanceData() {
  const context = useContext(FinanceDataContext);

  if (!context) {
    throw new Error("useFinanceData must be used within FinanceDataProvider");
  }

  return context;
}
