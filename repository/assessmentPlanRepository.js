import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createAssessmentPlan(planData, options = {}) {
  const { components, ...mainPlanData } = planData;
  const record = await scoped(model.assessmentPlanModel).create(mainPlanData, options);

  if (Array.isArray(components) && components.length > 0) {
    const componentsToCreate = components.map((comp) => ({
      ...comp,
      assessmentPlanId: record.assessmentPlanId,
      academicYearId: comp.academicYearId || mainPlanData.academicYearId || null,
      universityId: mainPlanData.universityId,
      instituteId: mainPlanData.instituteId,
      createdBy: mainPlanData.createdBy,
      updatedBy: mainPlanData.updatedBy,
    }));

    await Promise.all(
      componentsToCreate.map((comp) =>
        scoped(model.assessmentPlanComponentModel).create(comp, { transaction: options.transaction })
      )
    );
  }

  return await getAssessmentPlanById(record.assessmentPlanId, options);
}

export async function getAssessmentPlans({
  search,
  status,
  courseId,
  sessionId,
  regulationId,
  academicYearId,
  universityId,
  instituteId,
  term,
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (courseId) {
    where.courseId = Number(courseId);
  }
  if (sessionId) {
    where.sessionId = Number(sessionId);
  }
  if (regulationId) {
    where.regulationId = Number(regulationId);
  }
  if (academicYearId) {
    where.academicYearId = Number(academicYearId);
  }
  if (universityId) {
    where.universityId = Number(universityId);
  }
  if (instituteId) {
    where.instituteId = Number(instituteId);
  }
  if (term !== undefined && term !== null && term !== "") {
    where.term = Number(term);
  }
  if (search) {
    where[Op.or] = [
      { planName: { [Op.like]: `%${search}%` } },
      { planCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await scoped(model.assessmentPlanModel).findAndCountAll({
    where,
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
      {
        model: model.academicRegulationModel,
        as: "academicRegulation",
        attributes: ["academicRegulationId", "regulationCode", "regulationName"],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.assessmentPlanComponentModel,
        as: "components",
        include: [
          {
            model: model.examSetupTypeModel,
            as: "examSetupType",
            attributes: ["examSetupTypeId", "examName"],
            required: false,
          },
        ],
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
      },
    ],
    distinct: true,
    order: [["assessmentPlanId", "DESC"]],
    limit: limitNum,
    offset,
  });

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: rows,
  };
}

export async function getAssessmentPlanById(assessmentPlanId, options = {}) {
  return await scoped(model.assessmentPlanModel).findOne({
    where: { assessmentPlanId: Number(assessmentPlanId) },
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
      {
        model: model.academicRegulationModel,
        as: "academicRegulation",
        attributes: ["academicRegulationId", "regulationCode", "regulationName"],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.assessmentPlanComponentModel,
        as: "components",
        include: [
          {
            model: model.examSetupTypeModel,
            as: "examSetupType",
            attributes: ["examSetupTypeId", "examName"],
            required: false,
          },
        ],
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}

export async function updateAssessmentPlan(assessmentPlanId, updateData, options = {}) {
  const { components, ...mainUpdateData } = updateData;

  if (Object.keys(mainUpdateData).length > 0) {
    await scoped(model.assessmentPlanModel).update(mainUpdateData, {
      where: { assessmentPlanId: Number(assessmentPlanId) },
      transaction: options.transaction,
    });
  }

  if (Array.isArray(components)) {
    await scoped(model.assessmentPlanComponentModel).destroy({
      where: { assessmentPlanId: Number(assessmentPlanId) },
      transaction: options.transaction,
    });

    if (components.length > 0) {
      const existingPlan = await getAssessmentPlanById(assessmentPlanId, options);
      const componentsToCreate = components.map((comp) => ({
        ...comp,
        assessmentPlanId: Number(assessmentPlanId),
        academicYearId: comp.academicYearId || existingPlan?.academicYearId || null,
        universityId: existingPlan?.universityId,
        instituteId: existingPlan?.instituteId,
        createdBy: mainUpdateData.updatedBy || null,
        updatedBy: mainUpdateData.updatedBy || null,
      }));

      await Promise.all(
        componentsToCreate.map((comp) =>
          scoped(model.assessmentPlanComponentModel).create(comp, { transaction: options.transaction })
        )
      );
    }
  }

  return await getAssessmentPlanById(assessmentPlanId, options);
}

export async function deleteAssessmentPlan(assessmentPlanId, options = {}) {
  const existing = await scoped(model.assessmentPlanModel).findOne({
    where: { assessmentPlanId: Number(assessmentPlanId) },
    transaction: options.transaction,
  });

  if (!existing) {
    return null;
  }

  const newIsActive = !existing.isActive;

  await scoped(model.assessmentPlanModel).update(
    { isActive: newIsActive },
    {
      where: { assessmentPlanId: Number(assessmentPlanId) },
      transaction: options.transaction,
    }
  );

  return {
    assessmentPlanId: Number(assessmentPlanId),
    isActive: newIsActive,
    message: `Assessment plan marked as ${newIsActive ? "active" : "inactive"} successfully`,
  };
}

export async function createAssessmentPlanComponent(componentData, options = {}) {
  const record = await scoped(model.assessmentPlanComponentModel).create(componentData, options);
  return await scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanComponentId: record.assessmentPlanComponentId },
    transaction: options.transaction,
  });
}

export async function updateAssessmentPlanComponent(assessmentPlanComponentId, updateData, options = {}) {
  await scoped(model.assessmentPlanComponentModel).update(updateData, {
    where: { assessmentPlanComponentId: Number(assessmentPlanComponentId) },
    transaction: options.transaction,
  });

  return await scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanComponentId: Number(assessmentPlanComponentId) },
    transaction: options.transaction,
  });
}

