"use client";

import { useRef, useState } from "react";
import { Camera, Copy, CreditCard, FileCheck2, MailCheck, MoreHorizontal, Printer, RefreshCw, Search } from "lucide-react";
import QRCode from "qrcode";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { addYears, daysUntil, getLicenseExpiryText, getLicenseOperationalStatus, getLicenseStatusForDisplay } from "@/lib/license-utils";
import type { GeneratedLicense, LicenseApplication, LicenseEmailStatus } from "@/types";

function isIssuedLicense(license: GeneratedLicense) {
  return license.approvalStatus === "Issued" || license.approvalStatus === "Stamped / Certified" || license.stampStatus === "Stamped";
}

function photoStatus(license: GeneratedLicense) {
  return license.applicantPhotoFileName ? "Photo Uploaded to License" : license.photoStatus ?? "Photo Missing";
}

function emailStatusFor(license: GeneratedLicense): LicenseEmailStatus {
  if (license.licenseEmailStatus === "Sent") return "Sent";
  if (photoStatus(license) === "Photo Uploaded to License" && isIssuedLicense(license)) return "Ready To Send";
  if (license.licenseEmailStatus === "Photo Requested") return "Photo Requested";
  return "Follow-up Required";
}

function verificationLink(licenseNumber: string) {
  const path = `/verify/${encodeURIComponent(licenseNumber)}`;
  return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character);
}

