import crypto from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import * as examScheduleServices from "./examScheduleServices.js";

async function buildGenerationReadiness({
    examSetupTypeTermId,
    sessionId,
    instituteId,
    universityId,
    transaction
}) {
    const examSetupTypeTerm = await studentHallTicketRepository.findExamSetupTypeTermById(examSetupTypeTermId, transaction);
    if (!examSetupTypeTerm) {
        const error = new Error("examSetupTypeTerm not found");
        error.statusCode = 404;
        throw error;
    }

    if (Number(examSetupTypeTerm.instituteId) !== Number(instituteId) || Number(examSetupTypeTerm.universityId) !== Number(universityId)) {
        const error = new Error("examSetupTypeTerm does not belong to current institute/university");
        error.statusCode = 400;
        throw error;
    }

    const schedules = await studentHallTicketRepository.getSchedulesByExamSetupTypeTermAndSession(examSetupTypeTermId, sessionId, transaction);
    const totalSchedules = schedules.length;
    const missingDateTimeCount = schedules.filter((s) => !s.examDate || !s.examTime).length;
    const isPublished = Boolean(examSetupTypeTerm.examSetupType?.isPublish);
    const hasSchedules = totalSchedules > 0;
    const hasCompleteScheduleDateTime = hasSchedules && missingDateTimeCount === 0;

    // Hall tickets may be generated once every exam_schedule row for this exam type + session has examDate & examTime.
    // Room assignment (assignRoom / roomAssignment) is separate and does not gate generation.
    const canGenerate = hasCompleteScheduleDateTime;

    return {
        examSetupTypeTerm,
        isPublished,
        totalSchedules,
        missingDateTimeCount,
        hasSchedules,
        hasCompleteScheduleDateTime,
        canGenerate
    };
}

export async function generateHallTicketsByExamSession({
    examSetupTypeTermId,
    sessionId,
    instituteId,
    universityId
}) {
    return sequelize.transaction(async (transaction) => {
        const readiness = await buildGenerationReadiness({
            examSetupTypeTermId,
            sessionId,
            instituteId,
            universityId,
            transaction
        });

        if (!readiness.canGenerate) {
            const errors = [];
            if (!readiness.hasSchedules) {
                errors.push("No exam schedule exists for this exam setup term and session.");
            }
            if (readiness.hasSchedules && !readiness.hasCompleteScheduleDateTime) {
                errors.push("Schedule exam date and time for every subject in this exam type before generating hall tickets.");
            }
            const error = new Error(errors.join(" "));
            error.statusCode = 400;
            throw error;
        }

        const students = await studentHallTicketRepository.getEligibleStudents(
            sessionId,
            readiness.examSetupTypeTerm.courseId,
            readiness.examSetupTypeTerm.term,
            instituteId,
            universityId,
            transaction
        );

        if (!students.length) {
            return { generatedCount: 0, hallTickets: [] };
        }

        const upsertPromises = students.map((student) => {
            return studentHallTicketRepository.upsertHallTicket({
                examSetupTypeTermId,
                sessionId,
                studentId: student.studentId,
                instituteId,
                universityId,
                // Keep QR value as plain UUID token only.
                qr: crypto.randomUUID()
            }, transaction);
        });

        await Promise.all(upsertPromises);

        const hallTickets = await studentHallTicketRepository.getAllHallTickets({
            examSetupTypeTermId,
            sessionId,
            instituteId,
            universityId
        }, transaction);

        return {
            generatedCount: hallTickets.length,
            examSetupType: readiness.examSetupTypeTerm.examSetupType,
            hallTickets
        };
    });
}

function deriveHallTicketRowStatus({ eligibleStudentCount, generatedTicketCount, canGenerate }) {
    if (eligibleStudentCount === 0) return "NoStudents";
    if (generatedTicketCount >= eligibleStudentCount) return "Generated";
    if (generatedTicketCount > 0) return "Partial";
    if (canGenerate) return "Ready";
    return "Pending";
}

