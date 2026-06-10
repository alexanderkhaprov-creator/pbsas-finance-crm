export type AppRole = "Super Admin" | "Finance Admin" | "Board Viewer" | "Event Manager" | "Auditor";

export type UserProfile = {
  userId: string;
  email: string;
  role: AppRole;
  eventRecordIds: string[];
};

export type Person = {
  recordId?: string;
  id: string;
  fullName: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
  notes: string;
};

export type EventStatus = "Planning" | "Confirmed" | "Completed" | "Cancelled";

export type Event = {
  recordId?: string;
  id: string;
  eventName: string;
  eventType: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
};

export type ExpenseCategory =
  | "Fuel"
  | "Licensing Operations"
  | "Event Operations"
  | "Officials"
  | "Office & Administration"
  | "Professional Services"
  | "Workshop"
  | "General Operations"
  | "Other"
  | "Venue"
  | "Transport"
  | "Accommodation"
  | "Food & Beverage"
  | "Equipment"
  | "Licensing"
  | "Medical"
  | "Staff Payment"
  | "Marketing"
  | "Production"
  | "Travel"
  | "Hotel"
  | "Commission Operations"
  | "WBC Operations"
  | "Federation Operations"
  | "Miscellaneous";

export type CurrencyCode = "AED" | "USD" | "EUR" | "GBP" | "RUB";
export type ExpenseLinkType = "Event" | "Workshop" | "Tournament" | "Meeting" | "General Operations";
export type RevenueCategory = "License Revenue" | "Workshop Revenue" | "Event Revenue" | "Sanction Revenue" | "Membership Revenue" | "Sponsorship Revenue" | "Donation Revenue" | "Other Revenue";

export type CostCenterType = "Event" | "Workshop" | "Department" | "Federation Operations" | "WBC Operations" | "Licensing" | "General Admin" | "Athletic Commission Operations";
export type CostCenterStatus = "Active" | "Closed" | "Archived";

export type CostCenter = {
  id: string;
  name: string;
  type: CostCenterType;
  owner: string;
  status: CostCenterStatus;
  budgetAmount: number;
  currency: CurrencyCode;
  noteHistory?: InternalNote[];
  notes: string;
};

export type ReimbursementStatus =
  | "Not Reimbursable"
  | "Pending"
  | "Approved"
  | "Reimbursed"
  | "Outstanding"
  | "Pending Review"
  | "Approved for Reimbursement"
  | "Partially Reimbursed"
  | "Fully Reimbursed"
  | "Disputed"
  | "Closed"
  | "Rejected"
  | "Deferred";
export type ApprovalStatus = "Draft" | "Submitted" | "Under Review" | "Pending Review" | "Approved" | "Rejected" | "Reimbursed" | "Closed";
export type ReceiptProcessingStatus = "New" | "Needs Review" | "Converted to Expense" | "Rejected";
export type ReconciliationStatus = "Not Reconciled" | "In Review" | "Reconciled" | "Disputed";
export type AuditModule = "People" | "Events" | "Cost Centers" | "Receipt Intake" | "Expenses" | "Reimbursements" | "Revenue" | "Data Management" | "Batch Entry" | "Document Register" | "License Applications" | "Application Intake" | "Application Import";
export type AuditAction =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Status Changed"
  | "Converted"
  | "Imported"
  | "Exported"
  | "Reset"
  | "Application created"
  | "Application updated"
  | "Payment status changed"
  | "Review status changed"
  | "Chief approval recorded"
  | "License marked ready for stamp"
  | "License issued"
  | "Application rejected"
  | "Application Rejected"
  | "Fee schedule created"
  | "Fee schedule updated"
  | "Fee schedule archived/restored"
  | "Document requirement created"
  | "Document requirement updated"
  | "Document requirement archived/restored"
  | "Application submitted"
  | "Invoice generated"
  | "Invoice sent"
  | "Payment recorded"
  | "Payment waived"
  | "Payment destination changed"
  | "Document status changed"
  | "Chief review started"
  | "Chief approval granted"
  | "Application blocked by missing payment"
  | "Internal UAEAC section updated"
  | "Payment Instructions Viewed"
  | "Payment Submitted"
  | "Payment Verified"
  | "Payment Rejected"
  | "Payment Waived"
  | "Payment Proof Rejected"
  | "Payment Section Reviewed"
  | "Payment Marked Cash Paid"
  | "Payment Marked Manually Paid"
  | "Application Manually Marked Ready For Chief Review"
  | "Core Document Verified"
  | "License Issue Blocked By Missing Core Document"
  | "Document Uploaded"
  | "Document Marked Received"
  | "Document Verified"
  | "Document Needs Clarification"
  | "Document Rejected"
  | "More Documents Requested"
  | "Receipt Generated"
  | "Receipt Downloaded"
  | "Receipt Cancelled"
  | "License Draft Generated"
  | "License Previewed"
  | "License Printed / Downloaded"
  | "Existing License Uploaded"
  | "Declaration Accepted"
  | "Returning Applicant Identified"
  | "Application Import Created"
  | "Application Created From OCR Import"
  | "Expense Created From Receipt OCR"
  | "Expense Created"
  | "Expense Submitted"
  | "Expense Approved"
  | "Expense Rejected"
  | "Expense Closed"
  | "Reimbursement Created"
  | "Reimbursement Approved"
  | "Reimbursement Settled"
  | "Reimbursement Proof Uploaded"
  | "Reimbursement Marked Paid"
  | "Faulty Test Expense Removed"
  | "Revenue Created"
  | "Revenue Updated"
  | "Revenue Deleted"
  | "Document Submitted for Approval"
  | "Document Approved"
  | "Document Rejected"
  | "Stamp Applied"
  | "Document Issued"
  | "Document Cancelled"
  | "License Stamped"
  | "License Issued"
  | "License Issued With Stamp"
  | "Document Certified With Stamp"
  | "Treasury Settlement Recorded";
