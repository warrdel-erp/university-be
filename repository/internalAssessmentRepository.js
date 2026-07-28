import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamSetupType(examSetupTypeId, transaction) {
  return scoped(model.examSetupTypeModel).findOne({
    where: { examSetupTypeId },
    attributes: ["examSetupTypeId"],
    transaction,
  });
}

async function assertScopedSubject(subjectId, transaction) {
  return scoped(model.subjectModel).findOne({
    where: { subjectId },
    attributes: ["subjectId"],
    transaction,
  });
}

async function assertScopedEmployee(userId, transaction) {
  return scoped(model.employeeModel).findOne({
    where: { userId },
    attributes: ["userId"],
    transaction,
  });
}

async function assertScopedInternalAssessment(examAssessmentId, transaction) {
  return model.internalAssessmentModel.findOne({
    where: { examAssessmentId },
    attributes: ["examAssessmentId", "examSetupTypeId"],
    transaction,
    include: [
      {
        model: model.examSetupTypeModel,
        as: "assessmentExamType",
        required: true,
        where: buildScope(model.examSetupTypeModel),
        attributes: ["examSetupTypeId"],
      },
    ],
  });
}

const assessmentSubjectInclude = {
  model: model.subjectModel,
  as: "assessmentSubject",
  attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
  where: buildScope(model.subjectModel),
  required: true,
  include: [
    {
      model: model.courseModel,
      as: "courseInfo",
      attributes: ["termType"],
      required: true,
    },
  ],
};

const assessmentExamTypeEvaluationInclude = {
  model: model.examSetupTypeModel,
  as: "assessmentExamType",
  attributes: ["examSetupTypeId", "examType", "examName"],
  where: buildScope(model.examSetupTypeModel),
  required: true,
  include: [
    {
      model: model.syllabusDetailsModel,
      as: "syllabusDetailsExam",
      attributes: [
        "syllabusDetailsId",
        "syllabusId",
        "examSetupTypeId",
        "subjectId",
        "subjectType",
        "type",
        "marks",
        "total",
      ],
    },
  ],
};

const assessmentExamTypeInclude = {
  model: model.examSetupTypeModel,
  as: "assessmentExamType",
  attributes: ["examSetupTypeId", "examStructureId", "examType", "examName"],
  where: buildScope(model.examSetupTypeModel),
  required: true,
  include: [
    {
      model: model.syllabusDetailsModel,
      as: "syllabusDetailsExam",
      attributes: [
        "syllabusDetailsId",
        "syllabusId",
        "examSetupTypeId",
        "subjectId",
        "subjectType",
        "type",
        "marks",
        "total",
      ],
    },
    {
      model: model.examStructureModel,
      as: "examStructure",
      attributes: [
        "examStructureId",
        "academicYearId",
        "sessionId",
        "instituteId",
        "universityId",
        "courseId",
        "totalMarks",
        "createdAt",
        "updatedAt",
      ],
      where: buildScope(model.examStructureModel),
      required: false,
    },
  ],
};

const assessmentIncludes = [
  assessmentSubjectInclude,
  assessmentExamTypeInclude,
];

const assessmentScopeIncludes = [
  {
    model: model.subjectModel,
    as: "assessmentSubject",
    attributes: [],
    where: buildScope(model.subjectModel),
    required: true,
  },
  {
    model: model.examSetupTypeModel,
    as: "assessmentExamType",
    attributes: [],
    where: buildScope(model.examSetupTypeModel),
    required: true,
  },
];

async function findStudentsForAssessmentTerm({
  term,
  courseId,
  examAssessmentId,
}) {
  if (term == null || courseId == null) {
    return [];
  }

  const rows = await scoped(model.studentModel).findAll({
    attributes: [
      "studentId",
      "scholarNumber",
      "firstName",
      "middleName",
      "lastName",
    ],
    where: { courseId: Number(courseId) },
    include: [
      {
        model: model.classSectionTermModel,
        as: "studentClassSectionTerm",
        required: true,
        attributes: ["classSectionTermId", "term"],
        where: { term: Number(term) },
      },
      {
        model: model.assessmentEvaluationModel,
        as: "studentresult",
        attributes: [
          "assessmentEvalutionId",
          "subjectId",
          "userId",
          "examAssessmentId",
          "studentId",
          "status",
          "marks",
          "comments",
          "file",
        ],
        required: false,
        where: { examAssessmentId: Number(examAssessmentId) },
        include: [
          {
            model: model.employeeModel,
            as: "evaluationEmployee",
            attributes: ["employeeId", "userId"],
            required: false,
          },
        ],
      },
    ],
  });

  // Keep FE key employeeId as real employee.employeeId (linked via employee.userId)
  for (const row of rows) {
    const results = row.studentresult || [];
    for (const result of results) {
      const plain = result.get ? result.get({ plain: true }) : result;
      const employeeId = plain.evaluationEmployee?.employeeId ?? null;
      if (result.setDataValue) {
        result.setDataValue("employeeId", employeeId);
        result.setDataValue("evaluationEmployee", undefined);
      } else {
        result.employeeId = employeeId;
        delete result.evaluationEmployee;
      }
    }
  }

  return rows;
}

export async function addInternalAssessment(data) {
  const setupType = await assertScopedExamSetupType(data.examSetupTypeId);
  if (!setupType) {
    throw new Error("Exam setup type not found");
  }
  const subject = await assertScopedSubject(data.subjectId);
  if (!subject) {
    throw new Error("Subject not found");
  }
  if (data.userId) {
    const employee = await assertScopedEmployee(data.userId);
    if (!employee) {
      throw new Error("Employee not found");
    }
  }
  return await model.internalAssessmentModel.create(data);
}

