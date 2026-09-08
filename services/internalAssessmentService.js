import sequelize from "../database/sequelizeConfig.js";
import * as InternalAssessmentRepository from "../repository/internalAssessmentRepository.js";
import * as AssessmentEvaluationRepository from "../repository/assessmentEvaluationRepository.js";
import {
  decimalAdd,
  decimalCompare,
  decimalDivide,
  decimalMultiply,
  toMoneyNumber,
} from "../utility/decimalMoney.js";

function resolveContributionMarks(assessment, iaMaximumMarks) {
  if (assessment.normalizedMaxMarks != null) {
    return toMoneyNumber(assessment.normalizedMaxMarks);
  }

  return decimalMultiply(
    iaMaximumMarks,
    decimalDivide(toMoneyNumber(assessment.weightagePercentage), 100),
  );
}

function calculateStudentFinalMarks(assessments, marksByAssessmentId, iaMaximumMarks) {
  let total = 0;

  for (const assessment of assessments) {
    const obtained = toMoneyNumber(
      marksByAssessmentId.get(assessment.internalAssessmentId),
    );
    const maximumMarks = toMoneyNumber(assessment.maximumMarks);
    const contribution = resolveContributionMarks(assessment, iaMaximumMarks);
    const ratio = decimalDivide(obtained, maximumMarks);
    total = decimalAdd(total, decimalMultiply(ratio, contribution));
  }

  return total;
}

function resolveIaMaximumMarks(assessments, requestedIaMaximumMarks) {
  if (requestedIaMaximumMarks != null) {
    return toMoneyNumber(requestedIaMaximumMarks);
  }

  let allNormalized = true;
  let sumNormalized = 0;

  for (const assessment of assessments) {
    if (assessment.normalizedMaxMarks == null) {
      allNormalized = false;
      break;
    }
    sumNormalized = decimalAdd(
      sumNormalized,
      toMoneyNumber(assessment.normalizedMaxMarks),
    );
  }

  if (allNormalized && decimalCompare(sumNormalized, 0) > 0) {
    return sumNormalized;
  }

  const error = new Error(
    "iaMaximumMarks is required when included assessments do not all have normalizedMaxMarks",
  );
  error.statusCode = 400;
  throw error;
}

