import crypto from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

async function buildGenerationReadiness({ examSetupTypeTermId, sessionId, transaction }) {
    const examSetupTypeTerm = await studentHallTicketRepository.findExamSetupTypeTermById(examSetupTypeTermId, transaction);
    if (!examSetupTypeTerm) {
        const error = new Error("examSetupTypeTerm not found");
        error.statusCode = 404;
        throw error;
    }

    const schedules = await studentHallTicketRepository.getSchedulesByExamSetupTypeTermAndSession(examSetupTypeTermId, sessionId, transaction);
    const canGenerate = schedules.some((s) => s.examDate && s.examTime);

    return {
        examSetupTypeTerm,
        totalSchedules: schedules.length,
        canGenerate,
    };
}

export async function generateHallTicketsByExamSession({ examSetupTypeTermId, sessionId }) {
    return await sequelize.transaction(async (transaction) => {
        const readiness = await buildGenerationReadiness({
            examSetupTypeTermId,
            sessionId,
            transaction,
        });

        if (!readiness.canGenerate) {
            const error = new Error(
                "Schedule at least one subject with exam date and time for this exam type and session before generating hall tickets.",
            );
            error.statusCode = 400;
            throw error;
        }

        const existingCount = await studentHallTicketRepository.countHallTickets(
            { examSetupTypeTermId, sessionId },
            transaction,
        );
        if (existingCount > 0) {
            const error = new Error(
                "Hall tickets have already been generated for this exam and session. Regeneration is not allowed.",
            );
            error.statusCode = 400;
            throw error;
        }

        const students = await studentHallTicketRepository.getEligibleStudents(
            sessionId,
            readiness.examSetupTypeTerm.courseId,
            readiness.examSetupTypeTerm.term,
            transaction,
        );

        if (!students.length) {
            return { generatedCount: 0, hallTickets: [] };
        }

        const hallTicketPayloads = students.map((student) => ({
            examSetupTypeTermId,
            sessionId,
            studentId: student.studentId,
            qr: crypto.randomUUID(),
        }));

        await studentHallTicketRepository.bulkCreateHallTickets(hallTicketPayloads, transaction);

        const hallTickets = await studentHallTicketRepository.getAllHallTickets(
            { examSetupTypeTermId, sessionId },
            transaction,
        );

        return {
            generatedCount: hallTickets.length,
            examSetupType: readiness.examSetupTypeTerm.examSetupType,
            hallTickets,
        };
    });
}

export async function generateHallTicketsForUser(payload) {
    return generateHallTicketsByExamSession({
        examSetupTypeTermId: Number(payload.examSetupTypeTermId),
        sessionId: Number(payload.sessionId),
    });
}

function schedulesToSubjectList(scheduleRows, mappedScheduleIds = []) {
    const mappedSet = new Set(mappedScheduleIds || []);
    return (scheduleRows || []).map((row) => {
        const plain = row.get({ plain: true });
        const sub = plain.subjectSchedule;
        const sem = plain.semesterexam;
        const isMapped = plain.examScheduleId != null && mappedSet.has(plain.examScheduleId);
        return {
            examScheduleId: plain.examScheduleId,
            isMapped,
            subjectId: sub?.subjectId ?? plain.subjectId ?? null,
            subjectName: sub?.subjectName ?? null,
            subjectCode: sub?.subjectCode ?? null,
            semesterId: sem?.semesterId ?? plain.semesterId ?? null,
            semesterName: sem?.name ?? null,
            examDate: plain.examDate ?? null,
            examTime: plain.examTime ?? null,
            duration: plain.duration ?? null,
            scheduleKind: plain.type ?? null,
            subject: sub ?? null,
            semester: sem ?? null,
        };
    });
}

function flattenHallTicketDetail(ticket, scheduleRows, mappedScheduleIds = []) {
    const st = ticket.student;
    const sess = ticket.session;
    const est = ticket.examSetupTypeTerm;
    const examType = est?.examSetupType;
    const subjects = schedulesToSubjectList(scheduleRows, mappedScheduleIds);

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

export async function getHallTicketById(id) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.getHallTicketById(id, transaction);
        if (!ticket) return null;

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExamTermSession(
            ticket.examSetupTypeTermId,
            ticket.sessionId,
            transaction,
        );

        const examScheduleIds = schedules.map((s) => s.examScheduleId).filter((scheduleId) => scheduleId != null);
        const mappedScheduleIds = await studentHallTicketRepository.getMappedExamScheduleIds(
            ticket.studentId,
            examScheduleIds,
            transaction,
        );

        return flattenHallTicketDetail(ticket, schedules, mappedScheduleIds);
    });
}

export async function getHallTicketByIdForUser(id) {
    return getHallTicketById(Number(id));
}

export async function getHallTicketDetailsByQr(qr) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.getHallTicketByQr(qr, transaction);
        if (!ticket) return null;

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExamTermSession(
            ticket.examSetupTypeTermId,
            ticket.sessionId,
            transaction,
        );

        const examScheduleIds = schedules.map((s) => s.examScheduleId).filter((scheduleId) => scheduleId != null);
        const mappedScheduleIds = await studentHallTicketRepository.getMappedExamScheduleIds(
            ticket.studentId,
            examScheduleIds,
            transaction,
        );

        return flattenHallTicketDetail(ticket, schedules, mappedScheduleIds);
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

export async function getAllHallTicketsForUser(query = {}) {
    const filters = {};
    if (query.examSetupTypeTermId) filters.examSetupTypeTermId = query.examSetupTypeTermId;
    if (query.sessionId) filters.sessionId = query.sessionId;
    if (query.studentId) filters.studentId = query.studentId;

    return getAllHallTickets(filters, {
        page: query.page,
        limit: query.limit,
    });
}
