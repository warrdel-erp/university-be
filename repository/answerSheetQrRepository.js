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

function mappedListExamScheduleInclude(
  examScheduleWhere,
  search,
  { selectAttributes = true } = {},
) {
  const subjectInclude = {
    model: model.subjectModel,
    as: "subjectSchedule",
    attributes: selectAttributes
      ? ["subjectId", "subjectName", "subjectCode"]
      : [],
    required: Boolean(search),
  };

  if (search) {
    const like = `%${search}%`;
    subjectInclude.where = {
      [Op.or]: [
        { subjectName: { [Op.like]: like } },
        { subjectCode: { [Op.like]: like } },
      ],
    };
  }

  return {
    model: model.examScheduleModel,
    as: "examSchedule",
    required: true,
    where: examScheduleWhere,
    attributes: selectAttributes
      ? [
          "examScheduleId",
          "examinationSessionId",
          "examDate",
          "examTime",
          "duration",
          "term",
          "type",
          "subjectId",
          "maximumMarks",
        ]
      : [],
    include: [subjectInclude],
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
      "studentId",
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
      mappedListExamScheduleInclude(examScheduleWhere, options.search),
      {
        model: model.studentModel,
        as: "student",
        required: false,
        attributes: [
          "studentId",
          "firstName",
          "middleName",
          "lastName",
          "enrollNumber",
          "scholarNumber",
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
      {
        model: model.answersheetEvalutionUserAssignmentModel,
        as: "evaluationAssignment",
        required: false,
        attributes: [
          "assignmentId",
          "assignedToUserId",
          "notes",
          "timestamp",
          "createdAt",
        ],
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

/**
 * One row per assignment. An assignment may cover multiple examScheduleIds
 * and answerSheetIds; those are nested under the assignment.
 */
export async function findAndCountMappedAssignments(
  qrWhere,
  examScheduleWhere,
  limit,
  offset,
  options = {},
) {
  const matchingQrInclude = {
    model: model.answerSheetQrModel,
    as: "answerSheetQrs",
    required: true,
    attributes: [],
    where: qrWhere,
    include: [
      mappedListExamScheduleInclude(examScheduleWhere, options.search, {
        selectAttributes: false,
      }),
    ],
  };

  const count = await scoped(
    model.answersheetEvalutionUserAssignmentModel,
  ).count({
    distinct: true,
    col: "assignment_id",
    include: [matchingQrInclude],
    transaction: options.transaction,
  });

  if (!count) {
    return { count: 0, rows: [] };
  }

  const idRows = await scoped(
    model.answersheetEvalutionUserAssignmentModel,
  ).findAll({
    attributes: ["assignmentId"],
    include: [matchingQrInclude],
    group: ["answersheet_evalution_user_assignment.assignment_id"],
    order: [[col("answersheet_evalution_user_assignment.assignment_id"), "DESC"]],
    limit,
    offset,
    subQuery: false,
    raw: true,
    transaction: options.transaction,
  });

  const assignmentIds = [];
  for (const row of idRows) {
    assignmentIds.push(row.assignmentId ?? row.assignment_id);
  }

  if (!assignmentIds.length) {
    return { count, rows: [] };
  }

  const rows = await scoped(
    model.answersheetEvalutionUserAssignmentModel,
  ).findAll({
    where: { assignmentId: { [Op.in]: assignmentIds } },
    attributes: [
      "assignmentId",
      "assignedToUserId",
      "notes",
      "timestamp",
      "academicYearId",
      "createdBy",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: model.userModel,
        as: "assignedEvaluator",
        attributes: ["userId", "userName", "email"],
        required: true,
      },
      {
        model: model.answerSheetQrModel,
        as: "answerSheetQrs",
        required: true,
        where: qrWhere,
        attributes: [
          "examScheduleId",
          "deadlineDate",
          "evaluatedAt",
          "updatedAt",
        ],
        include: [
          mappedListExamScheduleInclude(examScheduleWhere, options.search),
        ],
      },
    ],
    order: [["assignmentId", "DESC"]],
    transaction: options.transaction,
  });

  const rowsById = new Map();
  for (const row of rows) {
    rowsById.set(row.assignmentId, row);
  }

  const orderedRows = [];
  for (const assignmentId of assignmentIds) {
    const row = rowsById.get(assignmentId);
    if (row) {
      orderedRows.push(row);
    }
  }

  return { count, rows: orderedRows };
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
