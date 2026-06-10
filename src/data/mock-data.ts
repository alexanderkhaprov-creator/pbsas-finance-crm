import type { AppSettings, ApplicationImport, AuditLog, CostCenter, Event, Expense, FinancialPeriod, GeneratedLicense, LicenseApplication, LicenseDocumentRequirement, LicenseFeeScheduleItem, LicenseIntake, LicenseReceipt, PaymentSettings, Person, ReceiptIntake, Reimbursement, Revenue, StampSettings, SupportingDocument } from "@/types";

export const people: Person[] = [
  {
    id: "PER-001",
    fullName: "Alexander Khaprov",
    role: "Founder / Operations Lead",
    organization: "Pro Boxing Sports Agency and Services LLC",
    email: "alexander@example.com",
    phone: "+971 50 000 1001",
    notes: "Primary finance and operations owner."
  },
  {
    id: "PER-002",
    fullName: "Mariam Al Nuaimi",
    role: "Commission Coordinator",
    organization: "UAE Athletic Commission",
    email: "mariam@example.com",
    phone: "+971 50 000 1002",
    notes: "Coordinates approvals and event requirements."
  },
  {
    id: "PER-003",
    fullName: "Sergey Ivanov",
    role: "Sanctioning Liaison",
    organization: "WBCEurasia",
    email: "sergey@example.com",
    phone: "+971 50 000 1003",
    notes: "Handles WBCEurasia documentation."
  }
];

export const events: Event[] = [
  {
    id: "EVT-001",
    eventName: "Dubai Championship Night",
    eventType: "Professional Boxing",
    location: "Dubai, UAE",
    startDate: "2026-03-12",
    endDate: "2026-03-12",
    status: "Completed"
  },
  {
    id: "EVT-002",
    eventName: "WBCEurasia Title Showcase",
    eventType: "Title Event",
    location: "Abu Dhabi, UAE",
    startDate: "2026-06-21",
    endDate: "2026-06-22",
    status: "Confirmed"
  },
  {
    id: "EVT-003",
    eventName: "Athlete Medical Review Week",
    eventType: "Commission Operations",
    location: "Sharjah, UAE",
    startDate: "2026-08-05",
    endDate: "2026-08-09",
    status: "Planning"
  }
];

export const costCenters: CostCenter[] = [
  {
    id: "CC-000001",
    name: "WBC Officials Workshop Abu Dhabi",
    type: "Workshop",
    owner: "Mariam Al Nuaimi",
    status: "Active",
    budgetAmount: 25000,
    currency: "AED",
    notes: "Workshop delivery, licensing, medical review, and official accreditation costs."
  },
  {
    id: "CC-000002",
    name: "UAE Boxing Federation Operations",
    type: "Federation Operations",
    owner: "Mariam Al Nuaimi",
    status: "Active",
    budgetAmount: 40000,
    currency: "AED",
    notes: "Recurring UAE federation administration and commission workflow."
  },
  {
    id: "CC-000003",
    name: "WBCEurasia Operations",
    type: "WBC Operations",
    owner: "Sergey Ivanov",
    status: "Active",
    budgetAmount: 30000,
    currency: "AED",
    notes: "Sanctioning, title-event liaison, and WBC operations."
  },
  {
    id: "CC-000004",
    name: "PBSAS Operations",
    type: "General Admin",
    owner: "Alexander Khaprov",
    status: "Active",
    budgetAmount: 60000,
    currency: "AED",
    notes: "Core PBSAS operating expenses."
  },
  {
    id: "CC-000005",
    name: "Marketing & Media",
    type: "Department",
    owner: "Alexander Khaprov",
    status: "Active",
    budgetAmount: 10000,
    currency: "AED",
    notes: "Media, creative, and promotion spend."
  }
];

