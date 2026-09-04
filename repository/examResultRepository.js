import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

const studentListAttributes = [
  "studentId",
  "scholarNumber",
  "enrollNumber",
  [
    fn(
      "TRIM",
      fn(
        "CONCAT_WS",
        " ",
        col("students.first_name"),
        col("students.middle_name"),
        col("students.last_name"),
      ),
    ),
    "studentName",
  ],
];

function studentIncludes(filters) {
  const classSectionWhere = {
    academicYearId: Number(filters.academicYearId),
    ...buildScope(model.classSectionModel),
  };
  if (filters.classSectionOr?.length) {
    classSectionWhere[Op.or] = filters.classSectionOr;
  }

  return [
    {
      model: model.courseModel,
      as: "course",
      required: true,
      attributes: ["courseId", "courseName", "courseCode"],
    },
    {
      model: model.sessionModel,
      as: "studentSession",
      required: true,
      attributes: ["sessionId", "sessionName"],
    },
    {
      model: model.classSectionTermModel,
      as: "studentClassSectionTerm",
      required: true,
      attributes: ["term"],
      where: { term: { [Op.in]: filters.terms } },
      include: [
        {
          model: model.classSectionModel,
          as: "classSection",
          required: true,
          attributes: [],
          where: classSectionWhere,
        },
      ],
    },
  ];
}

export async function findExaminationSession(examinationSessionId) {
  const where = {};
  if (examinationSessionId != null) {
    where.examinationSessionId = Number(examinationSessionId);
  }

  return scoped(model.examinationSessionModel).findOne({
    where,
    attributes: [
      "examinationSessionId",
      "sessionName",
      "academicYearId",
      "assessmentTypeId",
      "status",
    ],
    include: [
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        required: false,
        attributes: ["term"],
      },
    ],
    order: [["examinationSessionId", "DESC"]],
  });
}

export async function findSessionCourseMappingsByIds(mappingIds) {
  return scoped(model.sessionCouseMappingModel).findAll({
    where: { sessionCourseMappingId: { [Op.in]: mappingIds } },
    attributes: ["sessionCourseMappingId", "courseId", "sessionId"],
    raw: true,
  });
}

/**
 * Applicable exam schedules for an examination session.
 * Optional filters: courseIds, sessionIds, terms (includes null-term schedules).
 */
export async function findExamSchedulesByExaminationSessionId(
  examinationSessionId,
  filters = {},
) {
  const where = { examinationSessionId: Number(examinationSessionId) };

  if (filters.sessionIds?.length) {
    where.sessionId = { [Op.in]: filters.sessionIds };
  }
  if (filters.terms?.length) {
    where.term = {
      [Op.or]: [{ [Op.in]: filters.terms }, { [Op.is]: null }],
    };
  }

  const subjectWhere = { ...buildScope(model.subjectModel) };
  if (filters.courseIds?.length) {
    subjectWhere.courseId = { [Op.in]: filters.courseIds };
  }

  return scoped(model.examScheduleModel).findAll({
    where,
    attributes: [
      "examScheduleId",
      "sessionId",
      "term",
      "subjectId",
      "examDate",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        required: true,
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
        where: subjectWhere,
      },
    ],
    order: [
      ["examDate", "ASC"],
      ["examScheduleId", "ASC"],
    ],
  });
}

export async function findAnswerSheetsByStudentsAndExaminationSession(
  studentIds,
  examinationSessionId,
) {
  if (!studentIds.length) return [];

  return scoped(model.answerSheetQrModel).findAll({
    where: { studentId: { [Op.in]: studentIds } },
    attributes: [
      "id",
      "studentId",
      "examScheduleId",
      "markingStatus",
      "obtainedMarks",
      "evaluatedAt",
    ],
    include: [
      {
        model: model.examScheduleModel,
        as: "examSchedule",
        required: true,
        attributes: [],
        where: {
          examinationSessionId: Number(examinationSessionId),
          ...buildScope(model.examScheduleModel),
        },
      },
    ],
    raw: true,
  });
}

export async function findStudents(filters) {
  const studentWhere = { ...buildScope(model.studentModel) };
  if (filters.studentId != null) {
    studentWhere.studentId = Number(filters.studentId);
  }
  if (filters.search) {
    const like = `%${filters.search}%`;
    studentWhere[Op.or] = [
      { firstName: { [Op.like]: like } },
      { middleName: { [Op.like]: like } },
      { lastName: { [Op.like]: like } },
      { scholarNumber: { [Op.like]: like } },
      { enrollNumber: { [Op.like]: like } },
    ];
  }

  const options = {
    attributes: studentListAttributes,
    where: studentWhere,
    include: studentIncludes(filters),
    distinct: true,
    col: "student_id",
    subQuery: false,
    order: [["studentId", "ASC"]],
  };

  if (filters.limit != null) {
    options.limit = filters.limit;
    options.offset = filters.offset;
  }

  return scoped(model.studentModel).findAndCountAll(options);
}

export async function findOneStudent(filters) {
  return scoped(model.studentModel).findOne({
    attributes: studentListAttributes,
    where: {
      ...buildScope(model.studentModel),
      studentId: Number(filters.studentId),
    },
    include: studentIncludes(filters),
    subQuery: false,
  });
}
