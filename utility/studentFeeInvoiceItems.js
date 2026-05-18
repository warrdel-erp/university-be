import { decimalSubtract, toMoneyNumber } from "./decimalMoney.js";

export function netInvoiceItemAmount(amount, waiver) {
  const lineAmount = toMoneyNumber(amount);
  if (waiver === undefined || waiver === null) return lineAmount;
  return decimalSubtract(lineAmount, toMoneyNumber(waiver));
}

export function getMainInvoiceItem(items) {
  return (items ?? []).find((line) => line.isMainItem);
}

export function getMainInvoiceItemNetAmount(items) {
  const main = getMainInvoiceItem(items);
  if (!main) return 0;
  return netInvoiceItemAmount(main.amount, main.waiver);
}

export function getSupplementalInvoiceItems(items) {
  return (items ?? []).filter((line) => !line.isMainItem);
}
