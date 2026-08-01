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
  gradingId,
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
  if (gradingId) {
    where.gradingId = Number(gradingId);
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
        model: model.gradingModel,
        as: "gradingScheme",
        attributes: ["gradingId", "gradingName", "gradingCode"],
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

export async function updateAssessmentPlan(assessmentPlanId, updateData = {}, options = {}) {
  const planId = typeof assessmentPlanId === "object" ? Number(assessmentPlanId.assessmentPlanId) : Number(assessmentPlanId);
  const dataPayload = typeof assessmentPlanId === "object" ? (assessmentPlanId.payload || {}) : (updateData || {});
  const opts = typeof assessmentPlanId === "object" ? (updateData || {}) : options;

  const { components, ...mainUpdateData } = dataPayload;

  if (Object.keys(mainUpdateData).length > 0) {
    await scoped(model.assessmentPlanModel).update(mainUpdateData, {
      where: { assessmentPlanId: planId },
      transaction: opts.transaction,
    });
  }

  if (Array.isArray(components)) {
    await scoped(model.assessmentPlanComponentModel).destroy({
      where: { assessmentPlanId: planId },
      transaction: opts.transaction,
    });

    if (components.length > 0) {
      const existingPlan = await getAssessmentPlanById(planId, opts);
      const componentsToCreate = components.map((comp) => ({
        ...comp,
        assessmentPlanId: planId,
        academicYearId: comp.academicYearId || existingPlan?.academicYearId || null,
        universityId: existingPlan?.universityId,
        instituteId: existingPlan?.instituteId,
        createdBy: mainUpdateData.updatedBy || null,
        updatedBy: mainUpdateData.updatedBy || null,
      }));

      await scoped(model.assessmentPlanComponentModel).bulkCreate(componentsToCreate, {
        transaction: opts.transaction,
      });
    }
  }

  return await getAssessmentPlanById(planId, opts);
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

export async function updateAssessmentPlanComponent(assessmentPlanComponentId, updateData = {}, options = {}) {
  const compId = typeof assessmentPlanComponentId === "object" ? Number(assessmentPlanComponentId.assessmentPlanComponentId) : Number(assessmentPlanComponentId);
  const dataPayload = typeof assessmentPlanComponentId === "object" ? (assessmentPlanComponentId.payload || {}) : (updateData || {});
  const opts = typeof assessmentPlanComponentId === "object" ? (updateData || {}) : options;

  await scoped(model.assessmentPlanComponentModel).update(dataPayload, {
    where: { assessmentPlanComponentId: compId },
    transaction: opts.transaction,
  });

  return await scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanComponentId: compId },
    transaction: opts.transaction,
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
  assignmentStatus = "all",
  term,
  search,
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const subjectWhere = {};
  if (subjectId) subjectWhere.subjectId = Number(subjectId);
  if (courseId) subjectWhere.courseId = Number(courseId);
  if (term) subjectWhere.term = Number(term);

  if (search) {
    subjectWhere[Op.or] = [
      { subjectName: { [Op.like]: `%${search}%` } },
      { subjectCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const mappingWhere = {};
  if (assessmentPlanId) mappingWhere.assessmentPlanId = Number(assessmentPlanId);
  if (sessionId) mappingWhere.sessionId = Number(sessionId);

  const planWhere = {};
  if (academicRegulationId) planWhere.regulationId = Number(academicRegulationId);

  let mappingRequired = false;
  if (assignmentStatus === "assigned" || Object.keys(mappingWhere).length > 0 || Object.keys(planWhere).length > 0) {
    mappingRequired = true;
  }

  if (assignmentStatus === "unassigned") {
    subjectWhere["$assessmentPlanMappings.assessment_plan_subject_mapping_id$"] = null;
  }

  const include = [
    {
      model: model.courseModel,
      as: "course",
      attributes: ["courseId", "courseName", "courseCode"],
      required: false,
      include: [
        {
          model: model.academicRegulationModel,
          as: "academicRegulations",
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
      ],
    },
    {
      model: model.assessmentPlanSubjectMappingModel,
      as: "assessmentPlanMappings",
      where: Object.keys(mappingWhere).length > 0 ? mappingWhere : undefined,
      required: mappingRequired,
      include: [
        {
          model: model.assessmentPlanModel,
          as: "assessmentPlan",
          where: Object.keys(planWhere).length > 0 ? planWhere : undefined,
          required: Object.keys(planWhere).length > 0,
          include: [
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
            {
              model: model.sessionModel,
              as: "session",
              attributes: ["sessionId", "sessionName"],
              required: false,
            },
          ],
        },
      ],
    },
  ];

  const { count, rows } = await scoped(model.subjectModel).findAndCountAll({
    where: subjectWhere,
    include,
    distinct: true,
    order: [["subjectId", "DESC"]],
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

export async function getAssessmentPlanStats({
  courseId,
  sessionId,
  term,
}) {
  const subjectWhere = {};
  if (courseId) subjectWhere.courseId = Number(courseId);
  if (term) subjectWhere.term = Number(term);

  const totalSubjects = await scoped(model.subjectModel).count({
    where: subjectWhere,
  });

  const subjects = await scoped(model.subjectModel).findAll({
    where: subjectWhere,
    attributes: ["subjectId", "courseId", "term"],
  });

  const courseIds = [...new Set(subjects.map((s) => s.courseId).filter(Boolean))];

  const planWhere = {};
  if (courseIds.length > 0) {
    planWhere.courseId = { [Op.in]: courseIds };
  }
  if (sessionId) planWhere.sessionId = Number(sessionId);

  const plans = await scoped(model.assessmentPlanModel).findAll({
    where: planWhere,
    attributes: ["assessmentPlanId", "courseId", "status", "isActive"],
  });

  const coursesWithPlan = new Set(plans.map((p) => p.courseId));

  let assignedSubjects = 0;
  let unassignedSubjects = 0;

  for (const subj of subjects) {
    if (coursesWithPlan.has(subj.courseId)) {
      assignedSubjects++;
    } else {
      unassignedSubjects++;
    }
  }

  const overriddenSubjects = plans.filter((p) => p.status === "Archived" || p.isActive === false).length;

  return {
    totalSubjects,
    assignedSubjects,
    unassignedSubjects,
    overriddenSubjects,
    coveragePercentage: totalSubjects > 0 ? Number(((assignedSubjects / totalSubjects) * 100).toFixed(2)) : 0,
  };
}

export async function createAssessmentPlanSubjectMapping(data, options = {}) {
  return await scoped(model.assessmentPlanSubjectMappingModel).create(data, {
    transaction: options.transaction,
  });
}

export async function getAssessmentPlanSubjectMappings({
  assessmentPlanId,
  subjectId,
  courseId,
  sessionId,
  academicYearId,
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (assessmentPlanId) where.assessmentPlanId = Number(assessmentPlanId);
  if (subjectId) where.subjectId = Number(subjectId);
  if (courseId) where.courseId = Number(courseId);
  if (sessionId) where.sessionId = Number(sessionId);
  if (academicYearId) where.academicYearId = Number(academicYearId);

  const { count, rows } = await scoped(model.assessmentPlanSubjectMappingModel).findAndCountAll({
    where,
    include: [
      {
        model: model.assessmentPlanModel,
        as: "assessmentPlan",
        attributes: ["assessmentPlanId", "planName", "planCode", "status", "isActive"],
        required: false,
      },
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId", "subjectName", "subjectCode", "term"],
        required: false,
      },
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle"],
        required: false,
      },
    ],
    limit: limitNum,
    offset,
    order: [["assessmentPlanSubjectMappingId", "DESC"]],
  });

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: rows,
  };
}

export async function deleteAssessmentPlanSubjectMapping(mappingId, options = {}) {
  const existing = await scoped(model.assessmentPlanSubjectMappingModel).findOne({
    where: { assessmentPlanSubjectMappingId: Number(mappingId) },
    transaction: options.transaction,
  });

  if (!existing) {
    return null;
  }

  await scoped(model.assessmentPlanSubjectMappingModel).destroy({
    where: { assessmentPlanSubjectMappingId: Number(mappingId) },
    transaction: options.transaction,
  });

  return { message: "Subject assessment plan mapping deleted successfully" };
}
