import crypto from "crypto";
import sequelize from "../database/sequelizeConfig.js";
import { buildTermName } from "../utility/courseTerms.js";
import { getAcademicYearId } from "../utility/requestContext.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

export async function getStudentsForExaminationSession(examinationSessionId, filters = {}) {
    return studentHallTicketRepository.getStudentsByExaminationSessionId(Number(examinationSessionId), filters);
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

export async function generateHallTicketsByExamSession({ examinationSessionId, user }) {
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

        const existingCount = await studentHallTicketRepository.countHallTickets(
            { examinationSessionId },
            transaction,
        );
        if (existingCount > 0) {
            const error = new Error(
                "Hall tickets have already been generated for this examination session. Regeneration is not allowed.",
            );
            error.statusCode = 400;
            throw error;
        }

        const students = await studentHallTicketRepository.getEligibleStudentsForExaminationSession(
            examinationSessionId,
            transaction,
        );

        if (!students.length) {
            return { generatedCount: 0, hallTickets: [] };
        }

        const hallTicketPayloads = students.map((student) => ({
            examinationSessionId,
            academicYearId: effectiveAcademicYearId,
            studentId: student.studentId,
            qr: crypto.randomUUID(),
        }));

        await studentHallTicketRepository.bulkCreateHallTickets(hallTicketPayloads, transaction);

        const hallTickets = await studentHallTicketRepository.getAllHallTickets(
            { examinationSessionId },
            transaction,
        );

        return {
            generatedCount: hallTickets.length,
            assessmentType: readiness.examinationSession.assessmentType,
            hallTickets,
        };
    });
}

export async function generateHallTicketsForUser(payload, user) {
    return generateHallTicketsByExamSession({
        examinationSessionId: Number(payload.examinationSessionId),
        user,
    });
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
        examType: assessmentType?.examType ?? null,
        examName: assessmentType?.examName ?? null,
        subjects,
    };
}

export async function getHallTicketById(id) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.getHallTicketById(id, transaction);
        if (!ticket) return null;

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
            ticket.examinationSessionId,
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

        const schedules = await studentHallTicketRepository.getSchedulesWithSubjectsForExaminationSession(
            ticket.examinationSessionId,
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

export async function publishStudentHallTicket(id) {
    return await sequelize.transaction(async (transaction) => {
        const ticket = await studentHallTicketRepository.publishStudentHallTicket(id, transaction);
        if (!ticket) {
            const error = new Error("Hall ticket not found");
            error.statusCode = 404;
            throw error;
        }
        return ticket;
    });
}

export async function publishSessionHallTickets(examinationSessionId) {
    return await sequelize.transaction(async (transaction) => {
        const publishedCount = await studentHallTicketRepository.publishSessionHallTickets(examinationSessionId, transaction);
        return { examinationSessionId, publishedCount };
    });
}

export async function generateOrRegenerateStudentTicket({ examinationSessionId, studentId, user }) {
    return await sequelize.transaction(async (transaction) => {
        const students = await studentHallTicketRepository.getStudentsByExaminationSessionId(examinationSessionId, transaction);
        const student = students.find((s) => s.studentId === studentId);
        if (!student) {
            const error = new Error("Student is not part of this examination session");
            error.statusCode = 404;
            throw error;
        }

        if (student.eligibilityStatus !== "Ready") {
            const error = new Error(`Cannot generate hall ticket. Student eligibility status is '${student.eligibilityStatus}': ${student.eligibilityReason}`);
            error.statusCode = 400;
            throw error;
        }

        const effectiveAcademicYearId = getAcademicYearId() || (user?.academicYearId ? Number(user.academicYearId) : undefined);
        const ticket = await studentHallTicketRepository.generateOrRegenerateStudentHallTicket({
            examinationSessionId,
            academicYearId: effectiveAcademicYearId,
            studentId,
        }, transaction);

        return ticket;
    });
}

export async function getStudentEligibilityDetails(examinationSessionId, studentId) {
    const students = await studentHallTicketRepository.getStudentsByExaminationSessionId(examinationSessionId);
    const student = students.find((s) => s.studentId === Number(studentId));
    if (!student) {
        const error = new Error("Student not found in this examination session");
        error.statusCode = 404;
        throw error;
    }
    return student;
}
