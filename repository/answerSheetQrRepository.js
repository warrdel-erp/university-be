import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

function examScheduleDetailInclude() {
  return {
    model: model.examScheduleModel,
    as: "examSchedule",
    attributes: ["examScheduleId", "examDate", "examTime", "duration", "term", "sessionId", "type"],
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
          {
            model: model.courseModel,
            as: "course",
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
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
    attributes: ["id", "qr", "requestId", "studentId", "examScheduleId", "assignedToUser", "evaluatedAt", "obtainedMarks", "fileUploadId", "instituteId", "universityId", "createdAt"],
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
  const termScope = buildScope(model.examSetupTypeTermModel);

  return scoped(model.examScheduleModel).findOne({
    where: { examScheduleId },
    attributes: ["examScheduleId", "examSetupTypeTermId", "sessionId"],
    include: [
      {
        model: model.examSetupTypeTermModel,
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

/**
 * Resolve sessionCourseMappingId → courseId + sessionId, then matching exam_schedule ids.
 */
async function findExamScheduleIdsForSelections(
  examinationSessionId,
  selections,
) {
  const mappingIds = [];
  for (const selection of selections) {
    mappingIds.push(selection.sessionCourseMappingId);
  }

  const mappings = await scoped(model.sessionCouseMappingModel).findAll({
    where: { sessionCourseMappingId: { [Op.in]: mappingIds } },
    attributes: ["sessionCourseMappingId", "courseId", "sessionId"],
  });

  const mappingById = new Map();
  for (const mapping of mappings) {
    mappingById.set(mapping.sessionCourseMappingId, mapping);
  }

  const selectionOr = [];
  for (const selection of selections) {
    const mapping = mappingById.get(selection.sessionCourseMappingId);
    if (!mapping) {
      continue;
    }

    const clause = {
      sessionId: mapping.sessionId,
      "$subjectSchedule.course_id$": mapping.courseId,
    };
    if (selection.terms && selection.terms.length > 0) {
      clause.term = { [Op.in]: selection.terms };
    }
    selectionOr.push(clause);
  }

  if (selectionOr.length === 0) {
    return [];
  }

  const rows = await scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionId,
      ...buildScope(model.examScheduleModel),
      [Op.or]: selectionOr,
    },
    attributes: ["examScheduleId"],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: [],
        required: true,
      },
    ],
  });

  const examScheduleIds = [];
  for (const row of rows) {
    examScheduleIds.push(row.examScheduleId);
  }
  return examScheduleIds;
}

/**
 * Answer sheets that have a mapped S3 file and belong to schedules
 * under the given examination session.
 */
export async function getMappedAnswerSheetsByExamSession(
  examinationSessionId,
  filters,
  limit,
  offset,
) {
  const examScheduleWhere = {
    examinationSessionId,
    ...buildScope(model.examScheduleModel),
  };

  if (filters.examScheduleId && filters.examScheduleId.length > 0) {
    examScheduleWhere.examScheduleId = { [Op.in]: filters.examScheduleId };
  }

  if (filters.term && filters.term.length > 0) {
    examScheduleWhere.term = { [Op.in]: filters.term };
  }

  if (filters.selections && filters.selections.length > 0) {
    const selectionScheduleIds = await findExamScheduleIdsForSelections(
      examinationSessionId,
      filters.selections,
    );
    if (selectionScheduleIds.length === 0) {
      return { count: 0, rows: [] };
    }

    if (examScheduleWhere.examScheduleId) {
      const allowed = new Set(selectionScheduleIds);
      const intersected = [];
      for (const id of examScheduleWhere.examScheduleId[Op.in]) {
        if (allowed.has(id)) {
          intersected.push(id);
        }
      }
      if (intersected.length === 0) {
        return { count: 0, rows: [] };
      }
      examScheduleWhere.examScheduleId = { [Op.in]: intersected };
    } else {
      examScheduleWhere.examScheduleId = { [Op.in]: selectionScheduleIds };
    }
  }

  const qrWhere = {
    fileUploadId: { [Op.ne]: null },
  };

  if (filters.search) {
    const like = `%${filters.search}%`;
    qrWhere[Op.or] = [
      { "$student.first_name$": { [Op.like]: like } },
      { "$student.middle_name$": { [Op.like]: like } },
      { "$student.last_name$": { [Op.like]: like } },
      { "$examSchedule.subjectSchedule.subject_name$": { [Op.like]: like } },
    ];
  }

  return scoped(model.answerSheetQrModel).findAndCountAll({
    where: qrWhere,
    attributes: [
      "id",
      "qr",
      "studentId",
      "examScheduleId",
      "assignedToUser",
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
        model: model.studentModel,
        as: "student",
        attributes: [
          "studentId",
          "firstName",
          "middleName",
          "lastName",
          "enrollNumber",
          "scholarNumber",
        ],
        required: false,
      },
      {
        model: model.s3FileModel,
        as: "s3File",
        required: true,
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
  });
}