export type DocumentType =
  | "Receipt"
  | "Invoice"
  | "Contract"
  | "Agreement"
  | "Bank Transfer Proof"
  | "Cash Payment Confirmation"
  | "Event Permit"
  | "License Application"
  | "Passport / ID"
  | "Photo"
  | "Medical Document"
  | "Payment Proof"
  | "Accreditation Certificate"
  | "Other";
export type DocumentLinkedModule = "Expense" | "Receipt" | "Reimbursement" | "Revenue" | "Event" | "Cost Center" | "Person" | "License Application" | "License/Application future use";
export type DocumentVerificationStatus = "Unchecked" | "Verified" | "Needs Clarification" | "Rejected";
export type ConfidentialityLevel = "Public/Internal" | "Finance Only" | "Board Only" | "Restricted";
export type DocumentApprovalStatus = "Draft" | "Pending Approval" | "Approved Awaiting Stamp" | "Stamped / Certified" | "Issued" | "Rejected" | "Cancelled";

export type AuditLog = {
  id: string;
  timestamp: string;
  module: AuditModule;
  recordId: string;
  recordLabel: string;
  action: AuditAction;
  changedBy: string;
  previousValueSummary: string;
  newValueSummary: string;
  notes: string;
};

export type SupportingDocument = {
  id: string;
  documentType: DocumentType;
  title: string;
  linkedModule: DocumentLinkedModule;
  linkedRecordId: string;
  fileName: string;
  receivedDate: string;
  issuedBy: string;
  receivedFrom: string;
  currency: CurrencyCode;
  amount: number;
  verificationStatus: DocumentVerificationStatus;
  approvalStatus?: DocumentApprovalStatus;
  stampStatus?: StampStatus;
  issuedDate?: string;
  approvedBy?: string;
  approvalTitle?: string;
  approvalDate?: string;
  rejectionReason?: string;
  stampedBy?: string;
  stampDate?: string;
  confidentialityLevel: ConfidentialityLevel;
  notes: string;
};

export type LicenseCategory =
  | "Professional Boxer"
  | "Coach / Second"
  | "Referee"
  | "Judge"
  | "Ring Inspector"
  | "Timekeeper"
  | "Supervisor"
  | "Ringside Physician / Doctor"
  | "Cutman"
  | "Matchmaker"
  | "Manager"
  | "Promoter Representative"
  | "Other";
