import { Op, fn, col } from "sequelize";
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
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

export async function getAnswerSheetQrGenerationRequests(instituteId, universityId, limit, offset, transaction) {
  const whereClause = {
    instituteId,
    universityId,
    requestId: { [Op.not]: null },
  };

  const [count, groupedRows] = await Promise.all([
    model.answerSheetQrModel.count({
      where: whereClause,
      distinct: true,
      col: "request_id",
      transaction,
    }),
    model.answerSheetQrModel.findAll({
      where: whereClause,
      attributes: [
        "requestId",
        [fn("COUNT", col("id")), "totalQrs"],
        [fn("MIN", col("created_at")), "firstGeneratedAt"],
        [fn("MAX", col("created_at")), "lastGeneratedAt"],
      ],
      group: ["requestId"],
      order: [[fn("MAX", col("created_at")), "DESC"]],
      limit,
      offset,
      raw: true,
      transaction,
    }),
  ]);

  const requestIds = groupedRows.map((row) => row.requestId).filter(Boolean);

  let usageRows = [];
  if (requestIds.length) {
    usageRows = await model.answerSheetQrModel.findAll({
      where: {
        instituteId,
        universityId,
        requestId: { [Op.in]: requestIds },
      },
      attributes: ["requestId", "studentId", "examScheduleId"],
      raw: true,
      transaction,
    });
  }

  const usageMap = usageRows.reduce((acc, row) => {
    const key = row.requestId;
    if (!acc[key]) {
      acc[key] = { mappedQrs: 0, unmappedQrs: 0 };
    }
    if (row.studentId != null || row.examScheduleId != null) {
      acc[key].mappedQrs += 1;
    } else {
      acc[key].unmappedQrs += 1;
    }
    return acc;
  }, {});

  const rows = groupedRows.map((row) => {
    const usage = usageMap[row.requestId] || { mappedQrs: 0, unmappedQrs: 0 };
    return {
      ...row,
      totalQrs: Number(row.totalQrs || 0),
      mappedQrs: usage.mappedQrs,
      unmappedQrs: usage.unmappedQrs,
    };
  });

  return { count: Number(count || 0), rows };
}

export async function getAnswerSheetQrsByRequestId(
  instituteId,
  universityId,
  requestId,
  limit,
  offset,
  transaction
) {
  const { count, rows } = await model.answerSheetQrModel.findAndCountAll({
    where: { instituteId, universityId, requestId },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "instituteId", "universityId", "createdAt"],
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

  if (mappingPayload.examScheduleId != null) {
    const existingExamScheduleMapping = await model.answerSheetQrModel.findOne({
      where: {
        examScheduleId: mappingPayload.examScheduleId,
        instituteId,
        universityId,
        id: { [Op.ne]: row.id },
      },
      transaction,
      lock: transaction?.LOCK?.UPDATE,
    });

    if (existingExamScheduleMapping) {
      return { examScheduleAlreadyMapped: true, row };
    }
  }

  await row.update(mappingPayload, { transaction });
  return { examScheduleAlreadyMapped: false, row };
}