export async function getAllInternalAssessment(examSetupTypeId) {
  const where = {};
  if (examSetupTypeId != null) {
    const setupType = await assertScopedExamSetupType(examSetupTypeId);
    if (!setupType) {
      return [];
    }
    where.examSetupTypeId = examSetupTypeId;
  }
  return await model.internalAssessmentModel.findAll({
    attributes: [
      "examAssessmentId",
      "subjectId",
      "userId",
      "term",
      "examSetupTypeId",
      "type",
      "totalMarks",
      "weightage",
      "publishDate",
      "dueDate",
      "description",
      "file",
    ],
    where,
    include: assessmentScopeIncludes,
    order: [["createdAt", "DESC"]],
  });
}

export async function getInternalAssessmentById(examAssessmentId) {
  const existing = await assertScopedInternalAssessment(examAssessmentId);
  if (!existing) {
    return null;
  }
  return await model.internalAssessmentModel.findOne({
    attributes: [
      "examAssessmentId",
      "subjectId",
      "userId",
      "term",
      "examSetupTypeId",
      "type",
      "totalMarks",
      "weightage",
      "publishDate",
      "dueDate",
      "description",
      "file",
    ],
    where: { examAssessmentId },
    include: assessmentScopeIncludes,
  });
}

export async function updateInternalAssessment(examAssessmentId, data) {
  try {
    const existing = await assertScopedInternalAssessment(examAssessmentId);
    if (!existing) {
      return [0];
    }
    return await model.internalAssessmentModel.update(data, {
      where: { examAssessmentId },
    });
  } catch (error) {
    console.error(
      `Error updating internal assessment ID ${examAssessmentId}:`,
      error,
    );
    throw error;
  }
}

export async function deleteInternalAssessment(examAssessmentId) {
  const existing = await assertScopedInternalAssessment(examAssessmentId);
  if (!existing) {
    return 0;
  }
  return await model.internalAssessmentModel.destroy({
    where: { examAssessmentId },
  });
}

export async function evaluationInternalAssessment(subjectId, userId) {
  const assessment = await model.internalAssessmentModel.findOne({
    attributes: [
      "examAssessmentId",
      "subjectId",
      "userId",
      "term",
      "examSetupTypeId",
      "type",
      "totalMarks",
      "weightage",
      "publishDate",
      "dueDate",
      "description",
      "file",
    ],
    where: { subjectId, userId },
    include: [
      {
        model: model.subjectModel,
        as: "assessmentSubject",
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
        where: buildScope(model.subjectModel),
        required: true,
        include: [
          {
            model: model.courseModel,
            as: "courseInfo",
            attributes: ["termType", "courseId"],
            required: true,
          },
        ],
      },
      assessmentExamTypeEvaluationInclude,
      {
        model: model.userModel,
        as: "user",
        attributes: ["user_id"],
        required: true,
      },
    ],
  });

  if (!assessment) {
    return null;
  }

  const plain = assessment.get({ plain: true });
  const termStudents = await findStudentsForAssessmentTerm({
    term: plain.term,
    courseId: plain.assessmentSubject.courseId,
    examAssessmentId: plain.examAssessmentId,
  });

  assessment.setDataValue("termStudents", termStudents);
  return assessment;
}

export async function bulkInsertEvaluation(dataArray) {
  try {
    if (dataArray.length > 0) {
      const assessmentId = dataArray[0].examAssessmentId;
      const existing = await assertScopedInternalAssessment(assessmentId);
      if (!existing) {
        const error = new Error("Internal assessment not found");
        error.statusCode = 404;
        throw error;
      }

      const studentIds = [];
      for (const row of dataArray) {
        studentIds.push(row.studentId);
      }

      const existingEvaluations = await model.assessmentEvaluationModel.findAll(
        {
          where: {
            examAssessmentId: assessmentId,
            studentId: { [Op.in]: studentIds },
          },
          attributes: ["assessmentEvalutionId", "studentId"],
        },
      );

      const existingByStudentId = {};
      for (const evaluation of existingEvaluations) {
        existingByStudentId[evaluation.studentId] =
          evaluation.assessmentEvalutionId;
      }

      const rows = [];
      for (const row of dataArray) {
        const assessmentEvalutionId = existingByStudentId[row.studentId];
        if (assessmentEvalutionId) {
          rows.push({
            ...row,
            assessmentEvalutionId,
          });
        } else {
          rows.push(row);
        }
      }

      return await model.assessmentEvaluationModel.bulkCreate(rows, {
        updateOnDuplicate: [
          "subjectId",
          "userId",
          "examAssessmentId",
          "studentId",
          "status",
          "marks",
          "comments",
          "file",
          "updatedBy",
          "updatedAt",
        ],
      });
    }
    return [];
  } catch (error) {
    console.error("Repository Error evalution:", error);
    throw error;
  }
}

export async function updateEvaluation(id, data) {
  const evaluation = await model.assessmentEvaluationModel.findOne({
    where: { assessmentEvalutionId: id },
    attributes: ["assessmentEvalutionId", "examAssessmentId"],
  });
  if (!evaluation) {
    return [0];
  }
  const assessment = await assertScopedInternalAssessment(
    evaluation.examAssessmentId,
  );
  if (!assessment) {
    return [0];
  }
  return await model.assessmentEvaluationModel.update(data, {
    where: { assessmentEvalutionId: id },
  });
}
