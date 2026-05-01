import { Op } from "sequelize";
import * as model from "../models/index.js";

export async function countUnusedByInstitute(instituteId, universityId, transaction) {
  return model.answerSheetQrModel.count({
    where: {
      instituteId,
      universityId,
      studentId: { [Op.is]: null },
      examScheduleId: { [Op.is]: null },
    },
    transaction,
  });
}

export async function bulkCreateAnswerSheetQr(rows, transaction) {
  return model.answerSheetQrModel.bulkCreate(rows, { transaction });
}

export async function getAnswerSheetQrs(instituteId, universityId, limit, offset, transaction) {
  const { count, rows } = await model.answerSheetQrModel.findAndCountAll({
    where: { instituteId, universityId },
    attributes: ["id", "qr", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
    order: [["id", "DESC"]],
    limit,
    offset,
    transaction,
  });

  return { count, rows };
}

export async function getAnswerSheetQrsByUsage(
  instituteId,
  universityId,
  usageType,
  limit,
  offset,
  transaction
) {
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
    transaction,
  });

  return { count, rows };
}

export async function getAnswerSheetQrById(id, instituteId, universityId, transaction) {
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
    transaction,
  });
}

export async function getScopedStudent(studentId, instituteId, universityId, transaction) {
  return model.studentModel.findOne({
    where: { studentId, instituteId, universityId },
    attributes: ["studentId", "instituteId", "universityId"],
    transaction,
  });
}

export async function getScopedExamSchedule(examScheduleId, instituteId, universityId, transaction) {
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
    transaction,
  });
}

export async function mapAnswerSheetQrOnce(qr, mappingPayload, instituteId, universityId, transaction) {
  const row = await model.answerSheetQrModel.findOne({
    where: { qr, instituteId, universityId },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

  if (!row) return null;

  if (row.studentId !== null || row.examScheduleId !== null) {
    return { alreadyUsed: true, row };
  }

  await row.update(mappingPayload, { transaction });
  return { alreadyUsed: false, row };
}