async function buildCalculatedFinalResultRows({
  subjectId,
  classSectionTermId,
  userId,
  iaMaximumMarksInput,
  status,
  submittedAt,
  transaction,
}) {
  const assessments =
    await AssessmentEvaluationRepository.getIncludedAssessmentsWithEvaluations({
      subjectId,
      classSectionTermId,
      transaction,
    });

  if (!assessments.length) {
    const error = new Error(
      "No internal assessments with isIncludeInFinalResult=true found",
    );
    error.statusCode = 400;
    throw error;
  }

  const plainAssessments = [];
  let weightageSum = 0;

  for (const assessment of assessments) {
    const plain = assessment.get ? assessment.get({ plain: true }) : assessment;
    plainAssessments.push(plain);
    weightageSum = decimalAdd(
      weightageSum,
      toMoneyNumber(plain.weightagePercentage),
    );
  }

  if (decimalCompare(weightageSum, 100) !== 0) {
    const error = new Error(
      `Sum of weightagePercentage for included assessments must be 100. Current total is ${weightageSum}`,
    );
    error.statusCode = 400;
    throw error;
  }

  const iaMaximumMarks = resolveIaMaximumMarks(
    plainAssessments,
    iaMaximumMarksInput,
  );

  const { students } =
    await InternalAssessmentRepository.getStudentsByClassSectionTermId(
      classSectionTermId,
      { transaction },
    );

  if (!students.length) {
    const error = new Error("No students found for classSectionTermId");
    error.statusCode = 400;
    throw error;
  }

  const evaluationsByStudent = new Map();

  for (const assessment of plainAssessments) {
    const evaluations = assessment.studentEvaluations || [];
    for (const evaluation of evaluations) {
      const studentId = Number(evaluation.studentId);
      if (!evaluationsByStudent.has(studentId)) {
        evaluationsByStudent.set(studentId, new Map());
      }
      evaluationsByStudent
        .get(studentId)
        .set(Number(assessment.internalAssessmentId), evaluation.obtainedMarks);
    }
  }

  const firstAssessment = plainAssessments[0];
  const rows = [];
  const incomplete = [];

  for (const student of students) {
    const studentId = Number(student.studentId);
    const marksByAssessmentId =
      evaluationsByStudent.get(studentId) || new Map();

    let missing = false;
    for (const assessment of plainAssessments) {
      const assessmentId = Number(assessment.internalAssessmentId);
      if (
        !marksByAssessmentId.has(assessmentId) ||
        marksByAssessmentId.get(assessmentId) == null
      ) {
        missing = true;
        break;
      }
    }

    if (missing) {
      incomplete.push(studentId);
      continue;
    }

    rows.push({
      subjectId,
      electiveSubjectId: null,
      classSectionTermId,
      studentId,
      userId,
      iaMaximumMarks,
      marks: calculateStudentFinalMarks(
        plainAssessments,
        marksByAssessmentId,
        iaMaximumMarks,
      ),
      status,
      submittedAt,
      universityId: firstAssessment.universityId,
      instituteId: firstAssessment.instituteId,
      academicYearId: firstAssessment.academicYearId,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  if (incomplete.length) {
    const error = new Error(
      `Cannot calculate final IA. Missing marks for ${incomplete.length} student(s). All included assessments must be fully graded.`,
    );
    error.statusCode = 400;
    error.data = { incompleteStudentIds: incomplete };
    throw error;
  }

  return {
    rows,
    iaMaximumMarks,
    includedAssessmentCount: plainAssessments.length,
    weightageSum,
  };
}

export async function getUserInternalAssessments(userId, options = {}) {
  return InternalAssessmentRepository.getUserInternalAssessments(userId, options);
}

export async function createInternalAssessment(payload) {
  if (!payload.issueDate) {
    payload.issueDate = new Date();
  }

  const transaction = await sequelize.transaction();

  try {
    const assessment =
      await InternalAssessmentRepository.createInternalAssessment(
        payload,
        transaction,
      );

    const { students } =
      await InternalAssessmentRepository.getStudentsByClassSectionTermId(
        payload.classSectionTermId,
        { transaction },
      );

    const evaluationRows = [];
    for (const student of students) {
      evaluationRows.push({
        studentId: student.studentId,
        internalAssessmentId: assessment.internalAssessmentId,
        obtainedMarks: null,
        universityId: assessment.universityId,
        instituteId: assessment.instituteId,
        academicYearId: assessment.academicYearId,
      });
    }

    await InternalAssessmentRepository.createStudentEvaluationPlaceholders(
      evaluationRows,
      transaction,
    );

    await transaction.commit();

    return InternalAssessmentRepository.getInternalAssessmentById(
      assessment.internalAssessmentId,
    );
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getInternalAssessmentsBySubject(filters) {
  return InternalAssessmentRepository.getInternalAssessmentsBySubject(filters);
}

export async function getInternalAssessmentById(internalAssessmentId) {
  const assessment =
    await InternalAssessmentRepository.getInternalAssessmentById(
      Number(internalAssessmentId),
    );

  if (!assessment) {
    const error = new Error("Internal assessment not found");
    error.statusCode = 404;
    throw error;
  }

  return assessment;
}

export async function getAssessmentStatusCounts(filters) {
  return InternalAssessmentRepository.getAssessmentStatusCounts(filters);
}

export async function getUserDashboardSku(userId) {
  return InternalAssessmentRepository.getUserDashboardSku(userId);
}

export async function updateInternalAssessment(internalAssessmentId, payload) {
  const existing =
    await InternalAssessmentRepository.getInternalAssessmentById(
      Number(internalAssessmentId),
    );

  if (!existing) {
    const error = new Error("Internal assessment not found");
    error.statusCode = 404;
    throw error;
  }

  const weightagePercentage =
    payload.weightagePercentage !== undefined
      ? Number(payload.weightagePercentage)
      : existing.weightagePercentage != null
        ? Number(existing.weightagePercentage)
        : null;

  const weightage =
    existing.weightage != null ? Number(existing.weightage) : null;

  if (weightagePercentage != null && weightage != null) {
    payload.normalizedMaxMarks = decimalMultiply(
      weightage,
      decimalDivide(weightagePercentage, 100),
    );
  }

  await InternalAssessmentRepository.updateInternalAssessment(
    Number(internalAssessmentId),
    payload,
  );

  return InternalAssessmentRepository.getInternalAssessmentById(
    Number(internalAssessmentId),
  );
}

export async function getStudentEvaluations(internalAssessmentId, studentId) {
  const assessment =
    await InternalAssessmentRepository.getInternalAssessmentById(
      Number(internalAssessmentId),
    );

  if (!assessment) {
    const error = new Error("Internal assessment not found");
    error.statusCode = 404;
    throw error;
  }

  return InternalAssessmentRepository.getStudentEvaluationsByAssessmentId(
    Number(internalAssessmentId),
    studentId ? Number(studentId) : undefined,
  );
}

export async function getMarksTableBySubject(filters) {
  return InternalAssessmentRepository.getMarksTableBySubject({
    subjectId: Number(filters.subjectId),
    classSectionTermId: Number(filters.classSectionTermId),
  });
}

export async function getMarksCellBySubject(filters) {
  return InternalAssessmentRepository.getMarksCellBySubject({
    subjectId: Number(filters.subjectId),
    classSectionTermId: Number(filters.classSectionTermId),
    page: filters.page ? Number(filters.page) : undefined,
    limit: filters.limit ? Number(filters.limit) : undefined,
  });
}

export async function getStudentEvaluationByStudentAndAssessment(filters) {
  const result =
    await InternalAssessmentRepository.getStudentEvaluationByStudentAndAssessment(
      {
        subjectId: Number(filters.subjectId),
        classSectionTermId: Number(filters.classSectionTermId),
        studentId: Number(filters.studentId),
        internalAssessmentId: Number(filters.internalAssessmentId),
      },
    );

  if (!result) {
    const error = new Error(
      "Internal assessment not found for subjectId and classSectionTermId",
    );
    error.statusCode = 404;
    throw error;
  }

  return result;
}

export async function getStudentsByClassSectionTermId(classSectionTermId) {
  const result =
    await InternalAssessmentRepository.getStudentsByClassSectionTermId(
      Number(classSectionTermId),
    );
  return result.students;
}

export async function upsertStudentEvaluations(internalAssessmentId, marks) {
  const assessment =
    await InternalAssessmentRepository.getInternalAssessmentById(
      Number(internalAssessmentId),
    );

  if (!assessment) {
    const error = new Error("Internal assessment not found");
    error.statusCode = 404;
    throw error;
  }

  const maximumMarks = Number(assessment.maximumMarks);

  for (const mark of marks) {
    if (
      mark.obtainedMarks !== null &&
      Number(mark.obtainedMarks) > maximumMarks
    ) {
      const error = new Error(
        `obtainedMarks cannot exceed maximumMarks (${maximumMarks}) for studentId ${mark.studentId}`,
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const transaction = await sequelize.transaction();

  try {
    const rows = [];
    for (const mark of marks) {
      rows.push({
        internalAssessmentId: Number(internalAssessmentId),
        studentId: mark.studentId,
        obtainedMarks: mark.obtainedMarks,
        universityId: assessment.universityId,
        instituteId: assessment.instituteId,
        academicYearId: assessment.academicYearId,
      });
    }

    await InternalAssessmentRepository.upsertStudentEvaluations(
      rows,
      transaction,
    );
    await transaction.commit();

    return InternalAssessmentRepository.getStudentEvaluationsByAssessmentId(
      Number(internalAssessmentId),
    );
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function calculateAndStoreFinalResults(payload) {
  const subjectId = Number(payload.subjectId);
  const classSectionTermId = Number(payload.classSectionTermId);
  const userId = Number(payload.userId);

  const transaction = await sequelize.transaction();

  try {
    const submittedCount =
      await AssessmentEvaluationRepository.countSubmittedFinalResults({
        subjectId,
        classSectionTermId,
        transaction,
      });

    if (submittedCount > 0) {
      const error = new Error(
        "Final IA already submitted for this subject and class section. Recalculation is not allowed.",
      );
      error.statusCode = 400;
      throw error;
    }

    const { rows, iaMaximumMarks, includedAssessmentCount, weightageSum } =
      await buildCalculatedFinalResultRows({
        subjectId,
        classSectionTermId,
        userId,
        iaMaximumMarksInput: payload.iaMaximumMarks,
        status: "pending",
        submittedAt: null,
        transaction,
      });

    await AssessmentEvaluationRepository.upsertFinalResults(rows, transaction);
    await transaction.commit();

    const results = await AssessmentEvaluationRepository.getFinalResults({
      subjectId,
      classSectionTermId,
    });

    return {
      subjectId,
      classSectionTermId,
      iaMaximumMarks,
      includedAssessmentCount,
      weightageSum,
      studentCount: results.length,
      status: "pending",
      results,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function submitFinalResults(payload) {
  const subjectId = Number(payload.subjectId);
  const classSectionTermId = Number(payload.classSectionTermId);
  const userId = Number(payload.userId);

  const transaction = await sequelize.transaction();

  try {
    const submittedCount =
      await AssessmentEvaluationRepository.countSubmittedFinalResults({
        subjectId,
        classSectionTermId,
        transaction,
      });

    if (submittedCount > 0) {
      const error = new Error(
        "Final IA already submitted for this subject and class section",
      );
      error.statusCode = 400;
      throw error;
    }

    const submittedAt = new Date();
    const { rows, iaMaximumMarks, includedAssessmentCount, weightageSum } =
      await buildCalculatedFinalResultRows({
        subjectId,
        classSectionTermId,
        userId,
        iaMaximumMarksInput: payload.iaMaximumMarks,
        status: "submitted",
        submittedAt,
        transaction,
      });

    await AssessmentEvaluationRepository.upsertFinalResults(rows, transaction);
    await transaction.commit();

    const results = await AssessmentEvaluationRepository.getFinalResults({
      subjectId,
      classSectionTermId,
    });

    return {
      subjectId,
      classSectionTermId,
      iaMaximumMarks,
      includedAssessmentCount,
      weightageSum,
      studentCount: results.length,
      submittedCount: results.length,
      status: "submitted",
      results,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getFinalResults(filters) {
  return AssessmentEvaluationRepository.getFinalResults({
    subjectId: Number(filters.subjectId),
    classSectionTermId: Number(filters.classSectionTermId),
    studentId: filters.studentId ? Number(filters.studentId) : undefined,
  });
}
