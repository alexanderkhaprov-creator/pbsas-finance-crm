"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, CreditCard, FileCheck2, MoreHorizontal, Printer, RefreshCw, RotateCw, Stamp, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { addYears, getLicenseExpiryText, getLicenseStatusForDisplay } from "@/lib/license-utils";
import type { ApplicantPhotoStatus, GeneratedLicense, LicenseApplication, LicenseEmailStatus, LicensePendingFlag } from "@/types";

const officialStampImage = "/uaeac-stamp-red.jpeg";
const officialSingleStampImage = "/uaeac-stamp.png";
const officialLogoImage = "/UAEAC logo v2.png";
const officialLicensePrefix = "UAEAC2026";
const internalLinPrefix = "LIN-2026";

function assetSrc(value: string | undefined) {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) return value;
  return `${window.location.origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function displayDate(value: string | undefined) {
  return value ? value.slice(0, 10) : "Not set";
}

function maskPassportNumber(value: string | undefined) {
  const normalized = value?.replace(/\s+/g, "").trim();
  if (!normalized) return "";
  const suffix = normalized.slice(-4);
  return `${"X".repeat(Math.max(4, normalized.length - 4))}${suffix}`;
}

function licenseTitleFor(categoryLabel: string) {
  const category = categoryLabel.toLowerCase();
  if (category.includes("doctor") || category.includes("physician")) return "Professional Boxing Ringside Physician License";
  if (category.includes("manager")) return "Professional Boxing Manager License";
  if (category.includes("referee") || category.includes("judge") || category.includes("ring inspector")) return "Professional Boxing Official License";
  if (category.includes("boxer")) return "Professional Boxing Athlete License";
  if (category.includes("coach") || category.includes("second")) return "Professional Boxing Coach / Second License";
  if (category.includes("supervisor")) return "Professional Boxing Supervisor License";
  if (category.includes("timekeeper")) return "Professional Boxing Timekeeper License";
  if (category.includes("cutman")) return "Professional Boxing Cutman License";
  return "Professional Boxing Participant License";
}

function watermarkFor(license: GeneratedLicense) {
  const status = license.approvalStatus ?? "Draft";
  if (status === "Stamped / Certified") return "CERTIFIED";
  if (status === "Approved Awaiting Stamp") return "APPROVED";
  if (status === "Issued") return "ISSUED";
  if (status === "Cancelled") return "CANCELLED";
  if (status === "Rejected") return "REJECTED";
  return "DRAFT";
}

function displayApprovalStatus(value: string | undefined) {
  return value === "Stamped / Certified" ? "Certified" : value ?? "Draft";
}

function normalizePersonName(value: string | undefined) {
  if (!value) return value;
  return value.replace(/\bpat\s+fiacco\b/gi, "Pat Fiacco");
}

function officialLicenseNumberFrom(value: string | undefined) {
  if (!value) return "";
  const official = value.match(/^UAEAC(\d{4})-(\d{5})$/);
  if (official) return value;
  const oldApplicationNumber = value.match(/^UAEAC(\d{4})(\d{5})$/);
  if (oldApplicationNumber) return `UAEAC${oldApplicationNumber[1]}-${oldApplicationNumber[2]}`;
  const oldGeneratedNumber = value.match(/^LIC-(\d{4})-(\d{6})$/);
  if (oldGeneratedNumber) return `UAEAC${oldGeneratedNumber[1]}-${oldGeneratedNumber[2].slice(-5)}`;
  return "";
}

function internalRegistryReferenceFrom(value: string | undefined) {
  if (!value) return "";
  if (/^LIN-\d{4}-\d{6}$/.test(value)) return value;
  const oldGeneratedNumber = value.match(/^LIC-(\d{4})-(\d{6})$/);
  if (oldGeneratedNumber) return `LIN-${oldGeneratedNumber[1]}-${oldGeneratedNumber[2]}`;
  const officialNumber = value.match(/^UAEAC(\d{4})-?(\d{5})$/);
  if (officialNumber) return `LIN-${officialNumber[1]}-${officialNumber[2].padStart(6, "0")}`;
  return "";
}

function nextOfficialLicenseNumber(records: GeneratedLicense[]) {
  const highest = records.reduce((max, license) => {
    const official = officialLicenseNumberFrom(license.id) || officialLicenseNumberFrom(license.lin);
    const match = official.match(/^UAEAC\d{4}-(\d{5})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${officialLicensePrefix}-${String(highest + 1).padStart(5, "0")}`;
}

