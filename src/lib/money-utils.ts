export function parseMoneyInput(input: string): number {
  const cleaned = input.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") return 0;

  const hasDot = cleaned.includes(".");
  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const lastComma = cleaned.lastIndexOf(",");
  const digitsAfterLastComma = lastComma >= 0 ? cleaned.length - lastComma - 1 : 0;

  if (hasDot) {
    const normalized = cleaned.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (commaCount === 1 && digitsAfterLastComma === 2) {
    const parsed = Number(cleaned.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(amount: number, currency = "AED") {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export const moneyParsingExamples = {
  plain: parseMoneyInput("10586") === 10586,
  thousands: parseMoneyInput("10,586") === 10586,
  thousandsWithDecimals: parseMoneyInput("10,586.00") === 10586,
  decimalDot: parseMoneyInput("10.59") === 10.59,
  decimalComma: parseMoneyInput("10,50") === 10.5,
  millions: parseMoneyInput("1,234,567.89") === 1234567.89
};
