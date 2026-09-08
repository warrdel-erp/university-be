import sequelize from "../database/sequelizeConfig.js";
import * as InternalAssessmentRepository from "../repository/internalAssessmentRepository.js";
import { decimalAdd, decimalCompare } from "../utility/decimalMoney.js";

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

  const touchesFinalResultWeightage =
    payload.weightagePercentage !== undefined ||
    payload.isIncludeInFinalResult !== undefined;

  if (touchesFinalResultWeightage) {
    const willInclude =
      payload.isIncludeInFinalResult !== undefined
        ? payload.isIncludeInFinalResult
        : Boolean(existing.isIncludeInFinalResult);

    const nextWeightage =
      payload.weightagePercentage !== undefined
        ? Number(payload.weightagePercentage)
        : Number(existing.weightagePercentage || 0);

    const otherIncludedSum =
      await InternalAssessmentRepository.getIncludedWeightageSum({
        subjectId: existing.subjectId,
        classSectionTermId: existing.classSectionTermId,
        excludeInternalAssessmentId: Number(internalAssessmentId),
      });

    const totalIncludedWeightage = willInclude
      ? decimalAdd(otherIncludedSum, nextWeightage)
      : otherIncludedSum;

    const hasIncludedAssessments =
      willInclude || decimalCompare(otherIncludedSum, 0) > 0;

    if (
      hasIncludedAssessments &&
      decimalCompare(totalIncludedWeightage, 100) !== 0
    ) {
      const error = new Error(
        `Sum of weightagePercentage for assessments with isIncludeInFinalResult=true must be 100. Current total would be ${totalIncludedWeightage}`,
      );
      error.statusCode = 400;
      throw error;
    }
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
