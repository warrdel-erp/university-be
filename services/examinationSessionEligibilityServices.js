import {
  decimalAdd,
  decimalSubtract,
  decimalMax,
} from "../utility/decimalMoney.js";
import {
  ATTENDANCE_PRESENT_STATUSES,
  DOCUMENT_STATUS,
  ELIGIBILITY_REVIEW_REASON_CODE,
  ELIGIBILITY_STATUS_LABEL,
} from "../constant.js";
import { resolveHallTicketStatus } from "../utility/hallTicketEligibility.js";

export function checkDocuments(st, reviewReasons) {
  if (st.documentStatus === DOCUMENT_STATUS.PENDING) {
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.DOCUMENT_NOT_SUBMITTED,
      title: "Required document missing",
      severity: "warning",
      message: "Required registration document has not been submitted.",
    });
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.DOCUMENT_VERIFICATION_PENDING,
      title: "Document verification pending",
      severity: "warning",
      message: "Registration document verification is pending.",
    });
  }

  if (!st.studentPhoto) {
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.MISSING_PHOTOGRAPH,
      title: "Missing photograph",
      severity: "warning",
      message: "Student photograph is missing.",
    });
  }
}

export function checkRegistration(st, reviewReasons) {
  const REQUIRED_FIELDS = [
    // Identity
    { field: "firstName",      label: "First name" },
    { field: "lastName",       label: "Last name" },
    { field: "fatherName",     label: "Father's name" },
    { field: "birthDate",      label: "Date of birth" },
    // Contact
    { field: "phoneNumber",    label: "Phone number" },
    { field: "email",          label: "Email address" },
    // Academic
    { field: "scholarNumber",  label: "Scholar number" },
    { field: "enrollNumber",   label: "Enrollment number" },
    { field: "admisssionDate", label: "Admission date" }, // model field has triple-s typo
    // Address
    { field: "pAddress",       label: "Permanent address" },
    { field: "pCity",          label: "City" },
    { field: "pState",         label: "State" },
    { field: "pCountry",       label: "Country" },
    { field: "pPincode",       label: "Pincode" },
  ];

  const missingFields = [];
  for (const item of REQUIRED_FIELDS) {
    const val = st[item.field];
    if (val === null || val === undefined || String(val).trim() === "") {
      missingFields.push(item.label);
    }
  }

  if (missingFields.length > 0) {
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.REGISTRATION_PENDING,
      title: "Incomplete registration",
      severity: "warning",
      message: `Student registration is incomplete. Missing: ${missingFields.join(", ")}.`,
    });
  }
}

export function checkInvoices(st, reviewReasons) {
  const invoices = st.studentFeeInvoices || [];
  const totalInvoices = invoices.length;
  const unpaidInvoicesList = [];
  for (const inv of invoices) {
    if (inv.paymentStatus === "unpaid" || inv.paymentStatus === "partial") {
      unpaidInvoicesList.push(inv);
    }
  }
  const unpaidInvoices = unpaidInvoicesList.length;
  const paidInvoices = totalInvoices - unpaidInvoices;
  let outstandingAmount = 0;
  for (const inv of unpaidInvoicesList) {
    const remaining = decimalSubtract(
      Number(inv.total) || 0,
      Number(inv.paidAmount) || 0,
    );
    const positiveRemaining = decimalMax(0, remaining);
    outstandingAmount = decimalAdd(outstandingAmount, positiveRemaining);
  }
  const hasOutstandingInvoice = unpaidInvoices > 0 && outstandingAmount > 0;

  const invoiceKPIs = {
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    outstandingAmount,
    hasOutstandingInvoice,
  };

  if (hasOutstandingInvoice) {
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.UNPAID_INVOICE,
      title: "Outstanding fee payment",
      severity: "warning",
      message: `Student has ${unpaidInvoices} unpaid invoices with an outstanding amount of ₹${outstandingAmount.toLocaleString("en-IN")}.`,
    });
  }

  return invoiceKPIs;
}

export function checkAttendance(attendanceKPIs, reviewReasons) {
  const { totalClasses, minimumAttendanceRequired, attendancePercentage } =
    attendanceKPIs;
  if (totalClasses === 0) {
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.ATTENDANCE_DATA_INCOMPLETE,
      title: "Attendance data incomplete",
      severity: "warning",
      message: "Attendance data is incomplete for the current term.",
    });
  } else if (
    minimumAttendanceRequired !== null &&
    attendancePercentage < minimumAttendanceRequired
  ) {
    reviewReasons.push({
      code: ELIGIBILITY_REVIEW_REASON_CODE.LOW_ATTENDANCE,
      title: "Attendance below minimum",
      severity: "error",
      message: `Attendance is ${attendancePercentage}%, below the required minimum of ${minimumAttendanceRequired}%.`,
    });
  }
}

