import sequelize from "../database/sequelizeConfig.js";
import * as assessmentPlanRepo from "../repository/assessmentPlanRepository.js";
import * as model from "../models/index.js";

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

export async function getAssessmentPlans(queryParams) {
  return await assessmentPlanRepo.getAssessmentPlans(queryParams);
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

    // Verify assessmentPlanId courseId and sessionId match assessmentPlanModel
    if (plan.courseId && Number(plan.courseId) !== Number(payload.courseId)) {
      const error = new Error(`Assessment Plan (ID: ${payload.assessmentPlanId}) is created for Course (ID: ${plan.courseId}), which does not match payload Course (ID: ${payload.courseId})`);
      error.statusCode = 400;
      throw error;
    }

    if (plan.sessionId && Number(plan.sessionId) !== Number(payload.sessionId)) {
      const error = new Error(`Assessment Plan (ID: ${payload.assessmentPlanId}) is created for Session (ID: ${plan.sessionId}), which does not match payload Session (ID: ${payload.sessionId})`);
      error.statusCode = 400;
      throw error;
    }

    // 1. Verify subjectId belongs to courseId
    const subjectRecord = await model.subjectModel.findOne({
      where: {
        subjectId: Number(payload.subjectId),
        courseId: Number(payload.courseId),
      },
      attributes: ["subjectId", "courseId", "academicYearId"],
      transaction: t,
    });
    if (!subjectRecord) {
      const error = new Error(`Subject (ID: ${payload.subjectId}) does not belong to Course (ID: ${payload.courseId})`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Verify sessionId and courseId are mapped in sessionCouseMappingModel
    const sessionCourseRecord = await model.sessionCouseMappingModel.findOne({
      where: {
        sessionId: Number(payload.sessionId),
        courseId: Number(payload.courseId),
      },
      transaction: t,
    });
    if (!sessionCourseRecord) {
      const error = new Error(`Session (ID: ${payload.sessionId}) is not mapped to Course (ID: ${payload.courseId})`);
      error.statusCode = 400;
      throw error;
    }

    let sessionId = Number(payload.sessionId);
    const sessionRecord = await model.sessionModel.findByPk(sessionId, {
      attributes: ["sessionId", "academicYearId"],
      transaction: t,
    });
    if (!sessionRecord) {
      const error = new Error(`Session (ID: ${sessionId}) does not exist`);
      error.statusCode = 400;
      throw error;
    }

    if (!plan.academicYearId) {
      const error = new Error(
        `Assessment Plan (ID: ${payload.assessmentPlanId}) has no Academic Year. Cannot create subject mapping.`,
      );
      error.statusCode = 400;
      throw error;
    }

    const academicYearId = Number(plan.academicYearId);

    // No cross-year mapping: plan, subject, and session must share the same academic year
    if (
      !subjectRecord.academicYearId ||
      Number(subjectRecord.academicYearId) !== academicYearId
    ) {
      const error = new Error(
        `Assessment Plan (ID: ${payload.assessmentPlanId}) belongs to Academic Year ID ${academicYearId}, which does not match Subject (ID: ${payload.subjectId}) Academic Year ID ${subjectRecord.academicYearId}`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      !sessionRecord.academicYearId ||
      Number(sessionRecord.academicYearId) !== academicYearId
    ) {
      const error = new Error(
        `Assessment Plan (ID: ${payload.assessmentPlanId}) belongs to Academic Year ID ${academicYearId}, which does not match Session (ID: ${sessionId}) Academic Year ID ${sessionRecord.academicYearId}`,
      );
      error.statusCode = 400;
      throw error;
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
      academicYearId: academicYearId,
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
