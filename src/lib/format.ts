import { formatMoney } from "@/lib/money-utils";

export function formatCurrency(amount: number, currency = "AED") {
  return formatMoney(amount, currency);
}

export { formatMoney };

export function formatDate(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}