export type LicenseApplicationSource = "Hard Copy" | "Soft Copy" | "Online Form" | "Email" | "WhatsApp" | "Other";
export type LicensePaymentStatus = "Pending Payment" | "Payment Submitted" | "Payment Verified" | "Paid" | "Partially Paid" | "Waived" | "Refunded" | "Rejected";
export type LicensePaymentMethod = "Cash" | "Bank Transfer" | "Card" | "Online Payment" | "Other";
export type LicensePaidTo = "UAE Boxing Federation" | "UAE Athletic Commission" | "PBSAS" | "Other";
export type LicenseReviewStatus = "New" | "Awaiting Payment" | "Awaiting Payment Verification" | "Pending Review - Payment Section" | "Pending Documents" | "Pending Payment" | "Eligible For Chief Review" | "Under Chief Review" | "Pending Chief Review" | "Approved by Chief" | "Rejected" | "Ready for Stamp" | "License Issued";
export type StampStatus = "Not Available Yet" | "Awaiting Stamp" | "Stamped" | "Not Required";
export type StampPosition = "Bottom Right" | "Bottom Center" | "Bottom Left" | "Near Signature" | "Custom";
export type StampSize = "Small" | "Medium" | "Large";
export type LicenseStatus = "Application Registered" | "Awaiting Payment" | "Awaiting Review" | "Approved Awaiting Stamp" | "Issued" | "Rejected" | "Expired" | "Suspended";
export type LicenseInvoiceStatus = "Not Generated" | "Invoice Required" | "Draft" | "Generated" | "Invoice Sent" | "Sent" | "Paid" | "Cancelled" | "Waived";
export type LicenseApplicationOrigin = "Historical Migration" | "New Application" | "Online Form" | "Online Application" | "Manual Entry";
export type LicenseIntakeStatus = "New" | "Awaiting Data Entry" | "Awaiting Review" | "Converted to Application" | "Rejected";
export type OcrStatus = "Uploaded" | "Text Extracted" | "Mapping Review" | "Ready To Create Application" | "Ready To Convert Receipt" | "Converted To Application" | "Converted To Expense" | "Rejected";
export type OcrConfidenceLevel = "High" | "Medium" | "Low" | "Manual Review Required";
export type LicenseDocumentVerificationStatus = "Not Received" | "Received" | "Verified" | "Needs Clarification" | "Rejected";
export type LicenseRequirementStatus = "Active" | "Archived";

export type LicenseCompletionChecklist = {
  photoReceived: boolean;
  identificationProvided: boolean;
  applicationFormReceived: boolean;
  medicalReceived: boolean;
  paymentReceived: boolean;
  chiefReviewComplete: boolean;
  stampComplete: boolean;
};

export type LicenseDocumentChecklistItem = {
  requirementId: string;
  documentName: string;
  required: boolean;
  fileName: string;
  received: boolean;
  verificationStatus: LicenseDocumentVerificationStatus;
  notes: string;
};

export type LicenseDocumentRequirement = {
  id: string;
  documentName: string;
  appliesToCategories: LicenseCategory[];
  required: boolean;
  notes: string;
  status: LicenseRequirementStatus;
};

export type CoachCertification = {
  certificationName: string;
  issuingOrganization: string;
  yearIssued: string;
  notes: string;
};

export type NotableFighter = {
  fighterName: string;
  levelRecordNotes: string;
};

export type LicenseFeeScheduleItem = {
  id: string;
  category: LicenseCategory;
  amount: number;
  currency: CurrencyCode;
  validityPeriod: string;
  status: LicenseRequirementStatus;
  effectiveDate: string;
  notes: string;
};

