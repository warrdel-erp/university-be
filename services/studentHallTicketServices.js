import crypto from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import { buildTermName } from "../utility/courseTerms.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
 import { getUserPermissions } from "../utility/authEngine.js";
 import { PERMISSIONS } from "../const/permissions.js";


export function calculateStudentEligibility(rawRecord) {
    const {
        student: st,
        classSectionTerm: cst,
        examinationSessionTerm: est,
        mapperSessionId,
    } = rawRecord;

    const presentStatuses = [
        "Present",
        "Medical Leave",
        "Duty Leave",
        "Sports Leave",
        "NCC Leave",
        "Approved Leave",
    ];

    const course = st.course;
    const session = st.studentSession;

    const attendances = (st.attendances || []).filter(
        (a) => a.classSectionTermId === cst.classSectionTermId
    );

    const totalClasses = attendances.length;

    const presentClasses = attendances.filter((a) =>
        presentStatuses.includes(a.attendanceStatus)
    ).length;

    const absentClasses = totalClasses - presentClasses;

    const attendancePercentage =
        totalClasses > 0
            ? Number(((presentClasses / totalClasses) * 100).toFixed(2))
            : 0;

    const activeRegulation =
        (st.assessmentPlans || []).find(
            (plan) => plan.academicRegulation
        )?.academicRegulation ?? null;

    const minimumAttendanceRequired =
        activeRegulation?.minimumAttendance != null
            ? Number(activeRegulation.minimumAttendance)
            : null;

    const attendanceShortagePercentage =
        minimumAttendanceRequired != null
            ? Math.max(
                  0,
                  Number(
                      (
                          minimumAttendanceRequired -
                          attendancePercentage
                      ).toFixed(2)
                  )
              )
            : 0;

    const requiredPresentClasses =
        minimumAttendanceRequired != null
            ? Math.ceil(
                  (totalClasses * minimumAttendanceRequired) / 100
              )
            : 0;

    const additionalClassesNeeded =
        minimumAttendanceRequired != null
            ? Math.max(
                  0,
                  requiredPresentClasses - presentClasses
              )
            : 0;

    // --------------------------------
    // Eligibility status
    // --------------------------------

    const reviewReasons = [];

    // 1. Document checking
    if (st.documentStatus === "Pending Documents") {
        reviewReasons.push({
            code: "DOCUMENT_NOT_SUBMITTED",
            title: "Required document missing",
            severity: "warning",
            message: "Required registration document has not been submitted."
        });
        reviewReasons.push({
            code: "DOCUMENT_VERIFICATION_PENDING",
            title: "Document verification pending",
            severity: "warning",
            message: "Registration document verification is pending."
        });
    }

    // 1b. Photograph checking
    if (!st.studentPhoto) {
        reviewReasons.push({
            code: "MISSING_PHOTOGRAPH",
            title: "Missing photograph",
            severity: "warning",
            message: "Student photograph is missing."
        });
    }

    // 2. Invoice checking
    const invoices = st.studentFeeInvoices || [];
    const totalInvoices = invoices.length;
    const unpaidInvoicesList = invoices.filter(inv => inv.paymentStatus === "unpaid" || inv.paymentStatus === "partial");
    const unpaidInvoices = unpaidInvoicesList.length;
    const paidInvoices = totalInvoices - unpaidInvoices;
    const outstandingAmount = unpaidInvoicesList.reduce((sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.paidAmount)), 0);
    const hasOutstandingInvoice = unpaidInvoices > 0 && outstandingAmount > 0;

    const invoiceKPIs = {
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        outstandingAmount,
        hasOutstandingInvoice
    };

    if (hasOutstandingInvoice) {
        reviewReasons.push({
            code: "UNPAID_INVOICE",
            title: "Outstanding fee payment",
            severity: "warning",
            message: `Student has ${unpaidInvoices} unpaid invoices with an outstanding amount of ₹${outstandingAmount.toLocaleString('en-IN')}.`
        });
    }

    // 3. Attendance checking
    if (totalClasses === 0) {
        reviewReasons.push({
            code: "ATTENDANCE_DATA_INCOMPLETE",
            title: "Attendance data incomplete",
            severity: "warning",
            message: "Attendance data is incomplete for the current term."
        });
    } else if (
        minimumAttendanceRequired !== null &&
        attendancePercentage < minimumAttendanceRequired
    ) {
        reviewReasons.push({
            code: "LOW_ATTENDANCE",
            title: "Attendance below minimum",
            severity: "error",
            message: `Attendance is ${attendancePercentage}%, below the required minimum of ${minimumAttendanceRequired}%.`
        });
    }

    // Priority resolution
    let eligibilityStatus = "Ready";
    let reasonText = null;

    const errorReason = reviewReasons.find(r => r.severity === "error");
    const warningReason = reviewReasons.find(r => r.severity === "warning");

    if (errorReason) {
        eligibilityStatus = "Blocked";
        reasonText = errorReason.message;
    } else if (warningReason) {
        eligibilityStatus = "Review";
        reasonText = warningReason.message;
    }

    // --------------------------------
    // Hall Ticket lifecycle
    // --------------------------------

    const hallTicket = (st.hallTickets || [])[0] ?? null;

    const isGenerated = !!hallTicket;
    const isPublished = hallTicket?.isPublished ?? false;
    const isBlocked = hallTicket?.isBlocked ?? false;

    let hallTicketStatus = "Not Generated";

    if (isBlocked) {
        hallTicketStatus = "Blocked";
    } else if (isPublished) {
        hallTicketStatus = "Published";
    } else if (isGenerated) {
        hallTicketStatus = "Generated";
    }

    // IMPORTANT:
    // Do not overwrite eligibilityStatus here.

    const academicContext = {
        courseId:
            st.courseId ??
            course?.courseId ??
            null,

        courseName:
            course?.courseName ??
            null,

        sessionId:
            mapperSessionId ??
            st.sessionId ??
            session?.sessionId ??
            null,

        sessionName:
            session?.sessionName ??
            null,

        term: cst.term,

        examinationSessionTermId:
            est.examinationSessionTermId,

        classSectionTermId:
            cst.classSectionTermId,
    };

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

    const regulationInfo = activeRegulation
        ? {
              academicRegulationId:
                  activeRegulation.academicRegulationId,

              regulationCode:
                  activeRegulation.regulationCode ||
                  `REG-${activeRegulation.academicRegulationId}`,

              minimumAttendance:
                  minimumAttendanceRequired,
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

        hallTicketId:
            hallTicket?.id ?? null,

        student: {
            studentId:
                st.studentId,

            enrollmentNumber:
                st.enrollNumber ?? null,

            studentName: [
                st.firstName,
                st.middleName,
                st.lastName,
            ]
                .filter(Boolean)
                .join(" "),

            courseId:
                academicContext.courseId,

            courseName:
                academicContext.courseName,

            sessionId:
                academicContext.sessionId,

            sessionName:
                academicContext.sessionName,

            term:
                academicContext.term,
        },

        academicContext,

        attendance:
            attendanceKPIs,

        regulation:
            regulationInfo,

        invoice:
            invoiceKPIs,

        reviewReasons,
    };
}

