import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { FinanceDataProvider } from "@/components/finance-data-provider";

export const metadata: Metadata = {
  title: "PBSAS Finance Operations Database",
  description: "Internal finance operations CRM for PBSAS, UAE Athletic Commission, and WBCEurasia."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <FinanceDataProvider>
          <AppShell>{children}</AppShell>
        </FinanceDataProvider>
      </body>
    </html>
  );
}
