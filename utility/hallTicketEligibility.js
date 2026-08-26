import {
  ELIGIBILITY_STATUS,
  ELIGIBILITY_STATUS_LABEL,
  ELIGIBILITY_REVIEW_REASON_CODE,
  HALL_TICKET_STATUS,
  HALL_TICKET_REVIEW_FILTER,
  HALL_TICKET_REVIEW_REASON_LIKE_PATTERNS,
  ELIGIBILITY_STATUSES,
} from "../constant.js";

export function resolveEligibilityStatus(storedStatus, dynamicStatus) {
  if (storedStatus === ELIGIBILITY_STATUS.BLOCKED) return ELIGIBILITY_STATUS.BLOCKED;
  if (storedStatus === ELIGIBILITY_STATUS.APPROVED) return ELIGIBILITY_STATUS.APPROVED;
  return dynamicStatus;
}

export function mapEligibilityStatusToFrontend(status) {
  if (status === ELIGIBILITY_STATUS.READY) return ELIGIBILITY_STATUS_LABEL.READY;
  if (status === ELIGIBILITY_STATUS.BLOCKED) return ELIGIBILITY_STATUS_LABEL.BLOCKED;
  if (status === ELIGIBILITY_STATUS.APPROVED) return ELIGIBILITY_STATUS_LABEL.APPROVED;
  return ELIGIBILITY_STATUS_LABEL.REVIEW;
}

export function resolveHallTicketStatus(ticket, isBlocked) {
  if (isBlocked || ticket?.isBlocked) return HALL_TICKET_STATUS.BLOCKED;
  if (ticket?.isPublished) return HALL_TICKET_STATUS.PUBLISHED;
  if (ticket) return HALL_TICKET_STATUS.GENERATED;
  return HALL_TICKET_STATUS.NOT_GENERATED;
}

/**
 * Map stored / calculated review reasons to API review-filter flags.
 */
export function evaluateReviewConditions(reason = "", reviewReasons = null) {
  if (Array.isArray(reviewReasons) && reviewReasons.length > 0) {
    const codes = new Set();
    for (const item of reviewReasons) {
      codes.add(item.code);
    }
    return {
      [HALL_TICKET_REVIEW_FILTER.REGISTRATION_PENDING]: codes.has(
        ELIGIBILITY_REVIEW_REASON_CODE.REGISTRATION_PENDING,
      ),
      [HALL_TICKET_REVIEW_FILTER.PHOTOGRAPH_PENDING]: codes.has(
        ELIGIBILITY_REVIEW_REASON_CODE.MISSING_PHOTOGRAPH,
      ),
      [HALL_TICKET_REVIEW_FILTER.INVOICE_PENDING]: codes.has(
        ELIGIBILITY_REVIEW_REASON_CODE.UNPAID_INVOICE,
      ),
      FEE_PENDING: codes.has(ELIGIBILITY_REVIEW_REASON_CODE.UNPAID_INVOICE),
      [HALL_TICKET_REVIEW_FILTER.ATTENDANCE_PENDING]:
        codes.has(ELIGIBILITY_REVIEW_REASON_CODE.LOW_ATTENDANCE) ||
        codes.has(ELIGIBILITY_REVIEW_REASON_CODE.ATTENDANCE_DATA_INCOMPLETE),
    };
  }

  const r = (reason || "").toLowerCase();
  const registrationPatterns =
    HALL_TICKET_REVIEW_REASON_LIKE_PATTERNS.REGISTRATION_PENDING;
  const photographPatterns =
    HALL_TICKET_REVIEW_REASON_LIKE_PATTERNS.PHOTOGRAPH_PENDING;
  const invoicePatterns = HALL_TICKET_REVIEW_REASON_LIKE_PATTERNS.INVOICE_PENDING;
  const attendancePatterns =
    HALL_TICKET_REVIEW_REASON_LIKE_PATTERNS.ATTENDANCE_PENDING;

  let registrationPending = false;
  for (const pattern of registrationPatterns) {
    if (r.includes(pattern)) {
      registrationPending = true;
      break;
    }
  }

  let photographPending = false;
  for (const pattern of photographPatterns) {
    if (r.includes(pattern)) {
      photographPending = true;
      break;
    }
  }

  let invoicePending = false;
  for (const pattern of invoicePatterns) {
    if (r.includes(pattern)) {
      invoicePending = true;
      break;
    }
  }

  let attendancePending = false;
  for (const pattern of attendancePatterns) {
    if (r.includes(pattern)) {
      attendancePending = true;
      break;
    }
  }

  return {
    [HALL_TICKET_REVIEW_FILTER.REGISTRATION_PENDING]: registrationPending,
    [HALL_TICKET_REVIEW_FILTER.PHOTOGRAPH_PENDING]: photographPending,
    [HALL_TICKET_REVIEW_FILTER.INVOICE_PENDING]: invoicePending,
    FEE_PENDING: invoicePending,
    [HALL_TICKET_REVIEW_FILTER.ATTENDANCE_PENDING]: attendancePending,
  };
}

export function normalizeEligibilityStatuses(statusFilter) {
  if (!statusFilter) return null;
  const values = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
  const valid = [];
  for (const s of values) {
    const upper = String(s).toUpperCase();
    if (ELIGIBILITY_STATUSES.includes(upper)) {
      valid.push(upper);
    }
  }
  return valid.length > 0 ? valid : null;
}

export function buildReviewReasonEligibilityClause(reviewReasonFilters, Op) {
  if (reviewReasonFilters === undefined || reviewReasonFilters === null) {
    return null;
  }

  if (!Array.isArray(reviewReasonFilters) || reviewReasonFilters.length === 0) {
    return {
      reviewReason: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }],
      },
    };
  }

  const orClauses = [];
  for (const code of reviewReasonFilters) {
    const patterns =
      HALL_TICKET_REVIEW_REASON_LIKE_PATTERNS[String(code).toUpperCase()];
    if (!patterns) continue;
    for (const pattern of patterns) {
      orClauses.push({ reviewReason: { [Op.like]: `%${pattern}%` } });
    }
  }
  if (!orClauses.length) return null;
  return { [Op.or]: orClauses };
}
