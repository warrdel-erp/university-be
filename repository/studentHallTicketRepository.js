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

export async function upsertHallTicket(payload, transaction) {
    const existing = await model.studentHallTicketModel.findOne({
        transaction,
        where: {
            examSetupTypeTermId: payload.examSetupTypeTermId,
            sessionId: payload.sessionId,
            studentId: payload.studentId
        }
    });

    if (existing) {
        await existing.update({
            qr: payload.qr,
            instituteId: payload.instituteId,
            universityId: payload.universityId
        }, { transaction });
        return existing;
    }

    return model.studentHallTicketModel.create(payload, { transaction });
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

    const include =
        options.fullDetail === true ? getHallTicketIncludesFull() : getHallTicketIncludes();

    return model.studentHallTicketModel.findAll({
        transaction,
        where,
        include,
        order: [["id", "DESC"]]
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

export async function updateHallTicket(id, payload, transaction) {
    const hallTicket = await model.studentHallTicketModel.findByPk(id, { transaction });
    if (!hallTicket) return null;
    await hallTicket.update(payload, { transaction });
    return hallTicket;
}

export async function deleteHallTicket(id, transaction) {
    return model.studentHallTicketModel.destroy({ where: { id }, transaction });
}

function getHallTicketIncludes() {
    return [
        {
            model: model.studentModel,
            as: "student",
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber"]
        },
        {
            model: model.sessionModel,
            as: "session",
            attributes: ["sessionId", "sessionName"]
        },
        {
            model: model.examSetupTypeTermModel,
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "examSetupTypeId", "term", "courseId"],
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "examSetupType",
                    attributes: ["examSetupTypeId", "examType", "examName"]
                }
            ]
        }
    ];
}

/** Full hall ticket row + institute/university + complete student + richer exam/session context (for GET /all). */
function getHallTicketIncludesFull() {
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
        },
        {
            model: model.examSetupTypeTermModel,
            as: "examSetupTypeTerm",
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "examSetupType",
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