export const licenseApplications: LicenseApplication[] = [
  {
    id: "APP-000001",
    applicationOrigin: "Manual Entry",
    licenseIssueNumber: "UAEAC202600001",
    applicantFullName: "Omar Al Mansoori",
    applicantPhotoFileName: "omar-al-mansoori-photo.jpg",
    nationality: "United Arab Emirates",
    dateOfBirth: "1998-04-18",
    identificationNumber: "784-1998-0000001-1",
    phone: "+971 50 000 2001",
    email: "omar@example.com",
    address: "Abu Dhabi, UAE",
    licenseCategory: "Professional Boxer",
    otherCategoryDescription: "",
    applicationSource: "Hard Copy",
    applicationScanFileName: "omar-license-application.pdf",
    supportingDocumentFileNames: ["omar-passport.pdf", "omar-medical.pdf"],
    amountDue: 750,
    amountPaid: 750,
    currency: "AED",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
    paidTo: "UAE Athletic Commission",
    paymentDate: "2026-05-18",
    paymentReference: "CASH-2026-018",
    paymentNotes: "Paid at commission desk.",
    reviewStatus: "Approved by Chief",
    reviewedBy: "Mariam Al Nuaimi",
    chiefReviewer: "Chief Reviewer",
    reviewDate: "2026-05-19",
    approvalDate: "2026-05-20",
    rejectionReason: "",
    internalNotes: "Ready once physical stamp is available.",
    stampStatus: "Awaiting Stamp",
    stampDate: "",
    stampedBy: "",
    stampNotes: "Stamp not available yet.",
    licenseStatus: "Approved Awaiting Stamp",
    invoiceStatus: "Paid",
    invoiceNumber: "LIC-INV-0001",
    invoiceDate: "2026-05-18",
    invoiceAmount: 750,
    invoiceRecipient: "Omar Al Mansoori",
    invoiceNotes: "Manual receipt issued.",
    completionChecklist: {
      photoReceived: true,
      identificationProvided: true,
      applicationFormReceived: true,
      medicalReceived: true,
      paymentReceived: true,
      chiefReviewComplete: true,
      stampComplete: false
    },
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-20T11:30:00.000Z"
  },
  {
    id: "APP-000002",
    applicationOrigin: "Historical Migration",
    licenseIssueNumber: "UAEAC202600002",
    applicantFullName: "Nikolai Petrov",
    applicantPhotoFileName: "nikolai-petrov-photo.png",
    nationality: "Russia",
    dateOfBirth: "1985-11-02",
    identificationNumber: "P1234567",
    phone: "+971 50 000 2002",
    email: "nikolai@example.com",
    address: "Dubai, UAE",
    licenseCategory: "Coach / Second",
    otherCategoryDescription: "",
    applicationSource: "Email",
    applicationScanFileName: "nikolai-application.pdf",
    supportingDocumentFileNames: ["nikolai-passport.pdf"],
    amountDue: 500,
    amountPaid: 0,
    currency: "AED",
    paymentStatus: "Pending Payment",
    paymentMethod: "Bank Transfer",
    paidTo: "UAE Boxing Federation",
    paymentDate: "",
    paymentReference: "",
    paymentNotes: "Awaiting transfer proof.",
    reviewStatus: "Pending Payment",
    reviewedBy: "",
    chiefReviewer: "",
    reviewDate: "",
    approvalDate: "",
    rejectionReason: "",
    internalNotes: "Payment must be completed before final review.",
    stampStatus: "Not Available Yet",
    stampDate: "",
    stampedBy: "",
    stampNotes: "",
    licenseStatus: "Awaiting Payment",
    invoiceStatus: "Invoice Required",
    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: 500,
    invoiceRecipient: "Nikolai Petrov",
    invoiceNotes: "Prepare invoice after payment confirmation.",
    completionChecklist: {
      photoReceived: true,
      identificationProvided: true,
      applicationFormReceived: true,
      medicalReceived: false,
      paymentReceived: false,
      chiefReviewComplete: false,
      stampComplete: false
    },
    createdAt: "2026-05-22T10:15:00.000Z",
    updatedAt: "2026-05-22T10:15:00.000Z"
  },
  {
    id: "APP-000003",
    applicationOrigin: "New Application",
    licenseIssueNumber: "UAEAC202600003",
    applicantFullName: "Layla Haddad",
    applicantPhotoFileName: "",
    nationality: "Jordan",
    dateOfBirth: "1990-02-14",
    identificationNumber: "J9876543",
    phone: "+971 50 000 2003",
    email: "layla@example.com",
    address: "Sharjah, UAE",
    licenseCategory: "Judge",
    otherCategoryDescription: "",
    applicationSource: "WhatsApp",
    applicationScanFileName: "layla-application.pdf",
    supportingDocumentFileNames: ["layla-id.pdf"],
    amountDue: 450,
    amountPaid: 450,
    currency: "AED",
    paymentStatus: "Paid",
    paymentMethod: "Online Payment",
    paidTo: "PBSAS",
    paymentDate: "2026-05-24",
    paymentReference: "PAY-88641",
    paymentNotes: "Online payment confirmation received.",
    reviewStatus: "Pending Chief Review",
    reviewedBy: "Mariam Al Nuaimi",
    chiefReviewer: "",
    reviewDate: "2026-05-25",
    approvalDate: "",
    rejectionReason: "",
    internalNotes: "Awaiting chief review.",
    stampStatus: "Not Available Yet",
    stampDate: "",
    stampedBy: "",
    stampNotes: "",
    licenseStatus: "Awaiting Review",
    invoiceStatus: "Paid",
    invoiceNumber: "LIC-INV-0003",
    invoiceDate: "2026-05-24",
    invoiceAmount: 450,
    invoiceRecipient: "Layla Haddad",
    invoiceNotes: "",
    completionChecklist: {
      photoReceived: false,
      identificationProvided: true,
      applicationFormReceived: true,
      medicalReceived: false,
      paymentReceived: true,
      chiefReviewComplete: false,
      stampComplete: false
    },
    createdAt: "2026-05-24T13:40:00.000Z",
    updatedAt: "2026-05-25T09:20:00.000Z"
  }
];

