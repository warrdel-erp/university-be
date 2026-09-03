import { Op, fn, col, literal } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function examScheduleDetailInclude() {
  return {
    model: model.examScheduleModel,
    as: "examSchedule",
    attributes: [
      "examScheduleId",
      "examDate",
      "examTime",
      "duration",
      "term",
      "sessionId",
      "type",
      "examinationSessionId",
      "maximumMarks",
    ],
    required: false,
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
        required: false,
        include: [
          {
            model: model.courseModel,
            as: "courseInfo",
            attributes: ["courseId", "courseName", "courseCode", "termType"],
            required: false,
          },
        ],
      },
    ],
  };
}

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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "deadlineDate", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      examScheduleDetailInclude(),
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "deadlineDate", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      examScheduleDetailInclude(),
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


export async function getScopedStudent(studentId, transaction) {
  return scoped(model.studentModel).findOne({
    where: { studentId },
    attributes: ["studentId", "instituteId", "universityId"],
    transaction,
  });
}

export async function getScopedExamSchedule(examScheduleId, transaction) {
  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
    attributes: ["examScheduleId", "examinationSessionId", "sessionId", "term"],
    transaction,
  });
}

export async function hasStudentHallTicketForExamSession(
  studentId,
  examinationSessionId,
  transaction
) {
  const row = await scoped(model.studentHallTicketModel).findOne({
    where: { studentId, examinationSessionId },
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
    attributes: [
      "id",
      "qr",
      "studentId",
      "examScheduleId",
      "assignedToUser",
      "assignmentId",
      "evaluatedAt",
      "obtainedMarks",
      "fileUploadId",
      "instituteId",
      "universityId",
    ],
    transaction,
  });
}

export async function createEvaluationUserAssignment(payload, transaction) {
  return scoped(model.answersheetEvalutionUserAssignmentModel).create(payload, {
    transaction,
  });
}

export async function assignTeacherByAnswerSheetIds(
  ids,
  assignedToUserId,
  deadlineDate,
  assignmentId,
  transaction
) {
  const [affectedCount] = await scoped(model.answerSheetQrModel).update(
    {
      assignedToUser: assignedToUserId,
      deadlineDate,
      assignmentId,
    },
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "deadlineDate", "evaluatedAt", "obtainedMarks", "fileUploadId", "createdAt"],
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        required: false,
      },
      examScheduleDetailInclude(),
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

export async function getMySingleAssignedScript(id, assignedToUserId) {
  return scoped(model.answerSheetQrModel).findOne({
    where: {
      id,
      assignedToUser: assignedToUserId,
    },
    attributes: [
      "id",
      "qr",
      "requestId",
      "examScheduleId",
      "assignedToUser",
      "deadlineDate",
      "evaluatedAt",
      "obtainedMarks",
      "fileUploadId",
      "createdAt",
    ],
    include: [
      examScheduleDetailInclude(),
      {
        model: model.s3FileModel,
        as: "s3File",
        required: false,
        attributes: ["id", "status", "s3Key"],
      },
    ],
  });
}

/**
 * Answer sheets mapped to a student + exam schedule under the given session.
 */
export async function findExamScheduleIdsByWhere(where, options = {}) {
  return scoped(model.examScheduleModel).findAll({
    where,
    attributes: ["examScheduleId"],
    include: options.include,
    transaction: options.transaction,
  });
}

export async function findAndCountMappedAnswerSheets(
  qrWhere,
  examScheduleWhere,
  limit,
  offset,
  options = {},
) {
  return scoped(model.answerSheetQrModel).findAndCountAll({
    where: qrWhere,
    attributes: [
      "id",
      "qr",
      "examScheduleId",
      "assignedToUser",
      "deadlineDate",
      "evaluatedAt",
      "obtainedMarks",
      "fileUploadId",
      "createdAt",
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        where: examScheduleWhere,
        attributes: [
          "examScheduleId",
          "examinationSessionId",
          "examDate",
          "examTime",
          "term",
          "type",
          "subjectId",
        ],
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
        ],
      },
      {
        model: model.s3FileModel,
        as: "s3File",
        required: false,
        attributes: ["id", "status", "s3Key"],
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
    distinct: true,
    subQuery: false,
    transaction: options.transaction,
  });
}