export async function getStudentsForExaminationSession(examinationSessionId, filters = {}) {
    const rawList = await studentHallTicketRepository.getStudentsByExaminationSessionId(Number(examinationSessionId), filters);

    let processed = rawList.map(raw => {
        const calculated = calculateStudentEligibility(raw);
        return {
            studentId: calculated.student.studentId,
            enrollmentNumber: calculated.student.enrollmentNumber,
            firstName: raw.student.firstName ?? null,
            middleName: raw.student.middleName ?? null,
            lastName: raw.student.lastName ?? null,
            courseId: calculated.student.courseId,
            courseName: calculated.student.courseName,
            sessionId: calculated.student.sessionId,
            sessionName: calculated.student.sessionName,
            term: calculated.student.term,
            examinationSessionTermId: calculated.academicContext.examinationSessionTermId,
            classSectionTermId: calculated.academicContext.classSectionTermId,
            totalClasses: calculated.attendance.totalClasses,
            presentClasses: calculated.attendance.presentClasses,
            attendancePercentage: calculated.attendance.attendancePercentage,
            minimumAttendance: calculated.regulation?.minimumAttendance ?? null,
            hallTicketId: calculated.hallTicketId,
            isGenerated: calculated.isGenerated,
            isPublished: calculated.isPublished,
            isBlocked: calculated.isBlocked,
            markAsEligible: calculated.markAsEligible,
            hallTicketStatus: calculated.hallTicketStatus,
            eligibilityStatus: calculated.eligibilityStatus,
            reasonText: calculated.reasonText,
            hasOutstandingInvoice: calculated.invoice.hasOutstandingInvoice,
            outstandingAmount: calculated.invoice.outstandingAmount,
            eligibilityReason: calculated.eligibilityStatus !== "Ready" ? calculated.reviewReasons[0]?.message : null,
        };
    });

    if (filters.status) {
        const targetStatus = String(filters.status).trim().toLowerCase();
        processed = processed.filter(p => p.eligibilityStatus.toLowerCase() === targetStatus || p.hallTicketStatus.toLowerCase() === targetStatus);
    }

    const isPaginated = filters?.page != null || filters?.limit != null;
    if (!isPaginated) {
        return processed;
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    const offset = (page - 1) * limit;

    const total = processed.length;
    const paginatedRows = processed.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
        rows: paginatedRows,
        total,
        page,
        limit,
        totalPages,
    };
}

