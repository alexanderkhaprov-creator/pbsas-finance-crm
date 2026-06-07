import type { ApplicationImportMappedField, CurrencyCode, ExpenseCategory, LicenseApplication, LicenseCategory, OcrConfidenceLevel } from "@/types";
import { parseMoneyInput } from "@/lib/money-utils";

type FieldDefinition = {
  id: string;
  label: string;
  targetField: keyof LicenseApplication;
  aliases: string[];
};

export const applicationImportFields: FieldDefinition[] = [
  { id: "fullLegalName", label: "Full Legal Name", targetField: "applicantFullName", aliases: ["full legal name", "applicant name", "name"] },
  { id: "dateOfBirth", label: "Date of Birth", targetField: "dateOfBirth", aliases: ["date of birth", "dob"] },
  { id: "placeOfBirth", label: "Place of Birth", targetField: "placeOfBirth", aliases: ["place of birth", "birth place"] },
  { id: "nationality", label: "Nationality", targetField: "nationality", aliases: ["nationality"] },
  { id: "passportNumber", label: "Passport Number", targetField: "passportNumber", aliases: ["passport number", "passport no"] },
  { id: "nationalIdNumber", label: "National ID Number", targetField: "nationalIdNumber", aliases: ["national id", "emirates id", "id number"] },
  { id: "gender", label: "Gender", targetField: "gender", aliases: ["gender", "sex"] },
  { id: "existingRegisteredLicenseNumber", label: "Existing registered license number", targetField: "existingRegisteredLicenseNumber", aliases: ["existing license", "previous license", "license number"] },
  { id: "address", label: "Residential Address", targetField: "address", aliases: ["residential address", "address"] },
  { id: "city", label: "City", targetField: "city", aliases: ["city"] },
  { id: "country", label: "Country", targetField: "country", aliases: ["country"] },
  { id: "postalCode", label: "Postal Code", targetField: "postalCode", aliases: ["postal code", "postcode", "zip"] },
  { id: "phone", label: "Mobile Number", targetField: "phone", aliases: ["mobile number", "mobile", "phone"] },
  { id: "email", label: "Email Address", targetField: "email", aliases: ["email address", "email"] },
  { id: "emergencyContactName", label: "Emergency Contact Name", targetField: "emergencyContactName", aliases: ["emergency contact name", "emergency contact"] },
  { id: "emergencyContactRelationship", label: "Emergency Contact Relationship", targetField: "emergencyContactRelationship", aliases: ["emergency contact relationship", "relationship"] },
  { id: "emergencyContactPhone", label: "Emergency Contact Phone Number", targetField: "emergencyContactPhone", aliases: ["emergency contact phone", "emergency phone"] },
  { id: "licenseCategory", label: "Applicant Category / License Category", targetField: "licenseCategory", aliases: ["license category", "applicant category", "category"] },
  { id: "yearsOfExperience", label: "Years of Experience", targetField: "yearsOfExperience", aliases: ["years of experience", "experience"] },
  { id: "currentOrganizationTeam", label: "Current Organization / Team", targetField: "currentOrganizationTeam", aliases: ["current organization", "current team", "organization"] },
  { id: "professionalCertificationsHeld", label: "Professional Certifications Held", targetField: "professionalCertificationsHeld", aliases: ["professional certifications", "certifications"] },
  { id: "deniedLicense", label: "Denied license yes/no", targetField: "deniedLicense", aliases: ["denied license"] },
  { id: "medicalCondition", label: "Medical condition yes/no", targetField: "medicalCondition", aliases: ["medical condition"] },
  { id: "paymentReference", label: "Payment Reference", targetField: "paymentReference", aliases: ["payment reference", "transaction reference", "reference"] },
  { id: "amountPaid", label: "Amount Paid", targetField: "amountPaid", aliases: ["amount paid", "paid amount"] }
];

const licenseCategories: LicenseCategory[] = ["Professional Boxer", "Coach / Second", "Referee", "Judge", "Ring Inspector", "Timekeeper", "Supervisor", "Ringside Physician / Doctor", "Cutman", "Matchmaker", "Manager", "Promoter Representative", "Other"];
const currencies: CurrencyCode[] = ["AED", "USD", "EUR", "GBP", "RUB"];
const categories: ExpenseCategory[] = ["Travel", "Accommodation", "Food & Beverage", "Fuel", "Medical", "Licensing Operations", "Event Operations", "Officials", "Office & Administration", "Equipment", "Marketing", "Professional Services", "Workshop", "General Operations", "Other"];

function confidence(value: string): OcrConfidenceLevel {
  if (!value.trim()) return "Manual Review Required";
  if (value.length > 3) return "Medium";
  return "Low";
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const slash = trimmed.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!slash) return trimmed;
  const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
  return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
}

function extractByAliases(text: string, aliases: string[]) {
  for (const alias of aliases) {
    const pattern = new RegExp(`${alias}\\s*[:\\-]?\\s*([^\\n\\r]+)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function normalizeLicenseCategory(value: string) {
  const lower = value.toLowerCase();
  return licenseCategories.find((category) => lower.includes(category.toLowerCase()) || lower.includes(category.split(" ")[0].toLowerCase())) ?? value;
}

export function buildApplicationMappings(rawText: string): ApplicationImportMappedField[] {
  return applicationImportFields.map((field) => {
    let value = extractByAliases(rawText, field.aliases);
    if (field.targetField === "dateOfBirth") value = normalizeDate(value);
    if (field.targetField === "email" && !value) value = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
    if (field.targetField === "phone" && !value) value = rawText.match(/\+?\d[\d\s().-]{7,}/)?.[0]?.trim() ?? "";
    if (field.targetField === "licenseCategory") value = normalizeLicenseCategory(value);
    const level = confidence(value);
    return {
      id: field.id,
      label: field.label,
      targetField: field.targetField,
      extractedValue: value,
      editedValue: value,
      confidence: level,
      include: Boolean(value)
    };
  });
}

export function getMappedValue(fields: ApplicationImportMappedField[], targetField: keyof LicenseApplication) {
  return fields.find((field) => field.targetField === targetField && field.include)?.editedValue.trim() ?? "";
}

export function parseReceiptText(rawText: string) {
  const amountMatch = rawText.match(/(?:amount|total|paid)\s*[:\-]?\s*(AED|USD|EUR|GBP|RUB)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?|[0-9][0-9.]*(?:,[0-9]{1,2})?)/i);
  const dateMatch = rawText.match(/(?:date|receipt date)\s*[:\-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
  const vendor = extractByAliases(rawText, ["vendor", "merchant", "supplier", "store"]);
  const currency = currencies.find((item) => rawText.toUpperCase().includes(item)) ?? "AED";
  const category = categories.find((item) => rawText.toLowerCase().includes(item.toLowerCase())) ?? "General Operations";
  return {
    vendor,
    receiptDate: dateMatch?.[1] ? normalizeDate(dateMatch[1]) : "",
    amount: amountMatch?.[2] ? parseMoneyInput(amountMatch[2]) : 0,
    currency: (amountMatch?.[1] as CurrencyCode | undefined) ?? currency,
    paymentMethod: extractByAliases(rawText, ["payment method", "method"]) || "",
    referenceNumber: extractByAliases(rawText, ["reference", "ref", "transaction"]),
    vatTrn: extractByAliases(rawText, ["trn", "vat", "tax registration number"]),
    suggestedCategory: category
  };
}
