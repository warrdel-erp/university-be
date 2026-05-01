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

export async function getAllHallTickets(filters = {}, transaction) {
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
        order: [["id", "DESC"]]
    });
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