function assetSrc(value: string | undefined) {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) return value;
  return `${window.location.origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function displayApprovalStatus(value: string | undefined) {
  return value === "Stamped / Certified" ? "Certified" : value ?? "Draft";
}

function refreshedLicenseData(license: GeneratedLicense, application?: LicenseApplication): GeneratedLicense {
  if (!application) return license;
  return {
    ...license,
    applicantName: application.fullLegalName || application.applicantFullName || license.applicantName,
    applicantEmail: application.email || license.applicantEmail,
    applicantPhotoFileName: application.applicantPhotoFileName || license.applicantPhotoFileName,
    nationality: application.nationality || license.nationality,
    dateOfBirth: application.dateOfBirth || license.dateOfBirth,
    passportNumber: application.passportNumber || application.nationalIdNumber || application.identificationNumber || license.passportNumber,
    categoryLabel: application.additionalOfficialCategories?.length ? application.additionalOfficialCategories.join(" / ") : application.licenseCategory === "Other" ? application.otherCategoryDescription || license.categoryLabel : application.licenseCategory,
    approvalDate: application.approvalDate || license.approvalDate,
    expiryDate: application.licenseExpiryDate || license.expiryDate
  };
}

async function printLicenseDirect(license: GeneratedLicense, application: LicenseApplication | undefined, updateGeneratedLicense: (license: GeneratedLicense) => void) {
  const printModel = refreshedLicenseData(license, application);
  const logoSrc = assetSrc("/UAEAC logo v2.png");
  const photoSrc = assetSrc(printModel.applicantPhotoFileName);
  const stampSrc = assetSrc(printModel.stampImageFileName || "/uaeac-stamp.png");
  const qrMarkup = (await QRCode.toString(verificationLink(printModel.id), { type: "svg", margin: 1, width: 120, errorCorrectionLevel: "M" })).replace("<svg", "<svg class=\"qr-svg\" role=\"img\" aria-label=\"License verification QR code\"");
  const photoMarkup = photoSrc ? `<img class="photo-img" src="${escapeHtml(photoSrc)}" alt="Applicant Photo"/>` : `<div class="photo-placeholder">Applicant Photo</div>`;
  const stampMarkup = printModel.stampStatus === "Stamped" ? `<img class="stamp-image" src="${escapeHtml(stampSrc)}" alt="UAEAC Stamp"/>` : `<div class="stamp-pending">Stamp not applied</div>`;
  const issueDate = printModel.issuedDate || printModel.dateIssued;
  const html = `<!doctype html><html><head><title></title><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{width:210mm;height:297mm;margin:0;overflow:hidden;background:#fff}body{font-family:Georgia,"Times New Roman",serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;height:297mm;padding:8mm 10mm}.card{height:281mm;border:1.1mm solid #111;padding:5mm 6mm;position:relative;overflow:hidden}.head{display:grid;grid-template-columns:68mm 1fr 8mm;align-items:center;border-bottom:.35mm solid #111;padding:.5mm 0 2mm;column-gap:3mm}.logo{width:56mm;height:35mm;object-fit:contain;transform:translateX(-1.5mm)}.head-title{text-align:center}.head h1{font-size:25pt;white-space:nowrap;margin:0;line-height:1.02}.head h2{font:700 10.5pt Arial,sans-serif;letter-spacing:.055em;text-transform:uppercase;margin:1.5mm 0 0;white-space:nowrap}.identity{display:grid;grid-template-columns:32mm 1fr;gap:5mm;margin-top:7.5mm;padding-bottom:4mm;border-bottom:.25mm solid #d0d0d0}.section-title{font:700 7pt Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#444;margin:0 0 2mm}.photo{width:31mm;height:39mm;border:.35mm solid #222;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fafafa}.photo-img{width:100%;height:100%;object-fit:cover}.photo-placeholder{font:7pt Arial,sans-serif;color:#555}.holder-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:2.2mm 4mm}.field{border-bottom:.2mm solid #cfcfcf;padding-bottom:1.2mm}.field.full{grid-column:1/-1}.label{font:700 6.7pt Arial,sans-serif;text-transform:uppercase;color:#555;letter-spacing:.05em}.value{font:700 10pt Arial,sans-serif;margin-top:.5mm;line-height:1.12}.license-box{margin-top:5mm;border:.35mm solid #111;background:#fafafa;padding:3.5mm 3mm}.license-grid{display:grid;grid-template-columns:1.45fr .85fr .85fr .95fr;gap:2mm}.license-number .value{font-size:12pt}.body{font:8.8pt Arial,sans-serif;line-height:1.28;margin-top:7mm;border-bottom:.25mm solid #d0d0d0;padding-bottom:3mm}.body p{margin:0 0 1.7mm}.footer-grid{margin:8mm 36mm 0 27mm;display:flex;flex-direction:column;align-items:center;gap:6mm;text-align:center;font:7.3pt Arial,sans-serif}.qr-svg{width:25mm;height:25mm}.qr-svg rect:not(:first-child){fill:#111}.authority-block{position:absolute;left:6mm;bottom:19mm;width:72mm;border-top:.35mm solid #111;padding-top:3mm;font:7.3pt Arial,sans-serif;line-height:1.34}.stamp-wrap{position:absolute;right:6mm;bottom:20mm;width:43mm;text-align:center;font:7pt Arial,sans-serif}.stamp-image{width:29mm;height:auto}.stamp-pending{border:.3mm dashed #777;padding:4mm;color:#555}.security{position:absolute;left:6mm;right:6mm;bottom:7mm;border-top:.25mm solid #bbb;padding-top:1.8mm;display:grid;grid-template-columns:1.35fr .9fr .9fr 1fr;gap:2mm;font:6.5pt Arial,sans-serif;color:#333}</style></head><body><main class="page"><section class="card"><header class="head"><img class="logo" src="${escapeHtml(logoSrc)}" alt="UAEAC Logo"/><div class="head-title"><h1>UAE Athletic Commission</h1><h2>Professional Boxing Participant License</h2></div><div></div></header><section class="identity"><div><div class="section-title">Holder Identity</div><div class="photo">${photoMarkup}</div></div><div><div class="section-title">License Holder Information</div><div class="holder-grid"><div class="field full"><div class="label">Full Name</div><div class="value">${escapeHtml(printModel.applicantName)}</div></div><div class="field"><div class="label">Nationality</div><div class="value">${escapeHtml(printModel.nationality || "Not recorded")}</div></div><div class="field"><div class="label">Date of Birth</div><div class="value">${escapeHtml(formatDate(printModel.dateOfBirth || ""))}</div></div><div class="field"><div class="label">License Category</div><div class="value">${escapeHtml(printModel.categoryLabel)}</div></div></div></div></section><section class="license-box"><div class="section-title">License Details</div><div class="license-grid"><div class="field license-number"><div class="label">License Number</div><div class="value">${escapeHtml(printModel.id)}</div></div><div class="field"><div class="label">Issue Date</div><div class="value">${escapeHtml(formatDate(issueDate))}</div></div><div class="field"><div class="label">Expiry Date</div><div class="value">${escapeHtml(formatDate(printModel.expiryDate))}</div></div><div class="field"><div class="label">Status</div><div class="value">${escapeHtml(displayApprovalStatus(printModel.approvalStatus))}</div></div></div></section><section class="body"><p>The above-named license holder is licensed and authorized by the UAE Athletic Commission to participate in sanctioned professional boxing activities in the category stated above, subject to UAE Athletic Commission rules and regulations.</p><p>This license remains the property of the UAE Athletic Commission and must be presented upon request at sanctioned events, weigh-ins, medical examinations, accreditation checks, and official meetings.</p><p>The holder agrees to comply with all regulatory, medical, disciplinary, and safety requirements established by the UAE Athletic Commission.</p><p><strong>Issued by authority of the UAE Athletic Commission, Dubai, United Arab Emirates.</strong></p></section><footer class="footer-grid"><div>${qrMarkup}<div>Verification QR</div></div><div class="authority-block"><strong>Issued by authority of:</strong><br/>Pat Fiacco<br/>Chairman<br/>UAE Athletic Commission<br/><br/>Dubai, United Arab Emirates<br/><br/>Approval Date: ${escapeHtml(formatDate(printModel.approvalDate || issueDate))}</div></footer><div class="stamp-wrap">${stampMarkup}</div><div class="security"><span>License Number: ${escapeHtml(printModel.id)}</span><span>Issue Date: ${escapeHtml(formatDate(issueDate))}</span><span>Expiry Date: ${escapeHtml(formatDate(printModel.expiryDate))}</span><span>Generated Date: ${escapeHtml(formatDate(printModel.createdAt))}</span></div></section></main><script>document.title="";setTimeout(function(){window.print();},250);</script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  updateGeneratedLicense({ ...printModel, printStatus: "Printed" });
}

