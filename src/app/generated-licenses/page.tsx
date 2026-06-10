"use client";

import { CheckCircle2, FileCheck2, Printer, Stamp, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatDate } from "@/lib/format";
import type { GeneratedLicense } from "@/types";

const officialStampImage = "/uaeac-stamp-red.jpeg";

function printLicense(license: GeneratedLicense, updateGeneratedLicense: (license: GeneratedLicense) => void, stampImageFileName: string) {
  const activeStamp = license.stampImageFileName || stampImageFileName || officialStampImage;
  const stampSrc = activeStamp.startsWith("http") ? activeStamp : `${window.location.origin}${activeStamp}`;
  const stampWidth = license.stampSize === "Large" ? 138 : license.stampSize === "Small" ? 88 : 112;
  const stampMarkup = license.approvalStatus === "Stamped / Certified" || license.approvalStatus === "Issued" || license.stampStatus === "Stamped"
    ? `<div class="stamp"><img src="${stampSrc}" alt="UAEAC Official Stamp" style="width:${stampWidth}px;height:auto;display:block;margin:0 auto 8px;"/><strong>UAEAC OFFICIAL STAMP</strong><br/>Stamped by: ${license.stampedBy || "UAEAC"}<br/>Date: ${license.stampDate || license.issuedDate || ""}</div>`
    : `<div class="stamp pending">[UAEAC OFFICIAL STAMP]<br/>Awaiting stamp</div>`;
  const html = `<!doctype html><html><head><title>${license.id}</title><style>body{font-family:Georgia,serif;color:#111;padding:36px}.card{border:4px solid #111;padding:34px;min-height:860px;position:relative}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:18px}.photo{width:130px;height:160px;border:1px solid #222;display:flex;align-items:center;justify-content:center;font:12px Arial;margin:24px auto}.line{margin:18px 0}.label{font:700 12px Arial;text-transform:uppercase;color:#555}.value{font-size:22px;font-weight:700}.body{font:17px Arial;line-height:1.65;margin-top:24px}.sig{margin-top:70px;display:flex;justify-content:space-between;font:14px Arial}.stamp{border:2px solid #111;padding:12px;text-align:center;min-width:180px}.pending{border-style:dashed;color:#555}</style></head><body><div class="card"><div class="head"><h1>UAE Athletic Commission</h1><h2>Professional Boxing Participant License</h2></div><div class="photo">Applicant Photo</div><div class="line"><div class="label">Full Legal Name</div><div class="value">${license.applicantName}</div></div><div class="line"><div class="label">License Number / LIN</div><div class="value">${license.lin}</div></div><div class="line"><div class="label">License Category</div><div class="value">${license.categoryLabel}</div></div><div class="line"><div class="label">Date Issued / Expiry</div><div class="value">${license.dateIssued} to ${license.expiryDate}</div></div><div class="body"><p>The above-named participant is hereby licensed and authorized by the UAE Athletic Commission to participate in sanctioned professional boxing activities under the rules and regulations of the UAE Athletic Commission.</p><p>This license remains the property of the UAE Athletic Commission and must be presented upon request at all sanctioned events, weigh-ins, medical examinations, and official meetings.</p><p>The holder agrees to comply with all rules, medical requirements, disciplinary procedures, and safety regulations established by the UAE Athletic Commission.</p><p><strong>Issued by the authority of the UAE Athletic Commission</strong></p></div><div class="sig"><div>Issued By: ${license.issuedBy}<br/>${license.issuedByTitle}<br/>Date: ${license.issuedDate || license.dateIssued}</div><div>${stampMarkup}</div></div></div></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  updateGeneratedLicense({ ...license, printStatus: "Printed" });
}

export default function GeneratedLicensesPage() {
  const { generatedLicenses, stampSettings, updateGeneratedLicense } = useFinanceData();

  function updateLicense(license: GeneratedLicense, patch: Partial<GeneratedLicense>) {
    updateGeneratedLicense({ ...license, ...patch });
  }

  return (
    <>
      <PageHeader title="Generated Licenses" description="Printable UAEAC professional boxing participant license drafts and issued licenses." />
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["License", "Application", "LIN", "Applicant", "Category", "Issued", "Expiry", "Approval", "Stamp", "Print Status", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {generatedLicenses.map((license) => (
                <tr key={license.id}>
                  <td className="px-4 py-4 font-semibold text-ink">{license.id}</td>
                  <td className="px-4 py-4 text-steel">{license.applicationId}</td>
                  <td className="px-4 py-4 text-steel">{license.lin}</td>
                  <td className="px-4 py-4 text-steel">{license.applicantName}</td>
                  <td className="px-4 py-4 text-steel">{license.categoryLabel}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(license.dateIssued)}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(license.expiryDate)}</td>
                  <td className="px-4 py-4"><StatusBadge value={license.approvalStatus ?? "Draft"} /></td>
                  <td className="px-4 py-4"><StatusBadge value={license.stampStatus} /></td>
                  <td className="px-4 py-4"><StatusBadge value={license.printStatus} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => updateLicense(license, { approvalStatus: "Pending Approval" })}><FileCheck2 className="h-4 w-4" />Submit</button>
                      <button className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100" onClick={() => {
                        const approvedBy = window.prompt("Approved by", license.approvedBy || stampSettings.defaultStampedBy || "");
                        if (!approvedBy) return;
                        updateLicense(license, { approvalStatus: "Approved Awaiting Stamp", approvedBy, approvalTitle: window.prompt("Approval title", license.approvalTitle || stampSettings.defaultStampTitle || "UAE Athletic Commission") || license.approvalTitle, approvalDate: new Date().toISOString().slice(0, 10) });
                      }}><CheckCircle2 className="h-4 w-4" />Approve</button>
                      <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" disabled={stampSettings.stampAvailable !== "Yes"} onClick={() => {
                        if (stampSettings.stampAvailable !== "Yes") return;
                        updateLicense(license, { approvalStatus: "Stamped / Certified", stampStatus: "Stamped", stampedBy: stampSettings.defaultStampedBy, stampDate: new Date().toISOString().slice(0, 10), stampImageFileName: stampSettings.stampImageFileName || officialStampImage, stampPosition: stampSettings.stampPositionDefault ?? "Bottom Right", stampSize: stampSettings.stampSize ?? "Medium" });
                      }}><Stamp className="h-4 w-4" />Apply Stamp</button>
                      <button className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => {
                        updateLicense(license, { approvalStatus: "Issued", stampStatus: "Stamped", stampedBy: license.stampedBy || stampSettings.defaultStampedBy, stampDate: license.stampDate || new Date().toISOString().slice(0, 10), stampImageFileName: license.stampImageFileName || stampSettings.stampImageFileName || officialStampImage, stampPosition: license.stampPosition || stampSettings.stampPositionDefault || "Bottom Right", stampSize: license.stampSize || stampSettings.stampSize || "Medium", issuedDate: new Date().toISOString().slice(0, 10) });
                      }}>Mark Issued</button>
                      <button className="inline-flex items-center gap-2 rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => {
                        const reason = window.prompt("Rejection / cancellation reason", license.rejectionReason || "");
                        if (!reason) return;
                        updateLicense(license, { approvalStatus: "Rejected", rejectionReason: reason });
                      }}><XCircle className="h-4 w-4" />Reject</button>
                      <button className="inline-flex items-center gap-2 rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => {
                        const reason = window.prompt("Cancellation reason", license.rejectionReason || "");
                        if (!reason) return;
                        updateLicense(license, { approvalStatus: "Cancelled", rejectionReason: reason });
                      }}>Cancel</button>
                      <button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => printLicense(license, updateGeneratedLicense, stampSettings.stampImageFileName)}><Printer className="h-4 w-4" />Print</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
