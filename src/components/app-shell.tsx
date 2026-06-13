"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, CalendarDays, CircleDollarSign, ClipboardList, CreditCard, Database, FileBarChart, FileText, HandCoins, History, IdCard, Inbox, LayoutDashboard, Menu, ReceiptText, ScanText, ScrollText, Search, Stamp, Tags, Users } from "lucide-react";
import { useFinanceData } from "@/components/finance-data-provider";
import { PageLoadingState } from "@/components/page-loading-state";
import { useHasMounted } from "@/hooks/useHasMounted";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/people", label: "People", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/cost-centers", label: "Cost Centers", icon: Tags },
  { href: "/receipt-intake", label: "Receipt Register", icon: Inbox },
  { href: "/expenses", label: "Expenses", icon: CircleDollarSign },
  { href: "/batch-entry", label: "Batch Entry", icon: ClipboardList },
  { href: "/application-intake", label: "Application Intake", icon: Inbox },
  { href: "/application-import", label: "Application Import", icon: ScanText },
  { href: "/bulk-intake", label: "Bulk Intake", icon: ClipboardList },
  { href: "/license-applications", label: "License Applications", icon: IdCard },
  { href: "/license-application-form", label: "License Application Form", icon: ScrollText },
  { href: "/license-fee-schedule", label: "License Fee Schedule", icon: CircleDollarSign },
  { href: "/license-document-requirements", label: "License Document Requirements", icon: FileText },
  { href: "/payment-settings", label: "Payment Settings", icon: CreditCard },
  { href: "/stamp-settings", label: "Stamp Settings", icon: Stamp },
  { href: "/license-receipts", label: "License Receipts", icon: ReceiptText },
  { href: "/generated-licenses", label: "Generated Licenses", icon: IdCard },
  { href: "/issued-licenses", label: "Issued Licenses", icon: IdCard },
  { href: "/document-register", label: "Document Register", icon: FileText },
  { href: "/reimbursements", label: "Reimbursements", icon: HandCoins },
  { href: "/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/audit-trail", label: "Audit Trail", icon: History },
  { href: "/data-management", label: "Data Management", icon: Database }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasMounted = useHasMounted();
  const { appSettings, isLoading } = useFinanceData();
  const isReady = hasMounted && !isLoading;

  return (
    <div className="min-h-screen bg-[#f5f5f3] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-r border-black/10 bg-ink text-white lg:min-h-screen">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-gold text-sm font-black text-ink">
            PB
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-champagne">PBSAS</p>
            <p className="text-sm text-white/70">Finance Operations</p>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:block lg:space-y-1 lg:overflow-visible">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                className={`flex min-w-max items-center gap-3 rounded px-3 py-3 text-sm font-medium transition ${
                  isActive ? "bg-gold text-ink" : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-black/10 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded border border-black/10 text-steel lg:hidden" title="Navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-ink sm:text-xl">PBSAS Finance Operations Database</h1>
                {isReady && appSettings.mode === "real" ? <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">REAL DATA MODE ACTIVE</span> : null}
              </div>
              <p className="text-sm text-steel">Internal operations CRM</p>
            </div>
          </div>
          <div className="hidden min-w-[260px] items-center gap-2 rounded border border-black/10 bg-[#f7f7f5] px-3 py-2 text-sm text-steel md:flex">
            <Search className="h-4 w-4" />
            <span>Search records from each module</span>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">{isReady ? children : <PageLoadingState />}</div>
      </main>
    </div>
  );
}
