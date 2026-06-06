"use client";

import { Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LicenseReceipt } from "@/types";

function printReceipt(receipt: LicenseReceipt, markDownloaded: (receipt: LicenseReceipt) => void) {
  const html = `<!doctype html><html><head><title>${receipt.id}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:40px}.head{text-align:center;border-bottom:3px solid #111;padding-bottom:18px}.box{border:1px solid #222;padding:18px;margin-top:22px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:8px 0}.label{font-weight:700;color:#555}.sig{margin-top:55px;display:flex;justify-content:space-between}</style></head><body><div class="head"><h1>UAE Athletic Commission</h1><h2>Official Payment Receipt</h2><p>Professional Boxing Licensing Division</p></div><div class="box">${[
    ["Receipt Number", receipt.id],
    ["Receipt Date", receipt.receiptDate],
    ["Applicant Name", receipt.applicantName],
    ["Application ID", receipt.applicationId],
    ["LIN", receipt.lin],
    ["Invoice Number", receipt.invoiceNumber],
    ["License Category", receipt.categoryLabel],
    ["Amount Received", `${receipt.currency} ${receipt.amountReceived}`],
    ["Payment Method", receipt.paymentMethod],
    ["Payment Reference", receipt.paymentReference],
    ["Paid To", receipt.paidTo],
    ["Received By", receipt.receivedBy],
    ["Received For", receipt.receivedFor],
    ["Notes", receipt.notes]
  ].map(([label, value]) => `<div class="row"><span class="label">${label}</span><span>${value || ""}</span></div>`).join("")}</div><div class="sig"><div>Received By: ____________________</div><div>Commission Stamp: ____________________</div></div></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  markDownloaded(receipt);
}

export default function LicenseReceiptsPage() {
  const { licenseReceipts, markLicenseReceiptDownloaded } = useFinanceData();

  return (
    <>
      <PageHeader title="License Receipts" description="Generated UAEAC professional boxing license payment receipts." />
      <section className="rounded border border-black/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead className="bg-[#f1f1ee] text-xs uppercase tracking-[0.12em] text-steel">
              <tr>{["Receipt", "Date", "Applicant", "Application", "LIN", "Invoice", "Category", "Amount", "Method", "Paid To", "Status", "Actions"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {licenseReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-4 py-4 font-semibold text-ink">{receipt.id}</td>
                  <td className="px-4 py-4 text-steel">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-4 py-4 text-steel">{receipt.applicantName}</td>
                  <td className="px-4 py-4 text-steel">{receipt.applicationId}</td>
                  <td className="px-4 py-4 text-steel">{receipt.lin}</td>
                  <td className="px-4 py-4 text-steel">{receipt.invoiceNumber || "Not generated"}</td>
                  <td className="px-4 py-4 text-steel">{receipt.categoryLabel}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(receipt.amountReceived, receipt.currency)}</td>
                  <td className="px-4 py-4 text-steel">{receipt.paymentMethod}</td>
                  <td className="px-4 py-4 text-steel">{receipt.paidTo}</td>
                  <td className="px-4 py-4"><StatusBadge value={receipt.status} /></td>
                  <td className="px-4 py-4"><button className="inline-flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-steel hover:border-gold hover:text-ink" onClick={() => printReceipt(receipt, markLicenseReceiptDownloaded)}><Printer className="h-4 w-4" />Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
