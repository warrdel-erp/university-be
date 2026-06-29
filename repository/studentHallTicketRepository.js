import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import { classSectionTermsInclude, studentClassSectionTermWithSectionInclude } from "../utility/classSectionIncludes.js";

export async function findExamSetupTypeTermById(examSetupTypeTermId, transaction) {
    return scoped(model.examSetupTypeTermModel).findByPk(examSetupTypeTermId, {
        transaction,
        include: [
            {
                model: model.examSetupTypeModel,
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName", "isPublish"],
                where: buildScope(model.examSetupTypeModel),
                required: true,
            },
        ],
    });
}

export async function getSchedulesByExamSetupTypeTermAndSession(examSetupTypeTermId, sessionId, transaction) {
    return scoped(model.examScheduleModel).findAll({
        transaction,
        where: { examSetupTypeTermId, sessionId },
        attributes: ["examScheduleId", "examDate", "examTime"],
    });
}

export async function getSchedulesWithSubjectsForExamTermSession(examSetupTypeTermId, sessionId, transaction) {
    return scoped(model.examScheduleModel).findAll({
        transaction,
        where: { examSetupTypeTermId, sessionId },
        attributes: ["examScheduleId", "subjectId", "semesterId", "examDate", "examTime", "duration", "type"],
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                required: false,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                where: buildScope(model.subjectModel),
            },
            {
                model: model.semesterModel,
                as: "semesterexam",
                required: false,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                where: buildScope(model.semesterModel),
            },
        ],
        order: [
            ["examDate", "ASC"],
            ["examTime", "ASC"],
            ["examScheduleId", "ASC"],
        ],
    });
}

export async function getEligibleStudents(sessionId, courseId, term, transaction) {
    return scoped(model.studentModel).findAll({
        transaction,
        attributes: ["studentId"],
        where: {
            sessionId,
        },
        include: [
            studentClassSectionTermWithSectionInclude({
                term,
                termRequired: true,
                sectionRequired: true,
                sectionWhere: {
                    ...buildScope(model.classSectionModel),
                    sessionId,
                    courseId,
                    acedmicYearId: { [Op.ne]: null },
                },
                sectionAttributes: [],
                termAttributes: [],
            }),
        ],
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
    if (filters.examSetupTypeTermId) where.examSetupTypeTermId = filters.examSetupTypeTermId;
    if (filters.sessionId) where.sessionId = filters.sessionId;
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
    if (filters.examSetupTypeTermId) where.examSetupTypeTermId = filters.examSetupTypeTermId;
    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.studentId) where.studentId = filters.studentId;

    return scoped(model.studentHallTicketModel).count({ where, transaction });
}

export async function countHallTicketsByTermIds(examSetupTypeTermIds, sessionId, transaction) {
    if (!examSetupTypeTermIds?.length || !sessionId) {
        return new Map();
    }

    const rows = await scoped(model.studentHallTicketModel).findAll({
        attributes: [
            "examSetupTypeTermId",
            [fn("COUNT", col("student_hall_ticket.id")), "count"],
        ],
        where: {
            examSetupTypeTermId: { [Op.in]: examSetupTypeTermIds },
            sessionId,
        },
        group: ["examSetupTypeTermId"],
        raw: true,
        transaction,
    });

    return new Map(rows.map((row) => [row.examSetupTypeTermId, Number(row.count)]));
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
            model: model.studentModel,
            as: "student",
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            where: buildScope(model.studentModel),
            required: false,
            include: [
                studentClassSectionTermWithSectionInclude({
                    sectionAttributes: ["classSectionsId", "class", "section", "sessionId"],
                }),
            ],
        },
        {
            model: model.sessionModel,
            as: "session",
            attributes: ["sessionId", "sessionName"],
        },
        {
            model: model.examSetupTypeTermModel,
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "examSetupTypeId", "term", "courseId"],
            where: buildScope(model.examSetupTypeTermModel),
            required: true,
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "examSetupType",
                    attributes: ["examSetupTypeId", "examType", "examName"],
                    where: buildScope(model.examSetupTypeModel),
                },
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseId", "courseName", "courseCode"],
                },
                {
                    model: model.acedmicYearModel,
                    as: "acedmicYear",
                    attributes: ["acedmicYearId", "yearTitle"],
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
