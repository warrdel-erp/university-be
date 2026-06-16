import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function findExamSetupTypeTermById(examSetupTypeTermId, transaction) {
    return scoped(model.examSetupTypeTermModel).findByPk(examSetupTypeTermId, {
        transaction,
        include: [
            {
                model: model.examSetupTypeModel.unscoped(),
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
                model: model.subjectModel.unscoped(),
                as: "subjectSchedule",
                required: false,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                where: buildScope(model.subjectModel),
            },
            {
                model: model.semesterModel.unscoped(),
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
            {
                model: model.classSectionModel.unscoped(),
                as: "studentSections",
                required: true,
                attributes: [],
                where: {
                    ...buildScope(model.classSectionModel),
                    sessionId,
                    courseId,
                    acedmicYearId: { [Op.ne]: null },
                },
                include: [
                    {
                        model: model.classModel.unscoped(),
                        as: "classGroup",
                        required: true,
                        attributes: [],
                        where: { term },
                    },
                ],
            },
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

function getHallTicketIncludes() {
    return [
        {
            model: model.instituteModel.unscoped(),
            as: "institute",
            attributes: ["instituteId", "instituteName"],
        },
        {
            model: model.universityModel.unscoped(),
            as: "university",
            attributes: ["universityId", "universityName"],
        },
        {
            model: model.studentModel.unscoped(),
            as: "student",
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"],
            where: buildScope(model.studentModel),
            required: false,
            include: [
                {
                    model: model.classSectionModel.unscoped(),
                    as: "studentSections",
                    attributes: ["classSectionsId", "class", "section", "sessionId"],
                    required: false,
                },
            ],
        },
        {
            model: model.sessionModel.unscoped(),
            as: "session",
            attributes: ["sessionId", "sessionName"],
        },
        {
            model: model.examSetupTypeTermModel.unscoped(),
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "examSetupTypeId", "term", "courseId"],
            where: buildScope(model.examSetupTypeTermModel),
            required: true,
            include: [
                {
                    model: model.examSetupTypeModel.unscoped(),
                    as: "examSetupType",
                    attributes: ["examSetupTypeId", "examType", "examName"],
                    where: buildScope(model.examSetupTypeModel),
                },
                {
                    model: model.courseModel.unscoped(),
                    as: "course",
                    attributes: ["courseId", "courseName", "courseCode"],
                },
                {
                    model: model.acedmicYearModel.unscoped(),
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
