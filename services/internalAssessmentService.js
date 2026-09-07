import sequelize from "../database/sequelizeConfig.js";
import * as InternalAssessmentRepository from "../repository/internalAssessmentRepository.js";

export async function getUserInternalAssessments(userId) {
  return InternalAssessmentRepository.getUserInternalAssessments(userId);
}

export async function createInternalAssessment(payload) {
  const transaction = await sequelize.transaction();

  try {
    const assessment =
      await InternalAssessmentRepository.createInternalAssessment(
        payload,
        transaction,
      );

    const students =
      await InternalAssessmentRepository.getStudentsByClassSectionTermId(
        payload.classSectionTermId,
        transaction,
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

  await InternalAssessmentRepository.updateInternalAssessment(
    Number(internalAssessmentId),
    payload,
  );

  return InternalAssessmentRepository.getInternalAssessmentById(
    Number(internalAssessmentId),
  );
}

export async function getStudentEvaluations(internalAssessmentId) {
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
  );
}

export async function getStudentsByClassSectionTermId(classSectionTermId) {
  return InternalAssessmentRepository.getStudentsByClassSectionTermId(
    Number(classSectionTermId),
  );
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