function nextInternalRegistryReference(records: GeneratedLicense[]) {
  const highest = records.reduce((max, license) => {
    const reference = internalRegistryReferenceFrom(license.lin) || internalRegistryReferenceFrom(license.id);
    const match = reference.match(/^LIN-\d{4}-(\d{6})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${internalLinPrefix}-${String(highest + 1).padStart(6, "0")}`;
}

function verificationPayload(license: GeneratedLicense) {
  const path = `/verify/${encodeURIComponent(license.id)}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

async function assetExists(path: string) {
  try {
    const response = await fetch(path, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function licenseCategoryLabel(application: Pick<LicenseApplication, "licenseCategory" | "otherCategoryDescription" | "additionalOfficialCategories">) {
  const combined = application.additionalOfficialCategories?.length ? application.additionalOfficialCategories.join(" / ") : "";
  return combined || (application.licenseCategory === "Other" ? application.otherCategoryDescription || "Other" : application.licenseCategory);
}

function applicantEmailFor(application?: LicenseApplication, license?: GeneratedLicense) {
  const legacyApplication = application as (LicenseApplication & { emailAddress?: string; personalInfo?: { email?: string } }) | undefined;
  return (application?.email || legacyApplication?.emailAddress || legacyApplication?.personalInfo?.email || license?.applicantEmail || "").trim();
}

function refreshedLicenseData(license: GeneratedLicense, application: LicenseApplication): GeneratedLicense {
  return {
    ...license,
    id: officialLicenseNumberFrom(application.licenseIssueNumber) || officialLicenseNumberFrom(license.id) || officialLicenseNumberFrom(license.lin) || license.id,
    lin: /^LIN-\d{4}-\d{6}$/.test(license.lin) ? license.lin : internalRegistryReferenceFrom(license.id) || internalRegistryReferenceFrom(license.lin) || license.lin,
    applicantName: application.fullLegalName || application.applicantFullName || license.applicantName,
    applicantEmail: applicantEmailFor(application, license),
    applicantPhotoFileName: application.applicantPhotoFileName || license.applicantPhotoFileName,
    nationality: application.nationality || license.nationality,
    dateOfBirth: application.dateOfBirth || license.dateOfBirth,
    passportNumber: application.passportNumber || application.nationalIdNumber || application.identificationNumber || license.passportNumber,
    categoryLabel: licenseCategoryLabel(application) || license.categoryLabel,
    photoStatus: application.photoStatus || (application.applicantPhotoFileName ? "Photo Uploaded to License" : license.photoStatus),
    summaryReviewStatus: application.summaryReviewStatus || license.summaryReviewStatus,
    summaryReviewedBy: application.summaryReviewedBy || license.summaryReviewedBy,
    summaryReviewedDate: application.summaryReviewedDate || license.summaryReviewedDate,
    summaryReviewNotes: application.summaryReviewNotes || license.summaryReviewNotes,
    licenseEmailStatus: application.licenseEmailStatus || license.licenseEmailStatus,
    emailPreparedDate: application.emailPreparedDate || license.emailPreparedDate,
    emailSentDate: application.emailSentDate || license.emailSentDate,
    emailNotes: application.emailNotes || license.emailNotes,
    approvedBy: normalizePersonName(application.approvedBy || application.chiefReviewer || license.approvedBy),
    stampedBy: normalizePersonName(license.stampedBy),
    issuedBy: normalizePersonName(application.approvedBy || application.chiefReviewer || license.issuedBy) || "Pat Fiacco",
    approvalDate: application.approvalDate || license.approvalDate,
    expiryDate: application.licenseExpiryDate || license.expiryDate
  };
}

function photoStatusFor(license: GeneratedLicense, application?: LicenseApplication): ApplicantPhotoStatus {
  if (license.photoStatus) return license.photoStatus;
  if (application?.photoStatus) return application.photoStatus;
  if (license.applicantPhotoFileName || application?.applicantPhotoFileName) return "Photo Uploaded to License";
  if (application?.completionChecklist.photoReceived) return "Photo Received";
  return "Photo Missing";
}

function paymentReady(application?: LicenseApplication) {
  if (!application) return false;
  const paymentStatus = application.paymentStatus as string;
  return paymentStatus === "Paid" || paymentStatus === "Payment Verified" || paymentStatus === "Verified" || paymentStatus === "Waived" || application.paymentConfirmationType === "Manually Paid" || application.paymentConfirmationType === "Cash Paid" || application.paymentConfirmationType === "Admin Ready Override" || application.paymentConfirmationType === "Waived";
}

function idVerified(application?: LicenseApplication) {
  if (!application) return false;
  const documents = application.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  return idDocument?.verificationStatus === "Verified" || application.completionChecklist.identificationProvided;
}

function sendReadiness(license: GeneratedLicense, application?: LicenseApplication) {
  const certifiedOrIssued = license.approvalStatus === "Issued" || license.approvalStatus === "Stamped / Certified";
  if (!certifiedOrIssued) return { ready: false, reason: "Not ready to send — license is not issued or certified." };
  if (license.stampStatus !== "Stamped") return { ready: false, reason: "Not ready to send — stamp not applied." };
  if (!paymentReady(application)) return { ready: false, reason: "Not ready to send — payment not confirmed." };
  if (!idVerified(application)) return { ready: false, reason: "Not ready to send — passport or National ID not verified." };
  if (photoStatusFor(license, application) !== "Photo Uploaded to License") return { ready: false, reason: "Not ready to send — applicant photo missing." };
  if ((license.summaryReviewStatus ?? application?.summaryReviewStatus) !== "Complete") return { ready: false, reason: "Not ready to send — summary review not completed." };
  return { ready: true, reason: "Ready To Send" };
}

function derivedPendingFlagsFor(license: GeneratedLicense, application?: LicenseApplication): LicensePendingFlag[] {
  const documents = application?.documentChecklistSnapshot ?? [];
  const idDocument = documents.find((item) => item.documentName.toLowerCase().includes("passport") || item.documentName.toLowerCase().includes("national id"));
  const requiredDocumentsPending = documents.filter((item) => item.required).some((item) => item.verificationStatus !== "Verified");
  const applicantEmail = applicantEmailFor(application, license);
  return [
    ...(photoStatusFor(license, application) !== "Photo Uploaded to License" ? ["Photo Pending" as const] : []),
    ...(application && (idDocument?.verificationStatus !== "Verified" || requiredDocumentsPending) ? ["Documents Pending" as const] : []),
    ...((license.summaryReviewStatus ?? application?.summaryReviewStatus) !== "Complete" ? ["Summary Review Pending" as const] : []),
    ...(license.stampStatus !== "Stamped" ? ["Stamp Pending" as const] : []),
    ...(!applicantEmail ? ["Email Pending" as const] : [])
  ];
}

function pendingFlagsFor(license: GeneratedLicense, application?: LicenseApplication): LicensePendingFlag[] {
  return derivedPendingFlagsFor(license, application);
}

function pendingNotesFor(flags: LicensePendingFlag[]) {
  return flags.length ? "License generated with pending administrative items. Review before final external sending." : "";
}

function normalizeGeneratedLicenseRecordIds(records: GeneratedLicense[]) {
  const used = new Set<string>();
  let sequence = records.reduce((highest, license) => {
    const match = license.generatedLicenseRecordId?.match(/^GLR-2026-(\d{6})$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return records.map((license, index) => {
    let recordId = license.generatedLicenseRecordId;
    if (!recordId || used.has(recordId)) {
      do {
        sequence += 1;
        recordId = `GLR-2026-${String(sequence || index + 1).padStart(6, "0")}`;
      } while (used.has(recordId));
    }
    used.add(recordId);
    return { ...license, generatedLicenseRecordId: recordId };
  });
}

function validPhotoFileName(fileName: string) {
  return /\.(jpe?g|png|webp)$/i.test(fileName.trim());
}

function normalizedGeneratedLicense(license: GeneratedLicense, application: LicenseApplication | undefined, records: GeneratedLicense[]) {
  const fromApplication = application ? refreshedLicenseData(license, application) : license;
  const officialNumber = officialLicenseNumberFrom(application?.licenseIssueNumber) || officialLicenseNumberFrom(fromApplication.id) || officialLicenseNumberFrom(fromApplication.lin) || nextOfficialLicenseNumber(records);
  return {
    ...fromApplication,
    generatedLicenseRecordId: fromApplication.generatedLicenseRecordId,
    id: officialNumber,
    lin: /^LIN-\d{4}-\d{6}$/.test(fromApplication.lin) ? fromApplication.lin : internalRegistryReferenceFrom(license.id) || internalRegistryReferenceFrom(license.lin) || nextInternalRegistryReference(records),
    approvedBy: normalizePersonName(fromApplication.approvedBy),
    stampedBy: normalizePersonName(fromApplication.stampedBy),
    issuedBy: normalizePersonName(fromApplication.issuedBy) || "Pat Fiacco"
  };
}

async function printLicense(license: GeneratedLicense, application: LicenseApplication | undefined, records: GeneratedLicense[], updateGeneratedLicense: (license: GeneratedLicense) => void, stampImageFileName: string) {
  const printModel = normalizedGeneratedLicense(license, application, records);
  const hasSingleStamp = await assetExists(officialSingleStampImage);
  const activeStamp = hasSingleStamp ? officialSingleStampImage : printModel.stampImageFileName || stampImageFileName || officialStampImage;
  const stampSrc = assetSrc(activeStamp);
  const logoSrc = assetSrc(officialLogoImage);
  const photoSrc = assetSrc(printModel.applicantPhotoFileName);
  const stampWidth = printModel.stampSize === "Large" ? 34 : printModel.stampSize === "Small" ? 24 : 29;
  const issueDate = printModel.issuedDate || printModel.dateIssued;
  const generatedDate = printModel.createdAt || new Date().toISOString();
  const passportMarkup = printModel.passportNumber
    ? escapeHtml(maskPassportNumber(printModel.passportNumber))
    : "Not recorded";
  const stampMarkup = printModel.stampStatus === "Stamped"
    ? hasSingleStamp
      ? `<div class="stamp single"><img class="stamp-image" src="${escapeHtml(stampSrc)}" alt="UAEAC Official Stamp" style="width:${stampWidth}mm;height:auto;"/><strong>UAEAC OFFICIAL STAMP</strong><br/>Stamped by: ${escapeHtml(normalizePersonName(printModel.stampedBy) || "UAEAC")}<br/>Stamp date: ${escapeHtml(displayDate(printModel.stampDate || issueDate))}</div>`
      : `<div class="stamp fallback"><div class="stamp-crop" style="width:${stampWidth}mm;height:${stampWidth}mm;"><img src="${escapeHtml(stampSrc)}" alt="UAEAC Official Stamp"/></div><strong>UAEAC OFFICIAL STAMP</strong><br/>Stamped by: ${escapeHtml(normalizePersonName(printModel.stampedBy) || "UAEAC")}<br/>Stamp date: ${escapeHtml(displayDate(printModel.stampDate || issueDate))}</div>`
    : `<div class="stamp pending">Stamp not applied</div>`;
  const photoMarkup = photoSrc ? `<img class="photo-img" src="${photoSrc}" alt="Applicant Photo"/>` : `<div class="photo-placeholder">Applicant Photo</div>`;
  const qrMarkup = (await QRCode.toString(verificationPayload(printModel), {
    type: "svg",
    margin: 1,
    width: 128,
    errorCorrectionLevel: "M"
  })).replace("<svg", "<svg class=\"qr-svg\" role=\"img\" aria-label=\"License verification QR code\"");
  const statusLabel = escapeHtml(displayApprovalStatus(printModel.approvalStatus));
  const html = `<!doctype html><html><head><title></title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{width:210mm;height:297mm;margin:0;padding:0;overflow:hidden;background:#fff}body{font-family:Georgia,"Times New Roman",serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;height:297mm;padding:8mm 10mm;overflow:hidden}.card{height:281mm;border:1.1mm solid #111;padding:5mm 6mm;position:relative;overflow:hidden}.watermark{position:absolute;left:8mm;right:8mm;top:103mm;text-align:center;font:700 46pt Arial,sans-serif;letter-spacing:.16em;color:rgba(0,0,0,.045);transform:rotate(-24deg);z-index:0;pointer-events:none}.content{position:relative;z-index:1}.head{display:grid;grid-template-columns:68mm minmax(0,1fr) 8mm;align-items:center;border-bottom:.35mm solid #111;padding:.5mm 0 2mm;column-gap:3mm}.logo{width:56mm;height:35mm;display:block;object-fit:contain;justify-self:start;align-self:center;transform:translateX(-1.5mm)}.head-title{text-align:center;align-self:center;justify-self:center;width:100%;min-width:0}.head h1{font-size:clamp(22pt,3.35vw,26.5pt);white-space:nowrap;margin:0;line-height:1.02}.head h2{font-family:Arial,sans-serif;font-size:10.5pt;letter-spacing:.055em;text-transform:uppercase;margin:1.5mm 0 0;white-space:nowrap}.section-title{font:700 7pt Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#444;margin:0 0 2mm}.identity{display:grid;grid-template-columns:32mm 1fr;gap:5mm;margin-top:7.5mm;padding-bottom:4mm;border-bottom:.25mm solid #d0d0d0}.photo{width:31mm;height:39mm;border:.35mm solid #222;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fafafa}.photo-img{width:100%;height:100%;object-fit:cover}.photo-placeholder{font:7pt Arial,sans-serif;text-align:center;color:#555}.holder-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:2.2mm 4mm}.field{min-width:0;border-bottom:.2mm solid #cfcfcf;padding-bottom:1.2mm}.field.full{grid-column:1 / -1}.label{font:700 6.7pt Arial,sans-serif;text-transform:uppercase;color:#555;letter-spacing:.05em}.value{font:700 10pt Arial,sans-serif;margin-top:.5mm;line-height:1.12;word-break:break-word}.license-box{margin-top:5mm;border:.35mm solid #111;background:#fafafa;padding:3.5mm 3mm}.license-box .section-title{margin-bottom:2.8mm}.license-grid{display:grid;grid-template-columns:1.45fr .85fr .85fr .95fr;gap:2mm}.license-number .value{font-size:12pt;letter-spacing:.03em}.license-box .value{font-size:9.2pt}.body{font:8.8pt Arial,sans-serif;line-height:1.28;margin-top:7mm;border-bottom:.25mm solid #d0d0d0;padding-bottom:3mm}.body p{margin:0 0 1.7mm}.body p:last-child{margin-bottom:0}.authority-copy{font-weight:700}.footer-grid{margin:8mm 36mm 0 27mm;display:flex;flex-direction:column;align-items:center;gap:6mm;text-align:center;font:7.3pt Arial,sans-serif}.qr{width:28mm;text-align:center;margin-bottom:4mm}.qr-svg{width:25mm;height:25mm;display:block;margin:0 auto 1mm}.qr-svg rect:not(:first-child){fill:#111}.qr-caption{font-weight:700;text-transform:uppercase;letter-spacing:.04em}.authority-block{position:absolute;left:6mm;bottom:19mm;width:72mm;border-top:.35mm solid #111;padding-top:3mm;line-height:1.34;max-width:72mm;text-align:left}.authority-block strong{font-size:8.5pt}.stamp-wrap{position:absolute;right:6mm;bottom:20mm;width:43mm}.stamp{width:43mm;min-height:31mm;text-align:center;font:7pt Arial,sans-serif;color:#111;margin:0}.stamp.single{transform:none}.stamp-image{display:block;margin:0 auto 1mm;object-fit:contain}.stamp.fallback{transform:rotate(-7deg)}.stamp-crop{overflow:hidden;border-radius:50%;display:block;margin:0 auto 1mm;background:#fff}.stamp-crop img{width:100%;height:100%;display:block;object-fit:cover;object-position:center bottom}.pending{border:.3mm dashed #777;padding:4mm;transform:none;color:#555;min-height:18mm;display:flex;align-items:center;justify-content:center}.security{position:absolute;left:6mm;right:6mm;bottom:7mm;border-top:.25mm solid #bbb;padding-top:1.8mm;display:grid;grid-template-columns:1.35fr .9fr .9fr 1fr;gap:2mm;font:6.5pt Arial,sans-serif;color:#333}.security span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.screen-note{display:none}@media print{.screen-note{display:none}}</style></head><body><main class="page"><section class="card"><div class="watermark">${escapeHtml(watermarkFor(printModel))}</div><div class="content"><header class="head"><img class="logo" src="${escapeHtml(logoSrc)}" alt="UAE Athletic Commission Logo"/><div class="head-title"><h1>UAE Athletic Commission</h1><h2>${escapeHtml(licenseTitleFor(printModel.categoryLabel))}</h2></div><div></div></header><section class="identity"><div><div class="section-title">Holder Identity</div><div class="photo">${photoMarkup}</div></div><div><div class="section-title">License Holder Information</div><div class="holder-grid"><div class="field full"><div class="label">Full Name</div><div class="value">${escapeHtml(printModel.applicantName)}</div></div><div class="field"><div class="label">Nationality</div><div class="value">${escapeHtml(printModel.nationality || "Not recorded")}</div></div><div class="field"><div class="label">Date of Birth</div><div class="value">${escapeHtml(displayDate(printModel.dateOfBirth))}</div></div><div class="field"><div class="label">Passport / National ID</div><div class="value">${passportMarkup}</div></div><div class="field"><div class="label">License Category</div><div class="value">${escapeHtml(printModel.categoryLabel)}</div></div></div></div></section><section class="license-box"><div class="section-title">License Details</div><div class="license-grid"><div class="field license-number"><div class="label">License Number</div><div class="value">${escapeHtml(printModel.id)}</div></div><div class="field"><div class="label">Issue Date</div><div class="value">${escapeHtml(displayDate(issueDate))}</div></div><div class="field"><div class="label">Expiry Date</div><div class="value">${escapeHtml(displayDate(printModel.expiryDate))}</div></div><div class="field"><div class="label">Status</div><div class="value">${statusLabel}</div></div></div></section><section class="body"><p>The above-named license holder is licensed and authorized by the UAE Athletic Commission to participate in sanctioned professional boxing activities in the category stated above, subject to UAE Athletic Commission rules and regulations.</p><p>This license remains the property of the UAE Athletic Commission and must be presented upon request at sanctioned events, weigh-ins, medical examinations, accreditation checks, and official meetings.</p><p>The holder agrees to comply with all regulatory, medical, disciplinary, and safety requirements established by the UAE Athletic Commission.</p><p class="authority-copy">Issued by authority of the UAE Athletic Commission, Dubai, United Arab Emirates.</p></section></div><footer class="footer-grid"><div class="qr">${qrMarkup}<div class="qr-caption">Verification QR</div></div><div class="authority-block"><strong>Issued by authority of:</strong><br/>Pat Fiacco<br/>Chairman<br/>UAE Athletic Commission<br/><br/>Dubai, United Arab Emirates<br/><br/>Approval Date: ${escapeHtml(displayDate(printModel.approvalDate || issueDate))}</div></footer><div class="stamp-wrap">${stampMarkup}</div><div class="security"><span>License Number: ${escapeHtml(printModel.id)}</span><span>Issue Date: ${escapeHtml(displayDate(issueDate))}</span><span>Expiry Date: ${escapeHtml(displayDate(printModel.expiryDate))}</span><span>Generated Date: ${escapeHtml(displayDate(generatedDate))}</span></div></section></main><script>document.title=""; setTimeout(function(){window.print();},250);</script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  updateGeneratedLicense({ ...printModel, printStatus: "Printed" });
}

async function printWalletCard(license: GeneratedLicense, application: LicenseApplication | undefined, records: GeneratedLicense[], updateGeneratedLicense: (license: GeneratedLicense) => void, addAuditLog: ReturnType<typeof useFinanceData>["addAuditLog"]) {
  const card = normalizedGeneratedLicense(license, application, records);
  const logoSrc = assetSrc(officialLogoImage);
  const photoSrc = assetSrc(card.applicantPhotoFileName);
  const hasSingleStamp = await assetExists(officialSingleStampImage);
  const stampSrc = hasSingleStamp ? assetSrc(officialSingleStampImage) : "";
  const qrMarkup = (await QRCode.toString(verificationPayload(card), {
    type: "svg",
    margin: 1,
    width: 120,
    errorCorrectionLevel: "M"
  })).replace("<svg", "<svg class=\"qr-svg\" role=\"img\" aria-label=\"License verification QR code\"");
  const status = getLicenseStatusForDisplay(card);
  const photoMarkup = photoSrc ? `<img class="photo" src="${escapeHtml(photoSrc)}" alt="Applicant Photo"/>` : `<div class="photo placeholder">Photo</div>`;
  const stampMarkup = card.stampStatus === "Stamped" && stampSrc ? `<img class="stamp" src="${escapeHtml(stampSrc)}" alt="UAEAC Stamp"/>` : "";
  const html = `<!doctype html><html><head><title></title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{display:flex;gap:10mm;align-items:flex-start}.card{width:86mm;height:54mm;border:.5mm solid #111;border-radius:3mm;padding:4mm;position:relative;overflow:hidden;background:#fff}.front{display:grid;grid-template-columns:23mm 1fr;gap:3mm}.logo{width:22mm;height:14mm;object-fit:contain}.photo{width:22mm;height:28mm;border:.25mm solid #222;object-fit:cover;background:#f7f7f7}.placeholder{display:flex;align-items:center;justify-content:center;font-size:7pt;color:#666}.title{font:700 8pt Arial;text-transform:uppercase;letter-spacing:.06em}.name{font:700 11pt Arial;margin-top:2mm}.meta{font-size:7pt;line-height:1.45;margin-top:2mm}.number{font:700 8pt Arial;margin-top:2mm}.status{position:absolute;right:4mm;bottom:3mm;font:700 7pt Arial;color:#0f766e}.back{display:grid;grid-template-columns:28mm 1fr;gap:4mm}.qr-svg{width:25mm;height:25mm}.qr-svg rect:not(:first-child){fill:#111}.stamp{position:absolute;right:4mm;bottom:4mm;width:18mm;height:auto}.small{font-size:7pt;line-height:1.5}.commission{font:700 9pt Arial;margin-bottom:2mm}</style></head><body><main class="sheet"><section class="card front"><div><img class="logo" src="${escapeHtml(logoSrc)}" alt="UAEAC Logo"/>${photoMarkup}</div><div><div class="title">UAE Athletic Commission</div><div class="name">${escapeHtml(card.applicantName)}</div><div class="meta">Category: ${escapeHtml(card.categoryLabel)}<br/>Expiry: ${escapeHtml(displayDate(card.expiryDate))}</div><div class="number">${escapeHtml(card.id)}</div></div><div class="status">${escapeHtml(status)}</div></section><section class="card back"><div>${qrMarkup}</div><div class="small"><div class="commission">UAE Athletic Commission</div>Issue date: ${escapeHtml(displayDate(card.issuedDate || card.dateIssued))}<br/>Expiry date: ${escapeHtml(displayDate(card.expiryDate))}<br/><br/>Verify this credential using the QR code. This card remains property of the UAE Athletic Commission.</div>${stampMarkup}</section></main><script>document.title=""; setTimeout(function(){window.print();},250);</script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  updateGeneratedLicense(card);
  addAuditLog({
    module: "License Applications",
    recordId: card.applicationId,
    recordLabel: card.applicantName,
    action: "Wallet Card Printed",
    changedBy: "Local User",
    previousValueSummary: "",
    newValueSummary: `${card.id} wallet card printed`,
    notes: "Printed UAEAC wallet card."
  });
}

function SummaryReviewModal({
  license,
  application,
  onClose,
  onComplete
}: {
  license: GeneratedLicense;
  application?: LicenseApplication;
  onClose: () => void;
  onComplete: (reviewedBy: string, reviewDate: string, notes: string) => void;
}) {
  const [reviewedBy, setReviewedBy] = useState(license.summaryReviewedBy || application?.summaryReviewedBy || "Pat Fiacco");
  const [reviewDate, setReviewDate] = useState(license.summaryReviewedDate || application?.summaryReviewedDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(license.summaryReviewNotes || application?.summaryReviewNotes || "");
  const flags = pendingFlagsFor(license, application);
  const paymentStatus = application ? application.paymentStatus : "Application not linked";
  const identityValue = application?.passportNumber || application?.nationalIdNumber || application?.identificationNumber || license.passportNumber || "Not recorded";
  const applicantEmail = applicantEmailFor(application, license);
  const emailStatus = applicantEmail ? license.licenseEmailStatus ?? application?.licenseEmailStatus ?? "Available" : "Email Pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">Generated License Summary Review</h3>
          <p className="mt-1 text-sm text-steel">{license.id} / {license.applicantName}</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <InfoCard label="Applicant name" value={application?.fullLegalName || application?.applicantFullName || license.applicantName} />
          <InfoCard label="Applicant Email" value={applicantEmail || "Email Pending"} />
          <InfoCard label="License category" value={license.categoryLabel} />
          <InfoCard label="Passport / National ID" value={identityValue} />
          <InfoCard label="Payment status" value={paymentStatus} />
          <InfoCard label="Email Status" value={emailStatus} />
          <InfoCard label="Invoice status" value={application?.invoiceStatus || "Not linked"} />
          <InfoCard label="Receipt status" value={application?.receiptNumber ? "Receipt generated" : "Not generated"} />
          <InfoCard label="Photo status" value={photoStatusFor(license, application)} />
          <InfoCard label="Stamp status" value={license.stampStatus} />
          <section className="md:col-span-2 rounded border border-black/10 bg-[#f7f7f5] p-4">
            <h4 className="font-semibold text-ink">Administrative cross-check</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {flags.length ? flags.map((flag) => <StatusBadge key={flag} value={flag} />) : <StatusBadge value="Complete" />}
            </div>
            {flags.length ? <p className="mt-3 text-sm text-amber-800">License generated with pending administrative items. Review before final external sending.</p> : null}
          </section>
          <label className="text-sm font-medium text-steel">Reviewed by<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={reviewedBy} onChange={(event) => setReviewedBy(event.target.value)} /></label>
          <label className="text-sm font-medium text-steel">Review date<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label>
          <label className="md:col-span-2 text-sm font-medium text-steel">Chief review notes<textarea className="mt-1 min-h-24 w-full rounded border border-black/10 px-3 py-2 text-ink" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel opacity-60" disabled title="Email sending will be enabled after mail integration.">Email License</button>
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose}>Close</button>
          <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => onComplete(reviewedBy.trim() || "Local User", reviewDate, notes)}>Mark Summary Review Complete</button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink">{value || "Not recorded"}</p>
    </div>
  );
}

function duplicateMatchesFor(license: GeneratedLicense, records: GeneratedLicense[]) {
  const normalizedName = license.applicantName.trim().toLowerCase();
  const normalizedCategory = license.categoryLabel.trim().toLowerCase();
  return records.filter((candidate) => {
    if ((candidate.generatedLicenseRecordId || `${candidate.id}-${candidate.applicationId}-${candidate.lin}`) === (license.generatedLicenseRecordId || `${license.id}-${license.applicationId}-${license.lin}`)) return false;
    return candidate.id === license.id
      || candidate.applicationId === license.applicationId
      || (candidate.applicantName.trim().toLowerCase() === normalizedName && candidate.categoryLabel.trim().toLowerCase() === normalizedCategory);
  });
}

function DeleteGeneratedLicenseModal({
  license,
  duplicates,
  mode,
  onClose,
  onConfirm
}: {
  license: GeneratedLicense;
  duplicates: GeneratedLicense[];
  mode: "delete" | "duplicate";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [checked, setChecked] = useState(false);
  const canConfirm = confirmation.trim().toUpperCase() === "DELETE" || checked;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-5">
          <h3 className="text-lg font-semibold text-ink">{mode === "duplicate" ? "Remove Duplicate Generated License" : "Delete Generated License"}</h3>
          <p className="mt-1 text-sm text-steel">This removes only the generated license record. The linked application and applicant records remain untouched.</p>
        </div>
        <div className="space-y-4 p-5">
          <section className="rounded border border-red-200 bg-red-50 p-4">
            <h4 className="font-semibold text-red-800">Selected record to remove</h4>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <InfoCard label="License Number" value={license.id} />
              <InfoCard label="Application ID" value={license.applicationId} />
              <InfoCard label="Applicant Name" value={license.applicantName} />
              <InfoCard label="Created Date" value={formatDate(license.createdAt)} />
              <InfoCard label="Status" value={displayApprovalStatus(license.approvalStatus)} />
              <InfoCard label="Record ID" value={license.generatedLicenseRecordId || "Not assigned"} />
            </div>
          </section>
          {duplicates.length ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-900">Matching generated license records</h4>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-amber-900">
                    <tr>{["License Number", "Application ID", "Applicant Name", "Created Date", "Status"].map((heading) => <th className="px-3 py-2" key={heading}>{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {duplicates.map((duplicate, index) => (
                      <tr key={duplicate.generatedLicenseRecordId || `duplicate-${duplicate.id}-${duplicate.applicationId}-${index}`}>
                        <td className="px-3 py-2 font-semibold">{duplicate.id}</td>
                        <td className="px-3 py-2">{duplicate.applicationId}</td>
                        <td className="px-3 py-2">{duplicate.applicantName}</td>
                        <td className="px-3 py-2">{formatDate(duplicate.createdAt)}</td>
                        <td className="px-3 py-2">{displayApprovalStatus(duplicate.approvalStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-amber-900">This action defaults to removing the selected row above and keeping the matching record(s).</p>
            </section>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" />
            I understand this removes only this generated license record.
          </label>
          <label className="block text-sm font-medium text-steel">Type DELETE to confirm<input className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-ink" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 p-5">
          <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={onClose}>Cancel</button>
          <button className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!canConfirm} onClick={onConfirm}>{mode === "duplicate" ? "Remove Duplicate" : "Delete Generated License"}</button>
        </div>
      </div>
    </div>
  );
}

export default function GeneratedLicensesPage() {
  const { generatedLicenses, licenseApplications, licenseFeeSchedule, stampSettings, updateGeneratedLicense, deleteGeneratedLicense, updateLicenseApplication, addAuditLog } = useFinanceData();
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [summaryReviewing, setSummaryReviewing] = useState<GeneratedLicense | null>(null);
  const [actionsLicense, setActionsLicense] = useState<GeneratedLicense | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{ license: GeneratedLicense; mode: "delete" | "duplicate" } | null>(null);
  const [photoUploadTarget, setPhotoUploadTarget] = useState<GeneratedLicense | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const tableHeadings = [
    { label: "License Number", title: "Official UAEAC participant license number." },
    { label: "Application", title: "" },
    { label: "Internal Registry Reference", title: "Internal UAEAC registry tracking number." },
    { label: "Applicant", title: "" },
    { label: "Applicant Email", title: "" },
    { label: "Category", title: "" },
    { label: "Issued", title: "" },
    { label: "Expiry", title: "" },
    { label: "Operational Status", title: "Calculated from issue status and expiry date." },
    { label: "Approval", title: "" },
    { label: "Stamp", title: "" },
    { label: "Photo", title: "" },
    { label: "Email", title: "" },
    { label: "Pending Items", title: "" },
    { label: "Send Readiness", title: "" },
    { label: "Print Status", title: "" },
    { label: "Actions", title: "" }
  ];

  const filteredLicenses = generatedLicenses.filter((license) => {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    const readiness = sendReadiness(license, application);
    const photoStatus = photoStatusFor(license, application);
    const emailStatus = license.licenseEmailStatus ?? application?.licenseEmailStatus ?? "Not Sent";
    const pendingFlags = pendingFlagsFor(license, application);
    return workflowFilter === "Photo Missing" ? photoStatus === "Photo Missing"
      : workflowFilter === "Photo Requested" ? photoStatus === "Photo Requested"
        : workflowFilter === "Ready To Send" ? readiness.ready
          : workflowFilter === "Sent" ? emailStatus === "Sent"
            : workflowFilter === "Summary Review Pending" ? (license.summaryReviewStatus ?? application?.summaryReviewStatus) !== "Complete"
              : workflowFilter === "Generated With Pending Items" ? license.approvalStatus === "Generated With Pending Items" || pendingFlags.length > 0
                : workflowFilter === "Photo Pending" ? pendingFlags.includes("Photo Pending")
                  : workflowFilter === "Documents Pending" ? pendingFlags.includes("Documents Pending")
                    : true;
  });

  function updateLicense(license: GeneratedLicense, patch: Partial<GeneratedLicense>) {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    const previousFlags = pendingFlagsFor(license, application);
    const merged = { ...license, ...patch };
    const nextFlags = derivedPendingFlagsFor(merged, application);
    const next: GeneratedLicense = {
      ...merged,
      pendingFlags: nextFlags,
      pendingNotes: pendingNotesFor(nextFlags),
      approvalStatus: merged.approvalStatus === "Generated With Pending Items" && !nextFlags.length ? "Approved Awaiting Stamp" : merged.approvalStatus
    };
    updateGeneratedLicense(next);
    const added = nextFlags.filter((flag) => !previousFlags.includes(flag));
    const cleared = previousFlags.filter((flag) => !nextFlags.includes(flag));
    if (added.length) {
      addAuditLog({
        module: "License Applications",
        recordId: license.applicationId,
        recordLabel: license.applicantName,
        action: "Pending Flag Added",
        changedBy: "Local User",
        previousValueSummary: previousFlags.join(", ") || "No pending flags",
        newValueSummary: nextFlags.join(", "),
        notes: added.join(", ")
      });
    }
    if (cleared.length) {
      addAuditLog({
        module: "License Applications",
        recordId: license.applicationId,
        recordLabel: license.applicantName,
        action: "Pending Flag Cleared",
        changedBy: "Local User",
        previousValueSummary: previousFlags.join(", "),
        newValueSummary: nextFlags.join(", ") || "No pending flags",
        notes: cleared.join(", ")
      });
    }
  }

  function duplicateReasons(license: GeneratedLicense) {
    const matches = duplicateMatchesFor(license, generatedLicenses);
    return matches.length ? matches : [];
  }

  function closeActionsAndRun(action: () => void) {
    setActionsLicense(null);
    action();
  }

  function confirmDeleteGeneratedLicense(license: GeneratedLicense, mode: "delete" | "duplicate") {
    deleteGeneratedLicense(
      license,
      mode === "duplicate" ? "Duplicate Generated License Removed" : "Generated License Deleted",
      mode === "duplicate"
        ? `Removed duplicate generated license ${license.generatedLicenseRecordId || license.id}. Visible license number and linked application records were preserved where present.`
        : `Deleted generated license ${license.generatedLicenseRecordId || license.id}. Linked application and applicant records were preserved.`
    );
    setDeleteRequest(null);
    setActionsLicense(null);
  }

  useEffect(() => {
    const identityNormalized = normalizeGeneratedLicenseRecordIds(generatedLicenses);
    identityNormalized.forEach((license, index) => {
      const original = generatedLicenses[index];
      const application = licenseApplications.find((item) => item.id === license.applicationId);
      const normalizedBase = normalizedGeneratedLicense(license, application, identityNormalized);
      const normalizedFlags = derivedPendingFlagsFor(normalizedBase, application);
      const normalized: GeneratedLicense = {
        ...normalizedBase,
        pendingFlags: normalizedFlags,
        pendingNotes: pendingNotesFor(normalizedFlags),
        approvalStatus: normalizedBase.approvalStatus === "Generated With Pending Items" && !normalizedFlags.length ? "Approved Awaiting Stamp" : normalizedBase.approvalStatus
      };
      const needsUpdate = [
        "id",
        "lin",
        "applicantName",
        "applicantEmail",
        "applicantPhotoFileName",
        "nationality",
        "dateOfBirth",
        "passportNumber",
        "categoryLabel",
        "approvedBy",
        "stampedBy",
        "issuedBy",
        "approvalDate",
        "expiryDate",
        "generatedLicenseRecordId",
        "pendingNotes",
        "approvalStatus"
      ].some((key) => normalized[key as keyof GeneratedLicense] !== original?.[key as keyof GeneratedLicense]);
      const pendingNeedsUpdate = (normalized.pendingFlags ?? []).join("|") !== (original?.pendingFlags ?? []).join("|");
      if (needsUpdate || pendingNeedsUpdate) {
        updateGeneratedLicense(normalized);
      }
    });
  }, [generatedLicenses, licenseApplications, updateGeneratedLicense]);

  function refreshLicense(license: GeneratedLicense) {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    if (!application) {
      window.alert(`No source application found for ${license.applicationId}.`);
      return;
    }
    updateLicense(license, refreshedLicenseData(license, application));
  }

  function openSummaryReview(license: GeneratedLicense) {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    const synced = { ...license, applicantEmail: applicantEmailFor(application, license) };
    if (synced.applicantEmail !== license.applicantEmail) {
      updateLicense(license, { applicantEmail: synced.applicantEmail });
    }
    setSummaryReviewing(synced);
    addAuditLog({
      module: "License Applications",
      recordId: license.applicationId,
      recordLabel: license.applicantName,
      action: "Summary Review Opened From Generated License",
      changedBy: "Local User",
      previousValueSummary: license.summaryReviewStatus ?? "Pending",
      newValueSummary: "Summary review opened",
      notes: `Opened summary review for ${license.id}.`
    });
  }

  async function completeSummaryReview(license: GeneratedLicense, reviewedBy: string, reviewDate: string, notes: string) {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    const patch = {
      summaryReviewStatus: "Complete" as const,
      summaryReviewedBy: reviewedBy,
      summaryReviewedDate: reviewDate,
      summaryReviewNotes: notes
    };
    updateLicense(license, patch);
    if (application) {
      await updateLicenseApplication({
        ...application,
        ...patch,
        updatedAt: new Date().toISOString()
      });
    }
    addAuditLog({
      module: "License Applications",
      recordId: license.applicationId,
      recordLabel: license.applicantName,
      action: "Summary Review Completed",
      changedBy: reviewedBy,
      previousValueSummary: license.summaryReviewStatus ?? "Pending",
      newValueSummary: `Complete on ${reviewDate}`,
      notes
    });
    setSummaryReviewing(null);
  }

  function uploadPhoto(license: GeneratedLicense) {
    setPhotoUploadTarget(license);
    photoInputRef.current?.click();
  }

  function handlePhotoUpload(file: File | undefined) {
    const license = photoUploadTarget;
    setPhotoUploadTarget(null);
    if (!file || !license) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) && !validPhotoFileName(file.name)) {
      window.alert("Photo must be JPG, JPEG, PNG, or WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const photoValue = typeof reader.result === "string" ? reader.result : file.name;
      updateLicense(license, {
        applicantPhotoFileName: photoValue,
        photoStatus: "Photo Uploaded to License"
      });
      addAuditLog({
        module: "License Applications",
        recordId: license.applicationId,
        recordLabel: license.applicantName,
        action: "Applicant Photo Uploaded",
        changedBy: "Local User",
        previousValueSummary: license.applicantPhotoFileName || "No photo",
        newValueSummary: file.name,
        notes: "Applicant photo uploaded on Generated Licenses page."
      });
    };
    reader.readAsDataURL(file);
  }

  function markEmailSent(license: GeneratedLicense) {
    const sentDate = window.prompt("Email sent date", new Date().toISOString().slice(0, 10))?.trim();
    if (!sentDate) return;
    const notes = window.prompt("Email notes", license.emailNotes ?? "")?.trim() ?? "";
    updateLicense(license, {
      licenseEmailStatus: "Sent",
      emailSentDate: sentDate,
      emailNotes: notes
    });
  }

  function validityYearsFor(license: GeneratedLicense) {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    const feeItem = application ? licenseFeeSchedule.find((item) => item.status === "Active" && item.category === application.licenseCategory) : undefined;
    const match = (feeItem?.validityPeriod ?? application?.validityPeriod ?? "1 Year").match(/(\d+)/);
    return Number(match?.[1] ?? 1);
  }

  function startRenewal(license: GeneratedLicense) {
    if (!window.confirm(`Start renewal workflow for ${license.id}?`)) return;
    const next: GeneratedLicense = {
      ...license,
      renewalStatus: "Renewal Pending",
      renewalStartedAt: new Date().toISOString(),
      renewalHistory: [
        ...(license.renewalHistory ?? []),
        {
          startedAt: new Date().toISOString(),
          previousExpiryDate: license.expiryDate,
          status: "Renewal Pending",
          notes: "Renewal workflow started by admin."
        }
      ]
    };
    updateGeneratedLicense(next);
    addAuditLog({
      module: "License Applications",
      recordId: license.applicationId,
      recordLabel: license.applicantName,
      action: "License Renewal Started",
      changedBy: "Local User",
      previousValueSummary: license.expiryDate,
      newValueSummary: next.renewalStatus ?? "Renewal Pending",
      notes: `Renewal started for ${license.id}.`
    });
  }

  function completeRenewal(license: GeneratedLicense) {
    if (!window.confirm(`Renew ${license.id} and extend the expiry date?`)) return;
    const newExpiryDate = addYears(license.expiryDate || new Date().toISOString().slice(0, 10), validityYearsFor(license));
    const next: GeneratedLicense = {
      ...license,
      expiryDate: newExpiryDate,
      previousExpiryDate: license.expiryDate,
      renewalStatus: "Renewed",
      renewedAt: new Date().toISOString(),
      renewalCount: (license.renewalCount ?? 0) + 1,
      renewalHistory: [
        ...(license.renewalHistory ?? []),
        {
          startedAt: license.renewalStartedAt ?? new Date().toISOString(),
          previousExpiryDate: license.expiryDate,
          newExpiryDate,
          status: "Renewed",
          notes: "Renewal completed by admin."
        }
      ]
    };
    updateGeneratedLicense(next);
    addAuditLog({
      module: "License Applications",
      recordId: license.applicationId,
      recordLabel: license.applicantName,
      action: "License Renewed",
      changedBy: "Local User",
      previousValueSummary: license.expiryDate,
      newValueSummary: newExpiryDate,
      notes: `Renewed ${license.id}.`
    });
  }

  return (
    <>
      <PageHeader title="Generated Licenses" description="Printable UAEAC professional boxing participant license drafts and issued licenses." />
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-4">
          <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value)}>
            <option value="">All generated licenses</option>
            {["Generated With Pending Items", "Photo Pending", "Documents Pending", "Photo Missing", "Photo Requested", "Ready To Send", "Sent", "Summary Review Pending"].map((filter) => <option key={filter} value={filter}>{filter}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{tableHeadings.map((heading) => <th className="px-4 py-3 font-semibold" key={heading.label} title={heading.title || undefined}>{heading.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredLicenses.map((license, index) => {
                const application = licenseApplications.find((item) => item.id === license.applicationId);
                const readiness = sendReadiness(license, application);
                const emailStatus: LicenseEmailStatus = license.licenseEmailStatus ?? application?.licenseEmailStatus ?? "Not Sent";
                const pendingFlags = pendingFlagsFor(license, application);
                const duplicates = duplicateReasons(license);
                return (
                <tr key={license.generatedLicenseRecordId || `generated-license-${license.id}-${license.applicationId}-${index}`}>
                  <td className="px-4 py-4 font-semibold text-ink">{license.id}{duplicates.length ? <div className="mt-1"><StatusBadge value="Possible Duplicate" /></div> : null}</td>
                  <td className="px-4 py-4 text-steel">{license.applicationId}</td>
                  <td className="px-4 py-4 text-steel">{license.lin}</td>
                  <td className="px-4 py-4 text-steel">{license.applicantName}</td>
                  <td className="px-4 py-4 text-steel">{applicantEmailFor(application, license) || "Email Pending"}</td>
                  <td className="px-4 py-4 text-steel">{license.categoryLabel}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(license.dateIssued)}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(license.expiryDate)}<div className="text-xs text-steel/80">{getLicenseExpiryText(license.expiryDate)}</div></td>
                  <td className="px-4 py-4"><StatusBadge value={getLicenseStatusForDisplay(license)} />{license.renewalStatus ? <div className="mt-1"><StatusBadge value={license.renewalStatus} /></div> : null}</td>
                  <td className="px-4 py-4"><StatusBadge value={license.approvalStatus ?? "Draft"} /></td>
                  <td className="px-4 py-4"><StatusBadge value={license.stampStatus} /></td>
                  <td className="px-4 py-4"><StatusBadge value={photoStatusFor(license, application)} /></td>
                  <td className="px-4 py-4"><StatusBadge value={emailStatus} /></td>
                  <td className="max-w-[260px] px-4 py-4">
                    {pendingFlags.length ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-800">Generated with pending items *</p>
                        <div className="flex flex-wrap gap-1">{pendingFlags.map((flag) => <StatusBadge key={flag} value={flag} />)}</div>
                      </div>
                    ) : <StatusBadge value="Complete" />}
                  </td>
                  <td className="max-w-[240px] px-4 py-4"><StatusBadge value={readiness.ready ? "Ready To Send" : "Follow-up Required"} /><p className="mt-1 text-xs text-steel">{readiness.reason}</p></td>
                  <td className="px-4 py-4"><StatusBadge value={license.printStatus} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-graphite" onClick={() => void printLicense(license, licenseApplications.find((item) => item.id === license.applicationId), generatedLicenses, updateGeneratedLicense, stampSettings.stampImageFileName)}><Printer className="h-4 w-4" />Print License</button>
                      <button className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100" onClick={() => openSummaryReview(license)}><FileCheck2 className="h-4 w-4" />Summary Review</button>
                      <button className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => uploadPhoto(license)}><Camera className="h-4 w-4" />Upload Applicant Photo</button>
                      <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={(event) => {
                        event.stopPropagation();
                        setActionsLicense(license);
                      }} type="button"><MoreHorizontal className="h-4 w-4" />More Actions</button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </section>
      <input
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handlePhotoUpload(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={photoInputRef}
        type="file"
      />
      {actionsLicense ? (
        <div className="fixed inset-0 z-[80]" onClick={() => setActionsLicense(null)}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute right-6 top-24 w-80 rounded border border-black/10 bg-white p-3 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-black/10 px-2 pb-3">
              <p className="font-semibold text-ink">More Actions</p>
              <p className="mt-1 text-xs text-steel">{actionsLicense.id} / {actionsLicense.applicantName}</p>
            </div>
            <div className="mt-2 grid gap-1">
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => refreshLicense(actionsLicense))}><RefreshCw className="h-4 w-4" />Refresh License Data</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50" disabled={stampSettings.stampAvailable !== "Yes"} onClick={() => closeActionsAndRun(() => updateLicense(actionsLicense, { approvalStatus: "Stamped / Certified", stampStatus: "Stamped", stampedBy: stampSettings.defaultStampedBy, stampDate: new Date().toISOString().slice(0, 10), stampImageFileName: stampSettings.stampImageFileName || officialStampImage, stampPosition: stampSettings.stampPositionDefault ?? "Bottom Right", stampSize: stampSettings.stampSize ?? "Medium" }))}><Stamp className="h-4 w-4" />Apply Stamp</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => updateLicense(actionsLicense, { approvalStatus: "Issued", stampStatus: "Stamped", stampedBy: actionsLicense.stampedBy || stampSettings.defaultStampedBy, stampDate: actionsLicense.stampDate || new Date().toISOString().slice(0, 10), stampImageFileName: actionsLicense.stampImageFileName || stampSettings.stampImageFileName || officialStampImage, stampPosition: actionsLicense.stampPosition || stampSettings.stampPositionDefault || "Bottom Right", stampSize: actionsLicense.stampSize || stampSettings.stampSize || "Medium", issuedDate: new Date().toISOString().slice(0, 10) }))}><CheckCircle2 className="h-4 w-4" />Mark Issued</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => startRenewal(actionsLicense))}><RotateCw className="h-4 w-4" />Renew License</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50" disabled={actionsLicense.renewalStatus !== "Renewal Pending" && actionsLicense.renewalStatus !== "Renewal Under Review"} onClick={() => closeActionsAndRun(() => completeRenewal(actionsLicense))}><RotateCw className="h-4 w-4" />Complete Renewal</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => void printWalletCard(actionsLicense, licenseApplications.find((item) => item.id === actionsLicense.applicationId), generatedLicenses, updateGeneratedLicense, addAuditLog))}><CreditCard className="h-4 w-4" />Print Wallet Card</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => updateLicense(actionsLicense, { photoStatus: "Photo Requested", licenseEmailStatus: "Photo Requested", emailPreparedDate: actionsLicense.emailPreparedDate || new Date().toISOString().slice(0, 10) }))}><Camera className="h-4 w-4" />Mark Photo Requested</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => markEmailSent(actionsLicense))}>Mark Email Sent</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => {
                setDeleteRequest({ license: actionsLicense, mode: "delete" });
                setActionsLicense(null);
              }}><XCircle className="h-4 w-4" />Delete Generated License</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!duplicateMatchesFor(actionsLicense, generatedLicenses).length} onClick={() => {
                setDeleteRequest({ license: actionsLicense, mode: "duplicate" });
                setActionsLicense(null);
              }}><XCircle className="h-4 w-4" />Remove Duplicate</button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteRequest ? (
        <DeleteGeneratedLicenseModal
          duplicates={duplicateMatchesFor(deleteRequest.license, generatedLicenses)}
          license={deleteRequest.license}
          mode={deleteRequest.mode}
          onClose={() => setDeleteRequest(null)}
          onConfirm={() => confirmDeleteGeneratedLicense(deleteRequest.license, deleteRequest.mode)}
        />
      ) : null}
      {summaryReviewing ? (
        <SummaryReviewModal
          application={licenseApplications.find((item) => item.id === summaryReviewing.applicationId)}
          license={summaryReviewing}
          onClose={() => setSummaryReviewing(null)}
          onComplete={(reviewedBy, reviewDate, notes) => void completeSummaryReview(summaryReviewing, reviewedBy, reviewDate, notes)}
        />
      ) : null}
    </>
  );
}
