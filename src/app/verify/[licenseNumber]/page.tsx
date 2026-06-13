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
  const { generatedLicenses, licenseApplications, addAuditLog } = useFinanceData();
  const license = useMemo(() => generatedLicenses.find((item) => item.id === licenseNumber), [generatedLicenses, licenseNumber]);
  const application = useMemo(() => licenseApplications.find((item) => item.id === license?.applicationId), [license?.applicationId, licenseApplications]);
  const status = license ? getLicenseOperationalStatus(license) : "NOT FOUND";
  const headline = license ? status === "Expired" ? "EXPIRED" : status === "Cancelled" ? "CANCELLED" : status === "Rejected" ? "REJECTED" : "VALID LICENSE" : "NOT FOUND";
  const photo = license?.applicantPhotoFileName || application?.applicantPhotoFileName;

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
          <>
            <div className="mt-6 flex flex-col gap-5 md:flex-row">
              <div className="flex h-44 w-36 shrink-0 items-center justify-center overflow-hidden rounded border border-black/10 bg-[#f7f7f5]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={license.applicantName} className="h-full w-full object-cover" src={photo} />
                ) : <span className="px-4 text-center text-sm text-steel">Applicant Photo</span>}
              </div>
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <Info label="Full Name" value={license.applicantName} />
                <Info label="License Number" value={license.id} />
                <Info label="Category" value={license.categoryLabel} />
                <Info label="Nationality" value={license.nationality || application?.nationality || "Not recorded"} />
                <Info label="Date of Birth" value={formatDate(license.dateOfBirth || application?.dateOfBirth || "")} />
                <Info label="Issue Date" value={formatDate(license.issuedDate || license.dateIssued)} />
                <Info label="Expiry Date" value={formatDate(license.expiryDate)} />
                <Info label="Status" value={status} />
              </div>
            </div>
            <p className={`mt-6 rounded border p-4 text-sm font-semibold ${status === "Expired" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {status === "Expired" ? "This license has expired and is not valid for participation." : "This license is valid for UAEAC-sanctioned professional boxing activities."}
            </p>
          </>
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
