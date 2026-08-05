import sequelize from "../database/sequelizeConfig.js";
import * as assessmentPlanRepo from "../repository/assessmentPlanRepository.js";
import * as model from "../models/index.js";
import { getAcademicYearId } from "../utility/requestContext.js";

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

export async function getCourseAssessmentPlanOverview(queryParams) {
  return await assessmentPlanRepo.getCourseAssessmentPlanOverview(queryParams);
}

export async function getAssessmentPlanStats(queryParams) {
  return await assessmentPlanRepo.getAssessmentPlanStats(queryParams);
}

export async function createAssessmentPlanSubjectMapping({ payload, user }) {
  return await sequelize.transaction(async (t) => {
    const plan = await model.assessmentPlanModel.findByPk(Number(payload.assessmentPlanId), { transaction: t });
    if (!plan) {
      const error = new Error("Assessment plan not found");
      error.statusCode = 404;
      throw error;
    }

    if (plan.status !== "Published" || !plan.isActive) {
      const error = new Error("Cannot map an assessment plan in Draft status. Plan must be Published.");
      error.statusCode = 400;
      throw error;
    }

    let sessionId = payload.sessionId ? Number(payload.sessionId) : null;

    // Fallback: If sessionId not specified, check if assessmentPlan has a sessionId
    if (!sessionId && plan.sessionId) {
      sessionId = Number(plan.sessionId);
    }

    // Verify sessionId exists in session table
    if (sessionId) {
      const sessionRecord = await model.sessionModel.findByPk(sessionId, { transaction: t });
      if (!sessionRecord) {
        sessionId = null;
      }
    }

    // Auto save active academicYearId strictly from requestContext / active user
    let academicYearId = getAcademicYearId() || (user?.academicYearId ? Number(user.academicYearId) : null);
    if (academicYearId) {
      const yearRecord = await model.acedmicYearModel.findByPk(academicYearId, { transaction: t });
      if (!yearRecord) {
        academicYearId = null;
      }
    }

    // Auto fetch examSetupTypeId strictly from internal assessmentPlanComponentModel connection
    let examSetupTypeId = null;
    const component = await model.assessmentPlanComponentModel.findOne({
      where: { assessmentPlanId: Number(payload.assessmentPlanId) },
      attributes: ["examSetupTypeId"],
      raw: true,
      transaction: t,
    });
    if (component && component.examSetupTypeId) {
      examSetupTypeId = Number(component.examSetupTypeId);
      const setupTypeRecord = await model.examSetupTypeModel.findByPk(examSetupTypeId, { transaction: t });
      if (!setupTypeRecord) {
        examSetupTypeId = null;
      }
    }

    const data = {
      assessmentPlanId: Number(payload.assessmentPlanId),
      subjectId: Number(payload.subjectId),
      courseId: Number(payload.courseId),
      sessionId: sessionId || null,
      academicYearId: academicYearId || null,
      examSetupTypeId: examSetupTypeId || null,
      universityId: user?.universityId ? Number(user.universityId) : null,
      instituteId: user?.instituteId ? Number(user.instituteId) : null,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };
    return await assessmentPlanRepo.createAssessmentPlanSubjectMapping(data, { transaction: t });
  });
}

export async function getAssessmentPlanSubjectMappings(queryParams) {
  return await assessmentPlanRepo.getAssessmentPlanSubjectMappings(queryParams);
}

export async function deleteAssessmentPlanSubjectMapping(mappingId) {
  return await sequelize.transaction(async (t) => {
    const result = await assessmentPlanRepo.deleteAssessmentPlanSubjectMapping(mappingId, { transaction: t });
    if (!result) {
      const error = new Error("Subject assessment plan mapping not found");
      error.statusCode = 404;
      throw error;
    }
    return result;
  });
}