export function calculateStudentEligibility(rawRecord) {
  const {
    student: st,
    classSectionTerm: cst,
    examinationSessionTerm: est,
    mapperSessionId,
  } = rawRecord;

  const presentStatuses = ATTENDANCE_PRESENT_STATUSES;

  const course = st.course;
  const session = st.studentSession;

  const attendances = [];
  for (const a of st.attendances || []) {
    if (a.classSectionTermId === cst.classSectionTermId) {
      attendances.push(a);
    }
  }

  const totalClasses = attendances.length;

  let presentClasses = 0;
  for (const a of attendances) {
    if (presentStatuses.includes(a.attendanceStatus)) {
      presentClasses++;
    }
  }

  const absentClasses = totalClasses - presentClasses;

  const attendancePercentage =
    totalClasses > 0
      ? Number(((presentClasses / totalClasses) * 100).toFixed(2))
      : 0;

  const activeRegulation =
    (st.assessmentPlans || []).find((plan) => plan.academicRegulation)
      ?.academicRegulation ?? null;

  const minimumAttendanceRequired =
    activeRegulation?.minimumAttendance != null
      ? Number(activeRegulation.minimumAttendance)
      : null;

  const attendanceShortagePercentage =
    minimumAttendanceRequired != null
      ? Math.max(
          0,
          Number((minimumAttendanceRequired - attendancePercentage).toFixed(2)),
        )
      : 0;

  const requiredPresentClasses =
    minimumAttendanceRequired != null
      ? Math.ceil((totalClasses * minimumAttendanceRequired) / 100)
      : 0;

  const additionalClassesNeeded =
    minimumAttendanceRequired != null
      ? Math.max(0, requiredPresentClasses - presentClasses)
      : 0;

  const attendanceKPIs = {
    totalClasses,
    presentClasses,
    absentClasses,
    attendancePercentage,
    minimumAttendanceRequired,
    attendanceShortagePercentage,
    requiredPresentClasses,
    additionalClassesNeeded,
  };

  // --------------------------------
  // Eligibility status
  // --------------------------------

  const reviewReasons = [];

  // Break down into checks
  checkRegistration(st, reviewReasons);
  checkDocuments(st, reviewReasons);
  const invoiceKPIs = checkInvoices(st, reviewReasons);
  checkAttendance(attendanceKPIs, reviewReasons);

  // Priority resolution
  let eligibilityStatus = ELIGIBILITY_STATUS_LABEL.READY;
  let reasonText = null;

  let errorReason = null;
  let warningReason = null;
  for (const r of reviewReasons) {
    if (!errorReason && r.severity === "error") errorReason = r;
    if (!warningReason && r.severity === "warning") warningReason = r;
  }

  if (errorReason) {
    eligibilityStatus = ELIGIBILITY_STATUS_LABEL.BLOCKED;
    reasonText = errorReason.message;
  } else if (warningReason) {
    eligibilityStatus = ELIGIBILITY_STATUS_LABEL.REVIEW;
    reasonText = warningReason.message;
  }

  // --------------------------------
  // Hall Ticket lifecycle
  // --------------------------------

  const hallTicket = (st.hallTickets || [])[0] ?? null;

  const isGenerated = !!hallTicket;
  const isPublished = hallTicket?.isPublished ?? false;
  const isBlocked = hallTicket?.isBlocked ?? false;

  const hallTicketStatus = resolveHallTicketStatus(hallTicket, isBlocked);

  const academicContext = {
    courseId: st.courseId ?? course?.courseId ?? null,

    courseName: course?.courseName ?? null,

    sessionId: mapperSessionId ?? st.sessionId ?? session?.sessionId ?? null,

    sessionName: session?.sessionName ?? null,

    term: cst.term,

    examinationSessionTermId: est?.examinationSessionTermId ?? null,

    classSectionTermId: cst.classSectionTermId,
  };

  const regulationInfo = activeRegulation
    ? {
        academicRegulationId: activeRegulation.academicRegulationId,

        regulationCode:
          activeRegulation.regulationCode ||
          `REG-${activeRegulation.academicRegulationId}`,

        minimumAttendance: minimumAttendanceRequired,
      }
    : null;

  return {
    eligibilityStatus,
    reasonText,

    hallTicketStatus,

    isGenerated,
    isPublished,
    isBlocked,
    markAsEligible: hallTicket?.markAsEligible ?? false,

    hallTicketId: hallTicket?.id ?? null,

    student: {
      studentId: st.studentId,

      enrollmentNumber: st.enrollNumber ?? null,

      studentName: [st.firstName, st.middleName, st.lastName]
        .filter(Boolean)
        .join(" "),

      courseId: academicContext.courseId,

      courseName: academicContext.courseName,

      sessionId: academicContext.sessionId,

      sessionName: academicContext.sessionName,

      term: academicContext.term,
    },

    academicContext,

    attendance: attendanceKPIs,

    regulation: regulationInfo,

    invoice: invoiceKPIs,

    reviewReasons,
  };
}
