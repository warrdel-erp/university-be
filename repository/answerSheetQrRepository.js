import { Op } from "sequelize";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";

export async function countUnusedByInstitute(instituteId, universityId) {
  return model.answerSheetQrModel.count({
    where: {
      instituteId,
      universityId,
      studentId: { [Op.is]: null },
      examScheduleId: { [Op.is]: null },
    },
  });
}

export async function bulkCreateAnswerSheetQr(rows) {
  return model.answerSheetQrModel.bulkCreate(rows);
}

export async function getAnswerSheetQrs(instituteId, universityId, limit, offset) {
  const { count, rows } = await model.answerSheetQrModel.findAndCountAll({
    where: { instituteId, universityId },
    attributes: ["id", "qr", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
    order: [["id", "DESC"]],
    limit,
    offset,
  });

  return { count, rows };
}

export async function getAnswerSheetQrsByUsage(instituteId, universityId, usageType, limit, offset) {
  const whereClause = {
    instituteId,
    universityId,
    ...(usageType === "used" && {
      [Op.or]: [{ studentId: { [Op.not]: null } }, { examScheduleId: { [Op.not]: null } }],
    }),
    ...(usageType === "unused" && {
      studentId: { [Op.is]: null },
      examScheduleId: { [Op.is]: null },
    }),
  };

  const { count, rows } = await model.answerSheetQrModel.findAndCountAll({
    where: whereClause,
    attributes: ["id", "qr", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examTime", "duration", "semesterId", "sessionId", "type"],
        required: false,
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
          {
            model: model.examSetupTypeTermModel,
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "term", "courseId"],
            required: false,
            include: [
              {
                model: model.examSetupTypeModel,
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName"],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    order: [["id", "DESC"]],
    limit,
    offset,
  });

  return { count, rows };
}

export async function getAnswerSheetQrById(id, instituteId, universityId) {
  return model.answerSheetQrModel.findOne({
    where: { id, instituteId, universityId },
    attributes: ["id", "qr", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examTime", "duration", "semesterId", "sessionId", "type"],
        required: false,
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
          {
            model: model.examSetupTypeTermModel,
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "term", "courseId"],
            required: false,
            include: [
              {
                model: model.examSetupTypeModel,
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName"],
                required: false,
              },
            ],
          },
        ],
      },
    ],
  });
}

export async function getScopedStudent(studentId, instituteId, universityId) {
  return model.studentModel.findOne({
    where: { studentId, instituteId, universityId },
    attributes: ["studentId", "instituteId", "universityId"],
  });
}

export async function getScopedExamSchedule(examScheduleId, instituteId, universityId) {
  return model.examScheduleModel.findOne({
    where: { examScheduleId },
    attributes: ["examScheduleId", "examSetupTypeTermId"],
    include: [
      {
        model: model.examSetupTypeTermModel,
        as: "examSetupTypeTerm",
        attributes: ["examSetupTypeTermId", "instituteId", "universityId"],
        where: { instituteId, universityId },
        required: true,
      },
    ],
  });
}

export async function mapAnswerSheetQrOnce(qr, mappingPayload, instituteId, universityId) {
  return sequelize.transaction(async (transaction) => {
    const row = await model.answerSheetQrModel.findOne({
      where: { qr, instituteId, universityId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!row) return null;

    if (row.studentId !== null || row.examScheduleId !== null) {
      return { alreadyUsed: true, row };
    }

    await row.update(mappingPayload, { transaction });
    return { alreadyUsed: false, row };
  });
}