export type LicenseApplication = {
  id: string;
  sourceIntakeId?: string;
  sourceImportId?: string;
  applicationOrigin: LicenseApplicationOrigin;
  licenseIssueNumber: string;
  applicantFullName: string;
  fullLegalName?: string;
  applicantPhotoFileName: string;
  placeOfBirth?: string;
  nationality: string;
  dateOfBirth: string;
  passportNumber?: string;
  nationalIdNumber?: string;
  nationalIdRawDigits?: string;
  nationalIdFormatted?: string;
  identificationNumber: string;
  gender?: "Male" | "Female" | "Non-binary" | "";
  existingRegisteredLicenseNumber?: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  licenseCategory: LicenseCategory;
  additionalOfficialCategories?: Array<"Referee" | "Judge" | "Ring Inspector">;
  otherCategoryDescription: string;
  returningApplicant?: boolean;
  heldPreviousLicense?: "Yes" | "No" | "";
  existingLicenseCommission?: string;
  existingLicenseEvidenceFileName?: string;
  professionalRecordWins?: number;
  professionalRecordLosses?: number;
  professionalRecordDraws?: number;
  professionalRecordKoWins?: number;
  weightDivision?: string;
  stance?: "Orthodox" | "Southpaw" | "";
  managerName?: string;
  promoterName?: string;
  currentAffiliation?: string;
  suspendedByCommission?: "Yes" | "No" | "";
  suspensionExplanation?: string;
  failedMedicalOrDoping?: "Yes" | "No" | "";
  failedMedicalOrDopingExplanation?: string;
  yearsOfExperience?: string;
  currentGymOrTeam?: string;
  professionalCertificationsHeld?: string;
  coachCertifications?: CoachCertification[];
  notableFightersTrained?: string;
  notableFighters?: NotableFighter[];
  officialClassification?: string;
  professionalBoxingExperienceYears?: string;
  amateurBoxingExperienceYears?: string;
  currentMemberships?: string;
  internationalCertifications?: string;
  languagesSpoken?: string;
  medicalSpecialty?: string;
  medicalLicenseNumber?: string;
  medicalRegistrationCountry?: string;
  hospitalClinicAffiliation?: string;
  ringsideExperienceYears?: string;
  traumaEmergencyExperience?: string;
  cprAclsExpiryDate?: string;
  currentOrganizationTeam?: string;
  relevantExperienceNotes?: string;
  deniedLicense?: "Yes" | "No" | "";
  deniedLicenseExplanation?: string;
  finedSuspendedDisciplined?: "Yes" | "No" | "";
  finedSuspendedDisciplinedExplanation?: string;
  underInvestigation?: "Yes" | "No" | "";
  underInvestigationExplanation?: string;
  criminalConviction?: "Yes" | "No" | "";
  criminalConvictionExplanation?: string;
  medicalCondition?: "Yes" | "No" | "";
  medicalConditionExplanation?: string;
  concussionPast12Months?: "Yes" | "No" | "";
  prescribedMedications?: "Yes" | "No" | "";
  prescribedMedicationsList?: string;
  bloodType?: string;
  allergies?: string;
  medicalSectionRequiredOverride?: boolean;
  applicationSource: LicenseApplicationSource;
  applicationScanFileName: string;
  supportingDocumentFileNames: string[];
  documentChecklistSnapshot?: LicenseDocumentChecklistItem[];
  amountDue: number;
  amountPaid: number;
  totalFeesPaid?: number;
  validityPeriod?: string;
  feeScheduleItemId?: string;
  feeVersionDate?: string;
  currency: CurrencyCode;
  paymentStatus: LicensePaymentStatus;
  paymentMethod: LicensePaymentMethod;
  paymentOtherDescription?: string;
  paymentProofFileName?: string;
  paymentRejectionReason?: string;
  paymentRejectedBy?: string;
  paymentRejectionDate?: string;
  paymentConfirmedBy?: string;
  paymentConfirmationType?: "Cash Paid" | "Manually Paid" | "Waived" | "Admin Ready Override" | "";
  paymentReadyOverrideReason?: string;
  paymentReadyOverrideBy?: string;
  receiptNumber?: string;
  paidTo: LicensePaidTo;
  paymentDate: string;
  paymentReference: string;
  paymentNotes: string;
  reviewStatus: LicenseReviewStatus;
  reviewedBy: string;
  chiefReviewer: string;
  reviewDate: string;
  approvalDate: string;
  rejectionReason: string;
  internalNotes: string;
  stampStatus: StampStatus;
  stampDate: string;
  stampedBy: string;
  stampNotes: string;
  licenseStatus: LicenseStatus;
  invoiceStatus: LicenseInvoiceStatus;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  invoiceCurrency?: CurrencyCode;
  invoiceDueDate?: string;
  invoiceApplicantName?: string;
  invoiceLicenseCategory?: string;
  invoiceRecipient: string;
  invoiceNotes: string;
  declarationSignature?: string;
  declarationApplicantName?: string;
  declarationDate?: string;
  declarationAccepted?: boolean;
  uaeacApplicationNumber?: string;
  uaeacDateReceived?: string;
  documentsVerifiedBy?: string;
  backgroundCheckCompleted?: "Yes" | "No" | "";
  medicalReviewCompleted?: "Yes" | "No" | "";
  licenseApproved?: "Yes" | "No" | "";
  licenseNumberIssued?: string;
  licenseExpiryDate?: string;
  approvedBy?: string;
  approvedBySignatureName?: string;
  completionChecklist: LicenseCompletionChecklist;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationImportMappedField = {
  id: string;
  label: string;
  targetField: keyof LicenseApplication;
  extractedValue: string;
  editedValue: string;
  confidence: OcrConfidenceLevel;
  include: boolean;
};

export type ApplicationImport = {
  id: string;
  uploadDate: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  ocrStatus: OcrStatus;
  extractedRawText: string;
  confidenceLevel: OcrConfidenceLevel;
  notes: string;
  mappedFields: ApplicationImportMappedField[];
  applicationOrigin: LicenseApplicationOrigin;
  duplicateWarning?: string;
  linkedApplicationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type LicenseReceipt = {
  id: string;
  receiptDate: string;
  applicantName: string;
  applicationId: string;
  lin: string;
  invoiceNumber: string;
  categoryLabel: string;
  amountReceived: number;
  currency: CurrencyCode;
  paymentMethod: LicensePaymentMethod;
  paymentDate: string;
  paymentReference: string;
  paidTo: LicensePaidTo;
  receivedBy: string;
  receivedFor: string;
  notes: string;
  status: "Active" | "Cancelled";
  approvalStatus?: DocumentApprovalStatus;
  stampStatus?: StampStatus;
  issuedDate?: string;
  approvedBy?: string;
  approvalTitle?: string;
  approvalDate?: string;
  rejectionReason?: string;
  stampedBy?: string;
  stampDate?: string;
  createdAt: string;
};

export type GeneratedLicense = {
  id: string;
  applicationId: string;
  lin: string;
  applicantName: string;
  categoryLabel: string;
  dateIssued: string;
  expiryDate: string;
  stampStatus: StampStatus;
  approvalStatus?: DocumentApprovalStatus;
  approvedBy?: string;
  approvalTitle?: string;
  approvalDate?: string;
  rejectionReason?: string;
  stampedBy?: string;
  stampDate?: string;
  stampImageFileName?: string;
  stampPosition?: StampPosition;
  stampSize?: StampSize;
  adminOverrideReason?: string;
  issuedDate?: string;
  notes?: string;
  issuedBy: string;
  issuedByTitle: string;
  printStatus: "Draft" | "Previewed" | "Printed";
  createdAt: string;
};

export type StampSettings = {
  stampAvailable: "Yes" | "No";
  stampName: string;
  stampImageFileName: string;
  stampDisplayLabel?: string;
  stampPositionDefault?: StampPosition;
  stampSize?: StampSize;
  defaultStampedBy: string;
  defaultStampTitle?: string;
  stampNotes: string;
  updatedAt: string;
};

export type LicenseIntake = {
  id: string;
  applicantName: string;
  applicationSource: LicenseApplicationSource;
  dateReceived: string;
  licenseCategory: LicenseCategory;
  applicationScanFileName: string;
  supportingDocumentFileNames: string[];
  paymentProofFileName: string;
  intakeNotes: string;
  intakeStatus: LicenseIntakeStatus;
  convertedApplicationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  mode: "demo" | "real";
  lastBackupAt: string;
  lastQuickCategory?: ExpenseCategory;
  lastQuickCostCenterId?: string;
  lastQuickCostCenter?: string;
  lastQuickCurrency?: CurrencyCode;
  closedPeriodEditAttempts?: number;
};

export type PaymentSettings = {
  bankName: string;
  accountName: string;
  iban: string;
  swift: string;
  accountCurrency: CurrencyCode;
  additionalInstructions: string;
  updatedAt: string;
};

export type InternalNote = {
  id: string;
  timestamp: string;
  author: string;
  text: string;
};

export type PeriodStatus = "Open" | "Under Review" | "Closed";

export type FinancialPeriod = {
  id: string;
  month: number;
  year: number;
  status: PeriodStatus;
  checklist: {
    receiptsReviewed: boolean;
    reimbursementsReviewed: boolean;
    expensesReconciled: boolean;
    reportsExported: boolean;
    backupCompleted: boolean;
  };
};

export type Expense = {
  recordId?: string;
  paidByPersonRecordId?: string;
  eventRecordId?: string;
  receiptFiles?: ReceiptFile[];
  sourceReceiptId?: string;
  paidByPersonId?: string;
  paidByPersonName?: string;
  personToReimburseId?: string;
  personToReimburseName?: string;
  costCenterId?: string;
  costCenter?: string;
  linkedEventId?: string;
  linkedEventName?: string;
  periodId?: string;
  periodLabel?: string;
  possibleDuplicateOfId?: string;
  ocrStatus?: OcrStatus;
  extractedRawText?: string;
  confidenceLevel?: OcrConfidenceLevel;
  mappingReviewed?: boolean;
  sourceFileName?: string;
  referenceNumber?: string;
  vatTrn?: string;
  duplicateWarning?: string;
  noteHistory?: InternalNote[];
  id: string;
  date: string;
  paidBy: string;
  linkType: ExpenseLinkType;
  event: string;
  category: ExpenseCategory;
  expensePurpose?: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  paymentMethod: string;
  vendor: string;
  receiptAttachment: string;
  reimbursable: boolean;
  reimbursementStatus: ReimbursementStatus;
  approvalStatus: ApprovalStatus;
  submittedBy?: string;
  submittedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  internalNotes?: string;
  reconciliationStatus?: ReconciliationStatus;
  reconciledBy?: string;
  reconciliationDate?: string;
  reconciliationNotes?: string;
  notes: string;
};

export type ReceiptIntake = {
  id: string;
  uploadDate: string;
  uploadedBy: string;
  paidByPersonId?: string;
  paidByPersonName?: string;
  personToReimburseId?: string;
  personToReimburseName?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  vendor: string;
  receiptDate: string;
  amount: number;
  currency: CurrencyCode;
  paymentMethod: string;
  paidBy: string;
  linkType: ExpenseLinkType;
  event: string;
  linkedEventId?: string;
  linkedEventName?: string;
  costCenterId?: string;
  costCenter?: string;
  periodId?: string;
  periodLabel?: string;
  possibleDuplicateOfId?: string;
  ocrStatus?: OcrStatus;
  extractedRawText?: string;
  confidenceLevel?: OcrConfidenceLevel;
  mappingReviewed?: boolean;
  sourceFileName?: string;
  referenceNumber?: string;
  vatTrn?: string;
  duplicateWarning?: string;
  noteHistory?: InternalNote[];
  suggestedCategory: ExpenseCategory;
  expensePurpose?: string;
  reimbursable: boolean;
  notes: string;
  status: ReceiptProcessingStatus;
  convertedExpenseId?: string;
  checklist: {
    amountVisible: boolean;
    dateVisible: boolean;
    vendorVisible: boolean;
    paymentMethodConfirmed: boolean;
    paidByConfirmed: boolean;
    eventCategoryConfirmed: boolean;
    reimbursementConfirmed: boolean;
  };
};

export type Reimbursement = {
  recordId?: string;
  personOwedRecordId?: string;
  expenseRecordId?: string;
  sourceReceiptId?: string;
  costCenterId?: string;
  costCenter?: string;
  linkedEventId?: string;
  linkedEventName?: string;
  periodId?: string;
  periodLabel?: string;
  noteHistory?: InternalNote[];
  id: string;
  paidBy: string;
  personOwed: string;
  responsiblePerson: string;
  linkedExpense: string;
  amount: number;
  amountOwed?: number;
  amountReimbursed: number;
  outstandingBalance: number;
  dueDate: string;
  status: ReimbursementStatus;
  reimbursedDate: string;
  settlementDate?: string;
  settlementMethod?: "Bank Transfer" | "Cash" | "Card" | "Other" | "";
  settlementReference?: string;
  settledBy?: string;
  reimbursementProofFileName?: string;
  reimbursementProofUploadedAt?: string;
  reimbursementProofNotes?: string;
  paymentReference: string;
  reconciliationStatus?: ReconciliationStatus;
  reconciledBy?: string;
  reconciliationDate?: string;
  reconciliationNotes?: string;
  notes: string;
};

export type Revenue = {
  recordId?: string;
  eventRecordId?: string;
  costCenterId?: string;
  costCenter?: string;
  linkType?: ExpenseLinkType;
  periodId?: string;
  periodLabel?: string;
  id: string;
  revenueDate: string;
  event: string;
  revenueCategory?: RevenueCategory | string;
  source: string;
  amount: number;
  expectedRevenue?: number;
  receivedRevenue?: number;
  outstandingRevenue?: number;
  currency: CurrencyCode;
  paymentMethod: string;
  invoiceReference: string;
  notes: string;
};

export type ReceiptFile = {
  recordId?: string;
  id: string;
  linkedExpense: string;
  expenseRecordId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  notes: string;
};
