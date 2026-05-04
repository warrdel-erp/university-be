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
    const canGenerate = schedules.some((s) => s.examDate && s.examTime);

    return {
        examSetupTypeTerm,
        totalSchedules: schedules.length,
        canGenerate
    };
}

async function cohortStudentAndTicketCounts(
    { examSetupTypeTermId, sessionId, instituteId, universityId },
    courseId,
    term
) {
    return sequelize.transaction(async (transaction) => {
        const eligibleStudents = await studentHallTicketRepository.getEligibleStudents(
            sessionId,
            courseId,
            term,
            instituteId,
            universityId,
            transaction
        );
        const generatedTicketCount = await studentHallTicketRepository.countHallTickets(
            {
                examSetupTypeTermId,
                sessionId,
                instituteId,
                universityId
            },
            transaction
        );
        return {
            eligibleStudentCount: eligibleStudents.length,
            generatedTicketCount
        };
    });
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
            const error = new Error(
                "Schedule at least one subject with exam date and time for this exam type and session before generating hall tickets."
            );
            error.statusCode = 400;
            throw error;
        }223

        const existingCount = await studentHallTicketRepository.countHallTickets(
            {
                examSetupTypeTermId,
                sessionId,
                instituteId,
                universityId
            },
            transaction
        );
        if (existingCount > 0) {
            const error = new Error(
                "Hall tickets have already been generated for this exam and session. Regeneration is not allowed."
            );
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

        const hallTicketPayloads = students.map((student) => ({
            examSetupTypeTermId,
            sessionId,
            studentId: student.studentId,
            instituteId,
            universityId,
            qr: crypto.randomUUID(),
        }));

        await studentHallTicketRepository.bulkCreateHallTickets(hallTicketPayloads, transaction);

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
        const ticket = await studentHallTicketRepository.getHallTicketByQr(
            qr,
            instituteId,
            universityId,
            transaction
        );
        if (!ticket) return null;

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExamTermSession(
            ticket.examSetupTypeTermId,
            ticket.sessionId,
            transaction
        );

        return flattenHallTicketDetail(ticket, schedules);
    });
}

/** Pagination for GET hall ticket list: page ≥ 1; limit clamped to 10–1000 (default 1000). */
export async function getAllHallTickets(filters, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const rawLimit = parseInt(pagination.limit, 10);
    const limit =
        Number.isNaN(rawLimit) || rawLimit < 1
            ? 1000
            : Math.min(1000, Math.max(10, rawLimit));
    const offset = (page - 1) * limit;

    return sequelize.transaction(async (transaction) => {
        const [rows, total] = await Promise.all([
            studentHallTicketRepository.getAllHallTickets(filters, transaction, { limit, offset }),
            studentHallTicketRepository.countHallTickets(filters, transaction),
        ]);
        return { rows, total, page, limit };
    });
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


export async function getExamTypeDashboardRows({
    sessionId,
    termNumber,
    instituteId,
    universityId,
    acedmicYearId,
}) {
    const rows = await examScheduleServices.getExamSchedules(universityId, acedmicYearId, instituteId, {
        sessionId,
        term: termNumber,
    });

    if (!rows?.length) return [];

    const groupsMap = new Map();
    for (const row of rows) {
        const key = `${row.examSetupTypeTermId}_${row.sessionId}`;
        if (!groupsMap.has(key)) groupsMap.set(key, []);
        groupsMap.get(key).push(row);
    }

    const dashboardRows = [];
    for (const scheduleRows of groupsMap.values()) {
        const first = scheduleRows[0];
        const examSetupTypeTerm = first.examSetupTypeTerm;
        if (!examSetupTypeTerm) continue;

        const examSetupType = examSetupTypeTerm.examSetupType;
        const counts = await cohortStudentAndTicketCounts(
            {
                examSetupTypeTermId: first.examSetupTypeTermId,
                sessionId: first.sessionId,
                instituteId,
                universityId,
            },
            examSetupTypeTerm.courseId,
            examSetupTypeTerm.term
        );

        const groupForExamType = {
            examType: examSetupType
                ? {
                      examType: examSetupType.examType,
                      examName: examSetupType.examName,
                  }
                : null,
            schedules: scheduleRows.map((r) => ({ scheduleKind: r.type })),
        };

        dashboardRows.push({
            examSetupTypeTermId: first.examSetupTypeTermId,
            sessionId: first.sessionId,
            examTerm: examSetupTypeTerm.term ?? null,
            examName: examSetupType?.examName ?? "",
            examType: dashboardExamTypeTheoryOrPractical(groupForExamType),
            studentCount: counts.eligibleStudentCount,
            isHallTicketGenerated: counts.generatedTicketCount > 0,
        });
    }

    dashboardRows.sort((a, b) => {
        const byName = (a.examName || "").localeCompare(b.examName || "");
        if (byName !== 0) return byName;
        return (a.sessionId ?? 0) - (b.sessionId ?? 0);
    });

    return dashboardRows;
}
