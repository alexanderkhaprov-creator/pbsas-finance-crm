import type { Expense, Reimbursement } from "@/types";

export function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function sumReimbursements(reimbursements: Reimbursement[]) {
  return reimbursements.reduce((sum, reimbursement) => sum + reimbursement.amount, 0);
}

export function sumReimbursed(reimbursements: Reimbursement[]) {
  return reimbursements.reduce((sum, reimbursement) => sum + (reimbursement.amountReimbursed ?? 0), 0);
}

export function sumOutstanding(reimbursements: Reimbursement[]) {
  return reimbursements.reduce((sum, reimbursement) => sum + (reimbursement.outstandingBalance ?? Math.max(0, reimbursement.amount - (reimbursement.amountReimbursed ?? 0))), 0);
}

export function totalExpensesByField<T extends keyof Expense>(expenses: Expense[], field: T) {
  return expenses.reduce<Record<string, number>>((totals, expense) => {
    const key = String(expense[field]);
    totals[key] = (totals[key] ?? 0) + expense.amount;
    return totals;
  }, {});
}

export function getDashboardMetrics(expenses: Expense[], reimbursements: Reimbursement[]) {
  return {
    totalExpenses: sumExpenses(expenses),
    totalApprovedExpenses: sumExpenses(expenses.filter((expense) => expense.approvalStatus === "Approved")),
    totalPendingExpenses: sumExpenses(expenses.filter((expense) => expense.approvalStatus === "Pending Review")),
    totalReimbursableAmount: sumExpenses(expenses.filter((expense) => expense.reimbursable)),
    totalPendingReimbursement: sumOutstanding(reimbursements.filter((reimbursement) => reimbursement.status === "Pending Review" || reimbursement.status === "Approved for Reimbursement" || reimbursement.status === "Partially Reimbursed")),
    totalReimbursedAmount: sumReimbursed(reimbursements)
  };
}

export function generateNextExpenseId(expenses: Expense[]) {
  const nextNumber =
    Math.max(
      0,
      ...expenses.map((expense) => {
        const match = expense.id.match(/^EXP-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
    ) + 1;

  return `EXP-${String(nextNumber).padStart(6, "0")}`;
}

export function reimbursementIdForExpense(expenseId: string) {
  return `RMB-${expenseId.replace("EXP-", "")}`;
}