export async function canGenerateHallTicketsByExamSession({
    examSetupTypeTermId,
    sessionId,
    instituteId,
    universityId
}) {
    return sequelize.transaction(async (transaction) => {
        const readiness = await buildGenerationReadiness({
            examSetupTypeTermId,
            sessionId,
            instituteId,
            universityId,
            transaction
        });

        const term = readiness.examSetupTypeTerm;
        const eligibleStudents = await studentHallTicketRepository.getEligibleStudents(
            sessionId,
            term.courseId,
            term.term,
            instituteId,
            universityId,
            transaction
        );
        const eligibleStudentCount = eligibleStudents.length;

        const generatedTicketCount = await studentHallTicketRepository.countHallTickets(
            {
                examSetupTypeTermId,
                sessionId,
                instituteId,
                universityId
            },
            transaction
        );

        const pendingTicketCount = Math.max(0, eligibleStudentCount - generatedTicketCount);

        return {
            canGenerate: readiness.canGenerate,
            checks: {
                isPublished: readiness.isPublished,
                hasSchedules: readiness.hasSchedules,
                hasCompleteScheduleDateTime: readiness.hasCompleteScheduleDateTime
            },
            stats: {
                totalSchedules: readiness.totalSchedules,
                missingDateTimeCount: readiness.missingDateTimeCount,
                eligibleStudentCount,
                generatedTicketCount,
                pendingTicketCount
            },
            /** Aligns with dashboard rows: Ready | Generated | Pending | Partial | NoStudents */
            generationStatus: deriveHallTicketRowStatus({
                eligibleStudentCount,
                generatedTicketCount,
                canGenerate: readiness.canGenerate
            }),
            examSetupType: readiness.examSetupTypeTerm.examSetupType,
            examSetupTypeTermId: term.examSetupTypeTermId,
            sessionId
        };
    });
}

function schedulesToSubjectList(scheduleRows) {
    return (scheduleRows || []).map((row) => {
        const plain = typeof row.toJSON === "function" ? row.toJSON() : typeof row.get === "function" ? row.get({ plain: true }) : row;
        const sub = plain.subjectSchedule;
        const sem = plain.semesterexam;
        return {
            examScheduleId: plain.examScheduleId,
            subjectId: sub?.subjectId ?? plain.subjectId ?? null,
            subjectName: sub?.subjectName ?? null,
            subjectCode: sub?.subjectCode ?? null,
            semesterId: sem?.semesterId ?? plain.semesterId ?? null,
            semesterName: sem?.name ?? null,
            examDate: plain.examDate ?? null,
            examTime: plain.examTime ?? null,
            duration: plain.duration ?? null,
            scheduleKind: plain.type ?? null,
            /** Full subject row (minus audit fields) when the join resolves; use if flat name/code were null. */
            subject: sub ?? null,
            semester: sem ?? null,
        };
    });
}

function flattenHallTicketDetail(ticket, scheduleRows) {
    const st = ticket.student;
    const sess = ticket.session;
    const est = ticket.examSetupTypeTerm;
    const examType = est?.examSetupType;

    const subjects = schedulesToSubjectList(scheduleRows);

    return {
        id: ticket.id,
        qr: ticket.qr,
        examSetupTypeTermId: ticket.examSetupTypeTermId,
        sessionId: ticket.sessionId,
        studentId: ticket.studentId,
        instituteId: ticket.instituteId,
        universityId: ticket.universityId,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,

        studentFirstName: st?.firstName ?? null,
        studentMiddleName: st?.middleName ?? null,
        studentLastName: st?.lastName ?? null,
        scholarNumber: st?.scholarNumber ?? null,
        enrollNumber: st?.enrollNumber ?? null,

        sessionName: sess?.sessionName ?? null,

        examSetupTypeId: examType?.examSetupTypeId ?? est?.examSetupTypeId ?? null,
        examType: examType?.examType ?? null,
        examName: examType?.examName ?? null,
        term: est?.term ?? null,
        courseId: est?.courseId ?? null,

        subjects,
    };
}

