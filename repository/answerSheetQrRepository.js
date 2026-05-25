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

export async function getAnswerSheetQrById(id, instituteId, universityId, transaction) {
  return model.answerSheetQrModel.findOne({
    where: { id, instituteId, universityId },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
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
      {
        model: model.userModel,
        as: "assignedTeacher",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
    ],
    transaction,
  });
}

export async function getAnswerSheetQrGenerationRequests(instituteId, universityId, limit, offset) {
  const whereClause = {
    instituteId,
    universityId,
    requestId: { [Op.not]: null },
  };

  const groupedRows = await model.answerSheetQrModel.findAll({
    where: whereClause,
    attributes: [
      "requestId",
      [fn("COUNT", col("id")), "totalQrs"],
      [fn("MAX", col("created_at")), "generatedAt"],
    ],
    group: ["requestId"],
    order: [[fn("MAX", col("created_at")), "DESC"]],
    limit,
    offset,
    raw: true,
  });

  const totalRequests = await model.answerSheetQrModel.count({
    where: whereClause,
    distinct: true,
    col: "requestId",
  });

  return { groupedRows, totalRequests };
}

export async function getAnswerSheetQrUsageByRequestId(instituteId, universityId, requestId) {
  return model.answerSheetQrModel.findAll({
    where: {
      instituteId,
      universityId,
      requestId,
    },
    attributes: ["studentId", "examScheduleId"],
    raw: true,
  });
}

export async function getAnswerSheetQrsByRequestId(
  instituteId,
  universityId,
  requestId,
  limit,
  offset
) {
  return model.answerSheetQrModel.findAndCountAll({
    where: { instituteId, universityId, requestId },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
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
      {
        model: model.userModel,
        as: "assignedTeacher",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
    ],
    order: [["id", "DESC"]],
    limit,
    offset,
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
    attributes: ["examScheduleId", "examSetupTypeTermId", "sessionId"],
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

export async function hasStudentHallTicketForExamTerm(
  studentId,
  examSetupTypeTermId,
  sessionId,
  instituteId,
  universityId,
  transaction
) {
  const row = await model.studentHallTicketModel.findOne({
    where: { studentId, examSetupTypeTermId, sessionId, instituteId, universityId },
    attributes: ["id"],
    transaction,
  });
  return Boolean(row);
}

export async function mapAnswerSheetQrOnce(
  qr,
  studentId,
  examScheduleId,
  instituteId,
  universityId,
  transaction
) {
  const row = await model.answerSheetQrModel.findOne({
    where: { qr, instituteId, universityId },
    transaction,
  });

  if (!row) return null;

  if (row.studentId && row.examScheduleId) {
    return { answerSheetAlreadyMapped: true, row };
  }

  const existingPair = await model.answerSheetQrModel.findOne({
    where: {
      studentId,
      examScheduleId,
      instituteId,
      universityId,
      id: { [Op.ne]: row.id },
    },
    transaction,
  });

  if (existingPair) {
    return { studentExamAlreadyMapped: true, row };
  }

  await row.update({ studentId, examScheduleId }, { transaction });

  return { row, answerSheetAlreadyMapped: false, studentExamAlreadyMapped: false };
}

export async function getScopedUser(userId, instituteId, universityId, transaction) {
  return model.userModel.findOne({
    where: { userId, defaultInstituteId: instituteId, universityId },
    attributes: ["userId", "userName", "email", "defaultInstituteId", "universityId"],
    transaction,
  });
}

export async function getAnswerSheetQrsByIds(ids, instituteId, universityId, transaction) {
  return model.answerSheetQrModel.findAll({
    where: {
      id: { [Op.in]: ids },
      instituteId,
      universityId,
    },
    attributes: ["id", "qr", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId"],
    transaction,
  });
}

export async function assignTeacherByAnswerSheetIds(
  ids,
  assignedToUserId,
  instituteId,
  universityId,
  transaction
) {
  const [affectedCount] = await model.answerSheetQrModel.update(
    { assignedToUser: assignedToUserId },
    {
      where: { id: { [Op.in]: ids }, instituteId, universityId },
      transaction,
    }
  );
  return affectedCount;
}

export async function assignMarksByAnswerSheetId(
  id,
  obtainedMarks,
  evaluatedAt,
  instituteId,
  universityId,
  transaction
) {
  const [affectedCount] = await model.answerSheetQrModel.update(
    { obtainedMarks, evaluatedAt },
    {
      where: { id, instituteId, universityId },
      transaction,
    }
  );
  return affectedCount;
}

export async function getScriptsAssignedToTeacher(
  assignedToUserId,
  instituteId,
  universityId,
  limit,
  offset
) {
  return model.answerSheetQrModel.findAndCountAll({
    where: {
      assignedToUser:assignedToUserId,
      instituteId,
      universityId,
    },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "createdAt"],
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
      {
        model: model.userModel,
        as: "assignedTeacher",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
    ],
    order: [["id", "DESC"]],
    limit,
    offset,
  });
}