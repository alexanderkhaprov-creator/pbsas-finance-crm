"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { getNextSequentialId } from "@/lib/id-utils";
import { licenseCategories } from "@/lib/options";
import type { CurrencyCode, LicenseApplication, LicenseCategory, LicenseDocumentChecklistItem } from "@/types";

type FormState = Partial<LicenseApplication> & {
  supportingDocuments: string;
};

const draftStorageKey = "pbsas_pending_license_application_draft_v1";

const initialForm: FormState = {
  applicantFullName: "",
  fullLegalName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  nationality: "",
  passportNumber: "",
  nationalIdNumber: "",
  gender: "",
  existingRegisteredLicenseNumber: "",
  returningApplicant: false,
  heldPreviousLicense: "",
  existingLicenseCommission: "",
  existingLicenseEvidenceFileName: "",
  address: "",
  city: "",
  country: "",
  postalCode: "",
  phone: "",
  email: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  licenseCategory: "Professional Boxer",
  otherCategoryDescription: "",
  applicantPhotoFileName: "",
  applicationScanFileName: "",
  supportingDocuments: "",
  currency: "AED",
  paymentMethod: "Online Payment",
  paidTo: "UAE Athletic Commission",
  paymentOtherDescription: "",
  receiptNumber: "",
  declarationAccepted: false,
  declarationSignature: "",
  declarationApplicantName: "",
  declarationDate: new Date().toISOString().slice(0, 10)
};