export async function getHallTicketEligibilityOverview(examinationSessionId) {
    const rawList = await studentHallTicketRepository.getStudentsByExaminationSessionId(Number(examinationSessionId));
    let ready = 0;
    let blocked = 0;
    let review = 0;

    for (const raw of rawList) {
        const calculated = calculateStudentEligibility(raw);
        if (calculated.eligibilityStatus === "Ready") {
            ready++;
        } else if (calculated.eligibilityStatus === "Blocked") {
            blocked++;
        } else if (calculated.eligibilityStatus === "Review") {
            review++;
        }
    }

    return {
        totalStudents: rawList.length,
        ready,
        blocked,
        review,
    };
}

export async function getHallTicketSummary(examinationSessionId) {
    const rawList = await studentHallTicketRepository.getStudentsByExaminationSessionId(Number(examinationSessionId));
    let feeClearance = 0;
    let attendanceShortage = 0;
    let registrationPending = 0;
    let missingPhotograph = 0;
    let documentVerification = 0;

    for (const raw of rawList) {
        const calculated = calculateStudentEligibility(raw);
        const reasons = calculated.reviewReasons || [];

        if (reasons.some(r => r.code === "UNPAID_INVOICE")) {
            feeClearance++;
        }
        if (reasons.some(r => r.code === "LOW_ATTENDANCE")) {
            attendanceShortage++;
        }
        if (reasons.some(r => r.code === "DOCUMENT_NOT_SUBMITTED")) {
            registrationPending++;
        }
        if (reasons.some(r => r.code === "MISSING_PHOTOGRAPH")) {
            missingPhotograph++;
        }
        if (reasons.some(r => r.code === "DOCUMENT_VERIFICATION_PENDING")) {
            documentVerification++;
        }
    }

    return {
        feeClearance,
        attendanceShortage,
        registrationPending,
        missingPhotograph,
        documentVerification
    };
}

async function buildGenerationReadiness({ examinationSessionId, transaction }) {
    const examinationSession = await studentHallTicketRepository.findExaminationSessionById(examinationSessionId, transaction);
    if (!examinationSession) {
        const error = new Error("examinationSession not found");
        error.statusCode = 404;
        throw error;
    }

    const schedules = await studentHallTicketRepository.getSchedulesByExaminationSessionId(examinationSessionId, transaction);
    const canGenerate = schedules.some((s) => s.examDate && s.examTime);

    return {
        examinationSession,
        totalSchedules: schedules.length,
        canGenerate,
    };
}

export async function generateHallTickets({ examinationSessionId, studentIds, user }) {
    return await sequelize.transaction(async (transaction) => {
        const readiness = await buildGenerationReadiness({
            examinationSessionId,
            transaction,
        });

        if (!readiness.canGenerate) {
            const error = new Error(
                "Schedule at least one subject with exam date and time for this examination session before generating hall tickets.",
            );
            error.statusCode = 400;
            throw error;
        }

        const effectiveAcademicYearId = getAcademicYearId() || (user?.academicYearId ? Number(user.academicYearId) : readiness.examinationSession.academicYearId);

        const allStudents = await studentHallTicketRepository.getStudentsByExaminationSessionId(examinationSessionId, {}, transaction);

        let targetStudents = [];
        if (studentIds && studentIds.length > 0) {
            for (const sid of studentIds) {
                const rawRecord = allStudents.find(s => s.student.studentId === sid);
                if (!rawRecord) {
                    const error = new Error(`Student ${sid} is not part of this examination session`);
                    error.statusCode = 404;
                    throw error;
                }
                const calculated = calculateStudentEligibility(rawRecord);
                if (calculated.eligibilityStatus === "Blocked") {
                    const error = new Error(`Cannot generate hall ticket. Student ${sid} is blocked for Hall Ticket generation`);
                    error.statusCode = 400;
                    throw error;
                }
                if (calculated.eligibilityStatus === "Review" && calculated.markAsEligible !== true) {
                    const error = new Error(`Cannot generate hall ticket. Student ${sid} is under review and must be marked as eligible before Hall Ticket generation.`);
                    error.statusCode = 400;
                    throw error;
                }
                targetStudents.push(calculated);
            }
        } else {
            for (const raw of allStudents) {
                const calculated = calculateStudentEligibility(raw);
                if ((calculated.eligibilityStatus === "Ready" || (calculated.eligibilityStatus === "Review" && calculated.markAsEligible === true)) && !calculated.isGenerated) {
                    targetStudents.push(calculated);
                }
            }
        }

        if (!targetStudents.length) {
            return { generatedCount: 0, hallTickets: [] };
        }

        const generatedTickets = [];
        for (const target of targetStudents) {
            const ticket = await studentHallTicketRepository.generateOrRegenerateStudentHallTicket({
                examinationSessionId,
                academicYearId: effectiveAcademicYearId,
                studentId: target.student.studentId,
            }, transaction);
            generatedTickets.push(ticket);
        }

        return {
            generatedCount: generatedTickets.length,
            assessmentType: readiness.examinationSession.assessmentType,
            hallTickets: generatedTickets,
        };
    });
}

