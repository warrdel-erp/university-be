import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { studentClassSectionTermWithSectionInclude } from "../utility/classSectionIncludes.js";

export async function findExaminationSessionById(examinationSessionId, transaction) {
    return scoped(model.examinationSessionModel).findByPk(examinationSessionId, {
        transaction,
        include: [
            {
                model: model.examSetupTypeModel,
                as: "assessmentType",
                attributes: ["examSetupTypeId", "examType", "examName", "isPublish"],
                where: buildScope(model.examSetupTypeModel),
                required: false,
            },
            {
                model: model.acedmicYearModel,
                as: "academicYear",
                attributes: ["academicYearId", "yearTitle"],
            },
            {
                model: model.examinationSessionTermModel,
                as: "examinationSessionTerms",
                include: [
                    {
                        model: model.classSectionTermModel,
                        as: "classSectionTerm",
                    },
                ],
            },
        ],
    });
}

export async function getSchedulesByExaminationSessionId(examinationSessionId, transaction) {
    return scoped(model.examScheduleModel).findAll({
        transaction,
        where: { examinationSessionId },
        attributes: ["examScheduleId", "examDate", "examTime"],
    });
}

export async function getSchedulesWithSubjectsForExaminationSession(examinationSessionId, transaction) {
    return scoped(model.examScheduleModel).findAll({
        transaction,
        where: { examinationSessionId },
        attributes: ["examScheduleId", "subjectId", "term", "examDate", "examTime", "duration", "type", "examinationSessionSlotId"],
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                required: false,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                where: buildScope(model.subjectModel),
            },
            {
                model: model.examinationSessionSlotModel,
                as: "examinationSessionSlot",
                required: false,
                attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
            },
        ],
        order: [
            ["examDate", "ASC"],
            ["examTime", "ASC"],
            ["examScheduleId", "ASC"],
        ],
    });
}

export async function getEligibleStudentsForExaminationSession(examinationSessionId, transaction) {
    const session = await findExaminationSessionById(examinationSessionId, transaction);
    if (!session) return [];

    const classSectionTermIds = (session.examinationSessionTerms || [])
        .map((t) => t.classSectionTermId)
        .filter(Boolean);

    if (classSectionTermIds.length) {
        return scoped(model.studentModel).findAll({
            transaction,
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            where: {
                ...buildScope(model.studentModel),
            },
            include: [
                {
                    model: model.studentClassSectionsHistoryModel,
                    as: "sectionHistory",
                    required: true,
                    where: {
                        classSectionTermId: { [Op.in]: classSectionTermIds },
                    },
                },
            ],
        });
    }

    return scoped(model.studentModel).findAll({
        transaction,
        attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
        where: {
            ...buildScope(model.studentModel),
        },
    });
}

export async function bulkCreateHallTickets(payloads, transaction) {
    return scoped(model.studentHallTicketModel).bulkCreate(payloads, { transaction });
}

export async function getHallTicketById(id, transaction) {
    return scoped(model.studentHallTicketModel).findByPk(id, {
        transaction,
        include: getHallTicketIncludes(),
    });
}

export async function getHallTicketByQr(qr, transaction) {
    return scoped(model.studentHallTicketModel).findOne({
        transaction,
        where: { qr },
        include: getHallTicketIncludes(),
    });
}

export async function getAllHallTickets(filters = {}, transaction, options = {}) {
    const where = {};
    if (filters.examinationSessionId) where.examinationSessionId = filters.examinationSessionId;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.studentId) where.studentId = filters.studentId;

    const query = {
        transaction,
        where,
        include: getHallTicketIncludes(),
        order: [["id", "DESC"]],
    };

    if (options.limit != null) query.limit = options.limit;
    if (options.offset != null) query.offset = options.offset;

    return scoped(model.studentHallTicketModel).findAll(query);
}

export async function countHallTickets(filters = {}, transaction) {
    const where = {};
    if (filters.examinationSessionId) where.examinationSessionId = filters.examinationSessionId;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.studentId) where.studentId = filters.studentId;

    return scoped(model.studentHallTicketModel).count({ where, transaction });
}

export async function countHallTicketsBySessionIds(examinationSessionIds, transaction) {
    if (!examinationSessionIds?.length) {
        return new Map();
    }

    const rows = await scoped(model.studentHallTicketModel).findAll({
        attributes: [
            "examinationSessionId",
            [fn("COUNT", col("student_hall_ticket.id")), "count"],
        ],
        where: {
            examinationSessionId: { [Op.in]: examinationSessionIds },
        },
        group: ["examinationSessionId"],
        raw: true,
        transaction,
    });

    return new Map(rows.map((row) => [row.examinationSessionId, Number(row.count)]));
}

function getHallTicketIncludes() {
    return [
        {
            model: model.instituteModel,
            as: "institute",
            attributes: ["instituteId", "instituteName"],
        },
        {
            model: model.universityModel,
            as: "university",
            attributes: ["universityId", "universityName"],
        },
        {
            model: model.acedmicYearModel,
            as: "academicYear",
            attributes: ["academicYearId", "yearTitle"],
        },
        {
            model: model.studentModel,
            as: "student",
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            where: buildScope(model.studentModel),
            required: false,
            include: [
                studentClassSectionTermWithSectionInclude({
                    sectionAttributes: ["classSectionsId", "year", "section", "sessionId"],
                    includeSectionTerms: false,
                }),
            ],
        },
        {
            model: model.examinationSessionModel,
            as: "examinationSession",
            attributes: ["examinationSessionId", "sessionName", "examStartDate", "examEndDate", "assessmentTypeId", "academicYearId"],
            where: buildScope(model.examinationSessionModel),
            required: false,
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "assessmentType",
                    attributes: ["examSetupTypeId", "examType", "examName"],
                },
                {
                    model: model.acedmicYearModel,
                    as: "academicYear",
                    attributes: ["academicYearId", "yearTitle"],
                },
            ],
        },
    ];
}

export async function getMappedExamScheduleIds(studentId, examScheduleIds, transaction) {
    if (!examScheduleIds || examScheduleIds.length === 0) {
        return [];
    }
    const student = await scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ['studentId'],
        transaction,
    });
    if (!student) {
        return [];
    }
    const answerSheetQrs = await scoped(model.answerSheetQrModel).findAll({
        where: {
            studentId,
            examScheduleId: examScheduleIds,
        },
        attributes: ["examScheduleId"],
        transaction,
    });
    return answerSheetQrs.map((a) => a.examScheduleId);
}
