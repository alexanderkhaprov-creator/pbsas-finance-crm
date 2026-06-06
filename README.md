# PBSAS Finance Operations Database

Internal mock/local finance operations CRM for Pro Boxing Sports Agency and Services LLC, UAE Athletic Commission, and WBCEurasia operations.

Built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Local mock state for this version
- Modular structure for a future backend integration

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3001`.

## Available Pages

- Dashboard: KPIs, monthly overview, charts, pending reimbursements, and activity feed
- Quick Expense Entry: compact fast-entry panel on Dashboard and Expenses
- People: operational contacts and stakeholders
- Events: boxing, commission, workshop, meeting, and tournament activity tracking
- Cost Centers: budget ownership and operational cost center management
- Receipt Intake: register, validate, and convert receipts into expenses
- Expenses: daily accounting register with local receipt placeholders
- Batch Entry: fast multi-row expense entry from receipts
- Document Register: supporting document register for receipts, invoices, contracts, permits, payment proofs, certificates, and other records
- Reimbursements: reimbursement liability tracking by person, responsible owner, status, and outstanding balance
- Revenue: future revenue register with event and cost center linkage
- Reports: accounting summaries and mock export controls
- Audit Trail: read-only local activity log with search and filters
- Data Management: browser-local backup, import, reset, and clear tools

## Current Operational Logic

- Data persists in browser `localStorage` using versioned keys.
- Receipt intake records can be converted into finalized expenses.
- Expense IDs are generated in sequence using `EXP-000001` format.
- Receipt IDs are generated in sequence using `RCT-000001` format.
- Cost Center IDs are generated in sequence using `CC-000001` format.
- Receipts, expenses, reimbursements, and revenue can link to a cost center and operational link type.
- Expenses use standardized categories and currencies.
- Reimbursable expenses automatically create linked reimbursement records.
- Reimbursements track who paid, who is owed, who is responsible, amount owed, amount reimbursed, outstanding balance, due date, and liability status.
- Expenses and reimbursements include reconciliation status, reconciled by, reconciliation date, and reconciliation notes.
- Batch entry creates multiple sequential expenses and reimbursement liabilities for reimbursable rows.
- Audit logs use `AUD-000001` IDs and track create, update, delete, status change, conversion, import, export, and reset actions.
- Supporting documents use `DOC-000001` IDs and can link to expenses, receipts, reimbursements, revenue, events, cost centers, people, and future license/application records.
- Data Management includes JSON backups, CSV exports for expenses/reimbursements/receipts/documents, backup reminders, manual backup completion marking, and Demo vs Real Data Entry Mode.
- Duplicate detection marks possible expense and receipt duplicates without blocking entry.
- Monthly financial periods support Open, Under Review, and Closed statuses plus a closing checklist.
- Closed-period edits show confirmation warnings and are counted on the dashboard.
- Expenses, reimbursements, cost centers, and receipt intake records support timestamped internal note history.
- Treasury Summary on the Dashboard tracks outstanding reimbursements, approved liabilities, pending/reconciled expenses, currency totals, monthly totals, largest liability, and largest cost center spend.
- Non-reimbursable expenses are excluded from reimbursements.
- Local receipt placeholders can be attached and previewed for images.
- Dashboard, reports, and expense summary cards calculate from local mock state.

## Local Storage Warning

This version uses browser `localStorage` only. It is temporary convenience storage for mock/local operations, not production accounting storage. Data can be lost if the browser profile is cleared, a different browser/device is used, private browsing is enabled, or local storage is reset.

Versioned keys:

- `pbsas_people_v1`
- `pbsas_events_v1`
- `pbsas_cost_centers_v1`
- `pbsas_expenses_v1`
- `pbsas_reimbursements_v1`
- `pbsas_revenues_v1`
- `pbsas_receipts_v1`
- `pbsas_audit_logs_v1`
- `pbsas_documents_v1`
- `pbsas_app_settings_v1`
- `pbsas_financial_periods_v1`

Use the Data Management page to export a full JSON backup before clearing local data or testing large changes. Backup files include `people`, `events`, `costCenters`, `expenses`, `reimbursements`, `revenues`, `receipts`, `documents`, `auditLogs`, `appSettings`, `exportedAt`, and `appVersion`.

## Recommended Daily Workflow

1. Start in Data Management and confirm the latest backup timestamp is current.
2. Enter receipts, supporting documents, expenses, reimbursements, and revenue records.
3. Use Document Register to link invoices, permits, agreements, certificates, and payment proofs to their operational records.
4. Reconcile expenses and reimbursements before closing the day.
5. Export a full backup JSON and any needed CSV registers at the end of each work session.

Real Data Entry Mode is a local warning state only. It does not turn this browser-local app into production storage.

## Project Structure

```text
src/
  app/                 App Router pages and layout
  components/          Shared dashboard, table, modal, and shell components
  data/                Mock data used by this version
  lib/                 Formatting helpers, options, and calculations
  types/               TypeScript domain models
```

## Future Backend Notes

This version intentionally avoids Supabase or any external backend. The shared `FinanceDataProvider` is the local data boundary; replacing its mock operations with API calls later should not require redesigning the page components.

Production use requires Supabase or equivalent cloud database/storage, proper authentication, access control, durable file storage, and server-side backups. Browser `localStorage` is not suitable for production accounting records.