export async function getReviewDetails({
    studentId,
    examinationSessionId,
}) {
    const rawRecord =
        await studentHallTicketRepository.getSingleStudentByExamSession(
            Number(examinationSessionId),
            Number(studentId)
        );

    if (!rawRecord) {
        const error = new Error(
            "Student not found in this examination session"
        );
        error.statusCode = 404;
        throw error;
    }

    if (Number(rawRecord?.student?.studentId) !== Number(studentId)) {
        const error = new Error(
            "Fetched student does not match requested studentId"
        );
        error.statusCode = 500;
        throw error;
    }

    const calculated = calculateStudentEligibility(rawRecord);

    const eligibilityStatus = calculated.eligibilityStatus;
    const hallTicketStatus = calculated.hallTicketStatus;

    const overview = {
        eligibleNormally: eligibilityStatus === "Ready",

        requiresReview: eligibilityStatus === "Review",

        isBlocked: eligibilityStatus === "Blocked",

        canGenerateNormally:
            !calculated.isGenerated &&
            ["Ready", "Review"].includes(eligibilityStatus),

        canGenerateWithOverride:
            !calculated.isGenerated &&
            eligibilityStatus === "Review",
    };

    return {
        eligibilityStatus,
        hallTicketStatus,

        hallTicketId: calculated.hallTicketId,
        isGenerated: calculated.isGenerated,
        isPublished: calculated.isPublished,
        isBlocked: calculated.isBlocked,
        markAsEligible: calculated.markAsEligible,

        student: calculated.student,

        examination: {
            examinationSessionId: Number(examinationSessionId),
            sessionName:
                rawRecord.examinationSession?.sessionName ?? null,
            assessmentTypeId:
                rawRecord.examinationSession?.assessmentTypeId ?? null,
            examSetupTypeTermId:
                calculated.academicContext.examSetupTypeTermId ?? null,
            examinationSessionTermId:
                calculated.academicContext.examinationSessionTermId,
        },

        attendance: calculated.attendance,

        regulation: calculated.regulation,

        reviewReasons: calculated.reviewReasons,

        overview,
    };
}

function resolveScheduleTerm(plain) {
    if (plain.term != null) return Number(plain.term);
    if (plain.subjectSchedule?.term != null) return Number(plain.subjectSchedule.term);
    return null;
}

function schedulesToSubjectList(scheduleRows, mappedScheduleIds = [], roomSeatingMap = new Map()) {
    const mappedSet = new Set(mappedScheduleIds || []);

    return (scheduleRows || []).map((row) => {
        const plain = row.get ? row.get({ plain: true }) : row;
        const sub = plain.subjectSchedule;
        const slot = plain.examinationSessionSlot;
        const term = resolveScheduleTerm(plain);
        const isMapped = plain.examScheduleId != null && mappedSet.has(plain.examScheduleId);
        const seating = roomSeatingMap.get(plain.examScheduleId) || null;
        return {
            examScheduleId: plain.examScheduleId,
            isMapped,
            subjectId: sub?.subjectId ?? plain.subjectId ?? null,
            subjectName: sub?.subjectName ?? null,
            subjectCode: sub?.subjectCode ?? null,
            term,
            examDate: plain.examDate ?? null,
            examTime: plain.examTime ?? null,
            duration: plain.duration ?? null,
            scheduleKind: plain.type ?? null,
            slot: slot ?? null,
            subject: sub ?? null,
            seating,
        };
    });
}

