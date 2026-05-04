import { Op } from "sequelize";
import * as model from "../models/index.js";

export async function findExamSetupTypeTermById(examSetupTypeTermId, transaction) {
    return model.examSetupTypeTermModel.findByPk(examSetupTypeTermId, {
        transaction,
        include: [
            {
                model: model.examSetupTypeModel,
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName", "isPublish"]
            }
        ]
    });
}

export async function getSchedulesByExamSetupTypeTermAndSession(examSetupTypeTermId, sessionId, transaction) {
    return model.examScheduleModel.findAll({
        transaction,
        where: { examSetupTypeTermId, sessionId },
        attributes: ["examScheduleId", "examDate", "examTime"]
    });
}

/** All scheduled papers for this exam setup type term + session (same exam “type” cohort as the hall ticket). */
export async function getSchedulesWithSubjectsForExamTermSession(examSetupTypeTermId, sessionId, transaction) {
    return model.examScheduleModel.findAll({
        transaction,
        where: { examSetupTypeTermId, sessionId },
        attributes: ["examScheduleId", "subjectId", "semesterId", "examDate", "examTime", "duration", "type"],
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                required: false,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            },
            {
                model: model.semesterModel,
                as: "semesterexam",
                required: false,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            },
        ],
        order: [
            ["examDate", "ASC"],
            ["examTime", "ASC"],
            ["examScheduleId", "ASC"],
        ],
    });
}

export async function getEligibleStudents(sessionId, courseId, term, instituteId, universityId, transaction) {
    return model.studentModel.findAll({
        transaction,
        attributes: ["studentId"],
        where: {
            sessionId,
            instituteId,
            universityId
        },
        include: [
            {
                model: model.classSectionModel,
                as: "studentSections",
                required: true,
                attributes: [],
                where: {
                    sessionId,
                    courseId,
                    instituteId,
                    acedmicYearId: { [Op.ne]: null }
                },
                include: [
                    {
                        model: model.classModel,
                        as: "classGroup",
                        required: true,
                        attributes: [],
                        where: { term }
                    }
                ]
            }
        ]
    });
}

export async function createHallTicket(payload, transaction) {
    return model.studentHallTicketModel.create(payload, { transaction });
}

export async function bulkCreateHallTickets(payloads, transaction) {
    return model.studentHallTicketModel.bulkCreate(payloads, { transaction });
}

export async function getHallTicketById(id, transaction) {
    return model.studentHallTicketModel.findByPk(id, {
        transaction,
        include: getHallTicketIncludes()
    });
}

export async function getHallTicketByQr(qr, instituteId, universityId, transaction) {
    return model.studentHallTicketModel.findOne({
        transaction,
        where: { qr, instituteId, universityId },
        include: getHallTicketIncludes()
    });
}

export async function getAllHallTickets(filters = {}, transaction, options = {}) {
    const where = {
        ...(filters.examSetupTypeTermId && { examSetupTypeTermId: filters.examSetupTypeTermId }),
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.studentId && { studentId: filters.studentId }),
        ...(filters.instituteId && { instituteId: filters.instituteId }),
        ...(filters.universityId && { universityId: filters.universityId })
    };

    return model.studentHallTicketModel.findAll({
        transaction,
        where,
        include: getHallTicketIncludes(),
        order: [["id", "DESC"]],
        ...(options.limit != null && { limit: options.limit }),
        ...(options.offset != null && { offset: options.offset }),
    });
}

export async function countHallTickets(filters = {}, transaction) {
    const where = {
        ...(filters.examSetupTypeTermId && { examSetupTypeTermId: filters.examSetupTypeTermId }),
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.studentId && { studentId: filters.studentId }),
        ...(filters.instituteId && { instituteId: filters.instituteId }),
        ...(filters.universityId && { universityId: filters.universityId }),
    };

    return model.studentHallTicketModel.count({ where, transaction });
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
            include: [
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    attributes: ["classSectionsId", "class", "section", "sessionId"],
                    required: false,
                },
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
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "examSetupType",
                    attributes: ["examSetupTypeId", "examType", "examName"],
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
