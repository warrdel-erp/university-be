import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function countUnusedByInstitute(transaction) {
  return scoped(model.answerSheetQrModel).count({
    where: {
      studentId: { [Op.is]: null },
      examScheduleId: { [Op.is]: null },
    },
    transaction,
  });
}

export async function bulkCreateAnswerSheetQr(rows, transaction) {
  return scoped(model.answerSheetQrModel).bulkCreate(rows, { transaction });
}

export async function getAnswerSheetQrById(id, transaction) {
  return scoped(model.answerSheetQrModel).findOne({
    where: { id },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
    include: [
      {
        model: model.studentModel.unscoped(),
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      {
        model: model.examScheduleModel.unscoped(),
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examTime", "duration", "semesterId", "sessionId", "type"],
        required: false,
        include: [
          {
            model: model.subjectModel.unscoped(),
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
          {
            model: model.examSetupTypeTermModel.unscoped(),
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "term", "courseId"],
            required: false,
            include: [
              {
                model: model.examSetupTypeModel.unscoped(),
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName"],
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: model.userModel.unscoped(),
        as: "assignedTeacher",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
    ],
    transaction,
  });
}

export async function getAnswerSheetQrGenerationRequests(limit, offset) {
  const whereClause = {
    requestId: { [Op.not]: null },
  };

  const groupedRows = await scoped(model.answerSheetQrModel).findAll({
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

  const totalRequests = await scoped(model.answerSheetQrModel).count({
    where: whereClause,
    distinct: true,
    col: "requestId",
  });

  return { groupedRows, totalRequests };
}

export async function getAnswerSheetQrUsageByRequestId(requestId) {
  return scoped(model.answerSheetQrModel).findAll({
    where: { requestId },
    attributes: ["studentId", "examScheduleId"],
    raw: true,
  });
}

export async function getAnswerSheetQrsByRequestId(
  requestId,
  limit,
  offset
) {
  return scoped(model.answerSheetQrModel).findAndCountAll({
    where: { requestId },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
    include: [
      {
        model: model.studentModel.unscoped(),
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      {
        model: model.examScheduleModel.unscoped(),
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examTime", "duration", "semesterId", "sessionId", "type"],
        required: false,
        include: [
          {
            model: model.subjectModel.unscoped(),
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
          {
            model: model.examSetupTypeTermModel.unscoped(),
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "term", "courseId"],
            required: false,
            include: [
              {
                model: model.examSetupTypeModel.unscoped(),
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName"],
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: model.userModel.unscoped(),
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


export async function getScopedStudent(studentId, transaction) {
  return scoped(model.studentModel).findOne({
    where: { studentId },
    attributes: ["studentId", "instituteId", "universityId"],
    transaction,
  });
}

export async function getScopedExamSchedule(examScheduleId, transaction) {
  const termScope = buildScope(model.examSetupTypeTermModel);

  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
    attributes: ["examScheduleId", "examSetupTypeTermId", "sessionId"],
    include: [
      {
        model: model.examSetupTypeTermModel.unscoped(),
        as: "examSetupTypeTerm",
        attributes: ["examSetupTypeTermId", "instituteId", "universityId"],
        where: termScope,
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
  transaction
) {
  const row = await scoped(model.studentHallTicketModel).findOne({
    where: { studentId, examSetupTypeTermId, sessionId },
    attributes: ["id"],
    transaction,
  });
  return Boolean(row);
}

export async function mapAnswerSheetQrOnce(
  qr,
  studentId,
  examScheduleId,
  transaction
) {
  const row = await scoped(model.answerSheetQrModel).findOne({
    where: { qr },
    transaction,
  });

  if (!row) return null;

  if (row.studentId && row.examScheduleId) {
    return { answerSheetAlreadyMapped: true, row };
  }

  const existingPair = await scoped(model.answerSheetQrModel).findOne({
    where: {
      studentId,
      examScheduleId,
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

export async function getScopedUser(userId, transaction) {
  return scoped(model.userModel).findOne({
    where: { userId },
    attributes: ["userId", "userName", "email", "defaultInstituteId", "universityId"],
    transaction,
  });
}

export async function getAnswerSheetQrsByIds(ids, transaction) {
  return scoped(model.answerSheetQrModel).findAll({
    where: {
      id: { [Op.in]: ids },
    },
    attributes: ["id", "qr", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId"],
    transaction,
  });
}

export async function assignTeacherByAnswerSheetIds(
  ids,
  assignedToUserId,
  transaction
) {
  const [affectedCount] = await scoped(model.answerSheetQrModel).update(
    { assignedToUser: assignedToUserId },
    {
      where: { id: { [Op.in]: ids } },
      transaction,
    }
  );
  return affectedCount;
}

export async function assignMarksByAnswerSheetId(
  id,
  obtainedMarks,
  evaluatedAt,
  transaction
) {
  const [affectedCount] = await scoped(model.answerSheetQrModel).update(
    { obtainedMarks, evaluatedAt },
    {
      where: { id },
      transaction,
    }
  );
  return affectedCount;
}

export async function getScriptsAssignedToTeacher(
  assignedToUserId,
  limit,
  offset
) {
  return scoped(model.answerSheetQrModel).findAndCountAll({
    where: {
      assignedToUser: assignedToUserId,
    },
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "createdAt"],
    include: [
      {
        model: model.studentModel.unscoped(),
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      {
        model: model.examScheduleModel.unscoped(),
        as: "examSchedule",
        attributes: ["examScheduleId", "examDate", "examTime", "duration", "semesterId", "sessionId", "type"],
        required: false,
        include: [
          {
            model: model.subjectModel.unscoped(),
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
          {
            model: model.examSetupTypeTermModel.unscoped(),
            as: "examSetupTypeTerm",
            attributes: ["examSetupTypeTermId", "term", "courseId"],
            required: false,
            include: [
              {
                model: model.examSetupTypeModel.unscoped(),
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examType", "examName"],
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: model.userModel.unscoped(),
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
