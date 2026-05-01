import crypto from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

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

    return {
        examSetupTypeTerm,
        isPublished,
        totalSchedules,
        missingDateTimeCount,
        hasSchedules,
        hasCompleteScheduleDateTime,
        canGenerate: isPublished && hasCompleteScheduleDateTime
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
            if (!readiness.isPublished) {
                errors.push("Exam schedule is not published for this exam type.");
            }
            if (!readiness.hasSchedules) {
                errors.push("No exam schedule exists for this exam setup term and session.");
            }
            if (readiness.hasSchedules && !readiness.hasCompleteScheduleDateTime) {
                errors.push("Some scheduled exams are missing examDate/examTime.");
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

        return {
            canGenerate: readiness.canGenerate,
            checks: {
                isPublished: readiness.isPublished,
                hasSchedules: readiness.hasSchedules,
                hasCompleteScheduleDateTime: readiness.hasCompleteScheduleDateTime
            },
            stats: {
                totalSchedules: readiness.totalSchedules,
                missingDateTimeCount: readiness.missingDateTimeCount
            },
            examSetupType: readiness.examSetupTypeTerm.examSetupType
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