export const applicationImports: ApplicationImport[] = [];

export const licenseIntake: LicenseIntake[] = [
  {
    id: "INT-000001",
    applicantName: "Farid Khan",
    applicationSource: "Hard Copy",
    dateReceived: "2026-05-28",
    licenseCategory: "Professional Boxer",
    applicationScanFileName: "farid-khan-hard-copy.pdf",
    supportingDocumentFileNames: ["farid-passport.pdf"],
    paymentProofFileName: "",
    intakeNotes: "Backlog hard-copy form entered from folder A.",
    intakeStatus: "Awaiting Data Entry",
    createdAt: "2026-05-28T08:30:00.000Z",
    updatedAt: "2026-05-28T08:30:00.000Z"
  },
  {
    id: "INT-000002",
    applicantName: "Mikhail Sokolov",
    applicationSource: "Soft Copy",
    dateReceived: "2026-05-29",
    licenseCategory: "Coach / Second",
    applicationScanFileName: "mikhail-application.pdf",
    supportingDocumentFileNames: ["mikhail-id.pdf", "mikhail-accreditation.pdf"],
    paymentProofFileName: "mikhail-payment-proof.pdf",
    intakeNotes: "Soft-copy set appears complete.",
    intakeStatus: "Awaiting Review",
    createdAt: "2026-05-29T11:00:00.000Z",
    updatedAt: "2026-05-29T11:00:00.000Z"
  }
];

export const licenseFeeSchedule: LicenseFeeScheduleItem[] = [
  ["Professional Boxer", 500, "1 Year"],
  ["Coach / Second", 500, "1 Year"],
  ["Referee", 800, "2 Years"],
  ["Judge", 800, "2 Years"],
  ["Ringside Physician / Doctor", 1500, "2 Years"],
  ["Ring Inspector", 800, "2 Years"],
  ["Timekeeper", 500, "2 Years"],
  ["Supervisor", 800, "2 Years"],
  ["Matchmaker", 800, "1 Year"],
  ["Manager", 800, "1 Year"],
  ["Promoter Representative", 3000, "1 Year"],
  ["Cutman", 500, "1 Year"],
  ["Other", 0, "Configurable"]
].map(([category, amount, validityPeriod], index) => ({
  id: `LFS-${String(index + 1).padStart(6, "0")}`,
  category: category as LicenseFeeScheduleItem["category"],
  amount: Number(amount),
  currency: "AED",
  validityPeriod: String(validityPeriod),
  status: "Active",
  effectiveDate: "2026-01-01",
  notes: "Default UAEAC local fee schedule."
}));

