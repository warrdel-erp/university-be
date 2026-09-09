import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

const finalResultAttributes = [
  "assessmentEvalutionId",
  "universityId",
  "instituteId",
  "academicYearId",
  "subjectId",
  "electiveSubjectId",
  "classSectionTermId",
  "studentId",
  "userId",
  "iaMaximumMarks",
  "marks",
  "status",
  "submittedAt",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
];

const studentAttributes = [
  "studentId",
  "scholarNumber",
  "enrollNumber",
  "firstName",
  "middleName",
  "lastName",
];

export async function getIncludedAssessmentsWithEvaluations({
  subjectId,
  classSectionTermId,
  transaction,
}) {
  return scoped(model.internalAssessmentModel).findAll({
    where: {
      subjectId: Number(subjectId),
      classSectionTermId: Number(classSectionTermId),
      isIncludeInFinalResult: true,
    },
    attributes: [
      "internalAssessmentId",
      "universityId",
      "instituteId",
      "academicYearId",
      "subjectId",
      "classSectionTermId",
      "title",
      "type",
      "maximumMarks",
      "weightagePercentage",
      "normalizedMaxMarks",
      "isIncludeInFinalResult",
    ],
    include: [
      {
        model: model.internalAssessmentStudentEvaluationModel,
        as: "studentEvaluations",
        attributes: [
          "internalAssessmentStudentEvaluationId",
          "studentId",
          "internalAssessmentId",
          "obtainedMarks",
        ],
        where: buildScope(model.internalAssessmentStudentEvaluationModel),
        required: false,
      },
    ],
    order: [
      ["issueDate", "ASC"],
      ["internalAssessmentId", "ASC"],
    ],
    transaction,
  });
}

export async function countSubmittedFinalResults({
  subjectId,
  classSectionTermId,
  transaction,
}) {
  return scoped(model.assessmentEvaluationModel).count({
    where: {
      subjectId: Number(subjectId),
      classSectionTermId: Number(classSectionTermId),
      status: "submitted",
    },
    transaction,
  });
}

/**
 * Subject + class-section final IA workflow status for faculty UI.
 * @returns {"submitted"|"inprogress"}
 */
export async function getFinalSubmissionStatus({
  subjectId,
  classSectionTermId,
  transaction,
}) {
  const submittedCount = await countSubmittedFinalResults({
    subjectId,
    classSectionTermId,
    transaction,
  });

  return submittedCount > 0 ? "submitted" : "inprogress";
}

export async function findFinalResultByStudent({
  subjectId,
  classSectionTermId,
  studentId,
  transaction,
}) {
  return scoped(model.assessmentEvaluationModel).findOne({
    where: {
      subjectId: Number(subjectId),
      classSectionTermId: Number(classSectionTermId),
      studentId: Number(studentId),
    },
    attributes: ["assessmentEvalutionId", "studentId", "status"],
    transaction,
  });
}

export async function updateFinalResultById(
  assessmentEvalutionId,
  payload,
  transaction,
) {
  return scoped(model.assessmentEvaluationModel).update(payload, {
    where: { assessmentEvalutionId: Number(assessmentEvalutionId) },
    transaction,
  });
}

export async function createFinalResult(payload, transaction) {
  return scoped(model.assessmentEvaluationModel).create(payload, {
    transaction,
  });
}

/**
 * Update existing student row when present; create only if missing.
 */
export async function upsertFinalResults(rows, transaction) {
  const results = [];

  for (const row of rows) {
    const existing = await findFinalResultByStudent({
      subjectId: row.subjectId,
      classSectionTermId: row.classSectionTermId,
      studentId: row.studentId,
      transaction,
    });

    if (existing) {
      await updateFinalResultById(
        existing.assessmentEvalutionId,
        {
          iaMaximumMarks: row.iaMaximumMarks,
          marks: row.marks,
          status: row.status,
          submittedAt: row.submittedAt,
          userId: row.userId,
          updatedBy: row.updatedBy,
          universityId: row.universityId,
          instituteId: row.instituteId,
          academicYearId: row.academicYearId,
        },
        transaction,
      );
      results.push(existing);
    } else {
      const created = await createFinalResult(row, transaction);
      results.push(created);
    }
  }

  return results;
}

export async function getFinalResults({
  subjectId,
  classSectionTermId,
  studentId,
  transaction,
}) {
  const where = {
    subjectId: Number(subjectId),
    classSectionTermId: Number(classSectionTermId),
  };

  if (studentId != null) {
    where.studentId = Number(studentId);
  }

  return scoped(model.assessmentEvaluationModel).findAll({
    where,
    attributes: finalResultAttributes,
    include: [
      {
        model: model.studentModel,
        as: "studentevaluation",
        attributes: studentAttributes,
        required: false,
      },
    ],
    order: [["studentId", "ASC"]],
    transaction,
  });
}
