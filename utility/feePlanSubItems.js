import { decimalAdd, toMoneyNumber } from "./decimalMoney.js";

export function isMainFeePlanSubItem(line) {
  return line?.isMainSubItem === true || line?.isMainSubItem === 1;
}

export function splitFeePlanSubItemAmounts(subItems) {
  let amount = 0;
  let supplementalFees = 0;

  for (const line of subItems ?? []) {
    const lineAmount = toMoneyNumber(line.amount);
    if (isMainFeePlanSubItem(line)) {
      amount = decimalAdd(amount, lineAmount);
    } else {
      supplementalFees = decimalAdd(supplementalFees, lineAmount);
    }
  }

  return {
    amount,
    supplementalFees,
    total: decimalAdd(amount, supplementalFees),
  };
}

export function mapFeePlanSubItemsForResponse(subItems) {
  return (subItems ?? []).map((line) => ({
    feePlanSubitemId: line.feePlanSubitemId,
    feeTypeId: line.feeTypeId,
    name: (line.feeTypeCatalog ?? {}).name ?? null,
    amount: toMoneyNumber(line.amount),
    isMainItem: isMainFeePlanSubItem(line),
  }));
}
