const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const NEAR_EXPIRY_DAYS = 30;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getContractExpiryDateBounds(referenceDate = new Date()) {
  const today = startOfDay(referenceDate);
  const nearExpiryEnd = new Date(today);
  nearExpiryEnd.setDate(nearExpiryEnd.getDate() + NEAR_EXPIRY_DAYS);

  return {
    today: formatDateOnly(today),
    nearExpiryEnd: formatDateOnly(nearExpiryEnd),
  };
}

export function buildExpiryStatusWhere(status, Op, referenceDate = new Date()) {
  if (!status) {
    return {};
  }

  const { today, nearExpiryEnd } = getContractExpiryDateBounds(referenceDate);

  if (status === "EXPIRED") {
    return { endDate: { [Op.lt]: today } };
  }

  if (status === "NEAR_EXPIRY") {
    return { endDate: { [Op.gte]: today, [Op.lte]: nearExpiryEnd } };
  }

  if (status === "ACTIVE") {
    return { endDate: { [Op.gt]: nearExpiryEnd } };
  }

  return {};
}

export function deriveContractStatus(endDate, referenceDate = new Date()) {
  const today = startOfDay(referenceDate);
  const end = startOfDay(endDate);

  if (end < today) {
    return "EXPIRED";
  }

  const daysUntilEnd = Math.floor((end - today) / MS_PER_DAY);
  if (daysUntilEnd <= NEAR_EXPIRY_DAYS) {
    return "NEAR_EXPIRY";
  }

  return "ACTIVE";
}