function flattenHallTicketDetail(ticket, scheduleRows, mappedScheduleIds = [], roomSeatingMap = new Map()) {
    const st = ticket.student;
    const es = ticket.examinationSession;
    const assessmentType = es?.assessmentType;
    const academicYear = ticket.academicYear || es?.academicYear;
    const subjects = schedulesToSubjectList(scheduleRows, mappedScheduleIds, roomSeatingMap);

    return {
        id: ticket.id,
        qr: ticket.qr,
        examinationSessionId: ticket.examinationSessionId,
        academicYearId: ticket.academicYearId,
        studentId: ticket.studentId,
        instituteId: ticket.instituteId,
        universityId: ticket.universityId,
        isBlocked: ticket.isBlocked ?? false,
        isPublished: ticket.isPublished ?? false,
        publishedAt: ticket.publishedAt ?? null,
        blockedAt: ticket.blockedAt ?? null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        studentFirstName: st?.firstName ?? null,
        studentMiddleName: st?.middleName ?? null,
        studentLastName: st?.lastName ?? null,
        scholarNumber: st?.scholarNumber ?? null,
        enrollNumber: st?.enrollNumber ?? null,
        sessionName: es?.sessionName ?? null,
        academicYearTitle: academicYear?.yearTitle ?? null,
        assessmentTypeId: es?.assessmentTypeId ?? null,
        examType: assessmentType?.examCategory ?? null,
        examName: assessmentType?.examName ?? null,
        subjects,
    };
}

export async function getHallTicketById(id) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.getHallTicketById(id, transaction);
        if (!ticket) return null;

        const student = ticket.student;
        const term = student?.studentClassSectionTerm?.term;
        const courseId = student?.courseId;
        const sessionId = student?.sessionId;

        if (!student || term == null || courseId == null || sessionId == null) {
            return flattenHallTicketDetail(ticket, [], [], new Map());
        }

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
            ticket.examinationSessionId,
            { courseId, sessionId, term },
            transaction,
        );

        const examScheduleIds = schedules.map((s) => s.examScheduleId).filter((scheduleId) => scheduleId != null);
        const mappedScheduleIds = await studentHallTicketRepository.getMappedExamScheduleIds(
            ticket.studentId,
            examScheduleIds,
            transaction,
        );

        const roomSeatingMap = await studentHallTicketRepository.getStudentRoomSeatingDetails(
            ticket.studentId,
            examScheduleIds,
            transaction,
        );

        return flattenHallTicketDetail(ticket, schedules, mappedScheduleIds, roomSeatingMap);
    });
}

export async function getHallTicketByIdForUser(id) {
    return getHallTicketById(Number(id));
}

export async function getHallTicketDetailsByQr(qr) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.getHallTicketByQr(qr, transaction);
        if (!ticket) return null;

        const student = ticket.student;
        const term = student?.studentClassSectionTerm?.term;
        const courseId = student?.courseId;
        const sessionId = student?.sessionId;

        if (!student || term == null || courseId == null || sessionId == null) {
            return flattenHallTicketDetail(ticket, [], [], new Map());
        }

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
            ticket.examinationSessionId,
            { courseId, sessionId, term },
            transaction,
        );

        const examScheduleIds = schedules.map((s) => s.examScheduleId).filter((scheduleId) => scheduleId != null);
        const mappedScheduleIds = await studentHallTicketRepository.getMappedExamScheduleIds(
            ticket.studentId,
            examScheduleIds,
            transaction,
        );

        const roomSeatingMap = await studentHallTicketRepository.getStudentRoomSeatingDetails(
            ticket.studentId,
            examScheduleIds,
            transaction,
        );

        return flattenHallTicketDetail(ticket, schedules, mappedScheduleIds, roomSeatingMap);
    });
}

export async function getHallTicketByQrForUser(qr) {
    return getHallTicketDetailsByQr(qr);
}

export async function getAllHallTickets(filters, pagination = {}) {
    const page = pagination.page ?? 1;
    const rawLimit = pagination.limit ?? 1000;
    const limit = Math.min(1000, Math.max(10, rawLimit));
    const offset = (page - 1) * limit;

    return await sequelize.transaction(async (transaction) => {
        const [rows, total] = await Promise.all([
            studentHallTicketRepository.getAllHallTickets(filters, transaction, { limit, offset }),
            studentHallTicketRepository.countHallTickets(filters, transaction),
        ]);
        return { rows, total, page, limit };
    });
}

