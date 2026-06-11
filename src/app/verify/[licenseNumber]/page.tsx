"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { useFinanceData } from "@/components/finance-data-provider";
import { formatDate } from "@/lib/format";
import { getLicenseOperationalStatus } from "@/lib/license-utils";

export default function VerifyLicensePage() {
  const params = useParams<{ licenseNumber: string }>();
  const licenseNumber = decodeURIComponent(params.licenseNumber ?? "");
  const { generatedLicenses, addAuditLog } = useFinanceData();
  const license = useMemo(() => generatedLicenses.find((item) => item.id === licenseNumber), [generatedLicenses, licenseNumber]);
  const status = license ? getLicenseOperationalStatus(license) : "NOT FOUND";
  const headline = license ? status === "Expired" ? "EXPIRED" : status === "Cancelled" ? "CANCELLED" : status === "Rejected" ? "REJECTED" : "VALID LICENSE" : "NOT FOUND";

  useEffect(() => {
    addAuditLog({
      module: "License Applications",
      recordId: license?.applicationId ?? licenseNumber,
      recordLabel: license?.applicantName ?? licenseNumber,
      action: "License Verification Viewed",
      changedBy: "Public Verification",
      previousValueSummary: "",
      newValueSummary: headline,
      notes: `Verification viewed for ${licenseNumber}.`
    });
  }, [addAuditLog, headline, license?.applicantName, license?.applicationId, licenseNumber]);

  return (
    <main className="mx-auto max-w-3xl rounded border border-black/10 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-4 border-b border-black/10 pb-4">
        <Image src="/UAEAC logo v2.png" alt="UAE Athletic Commission" width={96} height={64} className="h-16 w-24 object-contain" />
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-gold">UAE Athletic Commission</p>
          <h1 className="text-2xl font-semibold text-ink">License Verification</h1>
        </div>
      </div>
      <section className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold text-ink">{headline}</h2>
          <StatusBadge value={license ? status : "Rejected"} />
        </div>
        {license ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info label="Holder name" value={license.applicantName} />
            <Info label="License category" value={license.categoryLabel} />
            <Info label="License number" value={license.id} />
            <Info label="Issue date" value={formatDate(license.issuedDate || license.dateIssued)} />
            <Info label="Expiry date" value={formatDate(license.expiryDate)} />
            <Info label="Status" value={status} />
          </div>
        ) : (
          <p className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            License record not available in this browser. Production verification requires shared database deployment.
          </p>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-black/10 bg-[#f7f7f5] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}
