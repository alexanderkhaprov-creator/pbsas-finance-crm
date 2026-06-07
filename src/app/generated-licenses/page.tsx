"use client";

import { Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatDate } from "@/lib/format";
import type { GeneratedLicense } from "@/types";

function printLicense(license: GeneratedLicense, updateGeneratedLicense: (license: GeneratedLicense) => void, stampImageFileName: string) {
  const stampMarkup = stampImageFileName ? `<div>Stamp Image Placeholder:<br/><strong>${stampImageFileName}</strong></div>` : `<div>Stamp Placeholder: ____________________</div>`;
  const html = `<!doctype html><html><head><title>${license.id}</title><style>body{font-family:Georgia,serif;color:#111;padding:36px}.card{border:4px solid #111;padding:34px;min-height:860px}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:18px}.photo{width:130px;height:160px;border:1px solid #222;display:flex;align-items:center;justify-content:center;font:12px Arial;margin:24px auto}.line{margin:18px 0}.label{font:700 12px Arial;text-transform:uppercase;color:#555}.value{font-size:22px;font-weight:700}.body{font:17px Arial;line-height:1.65;margin-top:24px}.sig{margin-top:70px;display:flex;justify-content:space-between;font:14px Arial}</style></head><body><div class="card"><div class="head"><h1>UAE Athletic Commission</h1><h2>Professional Boxing Participant License</h2></div><div class="photo">Applicant Photo</div><div class="line"><div class="label">Full Legal Name</div><div class="value">${license.applicantName}</div></div><div class="line"><div class="label">License Number / LIN</div><div class="value">${license.lin}</div></div><div class="line"><div class="label">License Category</div><div class="value">${license.categoryLabel}</div></div><div class="line"><div class="label">Date Issued / Expiry</div><div class="value">${license.dateIssued} to ${license.expiryDate}</div></div><div class="body"><p>The above-named participant is hereby licensed and authorized by the UAE Athletic Commission to participate in sanctioned professional boxing activities under the rules and regulations of the UAE Athletic Commission.</p><p>This license remains the property of the UAE Athletic Commission and must be presented upon request at all sanctioned events, weigh-ins, medical examinations, and official meetings.</p><p>The holder agrees to comply with all rules, medical requirements, disciplinary procedures, and safety regulations established by the UAE Athletic Commission.</p><p><strong>Issued by the authority of the UAE Athletic Commission</strong></p></div><div class="sig"><div>Issued By: ${license.issuedBy}<br/>${license.issuedByTitle}<br/>Date: ${license.dateIssued}</div><div>Stamp Status: ${license.stampStatus}<br/>${stampMarkup}</div></div></div></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  updateGeneratedLicense({ ...license, printStatus: "Printed" });
}

export default function GeneratedLicensesPage() {
  const { generatedLicenses, stampSettings, updateGeneratedLicense } = useFinanceData();

  return (
    <>
      <PageHeader title="Generated Licenses" description="Printable UAEAC professional boxing participant license drafts and issued licenses." />
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["License", "Application", "LIN", "Applicant", "Category", "Issued", "Expiry", "Stamp", "Print Status", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
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
                  <td className="px-4 py-4"><StatusBadge value={license.stampStatus} /></td>
                  <td className="px-4 py-4"><StatusBadge value={license.printStatus} /></td>
                  <td className="px-4 py-4"><button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => printLicense(license, updateGeneratedLicense, stampSettings.stampImageFileName)}><Printer className="h-4 w-4" />Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