const allLicenseCategories: LicenseDocumentRequirement["appliesToCategories"] = [
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

function requirement(id: number, documentName: string, appliesToCategories: LicenseDocumentRequirement["appliesToCategories"], required: boolean, notes = ""): LicenseDocumentRequirement {
  return {
    id: `LDR-${String(id).padStart(6, "0")}`,
    documentName,
    appliesToCategories,
    required,
    notes,
    status: "Active"
  };
}

const boxerOnly: LicenseDocumentRequirement["appliesToCategories"] = ["Professional Boxer"];
const coachOnly: LicenseDocumentRequirement["appliesToCategories"] = ["Coach / Second"];
const officials: LicenseDocumentRequirement["appliesToCategories"] = ["Referee", "Judge", "Ring Inspector", "Supervisor", "Timekeeper"];
const doctors: LicenseDocumentRequirement["appliesToCategories"] = ["Ringside Physician / Doctor"];
const promoterOnly: LicenseDocumentRequirement["appliesToCategories"] = ["Promoter Representative"];

export const licenseDocumentRequirements: LicenseDocumentRequirement[] = [
  requirement(1, "Copy of Passport OR National ID document", allLicenseCategories, true, "Identification group requirement."),
  requirement(2, "Passport-Sized Photograph", allLicenseCategories, true),
  requirement(3, "Current Medical Examination", allLicenseCategories, false),
  requirement(4, "Brain Imaging / MRI / CT Scan (if applicable)", boxerOnly, false),
  requirement(5, "HIV Test Results", boxerOnly, false),
  requirement(6, "Hepatitis B Test Results", boxerOnly, false),
  requirement(7, "Hepatitis C Test Results", boxerOnly, false),
  requirement(8, "ECG / EKG Results", boxerOnly, false),
  requirement(9, "Proof of Insurance", boxerOnly, false),
  requirement(10, "Professional Record Documentation", boxerOnly, false),
  requirement(11, "Existing License Copies", allLicenseCategories, false, "Required only if applicant currently or previously held a boxing license from another commission."),
  requirement(12, "Coaching Certifications", coachOnly, true),
  requirement(13, "Medical License (Doctors)", doctors, true),
  requirement(14, "CPR / ACLS Certifications (Doctors)", doctors, true),
  requirement(15, "Police Clearance Certificate", [...officials, "Ringside Physician / Doctor", "Matchmaker", "Manager", "Promoter Representative"], true),
  requirement(16, "Anti-Doping Compliance Agreement", boxerOnly, false),
  requirement(17, "Other Supporting Documents", allLicenseCategories, false),
  requirement(18, "International Certifications or Appointments if applicable", officials, true),
  requirement(19, "Company authorization letter", promoterOnly, false),
  requirement(20, "Professional Certifications Held", allLicenseCategories, false),
  requirement(21, "Hospital / Clinic Affiliation proof", doctors, false),
  requirement(22, "Current Medical Examination", coachOnly, false),
  requirement(23, "Police Clearance Certificate", coachOnly, false),
  requirement(24, "ECG / EKG Results", officials, false),
  requirement(25, "Anti-Doping Compliance Agreement", officials, false),
  requirement(26, "Existing License Copies", ["Professional Boxer", "Cutman"], false),
  requirement(27, "Proof of Insurance", ["Ringside Physician / Doctor"], true)
];

export const paymentSettings: PaymentSettings = {
  bankName: "Enter bank name",
  accountName: "UAE Athletic Commission",
  iban: "AE00 0000 0000 0000 0000 000",
  swift: "BANKAEAAXXX",
  accountCurrency: "AED",
  additionalInstructions: "Payment settings are placeholders. Verify official bank details before requesting operational payments.",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

export const licenseReceipts: LicenseReceipt[] = [];
export const generatedLicenses: GeneratedLicense[] = [];

export const stampSettings: StampSettings = {
  stampAvailable: "Yes",
  stampName: "UAEAC Red Official Stamp",
  stampImageFileName: "/uaeac-stamp-red.jpeg",
  stampDisplayLabel: "Red Official UAEAC Stamp",
  stampPositionDefault: "Bottom Right",
  stampSize: "Medium",
  defaultStampedBy: "UAEAC Licensing Desk",
  defaultStampTitle: "UAE Athletic Commission",
  stampNotes: "Red Official UAEAC Stamp",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

export const expenses: Expense[] = [
  {
    id: "EXP-000001",
    date: "2026-03-01",
    paidBy: "Alexander Khaprov",
    linkType: "Event",
    event: "Dubai Championship Night",
    costCenterId: "CC-000004",
    costCenter: "PBSAS Operations",
    category: "Venue",
    description: "Arena operations deposit",
    amount: 42000,
    currency: "AED",
    paymentMethod: "Bank transfer",
    vendor: "Dubai Arena Services",
    receiptAttachment: "Receipt pending upload",
    reimbursable: false,
    reimbursementStatus: "Not Reimbursable",
    approvalStatus: "Approved",
    submittedBy: "Alexander Khaprov",
    reviewedBy: "Mariam Al Nuaimi",
    approvedBy: "Alexander Khaprov",
    approvalDate: "2026-03-02",
    rejectionReason: "",
    internalNotes: "Paid by company account.",
    reconciliationStatus: "Reconciled",
    reconciledBy: "Alexander Khaprov",
    reconciliationDate: "2026-03-03",
    reconciliationNotes: "Matched to bank transfer.",
    notes: "Core event cost."
  },
  {
    id: "EXP-000002",
    date: "2026-03-04",
    paidBy: "Mariam Al Nuaimi",
    linkType: "Event",
    event: "Dubai Championship Night",
    costCenterId: "CC-000002",
    costCenter: "UAE Boxing Federation Operations",
    category: "Medical",
    description: "Pre-fight medical support",
    amount: 8700,
    currency: "AED",
    paymentMethod: "Card",
    vendor: "Elite Medical Clinic",
    receiptAttachment: "medical-support.pdf",
    receiptFiles: [
      {
        id: "RCT-001",
        linkedExpense: "EXP-000002",
        fileName: "medical-support.pdf",
        fileUrl: "#",
        fileType: "application/pdf",
        uploadedAt: "2026-03-04",
        notes: "Mock receipt placeholder"
      }
    ],
    reimbursable: true,
    reimbursementStatus: "Approved",
    approvalStatus: "Approved",
    submittedBy: "Mariam Al Nuaimi",
    reviewedBy: "Alexander Khaprov",
    approvedBy: "Alexander Khaprov",
    approvalDate: "2026-03-05",
    rejectionReason: "",
    internalNotes: "Reimbursement approved for next payment batch.",
    reconciliationStatus: "In Review",
    reconciledBy: "Mariam Al Nuaimi",
    reconciliationDate: "",
    reconciliationNotes: "Receipt attached, awaiting bank payout match.",
    notes: "Awaiting payment batch."
  },
  {
    id: "EXP-000003",
    date: "2026-05-18",
    paidBy: "Sergey Ivanov",
    linkType: "Event",
    event: "WBCEurasia Title Showcase",
    costCenterId: "CC-000003",
    costCenter: "WBCEurasia Operations",
    category: "Travel",
    description: "Official flight booking",
    amount: 3600,
    currency: "AED",
    paymentMethod: "Card",
    vendor: "Emirates",
    receiptAttachment: "emirates-flight.pdf",
    receiptFiles: [
      {
        id: "RCT-002",
        linkedExpense: "EXP-000003",
        fileName: "emirates-flight.pdf",
        fileUrl: "#",
        fileType: "application/pdf",
        uploadedAt: "2026-05-18",
        notes: "Mock receipt placeholder"
      }
    ],
    reimbursable: true,
    reimbursementStatus: "Pending",
    approvalStatus: "Pending Review",
    submittedBy: "Sergey Ivanov",
    reviewedBy: "",
    approvedBy: "",
    approvalDate: "",
    rejectionReason: "",
    internalNotes: "Needs finance review before reimbursement.",
    reconciliationStatus: "Not Reconciled",
    reconciledBy: "",
    reconciliationDate: "",
    reconciliationNotes: "",
    notes: "Needs finance approval."
  },
  {
    id: "EXP-000004",
    date: "2026-05-22",
    paidBy: "Alexander Khaprov",
    linkType: "Event",
    event: "WBCEurasia Title Showcase",
    costCenterId: "CC-000005",
    costCenter: "Marketing & Media",
    category: "Marketing",
    description: "Event creative package",
    amount: 12500,
    currency: "AED",
    paymentMethod: "Bank transfer",
    vendor: "Knockout Media",
    receiptAttachment: "marketing-invoice.pdf",
    receiptFiles: [
      {
        id: "RCT-003",
        linkedExpense: "EXP-000004",
        fileName: "marketing-invoice.pdf",
        fileUrl: "#",
        fileType: "application/pdf",
        uploadedAt: "2026-05-22",
        notes: "Mock receipt placeholder"
      }
    ],
    reimbursable: false,
    reimbursementStatus: "Not Reimbursable",
    approvalStatus: "Approved",
    submittedBy: "Alexander Khaprov",
    reviewedBy: "Mariam Al Nuaimi",
    approvedBy: "Alexander Khaprov",
    approvalDate: "2026-05-23",
    rejectionReason: "",
    internalNotes: "Marketing spend is company-paid and non-reimbursable.",
    reconciliationStatus: "Disputed",
    reconciledBy: "Alexander Khaprov",
    reconciliationDate: "",
    reconciliationNotes: "Vendor confirmation pending.",
    notes: "Includes poster and social assets."
  },
  {
    id: "EXP-000005",
    date: "2026-05-27",
    paidBy: "Mariam Al Nuaimi",
    linkType: "Workshop",
    event: "Athlete Medical Review Week",
    costCenterId: "CC-000001",
    costCenter: "WBC Officials Workshop Abu Dhabi",
    category: "Licensing",
    description: "Document processing fees",
    amount: 2200,
    currency: "AED",
    paymentMethod: "Cash",
    vendor: "Government Services Center",
    receiptAttachment: "Receipt pending upload",
    reimbursable: true,
    reimbursementStatus: "Reimbursed",
    approvalStatus: "Approved",
    submittedBy: "Mariam Al Nuaimi",
    reviewedBy: "Alexander Khaprov",
    approvedBy: "Alexander Khaprov",
    approvalDate: "2026-05-29",
    rejectionReason: "",
    internalNotes: "Closed after petty cash reimbursement.",
    reconciliationStatus: "Reconciled",
    reconciledBy: "Mariam Al Nuaimi",
    reconciliationDate: "2026-05-30",
    reconciliationNotes: "Petty cash record matched.",
    notes: "Paid from petty cash, reimbursed."
  }
];

export const reimbursements: Reimbursement[] = [
  {
    id: "RMB-2001",
    paidBy: "Mariam Al Nuaimi",
    personOwed: "Mariam Al Nuaimi",
    responsiblePerson: "Alexander Khaprov",
    linkedExpense: "EXP-000002",
    costCenterId: "CC-000002",
    costCenter: "UAE Boxing Federation Operations",
    amount: 8700,
    amountReimbursed: 0,
    outstandingBalance: 8700,
    dueDate: "2026-03-19",
    status: "Approved for Reimbursement",
    reimbursedDate: "",
    paymentReference: "Pending",
    reconciliationStatus: "In Review",
    reconciledBy: "",
    reconciliationDate: "",
    reconciliationNotes: "Awaiting payment batch confirmation.",
    notes: "Ready for transfer."
  },
  {
    id: "RMB-2002",
    paidBy: "Sergey Ivanov",
    personOwed: "Sergey Ivanov",
    responsiblePerson: "Alexander Khaprov",
    linkedExpense: "EXP-000003",
    costCenterId: "CC-000003",
    costCenter: "WBCEurasia Operations",
    amount: 3600,
    amountReimbursed: 0,
    outstandingBalance: 3600,
    dueDate: "2026-06-01",
    status: "Pending Review",
    reimbursedDate: "",
    paymentReference: "Pending approval",
    reconciliationStatus: "Not Reconciled",
    reconciledBy: "",
    reconciliationDate: "",
    reconciliationNotes: "",
    notes: "Flight receipt attached."
  },
  {
    id: "RMB-2003",
    paidBy: "Mariam Al Nuaimi",
    personOwed: "Mariam Al Nuaimi",
    responsiblePerson: "Alexander Khaprov",
    linkedExpense: "EXP-000005",
    costCenterId: "CC-000001",
    costCenter: "WBC Officials Workshop Abu Dhabi",
    amount: 2200,
    amountReimbursed: 2200,
    outstandingBalance: 0,
    dueDate: "2026-06-10",
    status: "Fully Reimbursed",
    reimbursedDate: "2026-05-30",
    paymentReference: "TRF-88391",
    reconciliationStatus: "Reconciled",
    reconciledBy: "Alexander Khaprov",
    reconciliationDate: "2026-05-30",
    reconciliationNotes: "Transfer reference matched.",
    notes: "Closed."
  }
];

export const receipts: ReceiptIntake[] = [
  {
    id: "RCT-000001",
    uploadDate: "2026-05-28",
    uploadedBy: "Mariam Al Nuaimi",
    fileName: "clinic-document-fees.pdf",
    fileUrl: "#",
    fileType: "application/pdf",
    vendor: "Government Services Center",
    receiptDate: "2026-05-27",
    amount: 2200,
    currency: "AED",
    paymentMethod: "Cash",
    paidBy: "Mariam Al Nuaimi",
    linkType: "Workshop",
    event: "Athlete Medical Review Week",
    costCenterId: "CC-000001",
    costCenter: "WBC Officials Workshop Abu Dhabi",
    suggestedCategory: "Licensing",
    reimbursable: true,
    notes: "Demo intake record already reviewed.",
    status: "Converted to Expense",
    convertedExpenseId: "EXP-000005",
    checklist: {
      amountVisible: true,
      dateVisible: true,
      vendorVisible: true,
      paymentMethodConfirmed: true,
      paidByConfirmed: true,
      eventCategoryConfirmed: true,
      reimbursementConfirmed: true
    }
  },
  {
    id: "RCT-000002",
    uploadDate: "2026-05-29",
    uploadedBy: "Alexander Khaprov",
    fileName: "production-deposit-placeholder.jpg",
    fileUrl: "#",
    fileType: "image/jpeg",
    vendor: "Arena Production Desk",
    receiptDate: "2026-05-29",
    amount: 5400,
    currency: "AED",
    paymentMethod: "Card",
    paidBy: "Alexander Khaprov",
    linkType: "Event",
    event: "WBCEurasia Title Showcase",
    costCenterId: "CC-000005",
    costCenter: "Marketing & Media",
    suggestedCategory: "Production",
    reimbursable: false,
    notes: "Needs vendor confirmation before conversion.",
    status: "Needs Review",
    checklist: {
      amountVisible: true,
      dateVisible: true,
      vendorVisible: false,
      paymentMethodConfirmed: true,
      paidByConfirmed: true,
      eventCategoryConfirmed: false,
      reimbursementConfirmed: true
    }
  }
];

export const revenue: Revenue[] = [
  {
    id: "REV-3001",
    revenueDate: "2026-06-21",
    event: "WBCEurasia Title Showcase",
    linkType: "Event",
    costCenterId: "CC-000003",
    costCenter: "WBCEurasia Operations",
    source: "Sponsorship",
    amount: 50000,
    currency: "AED",
    paymentMethod: "Bank transfer",
    invoiceReference: "INV-2026-001",
    notes: "Expected title sponsor payment."
  },
  {
    id: "REV-3002",
    revenueDate: "2026-06-22",
    event: "WBCEurasia Title Showcase",
    linkType: "Event",
    costCenterId: "CC-000004",
    costCenter: "PBSAS Operations",
    source: "Ticketing",
    amount: 78000,
    currency: "AED",
    paymentMethod: "Processor payout",
    invoiceReference: "TKT-SETTLEMENT",
    notes: "Forecast placeholder."
  }
];

export const auditLogs: AuditLog[] = [
  {
    id: "AUD-000001",
    timestamp: "2026-05-30T10:00:00.000Z",
    module: "Data Management",
    recordId: "DEMO",
    recordLabel: "Demo dataset",
    action: "Reset",
    changedBy: "System",
    previousValueSummary: "Initial demo state",
    newValueSummary: "Seeded local PBSAS finance demo data",
    notes: "Demo audit entry for localStorage audit trail."
  }
];

export const documents: SupportingDocument[] = [
  {
    id: "DOC-000001",
    documentType: "Invoice",
    title: "Arena operations deposit invoice",
    linkedModule: "Expense",
    linkedRecordId: "EXP-000001",
    fileName: "arena-operations-invoice.pdf",
    receivedDate: "2026-03-01",
    issuedBy: "Dubai Arena Services",
    receivedFrom: "Dubai Arena Services",
    currency: "AED",
    amount: 42000,
    verificationStatus: "Verified",
    confidentialityLevel: "Finance Only",
    notes: "Matched to arena deposit expense."
  },
  {
    id: "DOC-000002",
    documentType: "Medical Document",
    title: "Pre-fight medical support receipt",
    linkedModule: "Expense",
    linkedRecordId: "EXP-000002",
    fileName: "medical-support.pdf",
    receivedDate: "2026-03-04",
    issuedBy: "Elite Medical Clinic",
    receivedFrom: "Mariam Al Nuaimi",
    currency: "AED",
    amount: 8700,
    verificationStatus: "Needs Clarification",
    confidentialityLevel: "Restricted",
    notes: "Medical record visibility should remain restricted."
  },
  {
    id: "DOC-000003",
    documentType: "Agreement",
    title: "WBCEurasia event operating agreement",
    linkedModule: "Cost Center",
    linkedRecordId: "CC-000003",
    fileName: "wbceurasia-operating-agreement.pdf",
    receivedDate: "2026-05-15",
    issuedBy: "WBCEurasia",
    receivedFrom: "Sergey Ivanov",
    currency: "AED",
    amount: 0,
    verificationStatus: "Unchecked",
    confidentialityLevel: "Board Only",
    notes: "Operational agreement placeholder."
  }
];

export const appSettings: AppSettings = {
  mode: "demo",
  lastBackupAt: "",
  lastQuickCategory: "Miscellaneous",
  lastQuickCostCenterId: "CC-000004",
  lastQuickCostCenter: "PBSAS Operations",
  lastQuickCurrency: "AED",
  closedPeriodEditAttempts: 0
};

export const financialPeriods: FinancialPeriod[] = [
  {
    id: "PERIOD-2026-03",
    month: 3,
    year: 2026,
    status: "Closed",
    checklist: {
      receiptsReviewed: true,
      reimbursementsReviewed: true,
      expensesReconciled: true,
      reportsExported: true,
      backupCompleted: true
    }
  },
  {
    id: "PERIOD-2026-05",
    month: 5,
    year: 2026,
    status: "Under Review",
    checklist: {
      receiptsReviewed: false,
      reimbursementsReviewed: false,
      expensesReconciled: false,
      reportsExported: false,
      backupCompleted: false
    }
  },
  {
    id: "PERIOD-2026-06",
    month: 6,
    year: 2026,
    status: "Open",
    checklist: {
      receiptsReviewed: false,
      reimbursementsReviewed: false,
      expensesReconciled: false,
      reportsExported: false,
      backupCompleted: false
    }
  }
];