export async function getAllHallTicketsForUser(query = {}, user) {
    const filters = {};
    if (query.examinationSessionId) filters.examinationSessionId = query.examinationSessionId;
    const academicYearId = query.academicYearId || getAcademicYearId() || (user?.academicYearId ? Number(user.academicYearId) : undefined);
    if (academicYearId) filters.academicYearId = academicYearId;
    if (query.studentId) filters.studentId = query.studentId;

    return getAllHallTickets(filters, {
        page: query.page,
        limit: query.limit,
    });
}

export async function blockHallTicket(id) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.blockHallTicket(id, transaction);
        if (!ticket) {
            const error = new Error("Hall ticket not found");
            error.statusCode = 404;
            throw error;
        }
        return ticket;
    });
}

export async function publishHallTickets({ examinationSessionId, studentIds }) {
    return await sequelize.transaction(async (transaction) => {
        const allSessionStudents = await studentHallTicketRepository.getStudentsByExaminationSessionId(examinationSessionId, {}, transaction);
        const validStudentIds = new Set(allSessionStudents.map(s => s.student.studentId));

        let targets = null;
        if (studentIds && studentIds.length > 0) {
            for (const sid of studentIds) {
                if (!validStudentIds.has(sid)) {
                    const error = new Error(`Student ${sid} is not associated with examination session ${examinationSessionId}`);
                    error.statusCode = 400;
                    throw error;
                }
            }
            targets = studentIds;
        }

        const generatedCount = await studentHallTicketRepository.countHallTickets({
            examinationSessionId,
            ...(targets && { studentId: targets }),
        }, transaction);

        if (generatedCount === 0) {
            const error = new Error(
                targets && targets.length > 0
                    ? "No generated hall tickets found for the specified student(s). Please generate them first."
                    : "No generated hall tickets found for this examination session. Please generate them first."
            );
            error.statusCode = 400;
            throw error;
        }

        const publishedCount = await studentHallTicketRepository.publishHallTickets(examinationSessionId, targets, transaction);
        return { examinationSessionId, publishedCount };
    });
}

export async function getStudentEligibilityDetails(examinationSessionId, studentId) {
    const rawRecord = await studentHallTicketRepository.getSingleStudentByExamSession(examinationSessionId, studentId);
    if (!rawRecord) {
        const error = new Error("Student not found in this examination session");
        error.statusCode = 404;
        throw error;
    }
    const calculated = calculateStudentEligibility(rawRecord);
    return {
        ...calculated.student,
        ...calculated.attendance,
        eligibilityStatus: calculated.eligibilityStatus,
        eligibilityReason: calculated.eligibilityStatus !== "Ready" ? calculated.reviewReasons[0]?.message : null,
        isGenerated: calculated.isGenerated,
        isPublished: calculated.isPublished,
        isBlocked: calculated.isBlocked,
        markAsEligible: calculated.markAsEligible,
        hallTicketStatus: calculated.hallTicketStatus,
        hallTicketId: calculated.hallTicketId,
    };
}

export async function markAsEligible({ examinationSessionId, studentId, markAsEligible, user }) {
    return await sequelize.transaction(async (transaction) => {
        // Fetch student details to get academicYearId and current eligibilityStatus
        const rawRecord = await studentHallTicketRepository.getSingleStudentByExamSession(
            Number(examinationSessionId),
            Number(studentId),
            transaction
        );
        if (!rawRecord) {
            const error = new Error("Student not found in this examination session");
            error.statusCode = 404;
            throw error;
        }

        const calculated = calculateStudentEligibility(rawRecord);
        
        const effectiveAcademicYearId = getAcademicYearId() || (user?.academicYearId ? Number(user.academicYearId) : rawRecord.examinationSession?.academicYearId || 1);

        const ticket = await studentHallTicketRepository.generateOrRegenerateStudentHallTicket({
            examinationSessionId,
            academicYearId: effectiveAcademicYearId,
            studentId,
            markAsEligible,
            markedBy: markAsEligible ? (user?.id || user?.userId) : null,
            previousEligibilityStatus: calculated.eligibilityStatus,
        }, transaction);

        return {
            studentId,
            examinationSessionId,
            markAsEligible: ticket.markAsEligible,
            markedBy: ticket.markedBy,
            markedAt: ticket.markedAt,
            previousEligibilityStatus: ticket.previousEligibilityStatus,
        };
    });
}
