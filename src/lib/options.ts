import type { ConfidentialityLevel, CostCenterType, CurrencyCode, DocumentApprovalStatus, DocumentLinkedModule, DocumentType, DocumentVerificationStatus, ExpenseCategory, ExpenseLinkType, LicenseApplicationOrigin, LicenseApplicationSource, LicenseCategory, LicenseDocumentVerificationStatus, LicenseIntakeStatus, LicenseInvoiceStatus, LicensePaidTo, LicensePaymentMethod, LicensePaymentStatus, LicenseReviewStatus, LicenseStatus, ReconciliationStatus, ReimbursementStatus, RevenueCategory, StampPosition, StampSize, StampStatus } from "@/types";

export const expenseCategories: ExpenseCategory[] = [
  "Travel",
  "Accommodation",
  "Food & Beverage",
  "Fuel",
  "Medical",
  "Licensing Operations",
  "Event Operations",
  "Officials",
  "Office & Administration",
  "Equipment",
  "Marketing",
  "Professional Services",
  "Workshop",
  "General Operations",
  "Other"
];

export const currencies: CurrencyCode[] = ["AED", "USD", "EUR", "GBP", "RUB"];

export const expenseLinkTypes: ExpenseLinkType[] = ["Event", "Workshop", "Tournament", "Meeting", "General Operations"];

export const revenueCategories: RevenueCategory[] = ["License Revenue", "Workshop Revenue", "Event Revenue", "Sanction Revenue", "Membership Revenue", "Sponsorship Revenue", "Donation Revenue", "Other Revenue"];

export const costCenterTypes: CostCenterType[] = ["Event", "Workshop", "Department", "Federation Operations", "WBC Operations", "Licensing", "General Admin", "Athletic Commission Operations"];

export const reimbursementLiabilityStatuses: ReimbursementStatus[] = [
  "Outstanding",
  "Pending Review",
  "Approved for Reimbursement",
  "Approved",
  "Partially Reimbursed",
  "Fully Reimbursed",
  "Disputed",
  "Closed",
  "Rejected",
  "Deferred"
];

export const reconciliationStatuses: ReconciliationStatus[] = ["Not Reconciled", "In Review", "Reconciled", "Disputed"];

export const documentTypes: DocumentType[] = [
  "Receipt",
  "Invoice",
  "Contract",
  "Agreement",
  "Bank Transfer Proof",
  "Cash Payment Confirmation",
  "Event Permit",
  "License Application",
  "Passport / ID",
  "Photo",
  "Medical Document",
  "Payment Proof",
  "Accreditation Certificate",
  "Other"
];

export const documentLinkedModules: DocumentLinkedModule[] = ["Expense", "Receipt", "Reimbursement", "Revenue", "Event", "Cost Center", "Person", "License Application", "License/Application future use"];

export const documentVerificationStatuses: DocumentVerificationStatus[] = ["Unchecked", "Verified", "Needs Clarification", "Rejected"];
export const documentApprovalStatuses: DocumentApprovalStatus[] = ["Draft", "Pending Approval", "Approved Awaiting Stamp", "Stamped / Certified", "Issued", "Rejected", "Cancelled"];

export const confidentialityLevels: ConfidentialityLevel[] = ["Public/Internal", "Finance Only", "Board Only", "Restricted"];

export const licenseCategories: LicenseCategory[] = [
  "Professional Boxer",
  "Coach / Second",
  "Referee",
  "Judge",
  "Ring Inspector",
  "Timekeeper",
  "Supervisor",
  "Ringside Physician / Doctor",
  "Cutman",
  "Matchmaker",
  "Manager",
  "Promoter Representative",
  "Other"
];

export const licenseApplicationSources: LicenseApplicationSource[] = ["Hard Copy", "Soft Copy", "Online Form", "Email", "WhatsApp", "Other"];

export const licensePaymentStatuses: LicensePaymentStatus[] = ["Pending Payment", "Payment Submitted", "Payment Verified", "Paid", "Partially Paid", "Waived", "Refunded", "Rejected"];

export const licensePaymentMethods: LicensePaymentMethod[] = ["Cash", "Bank Transfer", "Card", "Online Payment", "Other"];

export const licensePaidToOptions: LicensePaidTo[] = ["UAE Boxing Federation", "UAE Athletic Commission", "PBSAS", "Other"];

export const licenseReviewStatuses: LicenseReviewStatus[] = ["New", "Awaiting Payment", "Awaiting Payment Verification", "Pending Review - Payment Section", "Pending Documents", "Pending Payment", "Eligible For Chief Review", "Under Chief Review", "Pending Chief Review", "Approved by Chief", "Rejected", "Ready for Stamp", "License Issued"];

export const stampStatuses: StampStatus[] = ["Not Available Yet", "Awaiting Stamp", "Stamped", "Not Required"];
export const stampPositions: StampPosition[] = ["Bottom Right", "Bottom Center", "Bottom Left", "Near Signature", "Custom"];
export const stampSizes: StampSize[] = ["Small", "Medium", "Large"];

export const licenseStatuses: LicenseStatus[] = ["Application Registered", "Awaiting Payment", "Awaiting Review", "Approved Awaiting Stamp", "Issued", "Rejected", "Expired", "Suspended"];

export const licenseInvoiceStatuses: LicenseInvoiceStatus[] = ["Not Generated", "Invoice Required", "Draft", "Generated", "Invoice Sent", "Sent", "Paid", "Cancelled", "Waived"];

export const licenseApplicationOrigins: LicenseApplicationOrigin[] = ["Historical Migration", "New Application", "Online Form", "Online Application", "Manual Entry"];

export const licenseIntakeStatuses: LicenseIntakeStatus[] = ["New", "Awaiting Data Entry", "Awaiting Review", "Converted to Application", "Rejected"];

export const licenseDocumentVerificationStatuses: LicenseDocumentVerificationStatus[] = ["Not Received", "Received", "Verified", "Needs Clarification", "Rejected"];