export async function getHallTicketById(id, instituteId, universityId) {
    return sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.getHallTicketById(id, transaction);
        if (!ticket) return null;

        if (
            instituteId != null &&
            universityId != null &&
            (Number(ticket.instituteId) !== Number(instituteId) ||
                Number(ticket.universityId) !== Number(universityId))
        ) {
            return null;
        }

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExamTermSession(
            ticket.examSetupTypeTermId,
            ticket.sessionId,
            transaction
        );

        return flattenHallTicketDetail(ticket, schedules);
    });
}

export async function getHallTicketDetailsByQr(qr, instituteId, universityId) {
    return sequelize.transaction(async (transaction) => {
        const hallTicket = await studentHallTicketRepository.getHallTicketByQr(
            qr,
            instituteId,
            universityId,
            transaction
        );
        if (!hallTicket) return null;

        return {
            id: hallTicket.id,
            qr: hallTicket.qr,
            studentId: hallTicket.studentId,
            sessionId: hallTicket.sessionId,
            examSetupTypeTermId: hallTicket.examSetupTypeTermId,
            instituteId: hallTicket.instituteId,
            universityId: hallTicket.universityId,
            student: hallTicket.student,
            session: hallTicket.session,
            examSetupTypeTerm: hallTicket.examSetupTypeTerm
        };
    });
}

const HALL_TICKET_DEFAULT_PAGE = 1;
const HALL_TICKET_DEFAULT_LIMIT = 10;
const HALL_TICKET_MAX_LIMIT = 100;

export async function getAllHallTickets(filters, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page, 10) || HALL_TICKET_DEFAULT_PAGE);
    const limit = Math.min(
        HALL_TICKET_MAX_LIMIT,
        Math.max(1, parseInt(pagination.limit, 10) || HALL_TICKET_DEFAULT_LIMIT)
    );
    const offset = (page - 1) * limit;

    return sequelize.transaction(async (transaction) => {
        const [rows, total] = await Promise.all([
            studentHallTicketRepository.getAllHallTickets(filters, transaction, { limit, offset }),
            studentHallTicketRepository.countHallTickets(filters, transaction),
        ]);
        return { rows, total, page, limit };
    });
}

/**
 * Groups scheduled exams by (examSetupTypeTermId + sessionId): exam type (e.g. Mid-Term / End-Term),
 * course/session/academic year, per-subject date/time rows, and hall-ticket readiness for POST /studentHallTicket/generate.
 */
export async function getExamListWithHallTickets({ universityId, acedmicYearId, instituteId, filters }) {
    const rows = await examScheduleServices.getExamSchedules(universityId, acedmicYearId, instituteId, filters, {
        includeCourse: true,
    });

    if (!rows?.length) return [];

    const groupsMap = new Map();
    for (const row of rows) {
        const termId = row.examSetupTypeTermId;
        const sessionId = row.sessionId;
        const key = `${termId}_${sessionId}`;
        if (!groupsMap.has(key)) groupsMap.set(key, []);
        groupsMap.get(key).push(row);
    }

    const groups = [];
    for (const scheduleRows of groupsMap.values()) {
        const first = scheduleRows[0];
        const examSetupTypeTerm = first.examSetupTypeTerm;
        const examSetupType = examSetupTypeTerm?.examSetupType;

        const hallTicket = await canGenerateHallTicketsByExamSession({
            examSetupTypeTermId: first.examSetupTypeTermId,
            sessionId: first.sessionId,
            instituteId,
            universityId,
        });

        const schedules = scheduleRows.map((r) => ({
            examScheduleId: r.examScheduleId,
            examDate: r.examDate,
            examTime: r.examTime,
            duration: r.duration,
            scheduleKind: r.type,
            subject: r.subjectSchedule
                ? {
                      subjectId: r.subjectSchedule.subjectId,
                      subjectName: r.subjectSchedule.subjectName,
                      subjectCode: r.subjectSchedule.subjectCode,
                  }
                : null,
            semester: r.semesterexam
                ? { semesterId: r.semesterexam.semesterId, name: r.semesterexam.name }
                : null,
            studentCount: r.getDataValue ? r.getDataValue("studentCount") ?? 0 : 0,
            roomAssignmentCount: Array.isArray(r.roomCapacities) ? r.roomCapacities.length : 0,
        }));

        groups.push({
            examSetupTypeTermId: first.examSetupTypeTermId,
            sessionId: first.sessionId,
            acedmicYearId: first.acedmicYearId,
            session: first.sessionSchedule
                ? {
                      sessionId: first.sessionSchedule.sessionId,
                      sessionName: first.sessionSchedule.sessionName,
                  }
                : null,
            academicYear: first.acedmicYearSchedule
                ? {
                      acedmicYearId: first.acedmicYearSchedule.acedmicYearId,
                      yearTitle: first.acedmicYearSchedule.yearTitle,
                  }
                : null,
            examSetupTypeTerm: examSetupTypeTerm
                ? {
                      examSetupTypeTermId: examSetupTypeTerm.examSetupTypeTermId,
                      term: examSetupTypeTerm.term,
                      courseId: examSetupTypeTerm.courseId,
                      course: examSetupTypeTerm.course
                          ? {
                                courseId: examSetupTypeTerm.course.courseId,
                                courseName: examSetupTypeTerm.course.courseName,
                                courseCode: examSetupTypeTerm.course.courseCode,
                            }
                          : null,
                  }
                : null,
            examType: examSetupType
                ? {
                      examSetupTypeId: examSetupType.examSetupTypeId,
                      examType: examSetupType.examType,
                      examName: examSetupType.examName,
                      isPublish: examSetupType.isPublish,
                  }
                : null,
            schedules,
            hallTicket,
            generateHallTicketsBody: {
                examSetupTypeTermId: first.examSetupTypeTermId,
                sessionId: first.sessionId,
            },
        });
    }

    groups.sort((a, b) => {
        const nameA = a.examType?.examName || "";
        const nameB = b.examType?.examName || "";
        const byName = nameA.localeCompare(nameB);
        if (byName !== 0) return byName;
        return (a.sessionId ?? 0) - (b.sessionId ?? 0);
    });

    return groups;
}