async function printWalletCardDirect(license: GeneratedLicense, updateGeneratedLicense: (license: GeneratedLicense) => void, addAuditLog: ReturnType<typeof useFinanceData>["addAuditLog"]) {
  const logoSrc = assetSrc("/UAEAC logo v2.png");
  const photoSrc = assetSrc(license.applicantPhotoFileName);
  const qrMarkup = (await QRCode.toString(verificationLink(license.id), { type: "svg", margin: 1, width: 120, errorCorrectionLevel: "M" })).replace("<svg", "<svg class=\"qr-svg\"");
  const photoMarkup = photoSrc ? `<img class="photo" src="${escapeHtml(photoSrc)}" alt="Applicant Photo"/>` : `<div class="photo placeholder">Photo</div>`;
  const html = `<!doctype html><html><head><title></title><style>@page{size:A4;margin:12mm}body{margin:0;font-family:Arial,sans-serif}.sheet{display:flex;gap:10mm}.card{width:86mm;height:54mm;border:.5mm solid #111;border-radius:3mm;padding:4mm;position:relative;overflow:hidden}.front{display:grid;grid-template-columns:23mm 1fr;gap:3mm}.logo{width:22mm;height:14mm;object-fit:contain}.photo{width:22mm;height:28mm;border:.25mm solid #222;object-fit:cover;background:#f7f7f7}.placeholder{display:flex;align-items:center;justify-content:center;font-size:7pt;color:#666}.title{font:700 8pt Arial;text-transform:uppercase;letter-spacing:.06em}.name{font:700 11pt Arial;margin-top:2mm}.meta{font-size:7pt;line-height:1.45;margin-top:2mm}.number{font:700 8pt Arial;margin-top:2mm}.status{position:absolute;right:4mm;bottom:3mm;font:700 7pt Arial;color:#0f766e}.back{display:grid;grid-template-columns:28mm 1fr;gap:4mm}.qr-svg{width:25mm;height:25mm}.qr-svg rect:not(:first-child){fill:#111}.small{font-size:7pt;line-height:1.5}.commission{font:700 9pt Arial;margin-bottom:2mm}</style></head><body><main class="sheet"><section class="card front"><div><img class="logo" src="${escapeHtml(logoSrc)}" alt="UAEAC Logo"/>${photoMarkup}</div><div><div class="title">UAE Athletic Commission</div><div class="name">${escapeHtml(license.applicantName)}</div><div class="meta">Category: ${escapeHtml(license.categoryLabel)}<br/>Expiry: ${escapeHtml(formatDate(license.expiryDate))}</div><div class="number">${escapeHtml(license.id)}</div></div><div class="status">${escapeHtml(getLicenseStatusForDisplay(license))}</div></section><section class="card back"><div>${qrMarkup}</div><div class="small"><div class="commission">UAE Athletic Commission</div>Issue date: ${escapeHtml(formatDate(license.issuedDate || license.dateIssued))}<br/>Expiry date: ${escapeHtml(formatDate(license.expiryDate))}<br/><br/>Verify this credential using the QR code.</div></section></main><script>document.title="";setTimeout(function(){window.print();},250);</script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  updateGeneratedLicense(license);
  addAuditLog({ module: "License Applications", recordId: license.applicationId, recordLabel: license.applicantName, action: "Wallet Card Printed", changedBy: "Local User", previousValueSummary: "", newValueSummary: `${license.id} wallet card printed`, notes: "Printed UAEAC wallet card from Issued Licenses." });
}

function validityYearsFor(license: GeneratedLicense) {
  return 1;
}

export default function IssuedLicensesPage() {
  const { generatedLicenses, licenseApplications, updateGeneratedLicense, addAuditLog } = useFinanceData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [photoUploadTarget, setPhotoUploadTarget] = useState<GeneratedLicense | null>(null);
  const [actionsLicense, setActionsLicense] = useState<GeneratedLicense | null>(null);
  const [summaryReviewing, setSummaryReviewing] = useState<GeneratedLicense | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const issuedLicenses = generatedLicenses.filter(isIssuedLicense);
  const categories = [...new Set(issuedLicenses.map((license) => license.categoryLabel).filter(Boolean))];
  const filtered = issuedLicenses.filter((license) => {
    const operationalStatus = getLicenseOperationalStatus(license);
    const matchesQuery = query.trim()
      ? `${license.id} ${license.applicantName} ${license.categoryLabel}`.toLowerCase().includes(query.trim().toLowerCase())
      : true;
    const matchesCategory = categoryFilter ? license.categoryLabel === categoryFilter : true;
    const matchesFilter = filter === "Active" ? operationalStatus === "Active"
      : filter === "Expiring Soon" ? operationalStatus === "Expiring Soon"
        : filter === "Expired" ? operationalStatus === "Expired"
          : filter === "Photo Missing" ? photoStatus(license) !== "Photo Uploaded to License"
            : filter === "Email Not Sent" ? emailStatusFor(license) !== "Sent"
              : true;
    return matchesQuery && matchesCategory && matchesFilter;
  });

  function uploadPhoto(license: GeneratedLicense) {
    setPhotoUploadTarget(license);
    photoInputRef.current?.click();
  }

  function handlePhotoUpload(file: File | undefined) {
    const license = photoUploadTarget;
    setPhotoUploadTarget(null);
    if (!file || !license) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      window.alert("Photo must be JPG, JPEG, PNG, or WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const photoValue = typeof reader.result === "string" ? reader.result : file.name;
      const next = {
        ...license,
        applicantPhotoFileName: photoValue,
        photoStatus: "Photo Uploaded to License" as const,
        pendingFlags: (license.pendingFlags ?? []).filter((flag) => flag !== "Photo Pending")
      };
      updateGeneratedLicense(next);
      addAuditLog({
        module: "License Applications",
        recordId: license.applicationId,
        recordLabel: license.applicantName,
        action: "Applicant Photo Uploaded",
        changedBy: "Local User",
        previousValueSummary: license.applicantPhotoFileName || "No photo",
        newValueSummary: file.name,
        notes: "Applicant photo uploaded from Issued Licenses registry."
      });
    };
    reader.readAsDataURL(file);
  }

  function markEmailSent(license: GeneratedLicense) {
    const today = new Date().toISOString().slice(0, 10);
    updateGeneratedLicense({ ...license, licenseEmailStatus: "Sent", emailSentDate: today, emailNotes: `${license.emailNotes ? `${license.emailNotes}\n` : ""}Marked sent from Issued Licenses on ${today}.` });
  }

  function renewLicense(license: GeneratedLicense) {
    if (!window.confirm(`Start renewal workflow for ${license.id}?`)) return;
    updateGeneratedLicense({
      ...license,
      renewalStatus: "Renewal Pending",
      renewalStartedAt: new Date().toISOString(),
      renewalHistory: [
        ...(license.renewalHistory ?? []),
        {
          startedAt: new Date().toISOString(),
          previousExpiryDate: license.expiryDate,
          newExpiryDate: addYears(license.expiryDate, validityYearsFor(license)),
          status: "Renewal Pending",
          notes: "Renewal started from Issued Licenses registry."
        }
      ]
    });
    addAuditLog({
      module: "License Applications",
      recordId: license.applicationId,
      recordLabel: license.applicantName,
      action: "License Renewal Started",
      changedBy: "Local User",
      previousValueSummary: license.expiryDate,
      newValueSummary: "Renewal Pending",
      notes: `Renewal started for ${license.id}.`
    });
  }

  function completeRenewal(license: GeneratedLicense) {
    if (!window.confirm(`Complete renewal for ${license.id} and extend expiry?`)) return;
    const newExpiryDate = addYears(license.expiryDate, validityYearsFor(license));
    updateGeneratedLicense({
      ...license,
      expiryDate: newExpiryDate,
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
          notes: "Renewal completed from Issued Licenses registry."
        }
      ]
    });
    addAuditLog({ module: "License Applications", recordId: license.applicationId, recordLabel: license.applicantName, action: "License Renewed", changedBy: "Local User", previousValueSummary: license.expiryDate, newValueSummary: newExpiryDate, notes: `Renewed ${license.id}.` });
  }

  function refreshLicense(license: GeneratedLicense) {
    const application = licenseApplications.find((item) => item.id === license.applicationId);
    updateGeneratedLicense(refreshedLicenseData(license, application));
  }

  function completeSummaryReview(license: GeneratedLicense) {
    const reviewedBy = window.prompt("Reviewed by", license.summaryReviewedBy || "Pat Fiacco")?.trim();
    if (!reviewedBy) return;
    const reviewDate = window.prompt("Review date", new Date().toISOString().slice(0, 10))?.trim() || new Date().toISOString().slice(0, 10);
    const notes = window.prompt("Summary review notes", license.summaryReviewNotes ?? "")?.trim() ?? "";
    updateGeneratedLicense({ ...license, summaryReviewStatus: "Complete", summaryReviewedBy: reviewedBy, summaryReviewedDate: reviewDate, summaryReviewNotes: notes });
    addAuditLog({ module: "License Applications", recordId: license.applicationId, recordLabel: license.applicantName, action: "Summary Review Completed", changedBy: reviewedBy, previousValueSummary: license.summaryReviewStatus ?? "Pending", newValueSummary: `Complete on ${reviewDate}`, notes });
    setSummaryReviewing(null);
  }

  function closeActionsAndRun(action: () => void) {
    setActionsLicense(null);
    action();
  }

  async function copyVerificationLink(license: GeneratedLicense) {
    await navigator.clipboard.writeText(verificationLink(license.id));
  }

  return (
    <>
      <PageHeader title="Issued Licenses" description="Official UAEAC licenses in effect, photo readiness, expiry tracking, and QR verification links." />
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="space-y-3 border-b border-black/10 p-4">
          <div className="flex min-w-0 items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-steel" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-steel/70" onChange={(event) => setQuery(event.target.value)} placeholder="Search by applicant name or license number" value={query} />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">All issued licenses</option>
              {["Active", "Expiring Soon", "Expired", "Photo Missing", "Email Not Sent"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="rounded border border-black/10 bg-white px-3 py-2 text-sm text-ink" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">Category</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["License Number", "Applicant Name", "Photo", "Category", "Nationality", "Date of Birth", "Issue Date", "Expiry Date", "Status", "Days Until Expiry", "Email Status", "QR Verification Link", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filtered.map((license, index) => {
                const application = licenseApplications.find((item) => item.id === license.applicationId);
                const photo = license.applicantPhotoFileName || application?.applicantPhotoFileName;
                return (
                  <tr key={license.generatedLicenseRecordId || `issued-license-${license.id}-${license.applicationId}-${index}`}>
                    <td className="px-4 py-4 font-semibold text-ink">{license.id}</td>
                    <td className="px-4 py-4 text-steel">{license.applicantName}</td>
                    <td className="px-4 py-4">{photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={license.applicantName} className="h-14 w-12 rounded border border-black/10 object-cover" src={photo} />
                    ) : <span className="text-xs text-steel">No photo</span>}</td>
                    <td className="px-4 py-4 text-steel">{license.categoryLabel}</td>
                    <td className="px-4 py-4 text-steel">{license.nationality || application?.nationality || "Not recorded"}</td>
                    <td className="px-4 py-4 text-steel">{formatDate(license.dateOfBirth || application?.dateOfBirth || "")}</td>
                    <td className="px-4 py-4 text-steel">{formatDate(license.issuedDate || license.dateIssued)}</td>
                    <td className="px-4 py-4 text-steel">{formatDate(license.expiryDate)}</td>
                    <td className="px-4 py-4"><StatusBadge value={getLicenseStatusForDisplay(license)} /></td>
                    <td className="px-4 py-4 text-steel">{getLicenseExpiryText(license.expiryDate)}<div className="text-xs">{daysUntil(license.expiryDate) ?? "No date"}</div></td>
                    <td className="px-4 py-4"><StatusBadge value={emailStatusFor(license)} /></td>
                    <td className="px-4 py-4"><button className="rounded border border-black/10 px-2 py-1 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => void copyVerificationLink(license)}>Copy QR Verification Link</button></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-1 rounded bg-ink px-2 py-1 text-xs font-semibold text-white hover:bg-graphite" onClick={() => void printLicenseDirect(license, application, updateGeneratedLicense)}><Printer className="h-3 w-3" />Print License</button>
                        <button className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" onClick={() => uploadPhoto(license)}><Camera className="h-3 w-3" />Upload/Update Photo</button>
                        <button className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700" onClick={() => void copyVerificationLink(license)}><Copy className="h-3 w-3" />Copy Link</button>
                        <button className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-xs font-semibold text-steel hover:border-gold hover:text-ink" onClick={(event) => { event.stopPropagation(); setActionsLicense(license); }}><MoreHorizontal className="h-3 w-3" />More Actions</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {actionsLicense ? (
        <div className="fixed inset-0 z-[80]" onClick={() => setActionsLicense(null)}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute right-6 top-24 w-80 rounded border border-black/10 bg-white p-3 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-black/10 px-2 pb-3">
              <p className="font-semibold text-ink">More Actions</p>
              <p className="mt-1 text-xs text-steel">{actionsLicense.id} / {actionsLicense.applicantName}</p>
            </div>
            <div className="mt-2 grid gap-1">
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => void printWalletCardDirect(actionsLicense, updateGeneratedLicense, addAuditLog))}><CreditCard className="h-4 w-4" />Print Wallet Card</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => setSummaryReviewing(actionsLicense))}><FileCheck2 className="h-4 w-4" />Summary Review</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => refreshLicense(actionsLicense))}><RefreshCw className="h-4 w-4" />Refresh License Data</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => renewLicense(actionsLicense))}><RefreshCw className="h-4 w-4" />Renew License</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50" disabled={actionsLicense.renewalStatus !== "Renewal Pending" && actionsLicense.renewalStatus !== "Renewal Under Review"} onClick={() => closeActionsAndRun(() => completeRenewal(actionsLicense))}><RefreshCw className="h-4 w-4" />Complete Renewal</button>
              <button className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-steel hover:bg-[#f7f7f5]" onClick={() => closeActionsAndRun(() => markEmailSent(actionsLicense))}><MailCheck className="h-4 w-4" />Mark Email Sent</button>
            </div>
          </div>
        </div>
      ) : null}
      {summaryReviewing ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded border border-black/10 bg-white shadow-soft">
            <div className="border-b border-black/10 p-5">
              <h3 className="text-lg font-semibold text-ink">Summary Review</h3>
              <p className="mt-1 text-sm text-steel">{summaryReviewing.id} / {summaryReviewing.applicantName}</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Info label="Applicant" value={summaryReviewing.applicantName} />
              <Info label="License Number" value={summaryReviewing.id} />
              <Info label="Category" value={summaryReviewing.categoryLabel} />
              <Info label="Photo Status" value={photoStatus(summaryReviewing)} />
              <Info label="Email Status" value={emailStatusFor(summaryReviewing)} />
              <Info label="Status" value={displayApprovalStatus(summaryReviewing.approvalStatus)} />
            </div>
            <div className="flex justify-end gap-2 border-t border-black/10 p-5">
              <button className="rounded border border-black/10 px-4 py-2 text-sm font-semibold text-steel hover:bg-zinc-50" onClick={() => setSummaryReviewing(null)}>Close</button>
              <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d7b445]" onClick={() => completeSummaryReview(summaryReviewing)}>Mark Summary Review Complete</button>
            </div>
          </div>
        </div>
      ) : null}
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
    </>
  );
}

function Info({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink">{value || "Not recorded"}</p>
    </div>
  );
}