function nextLin(applications: LicenseApplication[]) {
  const highest = applications.reduce((max, application) => {
    const match = application.licenseIssueNumber.match(/^UAEAC2026(\d{5})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `UAEAC2026${String(highest + 1).padStart(5, "0")}`;
}

function nextInvoice(applications: LicenseApplication[]) {
  const highest = applications.reduce((max, application) => {
    const match = application.invoiceNumber.match(/^INV-2026-(\d{6})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `INV-2026-${String(highest + 1).padStart(6, "0")}`;
}

const combinedOfficialCategories = ["Referee", "Judge", "Ring Inspector"] as const;
const officials: LicenseCategory[] = ["Referee", "Judge", "Ring Inspector", "Supervisor", "Timekeeper"];
const medicalRequiredCategories: LicenseCategory[] = ["Professional Boxer", ...officials, "Ringside Physician / Doctor"];
const universalRequiredDocuments = ["Copy of Passport OR National ID document", "Passport-Sized Photograph"];
const universalOptionalDocuments = ["Current Medical Examination", "Professional Certifications Held", "Other Supporting Documents"];
const existingLicenseRequirementId = "LDR-EXISTING-LICENSE-CONDITIONAL";

function makeChecklistItem(requirementId: string, documentName: string, required: boolean, existing?: LicenseDocumentChecklistItem, notes = ""): LicenseDocumentChecklistItem {
  return {
    requirementId,
    documentName,
    required,
    fileName: existing?.fileName ?? "",
    received: existing?.received ?? false,
    verificationStatus: existing?.verificationStatus ?? "Not Received",
    notes: existing?.notes ?? notes
  };
}

function buildChecklist(category: LicenseCategory, requirements: ReturnType<typeof useFinanceData>["licenseDocumentRequirements"], existing: LicenseDocumentChecklistItem[] = [], heldPreviousLicense: FormState["heldPreviousLicense"] = "") {
  const existingById = new Map(existing.map((item) => [item.requirementId, item]));
  const existingByName = new Map(existing.map((item) => [item.documentName, item]));
  const rows = requirements
    .filter((requirement) => requirement.status === "Active" && requirement.appliesToCategories.includes(category))
    .map((requirement) => makeChecklistItem(requirement.id, requirement.documentName, universalRequiredDocuments.includes(requirement.documentName), existingById.get(requirement.id), requirement.notes));

  [...universalRequiredDocuments, ...universalOptionalDocuments].forEach((documentName) => {
    if (!rows.some((item) => item.documentName === documentName)) {
      rows.push(makeChecklistItem(`LDR-${documentName.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "-")}`, documentName, universalRequiredDocuments.includes(documentName), existingByName.get(documentName)));
    }
  });

  const filteredRows = rows.filter((item) => {
    if (item.documentName === "Existing License Copies") return heldPreviousLicense === "Yes";
    if (universalRequiredDocuments.includes(item.documentName) || universalOptionalDocuments.includes(item.documentName)) return true;
    return category !== "Manager";
  });

  if (heldPreviousLicense === "Yes" && !filteredRows.some((item) => item.documentName === "Existing License Copies")) {
    filteredRows.push(makeChecklistItem(existingLicenseRequirementId, "Existing License Copies", true, existingByName.get("Existing License Copies"), "Required because applicant held a license from another commission."));
  }

  return Array.from(new Map(filteredRows.map((item) => [item.documentName, item])).values()).map((item) => ({
    ...item,
    required: universalRequiredDocuments.includes(item.documentName) || (heldPreviousLicense === "Yes" && item.documentName === "Existing License Copies")
  }));
}

export default function LicenseApplicationFormPage() {
  const router = useRouter();
  const { licenseApplications, licenseFeeSchedule, licenseDocumentRequirements } = useFinanceData();
  const [form, setForm] = useState<FormState>(initialForm);
  const [documentChecklist, setDocumentChecklist] = useState<LicenseDocumentChecklistItem[]>(() => buildChecklist("Professional Boxer", licenseDocumentRequirements));
  const [message, setMessage] = useState("");
  const category = form.licenseCategory ?? "Professional Boxer";
  const fee = licenseFeeSchedule.find((item) => item.status === "Active" && item.category === category) ?? licenseFeeSchedule.find((item) => item.category === "Other");
  const requiredDocuments = documentChecklist.filter((item) => item.required);
  const optionalDocuments = documentChecklist.filter((item) => !item.required);
  const requiredFieldsComplete = Boolean(
    (form.fullLegalName || form.applicantFullName)?.trim() &&
      form.dateOfBirth &&
      form.nationality?.trim() &&
      form.email?.trim() &&
      form.emergencyContactName?.trim() &&
      form.emergencyContactPhone?.trim() &&
      (form.passportNumber?.trim() || form.nationalIdNumber?.trim())
  );
  const boxerMedicalComplete =
    category !== "Professional Boxer" ||
    Boolean(form.medicalCondition && form.concussionPast12Months && form.prescribedMedications && form.bloodType?.trim() && form.allergies?.trim());
  const documentsComplete = requiredDocuments.every((item) => item.fileName.trim() && item.verificationStatus === "Received");
  const existingLicenseFileName = documentChecklist.find((item) => item.documentName === "Existing License Copies")?.fileName || form.existingLicenseEvidenceFileName || "";
  const previousLicenseComplete = form.heldPreviousLicense !== "Yes" || Boolean(existingLicenseFileName.trim());
  const isApplyReady = requiredFieldsComplete && boxerMedicalComplete && documentsComplete && previousLicenseComplete && Boolean(form.declarationAccepted);

  const previews = useMemo(() => ({
    appId: getNextSequentialId(licenseApplications, "APP"),
    lin: nextLin(licenseApplications),
    invoice: nextInvoice(licenseApplications)
  }), [licenseApplications]);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setCategory(nextCategory: LicenseCategory) {
    setValue("licenseCategory", nextCategory);
    setValue("additionalOfficialCategories", combinedOfficialCategories.includes(nextCategory as (typeof combinedOfficialCategories)[number]) ? [nextCategory as (typeof combinedOfficialCategories)[number]] : undefined);
    setDocumentChecklist(buildChecklist(nextCategory, licenseDocumentRequirements, documentChecklist, form.heldPreviousLicense));
  }

  function setHeldPreviousLicense(value: "Yes" | "No" | "") {
    setValue("heldPreviousLicense", value);
    setDocumentChecklist(buildChecklist(category, licenseDocumentRequirements, documentChecklist, value));
  }

  function updateDocument(requirementId: string, patch: Partial<LicenseDocumentChecklistItem>) {
    setDocumentChecklist((current) => current.map((item) => (item.requirementId === requirementId ? { ...item, ...patch } : item)));
  }

  function apply() {
    setMessage("");
    if (!form.applicantFullName?.trim() && !form.fullLegalName?.trim()) {
      setMessage("Full Legal Name is required.");
      return;
    }
    if (!form.passportNumber?.trim() && !form.nationalIdNumber?.trim()) {
      setMessage("Please provide either Passport Number or National ID Number.");
      return;
    }
    if (category === "Other" && !form.otherCategoryDescription?.trim()) {
      setMessage("Other category description is required.");
      return;
    }
    if (!form.declarationAccepted) {
      setMessage("Declaration must be accepted before submission.");
      return;
    }
    if (!isApplyReady) {
      setMessage("Please complete all mandatory fields, required documents, payment-sensitive declarations, and the applicant declaration before applying.");
      return;
    }

    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const applicantName = form.fullLegalName || form.applicantFullName || "";
    const draft: Partial<LicenseApplication> = {
      id: "",
      licenseIssueNumber: "",
      applicationOrigin: "Online Application",
      applicantFullName: applicantName,
      fullLegalName: applicantName,
      applicantPhotoFileName: form.applicantPhotoFileName ?? "",
      placeOfBirth: form.placeOfBirth,
      nationality: form.nationality ?? "",
      dateOfBirth: form.dateOfBirth ?? "",
      passportNumber: form.passportNumber,
      nationalIdNumber: form.nationalIdNumber,
      identificationNumber: form.passportNumber || form.nationalIdNumber || "",
      gender: form.gender,
      existingRegisteredLicenseNumber: form.existingRegisteredLicenseNumber,
      phone: form.phone ?? "",
      email: form.email ?? "",
      address: form.address ?? "",
      city: form.city,
      country: form.country,
      postalCode: form.postalCode,
      emergencyContactName: form.emergencyContactName,
      emergencyContactRelationship: form.emergencyContactRelationship,
      emergencyContactPhone: form.emergencyContactPhone,
      licenseCategory: category,
      additionalOfficialCategories: form.additionalOfficialCategories,
      otherCategoryDescription: form.otherCategoryDescription ?? "",
      returningApplicant: Boolean(form.returningApplicant),
      heldPreviousLicense: form.heldPreviousLicense,
      existingLicenseCommission: form.existingLicenseCommission,
      existingLicenseEvidenceFileName: existingLicenseFileName,
      applicationSource: "Online Form",
      applicationScanFileName: form.applicationScanFileName ?? "",
      supportingDocumentFileNames: form.supportingDocuments.split(",").map((item) => item.trim()).filter(Boolean),
      documentChecklistSnapshot: documentChecklist,
      amountDue: fee?.amount ?? 0,
      amountPaid: 0,
      totalFeesPaid: 0,
      validityPeriod: fee?.validityPeriod,
      feeScheduleItemId: fee?.id,
      feeVersionDate: fee?.effectiveDate ?? now.slice(0, 10),
      currency: (fee?.currency ?? form.currency ?? "AED") as CurrencyCode,
      paymentStatus: "Pending Payment",
      paymentMethod: form.paymentMethod ?? "Online Payment",
      paymentOtherDescription: form.paymentOtherDescription,
      receiptNumber: form.receiptNumber,
      paidTo: form.paidTo ?? "UAE Athletic Commission",
      paymentDate: "",
      paymentReference: "",
      paymentNotes: "",
      reviewStatus: "Awaiting Payment",
      reviewedBy: "",
      chiefReviewer: "",
      reviewDate: "",
      approvalDate: "",
      rejectionReason: "",
      internalNotes: "Submitted from UAEAC Licensing & Registration Form.",
      stampStatus: "Not Available Yet",
      stampDate: "",
      stampedBy: "",
      stampNotes: "",
      licenseStatus: "Awaiting Payment",
      invoiceStatus: "Generated",
      invoiceNumber: "",
      invoiceDate: now.slice(0, 10),
      invoiceAmount: fee?.amount ?? 0,
      invoiceCurrency: fee?.currency ?? "AED",
      invoiceDueDate: dueDate,
      invoiceApplicantName: applicantName,
      invoiceLicenseCategory: category,
      invoiceRecipient: applicantName,
      invoiceNotes: "Payment must be settled before application may proceed to Chief Review.",
      declarationSignature: form.declarationSignature,
      declarationApplicantName: form.declarationApplicantName || applicantName,
      declarationDate: form.declarationDate || now.slice(0, 10),
      declarationAccepted: true,
      completionChecklist: {
        photoReceived: Boolean(form.applicantPhotoFileName),
        identificationProvided: Boolean(form.passportNumber || form.nationalIdNumber),
        applicationFormReceived: Boolean(form.applicationScanFileName),
        medicalReceived: documentChecklist.some((item) => item.documentName.toLowerCase().includes("medical") && (item.received || item.verificationStatus === "Received" || item.verificationStatus === "Verified")),
        paymentReceived: false,
        chiefReviewComplete: false,
        stampComplete: false
      },
      createdAt: now,
      updatedAt: now
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    router.push("/payment-instructions");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Payment must be settled before application may proceed to Chief Review.</div>
      {message ? <div className="mb-6 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</div> : null}
      <section className="relative overflow-hidden rounded border border-black/10 bg-white p-8 text-[#171717] shadow-soft">
        <div className="absolute left-0 top-0 h-3 w-full bg-[linear-gradient(90deg,#00732f_0_33%,#ffffff_33%_66%,#d71920_66%)]" />
        <div className="absolute right-0 top-3 h-24 w-8 bg-black" />
        <header className="border-b-2 border-black pb-5 text-center font-serif">
          <p className="text-sm font-semibold uppercase tracking-[0.28em]">UAE Athletic Commission</p>
          <h1 className="mt-3 text-3xl font-bold tracking-wide">UAE Licensing & Registration Form</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.2em]">Professional Boxing Participants</p>
        </header>
        <div className="mt-6 grid gap-4 border-b border-black/20 pb-5 md:grid-cols-3">
          <p className="text-sm text-zinc-600">Application ID preview: <span className="font-semibold text-black">{previews.appId}</span></p>
          <p className="text-sm text-zinc-600">LIN preview: <span className="font-semibold text-black">{previews.lin}</span></p>
          <p className="text-sm text-zinc-600">Invoice preview: <span className="font-semibold text-black">{previews.invoice}</span></p>
          <p className="text-sm text-zinc-600">Amount due: <span className="font-semibold text-black">{fee?.currency ?? "AED"} {fee?.amount ?? 0}</span></p>
          <p className="text-sm text-zinc-600">Validity: <span className="font-semibold text-black">{fee?.validityPeriod ?? "Configurable"}</span></p>
          <p className="text-sm text-zinc-600">Apply status: <span className="font-semibold text-black">Draft pending payment instructions</span></p>
        </div>

        <Section title="Section 1 - Personal Information">
          <Input label="Full Legal Name" required value={form.fullLegalName ?? ""} onChange={(value) => { setValue("fullLegalName", value); setValue("applicantFullName", value); }} />
          <Input label="Date of Birth" required type="date" value={form.dateOfBirth ?? ""} onChange={(value) => setValue("dateOfBirth", value)} />
          <Input label="Place of Birth" value={form.placeOfBirth ?? ""} onChange={(value) => setValue("placeOfBirth", value)} />
          <Input label="Nationality" required value={form.nationality ?? ""} onChange={(value) => setValue("nationality", value)} />
          <Input label="Passport Number" value={form.passportNumber ?? ""} onChange={(value) => setValue("passportNumber", value)} />
          <Input label="National ID Number" value={form.nationalIdNumber ?? ""} onChange={(value) => setValue("nationalIdNumber", value)} />
          <Select label="Gender" value={form.gender ?? ""} options={["", "Male", "Female", "Non-binary"]} onChange={(value) => setValue("gender", value as FormState["gender"])} />
          <Input label="Existing registered license number, if any" value={form.existingRegisteredLicenseNumber ?? ""} onChange={(value) => setValue("existingRegisteredLicenseNumber", value)} />
          <Input label="Residential Address" value={form.address ?? ""} onChange={(value) => setValue("address", value)} span />
          <Input label="City" value={form.city ?? ""} onChange={(value) => setValue("city", value)} />
          <Input label="Country" value={form.country ?? ""} onChange={(value) => setValue("country", value)} />
          <Input label="Postal Code" value={form.postalCode ?? ""} onChange={(value) => setValue("postalCode", value)} />
          <Input label="Mobile Number" value={form.phone ?? ""} onChange={(value) => setValue("phone", value)} />
          <Input label="Email Address" required type="email" value={form.email ?? ""} onChange={(value) => setValue("email", value)} />
          <Input label="Emergency Contact Name" required value={form.emergencyContactName ?? ""} onChange={(value) => setValue("emergencyContactName", value)} />
          <Input label="Emergency Contact Relationship" value={form.emergencyContactRelationship ?? ""} onChange={(value) => setValue("emergencyContactRelationship", value)} />
          <Input label="Emergency Contact Phone Number" required value={form.emergencyContactPhone ?? ""} onChange={(value) => setValue("emergencyContactPhone", value)} />
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">Identification: Passport Number or National ID Number required. Passport Number is preferred. If unavailable, National ID Number is required.</p>
        </Section>

        <Section title="Section 2 - Professional Information">
          <Select label="Applicant Category" value={category} options={licenseCategories} onChange={(value) => setCategory(value as LicenseCategory)} />
          {category === "Other" ? <Input label="Other category description" value={form.otherCategoryDescription ?? ""} onChange={(value) => setValue("otherCategoryDescription", value)} /> : null}
          {combinedOfficialCategories.includes(category as (typeof combinedOfficialCategories)[number]) ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">
              <p className="font-semibold">Combined official license option</p>
              <p className="mt-1">Applicants applying for Referee, Judge and Ring Inspector licenses simultaneously will be charged only a single applicable licensing fee.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {combinedOfficialCategories.map((officialCategory) => (
                  <label className="inline-flex items-center gap-2" key={officialCategory}>
                    <input
                      checked={(form.additionalOfficialCategories ?? [category as (typeof combinedOfficialCategories)[number]]).includes(officialCategory)}
                      className="h-4 w-4 accent-black"
                      type="checkbox"
                      onChange={(event) => {
                        const current = new Set(form.additionalOfficialCategories ?? [category as (typeof combinedOfficialCategories)[number]]);
                        if (event.target.checked) current.add(officialCategory);
                        else current.delete(officialCategory);
                        setValue("additionalOfficialCategories", Array.from(current) as FormState["additionalOfficialCategories"]);
                      }}
                    />
                    {officialCategory}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <YesNo label="Do you currently hold or previously hold a boxing license issued by another commission?" value={form.heldPreviousLicense ?? ""} onChange={setHeldPreviousLicense} />
          {form.heldPreviousLicense === "Yes" ? (
            <>
              <Input label="Commission / authority name" value={form.existingLicenseCommission ?? ""} onChange={(value) => setValue("existingLicenseCommission", value)} />
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">Existing License Copies are mandatory in Section 5 because the applicant has held a license from another commission.</p>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input checked={Boolean(form.returningApplicant)} className="h-4 w-4 accent-black" type="checkbox" onChange={(event) => setValue("returningApplicant", event.target.checked)} />
            Returning applicant
          </label>
          {category === "Professional Boxer" ? (
            <>
              {["professionalRecordWins", "professionalRecordLosses", "professionalRecordDraws", "professionalRecordKoWins"].map((key) => <Input key={key} label={key.replaceAll(/([A-Z])/g, " $1")} type="number" value={String(form[key as keyof FormState] ?? 0)} onChange={(value) => setValue(key as keyof FormState, Number(value) as never)} />)}
              <Input label="Weight Division" value={form.weightDivision ?? ""} onChange={(value) => setValue("weightDivision", value)} />
              <Select label="Stance" value={form.stance ?? ""} options={["", "Orthodox", "Southpaw"]} onChange={(value) => setValue("stance", value as FormState["stance"])} />
              <Input label="Manager Name" value={form.managerName ?? ""} onChange={(value) => setValue("managerName", value)} />
              <Input label="Promoter Name" value={form.promoterName ?? ""} onChange={(value) => setValue("promoterName", value)} />
              <Input label="Current Boxing Federation / Commission Affiliation" value={form.currentAffiliation ?? ""} onChange={(value) => setValue("currentAffiliation", value)} span />
              <YesNo label="Have you ever been suspended by any boxing commission?" value={form.suspendedByCommission ?? ""} onChange={(value) => setValue("suspendedByCommission", value)} />
              {form.suspendedByCommission === "Yes" ? <Input label="Suspension explanation" value={form.suspensionExplanation ?? ""} onChange={(value) => setValue("suspensionExplanation", value)} /> : null}
              <YesNo label="Have you ever failed a medical or anti-doping test?" value={form.failedMedicalOrDoping ?? ""} onChange={(value) => setValue("failedMedicalOrDoping", value)} />
              {form.failedMedicalOrDoping === "Yes" ? <Input label="Failed medical / anti-doping explanation" value={form.failedMedicalOrDopingExplanation ?? ""} onChange={(value) => setValue("failedMedicalOrDopingExplanation", value)} /> : null}
            </>
          ) : null}
          {category === "Coach / Second" ? <GeneralFields form={form} setValue={setValue} coach /> : null}
          {officials.includes(category) ? <OfficialFields form={form} setValue={setValue} /> : null}
          {category === "Ringside Physician / Doctor" ? <DoctorFields form={form} setValue={setValue} /> : null}
          {["Cutman", "Matchmaker", "Promoter Representative", "Other"].includes(category) ? <GeneralFields form={form} setValue={setValue} /> : null}
        </Section>

        <Section title="Section 3 - Disciplinary & Background Information">
          <Question field="deniedLicense" explanation="deniedLicenseExplanation" label="Have you ever been denied a license by any athletic commission?" form={form} setValue={setValue} />
          <Question field="finedSuspendedDisciplined" explanation="finedSuspendedDisciplinedExplanation" label="Have you ever been fined, suspended, or disciplined by any sports authority?" form={form} setValue={setValue} />
          <Question field="underInvestigation" explanation="underInvestigationExplanation" label="Are you currently under investigation by any athletic commission or sports governing body?" form={form} setValue={setValue} />
          <Question field="criminalConviction" explanation="criminalConvictionExplanation" label="Have you ever been convicted of a criminal offense?" form={form} setValue={setValue} />
        </Section>

        <Section title="Section 4 - Medical & Health Declaration">
          <p className="rounded border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700 md:col-span-2">Required for Boxers and Officials participating in field of play. Current category: {medicalRequiredCategories.includes(category) ? "Required" : "Optional unless admin marks required"}.</p>
          <Question field="medicalCondition" explanation="medicalConditionExplanation" required={category === "Professional Boxer"} label="Do you currently suffer from any medical condition that may impair your duties or participation?" form={form} setValue={setValue} />
          <YesNo label={`Have you suffered a concussion within the past 12 months?${category === "Professional Boxer" ? " *" : ""}`} value={form.concussionPast12Months ?? ""} onChange={(value) => setValue("concussionPast12Months", value)} />
          <Question field="prescribedMedications" explanation="prescribedMedicationsList" required={category === "Professional Boxer"} label="Are you currently taking any prescribed medications?" form={form} setValue={setValue} />
          <Input label="Blood Type" required={category === "Professional Boxer"} value={form.bloodType ?? ""} onChange={(value) => setValue("bloodType", value)} />
          <Input label="Allergies" required={category === "Professional Boxer"} value={form.allergies ?? ""} onChange={(value) => setValue("allergies", value)} />
        </Section>

        <section className="mt-8 border-t border-black/20 pt-5">
          <h2 className="font-serif text-xl font-bold">Section 5 - Required Documents Checklist</h2>
          <DocumentChecklist title="Required Documents" items={requiredDocuments} updateDocument={updateDocument} />
          <DocumentChecklist title="Optional Documents" items={optionalDocuments} updateDocument={updateDocument} />
        </section>

        <section className="mt-8 border-t border-black/20 pt-5 text-sm leading-6">
          <h2 className="font-serif text-xl font-bold">Section 7 - Applicant Declaration</h2>
          <p className="mt-3">I hereby certify that all information provided in this application is true, complete, and accurate. I understand that any false statement, omission, or misrepresentation may result in denial, suspension, or revocation of my UAE Athletic Commission license.</p>
          <p className="mt-3">I agree to comply with all rules, regulations, medical requirements, anti-doping protocols, and disciplinary procedures established by the UAE Athletic Commission.</p>
          <p className="mt-3">I authorize the UAE Athletic Commission to conduct background verification, disciplinary checks, and medical verification as required.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input label="Applicant Signature / Typed Confirmation" value={form.declarationSignature ?? ""} onChange={(value) => setValue("declarationSignature", value)} />
            <Input label="Applicant Name" value={form.declarationApplicantName ?? ""} onChange={(value) => setValue("declarationApplicantName", value)} />
            <Input label="Date" type="date" value={form.declarationDate ?? ""} onChange={(value) => setValue("declarationDate", value)} />
          </div>
          <label className="mt-4 flex items-center gap-2 font-semibold">
            <input checked={Boolean(form.declarationAccepted)} className="h-4 w-4 accent-black" type="checkbox" onChange={(event) => setValue("declarationAccepted", event.target.checked)} />
            Declaration Accepted
          </label>
        </section>

        <section className="mt-8 border-t border-black/20 pt-5 text-sm leading-6">
          <h2 className="font-serif text-xl font-bold">Section 8 - UAE Athletic Commission Use Only</h2>
          <div className="mt-3 rounded border border-black/20 bg-zinc-50 p-4 text-zinc-700">
            <p className="font-serif font-bold">UAE ATHLETIC COMMISSION<br />PROFESSIONAL BOXING REGULATORY DIVISION</p>
            <p className="mt-3">This form is an official licensing document of the UAE Athletic Commission (UAEAC). Submission of this application does not guarantee approval or issuance of a professional license.</p>
            <p className="mt-3 font-semibold">Incomplete applications will not be processed.</p>
          </div>
        </section>

        <div className="mt-8 flex justify-end">
          <button disabled={!isApplyReady} className="inline-flex items-center gap-2 rounded bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600" onClick={apply}>
            <Send className="h-4 w-4" />
            APPLY
          </button>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-black/20 pt-5">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", span = false, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; span?: boolean; required?: boolean }) {
  return <label className={`text-sm font-semibold ${span ? "md:col-span-2" : ""}`}>{label}{required ? <span className="text-red-700"> *</span> : null}<input required={required} className="mt-1 w-full rounded border border-black/20 px-3 py-2 font-sans" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold">{label}<select className="mt-1 w-full rounded border border-black/20 px-3 py-2 font-sans" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option || "Select"}</option>)}</select></label>;
}

function YesNo({ label, value, onChange }: { label: string; value: string; onChange: (value: "Yes" | "No" | "") => void }) {
  return <Select label={label} value={value} options={["", "Yes", "No"]} onChange={(nextValue) => onChange(nextValue as "Yes" | "No" | "")} />;
}

function Question({ field, explanation, label, form, setValue, required = false }: { field: keyof FormState; explanation: keyof FormState; label: string; form: FormState; setValue: <K extends keyof FormState>(key: K, value: FormState[K]) => void; required?: boolean }) {
  const value = String(form[field] ?? "");
  return (
    <>
      <YesNo label={`${label}${required ? " *" : ""}`} value={value} onChange={(nextValue) => setValue(field, nextValue as never)} />
      {value === "Yes" ? <Input label="If yes, explain" value={String(form[explanation] ?? "")} onChange={(nextValue) => setValue(explanation, nextValue as never)} /> : null}
    </>
  );
}

function GeneralFields({ form, setValue, coach = false }: { form: FormState; setValue: <K extends keyof FormState>(key: K, value: FormState[K]) => void; coach?: boolean }) {
  return (
    <>
      <Input label="Years of Experience" value={form.yearsOfExperience ?? ""} onChange={(value) => setValue("yearsOfExperience", value)} />
      <Input label={coach ? "Current Gym / Team" : "Current Organization / Team"} value={(coach ? form.currentGymOrTeam : form.currentOrganizationTeam) ?? ""} onChange={(value) => setValue(coach ? "currentGymOrTeam" : "currentOrganizationTeam", value)} />
      <Input label="Professional Certifications Held" value={form.professionalCertificationsHeld ?? ""} onChange={(value) => setValue("professionalCertificationsHeld", value)} />
      {coach ? <Input label="Notable Fighters Trained" value={form.notableFightersTrained ?? ""} onChange={(value) => setValue("notableFightersTrained", value)} /> : <Input label="Relevant Experience Notes" value={form.relevantExperienceNotes ?? ""} onChange={(value) => setValue("relevantExperienceNotes", value)} />}
    </>
  );
}

function OfficialFields({ form, setValue }: { form: FormState; setValue: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <>
      <Input label="Official Classification" value={form.officialClassification ?? ""} onChange={(value) => setValue("officialClassification", value)} />
      <Input label="Years of Experience in Professional Boxing" value={form.professionalBoxingExperienceYears ?? ""} onChange={(value) => setValue("professionalBoxingExperienceYears", value)} />
      <Input label="Years of Experience in Amateur Boxing" value={form.amateurBoxingExperienceYears ?? ""} onChange={(value) => setValue("amateurBoxingExperienceYears", value)} />
      <Input label="Current Federation / Commission Memberships" value={form.currentMemberships ?? ""} onChange={(value) => setValue("currentMemberships", value)} />
      <Input label="International Certifications or Appointments" value={form.internationalCertifications ?? ""} onChange={(value) => setValue("internationalCertifications", value)} />
      <Input label="Languages Spoken" value={form.languagesSpoken ?? ""} onChange={(value) => setValue("languagesSpoken", value)} />
    </>
  );
}

function DoctorFields({ form, setValue }: { form: FormState; setValue: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <>
      <Input label="Medical Specialty" value={form.medicalSpecialty ?? ""} onChange={(value) => setValue("medicalSpecialty", value)} />
      <Input label="Medical License Number" value={form.medicalLicenseNumber ?? ""} onChange={(value) => setValue("medicalLicenseNumber", value)} />
      <Input label="Country of Medical Registration" value={form.medicalRegistrationCountry ?? ""} onChange={(value) => setValue("medicalRegistrationCountry", value)} />
      <Input label="Hospital / Clinic Affiliation" value={form.hospitalClinicAffiliation ?? ""} onChange={(value) => setValue("hospitalClinicAffiliation", value)} />
      <Input label="Years of Ringside Experience" value={form.ringsideExperienceYears ?? ""} onChange={(value) => setValue("ringsideExperienceYears", value)} />
      <Input label="Trauma / Emergency Medicine Experience" value={form.traumaEmergencyExperience ?? ""} onChange={(value) => setValue("traumaEmergencyExperience", value)} />
      <Input label="Current CPR / ACLS Certification Expiry Date" type="date" value={form.cprAclsExpiryDate ?? ""} onChange={(value) => setValue("cprAclsExpiryDate", value)} />
    </>
  );
}

function DocumentChecklist({ title, items, updateDocument }: { title: string; items: LicenseDocumentChecklistItem[]; updateDocument: (requirementId: string, patch: Partial<LicenseDocumentChecklistItem>) => void }) {
  return (
    <div className="mt-4">
      <h3 className="font-serif text-lg font-bold">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div className="grid gap-3 rounded border border-black/10 p-3 md:grid-cols-[1.2fr_1fr_auto_1fr]" key={item.requirementId}>
            <div>
              <p className="text-sm font-semibold">{item.documentName}{item.required ? <span className="text-red-700"> *</span> : null}</p>
            </div>
            <div>
              <input
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm"
                type="file"
                onChange={(event) => updateDocument(item.requirementId, { fileName: event.target.files?.[0]?.name ?? "", received: Boolean(event.target.files?.[0]), verificationStatus: event.target.files?.[0] ? "Received" : "Not Received" })}
              />
              <input className="mt-2 w-full rounded border border-black/20 px-3 py-2 text-sm" placeholder="Filename" value={item.fileName} onChange={(event) => updateDocument(item.requirementId, { fileName: event.target.value })} />
              <p className={`mt-1 text-xs font-semibold ${item.fileName ? "text-emerald-700" : "text-zinc-500"}`}>{item.fileName ? `Uploaded: ${item.fileName}` : "Awaiting upload"}</p>
            </div>
            <label className="flex items-center gap-2 text-sm"><input checked={item.received} className="h-4 w-4 accent-black" type="checkbox" onChange={(event) => updateDocument(item.requirementId, { received: event.target.checked })} />Received</label>
            <div className="rounded border border-black/10 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
              {item.verificationStatus}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