/** Maps labels to `theory` | `practical` for dashboard (exam_setup_type.exam_type or exam_schedule.type). */
function toTheoryOrPractical(raw) {
    if (raw == null || String(raw).trim() === "") return null;
    const s = String(raw).trim().toLowerCase();
    if (s.includes("practical")) return "practical";
    if (s.includes("theory")) return "theory";
    return null;
}

function dashboardExamTypeTheoryOrPractical(group) {
    const fromSetup = toTheoryOrPractical(group.examType?.examType);
    if (fromSetup) return fromSetup;
    const kinds = (group.schedules || [])
        .map((s) => s.scheduleKind)
        .filter(Boolean);
    const normalized = [...new Set(kinds.map(toTheoryOrPractical).filter(Boolean))];
    if (normalized.length === 1) return normalized[0];
    return null;
}

/**
 * Dashboard for `termNumber` + `sessionId`: one row per scheduled exam cohort (`examSetupTypeTermId` + `sessionId`).
 * Each row includes `studentCount` — eligible students for that term + session (same rule as GET /canGenerate `eligibleStudentCount`).
 */
export async function getExamTypeDashboardRows({
    sessionId,
    termNumber,
    instituteId,
    universityId,
    acedmicYearId,
}) {
    const groups = await getExamListWithHallTickets({
        universityId,
        acedmicYearId,
        instituteId,
        filters: { sessionId, term: termNumber },
    });

    if (!groups?.length) {
        return [];
    }

    return groups.map((group) => {
        const generatedCount = group.hallTicket?.stats?.generatedTicketCount ?? 0;
        const studentCount = group.hallTicket?.stats?.eligibleStudentCount ?? 0;
        const termVal = group.examSetupTypeTerm?.term ?? null;
        const examNameStr = group.examType?.examName ?? "";

        return {
            examSetupTypeTermId: group.examSetupTypeTermId,
            sessionId: group.sessionId,
            examTerm: termVal,
            examName: examNameStr,
            examType: dashboardExamTypeTheoryOrPractical(group),
            studentCount,
            isHallTicketGenerated: generatedCount > 0,
        };
    });
}

export async function deleteHallTicket(id) {
    return sequelize.transaction(async (transaction) => {
        return studentHallTicketRepository.deleteHallTicket(id, transaction);
    });
}
