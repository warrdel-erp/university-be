import sequelize from "../database/sequelizeConfig.js";
import * as assessmentPlanRepo from "../repository/assessmentPlanRepository.js";

export async function createAssessmentPlan({ payload, user }) {
  return await sequelize.transaction(async (t) => {
    const planData = {
      ...payload,
      courseId: payload.courseId ? Number(payload.courseId) : null,
      sessionId: payload.sessionId ? Number(payload.sessionId) : null,
      regulationId: payload.regulationId ? Number(payload.regulationId) : null,
      term: payload.term !== undefined && payload.term !== null ? Number(payload.term) : null,
      academicYearId: payload.academicYearId ? Number(payload.academicYearId) : (user?.academicYearId || null),
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
      status: payload.status || "Draft",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    };

    return await assessmentPlanRepo.createAssessmentPlan(planData, { transaction: t });
  });
}

export async function getAssessmentPlans(queryParams, user) {
  const filters = {
    ...queryParams,
    universityId: queryParams.universityId || user?.universityId || null,
    instituteId: queryParams.instituteId || user?.instituteId || null,
    academicYearId: queryParams.academicYearId ? Number(queryParams.academicYearId) : (user?.academicYearId || null),
  };
  return await assessmentPlanRepo.getAssessmentPlans(filters);
}

export async function getAssessmentPlanById(assessmentPlanId) {
  const plan = await assessmentPlanRepo.getAssessmentPlanById(assessmentPlanId);
  if (!plan) {
    const error = new Error("Assessment plan not found");
    error.statusCode = 404;
    throw error;
  }
  return plan;
}

export async function updateAssessmentPlan({ assessmentPlanId, payload, user }) {
  return await sequelize.transaction(async (t) => {
    const existing = await assessmentPlanRepo.getAssessmentPlanById(assessmentPlanId, { transaction: t });
    if (!existing) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };

    if (payload.courseId !== undefined) updateData.courseId = payload.courseId ? Number(payload.courseId) : null;
    if (payload.sessionId !== undefined) updateData.sessionId = payload.sessionId ? Number(payload.sessionId) : null;
    if (payload.regulationId !== undefined) updateData.regulationId = payload.regulationId ? Number(payload.regulationId) : null;
    if (payload.term !== undefined) updateData.term = payload.term !== null ? Number(payload.term) : null;
    if (payload.academicYearId !== undefined) updateData.academicYearId = payload.academicYearId ? Number(payload.academicYearId) : null;

    return await assessmentPlanRepo.updateAssessmentPlan(assessmentPlanId, updateData, { transaction: t });
  });
}

export async function deleteAssessmentPlan(assessmentPlanId) {
  return await sequelize.transaction(async (t) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlan(assessmentPlanId, { transaction: t });
    if (!result) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}

export async function createAssessmentPlanComponent({ payload, user }) {
  return await sequelize.transaction(async (t) => {
    const componentData = {
      ...payload,
      assessmentPlanId: Number(payload.assessmentPlanId),
      academicYearId: payload.academicYearId ? Number(payload.academicYearId) : (user?.academicYearId || null),
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    return await assessmentPlanRepo.createAssessmentPlanComponent(componentData, { transaction: t });
  });
}

export async function updateAssessmentPlanComponent({ assessmentPlanComponentId, payload, user }) {
  return await sequelize.transaction(async (t) => {
    const updateData = {
      ...payload,
      updatedBy: user?.userId || null,
    };

    const updated = await assessmentPlanRepo.updateAssessmentPlanComponent(assessmentPlanComponentId, updateData, { transaction: t });
    if (!updated) {
      const error = new Error("Assessment plan component not found");
      error.statusCode = 404;
      throw error;
    }
    return updated;
  });
}

export async function deleteAssessmentPlanComponent(assessmentPlanComponentId) {
  return await sequelize.transaction(async (t) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlanComponent(assessmentPlanComponentId, { transaction: t });
    if (!result) {
      const error = new Error("Assessment plan component not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}
