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

export async function getHallTicketById(id) {
    return sequelize.transaction(async (transaction) => {
        return studentHallTicketRepository.getHallTicketById(id, transaction);
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

export async function getAllHallTickets(filters) {
    return sequelize.transaction(async (transaction) => {
        return studentHallTicketRepository.getAllHallTickets(filters, transaction);
    });
}

/** All hall tickets across exams with full student + related exam/institute payload (GET /all). */
export async function getAllHallTicketsAllExams(filters) {
    return sequelize.transaction(async (transaction) => {
        return studentHallTicketRepository.getAllHallTickets(filters, transaction, { fullDetail: true });
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

/**
 * Same data as list-with-hall-tickets, grouped by exam setup type (Mid-Term / End-Term / …).
 * Each item has examSetupTypeId + labels and an array of session/term rows with hallTicket status.
 */
export async function getHallTicketStatusByExamType({ universityId, acedmicYearId, instituteId, filters }) {
    const flatGroups = await getExamListWithHallTickets({
        universityId,
        acedmicYearId,
        instituteId,
        filters,
    });

    const byExamTypeId = new Map();

    for (const item of flatGroups) {
        const typeId = item.examType?.examSetupTypeId;
        if (typeId == null) continue;

        if (!byExamTypeId.has(typeId)) {
            byExamTypeId.set(typeId, {
                examSetupTypeId: typeId,
                examType: item.examType?.examType ?? null,
                examName: item.examType?.examName ?? null,
                isPublish: item.examType?.isPublish ?? null,
                sessions: [],
            });
        }

        byExamTypeId.get(typeId).sessions.push({
            examSetupTypeTermId: item.examSetupTypeTermId,
            sessionId: item.sessionId,
            session: item.session,
            academicYear: item.academicYear,
            examSetupTypeTerm: item.examSetupTypeTerm,
            hallTicket: item.hallTicket,
            generateHallTicketsBody: item.generateHallTicketsBody,
            scheduleCount: Array.isArray(item.schedules) ? item.schedules.length : 0,
        });
    }

    let result = Array.from(byExamTypeId.values()).sort((a, b) =>
        (a.examName || "").localeCompare(b.examName || "")
    );

    if (filters?.examSetupTypeId != null) {
        const only = Number(filters.examSetupTypeId);
        result = result.filter((row) => row.examSetupTypeId === only);
    }

    return result;
}

/**
 * One row per scheduled exam (exam_schedule): subject paper date/time, program (course), semester,
 * exam type, session/academic year, plus hall-ticket state for that exam's (examSetupTypeTermId + sessionId).
 * Hall ticket stats are shared across all subject rows in the same term+session (cached per pair).
 */
export async function getScheduledExamsWithHallTicketInfo({ universityId, acedmicYearId, instituteId, filters }) {
    const rows = await examScheduleServices.getExamSchedules(universityId, acedmicYearId, instituteId, filters, {
        includeCourse: true,
    });

    if (!rows?.length) return [];

    const hallTicketCache = new Map();

    async function resolveHallTicket(examSetupTypeTermId, sessionId) {
        const cacheKey = `${examSetupTypeTermId}_${sessionId}`;
        if (!hallTicketCache.has(cacheKey)) {
            const ht = await canGenerateHallTicketsByExamSession({
                examSetupTypeTermId,
                sessionId,
                instituteId,
                universityId,
            });
            hallTicketCache.set(cacheKey, ht);
        }
        return hallTicketCache.get(cacheKey);
    }

    const out = [];

    for (const row of rows) {
        if (filters?.examSetupTypeId != null) {
            const typeId = row.examSetupTypeTerm?.examSetupType?.examSetupTypeId;
            if (typeId !== Number(filters.examSetupTypeId)) continue;
        }

        const termId = row.examSetupTypeTermId;
        const sessionId = row.sessionId;
        const ht = await resolveHallTicket(termId, sessionId);
        const eligible = ht.stats?.eligibleStudentCount ?? 0;
        const generated = ht.stats?.generatedTicketCount ?? 0;

        const isHallTicketGenerated = eligible > 0 && generated >= eligible;

        const est = row.examSetupTypeTerm;
        const examSetupType = est?.examSetupType;
        const course = est?.course;

        let hallTicketStatus = "pending";
        if (eligible === 0) hallTicketStatus = "no_students";
        else if (generated >= eligible) hallTicketStatus = "generated";
        else if (generated > 0) hallTicketStatus = "partial";

        out.push({
            examScheduleId: row.examScheduleId,
            examDate: row.examDate,
            examTime: row.examTime,
            duration: row.duration,
            scheduleKind: row.type,
            subject: row.subjectSchedule
                ? {
                      subjectId: row.subjectSchedule.subjectId,
                      subjectName: row.subjectSchedule.subjectName,
                      subjectCode: row.subjectSchedule.subjectCode,
                  }
                : null,
            semester: row.semesterexam
                ? {
                      semesterId: row.semesterexam.semesterId,
                      name: row.semesterexam.name,
                  }
                : null,
            program: course
                ? {
                      courseId: course.courseId,
                      courseName: course.courseName,
                      courseCode: course.courseCode,
                      totalStudents: eligible,
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
            session: row.sessionSchedule
                ? {
                      sessionId: row.sessionSchedule.sessionId,
                      sessionName: row.sessionSchedule.sessionName,
                  }
                : null,
            academicYear: row.acedmicYearSchedule
                ? {
                      acedmicYearId: row.acedmicYearSchedule.acedmicYearId,
                      yearTitle: row.acedmicYearSchedule.yearTitle,
                  }
                : null,
            examSetupTypeTermId: termId,
            sessionId,
            examSetupTypeTerm: est
                ? {
                      examSetupTypeTermId: est.examSetupTypeTermId,
                      term: est.term,
                      courseId: est.courseId,
                  }
                : null,
            studentCountOnSchedule: row.getDataValue ? row.getDataValue("studentCount") ?? 0 : 0,
            isHallTicketGenerated,
            hallTicket: {
                isGenerated: isHallTicketGenerated,
                status: hallTicketStatus,
                generationStatus: ht.generationStatus,
                canGenerate: ht.canGenerate,
                eligibleStudentCount: eligible,
                generatedTicketCount: generated,
                pendingTicketCount: ht.stats?.pendingTicketCount ?? 0,
                checks: ht.checks,
            },
            generateHallTicketsBody: {
                examSetupTypeTermId: termId,
                sessionId,
            },
        });
    }

    out.sort((a, b) => {
        const dA = a.examDate ? String(a.examDate) : "";
        const dB = b.examDate ? String(b.examDate) : "";
        if (dA !== dB) return dA.localeCompare(dB);
        const tA = a.examTime ? String(a.examTime) : "";
        const tB = b.examTime ? String(b.examTime) : "";
        if (tA !== tB) return tA.localeCompare(tB);
        return (a.examScheduleId ?? 0) - (b.examScheduleId ?? 0);
    });

    return out;
}

export async function updateHallTicket(id, payload) {
    return sequelize.transaction(async (transaction) => {
        return studentHallTicketRepository.updateHallTicket(id, payload, transaction);
    });
}

export async function deleteHallTicket(id) {
    return sequelize.transaction(async (transaction) => {
        return studentHallTicketRepository.deleteHallTicket(id, transaction);
    });
}