export async function deleteAssessmentPlanComponent(assessmentPlanComponentId, options = {}) {
  const existing = await scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanComponentId: Number(assessmentPlanComponentId) },
    transaction: options.transaction,
  });

  if (!existing) {
    return null;
  }

  await scoped(model.assessmentPlanComponentModel).destroy({
    where: { assessmentPlanComponentId: Number(assessmentPlanComponentId) },
    transaction: options.transaction,
  });

  return { message: "Assessment plan component deleted successfully" };
}

export async function getCourseAssessmentPlanOverview({
  courseId,
  sessionId,
  subjectId,
  assessmentPlanId,
  academicRegulationId,
  term,
  search,
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (assessmentPlanId) where.assessmentPlanId = Number(assessmentPlanId);
  if (courseId) where.courseId = Number(courseId);
  if (sessionId) where.sessionId = Number(sessionId);
  if (academicRegulationId) where.regulationId = Number(academicRegulationId);
  if (term) where.term = Number(term);

  if (search) {
    where[Op.or] = [
      { planName: { [Op.like]: `%${search}%` } },
      { planCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const subjectWhere = {};
  if (subjectId) subjectWhere.subjectId = Number(subjectId);

  const include = [
    {
      model: model.courseModel,
      as: "course",
      attributes: ["courseId", "courseName"],
      required: false,
      include: [
        {
          model: model.subjectModel,
          as: "subjects",
          attributes: ["subjectId", "subjectName", "subjectCode", "term"],
          where: Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
          required: Object.keys(subjectWhere).length > 0,
        },
      ],
    },
    {
      model: model.sessionModel,
      as: "session",
      attributes: ["sessionId", "sessionName"],
      required: false,
    },
    {
      model: model.academicRegulationModel,
      as: "academicRegulation",
      attributes: [
        "academicRegulationId",
        "regulationCode",
        "regulationName",
        "evaluationPattern",
        "internalWeightage",
        "externalWeightage",
      ],
      required: false,
    },
  ];

  const { count, rows } = await scoped(model.assessmentPlanModel).findAndCountAll({
    where,
    include,
    distinct: true,
    order: [["assessmentPlanId", "DESC"]],
    limit: limitNum,
    offset,
  });

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: rows,
  };
}