export async function findAndCountMappedAssignments(
  qrWhere,
  examScheduleWhere,
  limit,
  offset,
  options = {},
) {
  const result = await scoped(model.answerSheetQrModel).findAndCountAll({
    where: qrWhere,
    attributes: [
      "assignmentId",
      "assignedToUser",
      "examScheduleId",
      [fn("MAX", col("deadline_date")), "deadlineDate"],
      [fn("COUNT", col("answer_sheet_qr.id")), "totalScripts"],
      [
        fn("SUM", literal("CASE WHEN evaluated_at IS NOT NULL THEN 1 ELSE 0 END")),
        "gradedScripts",
      ],
      [
        fn("SUM", literal("CASE WHEN evaluated_at IS NULL THEN 1 ELSE 0 END")),
        "remainingScripts",
      ],
      [fn("MIN", col("answer_sheet_qr.updated_at")), "assignedAt"],
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        where: examScheduleWhere,
        attributes: [
          "examScheduleId",
          "examinationSessionId",
          "examDate",
          "examTime",
          "term",
          "type",
          "subjectId",
        ],
        include: [
          {
            model: model.subjectModel,
            as: "subjectSchedule",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
        ],
      },
      {
        model: model.userModel,
        as: "assignedTeacher",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
      {
        model: model.answersheetEvalutionUserAssignmentModel,
        as: "evaluationAssignment",
        required: false,
      },
    ],
    group: [
      "assignmentId",
      "assignedToUser",
      "examScheduleId",
      "examSchedule.exam_schedule_id",
      "examSchedule->subjectSchedule.subject_id",
      "assignedTeacher.user_id",
      "evaluationAssignment.assignment_id",
    ],
    order: [["assignmentId", "DESC"]],
    limit,
    offset,
    subQuery: false,
    transaction: options.transaction,
  });

  return {
    count: Array.isArray(result.count) ? result.count.length : result.count,
    rows: result.rows,
  };
}

export async function getEvaluationAssignmentById(assignmentId) {
  return scoped(model.answersheetEvalutionUserAssignmentModel).findOne({
    where: { assignmentId },
    attributes: [
      "assignmentId",
      "universityId",
      "instituteId",
      "academicYearId",
      "assignedToUserId",
      "notes",
      "timestamp",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: model.userModel,
        as: "assignedEvaluator",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
      {
        model: model.userModel,
        as: "createdByUser",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
      {
        model: model.userModel,
        as: "updatedByUser",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: [
          "academicYearId",
          "yearTitle",
          "startingDate",
          "endingDate",
          "isActive",
        ],
        required: false,
      },
    ],
  });
}

export async function findAnswerSheetsByAssignmentId(assignmentId) {
  return scoped(model.answerSheetQrModel).findAll({
    where: { assignmentId },
    attributes: [
      "id",
      "qr",
      "requestId",
      "examScheduleId",
      "assignedToUser",
      "assignmentId",
      "deadlineDate",
      "evaluatedAt",
      "obtainedMarks",
      "fileUploadId",
      "createdAt",
      "updatedAt",
    ],
    include: [
      examScheduleDetailInclude(),
      {
        model: model.s3FileModel,
        as: "s3File",
        required: false,
        attributes: ["id", "status", "s3Key"],
      },
      {
        model: model.userModel,
        as: "assignedTeacher",
        attributes: ["userId", "userName", "email"],
        required: false,
      },
    ],
    order: [["id", "ASC"]],
  });
}

export async function findAssignmentAnswerSheetStats(assignmentId) {
  const today = new Date().toISOString().slice(0, 10);

  const row = await scoped(model.answerSheetQrModel).findOne({
    attributes: [
      [fn("COUNT", col("id")), "totalAssigned"],
      [
        fn(
          "SUM",
          literal("CASE WHEN evaluated_at IS NOT NULL THEN 1 ELSE 0 END"),
        ),
        "graded",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN evaluated_at IS NULL THEN 1 ELSE 0 END"),
        ),
        "notChecked",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN evaluated_at IS NULL AND deadline_date IS NOT NULL AND deadline_date < '${today}' THEN 1 ELSE 0 END`,
          ),
        ),
        "overdue",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN evaluated_at IS NULL AND deadline_date = '${today}' THEN 1 ELSE 0 END`,
          ),
        ),
        "dueToday",
      ],
      [fn("MAX", col("deadline_date")), "deadlineDate"],
    ],
    where: { assignmentId },
    raw: true,
  });

  return {
    totalAssigned: Number(row?.totalAssigned ?? 0),
    graded: Number(row?.graded ?? 0),
    notChecked: Number(row?.notChecked ?? 0),
    overdue: Number(row?.overdue ?? 0),
    dueToday: Number(row?.dueToday ?? 0),
    deadlineDate: row?.deadlineDate ?? null,
  };
}

export async function findMyAnswerSheetSkuStats(assignedToUserId) {
  const today = new Date().toISOString().slice(0, 10);

  const row = await scoped(model.answerSheetQrModel).findOne({
    attributes: [
      [fn("COUNT", col("id")), "totalAssigned"],
      [
        fn(
          "SUM",
          literal("CASE WHEN evaluated_at IS NOT NULL THEN 1 ELSE 0 END"),
        ),
        "graded",
      ],
      [
        fn(
          "SUM",
          literal("CASE WHEN evaluated_at IS NULL THEN 1 ELSE 0 END"),
        ),
        "notChecked",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN evaluated_at IS NULL AND deadline_date IS NOT NULL AND deadline_date < '${today}' THEN 1 ELSE 0 END`,
          ),
        ),
        "overdue",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN evaluated_at IS NULL AND deadline_date = '${today}' THEN 1 ELSE 0 END`,
          ),
        ),
        "dueToday",
      ],
    ],
    where: {
      assignedToUser: assignedToUserId,
    },
    raw: true,
  });

  return {
    totalAssigned: Number(row?.totalAssigned ?? 0),
    graded: Number(row?.graded ?? 0),
    notChecked: Number(row?.notChecked ?? 0),
    overdue: Number(row?.overdue ?? 0),
    dueToday: Number(row?.dueToday ?? 0),
  };
}
