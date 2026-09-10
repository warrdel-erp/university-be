import { Op } from "sequelize";
import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";
import {
  decimalAdd,
  decimalDivide,
  decimalGreaterThan,
  decimalMultiply,
  decimalSubtract,
  toIntegerNumber,
} from "../utility/decimalMoney.js";

function resolvePositiveInt(value, fallback) {
  const parsed = toIntegerNumber(value);
  return decimalGreaterThan(parsed, 0) ? parsed : fallback;
}

function decimalCeilDivide(numerator, denominator) {
  const quotient = decimalDivide(numerator, denominator);
  const floored = toIntegerNumber(quotient);
  if (decimalGreaterThan(quotient, floored)) {
    return decimalAdd(floored, 1);
  }
  return floored;
}

function paginationMeta(count, pageNum, limitNum) {
  return {
    totalRecords: count,
    totalPages: decimalCeilDivide(count, limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
  };
}


export async function createAssessmentPlan(planData, options = {}) {
  const { components, ...mainPlanData } = planData;
  const record = await scoped(model.assessmentPlanModel).create(
    mainPlanData,
    options,
  );

  if (Array.isArray(components) && components.length > 0) {
    const componentsToCreate = components.map((comp) => ({
      ...comp,
      assessmentPlanId: record.assessmentPlanId,
      academicYearId:
        comp.academicYearId || mainPlanData.academicYearId || null,
      universityId: mainPlanData.universityId,
      instituteId: mainPlanData.instituteId,
      createdBy: mainPlanData.createdBy,
      updatedBy: mainPlanData.updatedBy,
    }));

    await Promise.all(
      componentsToCreate.map((comp) =>
        scoped(model.assessmentPlanComponentModel).create(comp, {
          transaction: options.transaction,
        }),
      ),
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
  gradingId,
  term,
  page = 1,
  limit = 10,
}) {
  const pageNum = resolvePositiveInt(page, 1);
  const limitNum = resolvePositiveInt(limit, 10);
  const offset = decimalMultiply(decimalSubtract(pageNum, 1), limitNum);

  const where = { isActive: true };
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
  if (gradingId) {
    where.gradingId = Number(gradingId);
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

  const { count, rows } = await scoped(
    model.assessmentPlanModel,
  ).findAndCountAll({
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
        attributes: [
          "academicRegulationId",
          "regulationCode",
          "regulationName",
        ],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: [
          "academicYearId",
          "yearTitle",
          "startingDate",
          "endingDate",
        ],
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
    ...paginationMeta(count, pageNum, limitNum),
    data: rows,
  };
}

export async function getAssessmentPlanById(assessmentPlanId, options = {}) {
  const parsedId = Number(assessmentPlanId);
  if (isNaN(parsedId)) {
    return null;
  }
  return await scoped(model.assessmentPlanModel).findOne({
    where: { assessmentPlanId: parsedId },
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
        attributes: [
          "academicRegulationId",
          "regulationCode",
          "regulationName",
        ],
        required: false,
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: [
          "academicYearId",
          "yearTitle",
          "startingDate",
          "endingDate",
        ],
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

export async function updateAssessmentPlan(
  assessmentPlanId,
  updateData = {},
  options = {},
) {
  const planId =
    typeof assessmentPlanId === "object"
      ? Number(assessmentPlanId.assessmentPlanId)
      : Number(assessmentPlanId);
  const dataPayload =
    typeof assessmentPlanId === "object"
      ? assessmentPlanId.payload || {}
      : updateData || {};
  const opts =
    typeof assessmentPlanId === "object" ? updateData || {} : options;

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
        academicYearId:
          comp.academicYearId || existingPlan?.academicYearId || null,
        universityId: existingPlan?.universityId,
        instituteId: existingPlan?.instituteId,
        createdBy: mainUpdateData.updatedBy || null,
        updatedBy: mainUpdateData.updatedBy || null,
      }));

      await scoped(model.assessmentPlanComponentModel).bulkCreate(
        componentsToCreate,
        {
          transaction: opts.transaction,
        },
      );
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
    },
  );

  return {
    assessmentPlanId: Number(assessmentPlanId),
    isActive: newIsActive,
    message: `Assessment plan marked as ${newIsActive ? "active" : "inactive"} successfully`,
  };
}

export async function createAssessmentPlanComponent(
  componentData,
  options = {},
) {
  const record = await scoped(model.assessmentPlanComponentModel).create(
    componentData,
    options,
  );
  return await scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanComponentId: record.assessmentPlanComponentId },
    transaction: options.transaction,
  });
}

export async function updateAssessmentPlanComponent(
  assessmentPlanComponentId,
  updateData = {},
  options = {},
) {
  const compId =
    typeof assessmentPlanComponentId === "object"
      ? Number(assessmentPlanComponentId.assessmentPlanComponentId)
      : Number(assessmentPlanComponentId);
  const dataPayload =
    typeof assessmentPlanComponentId === "object"
      ? assessmentPlanComponentId.payload || {}
      : updateData || {};
  const opts =
    typeof assessmentPlanComponentId === "object" ? updateData || {} : options;

  await scoped(model.assessmentPlanComponentModel).update(dataPayload, {
    where: { assessmentPlanComponentId: compId },
    transaction: opts.transaction,
  });

  return await scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanComponentId: compId },
    transaction: opts.transaction,
  });
}

export async function deleteAssessmentPlanComponent(
  assessmentPlanComponentId,
  options = {},
) {
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

/**
 * Subjects for curricula linked to the given batches, limited to terms whose
 * curriculum_batch_term_mapping.year matches the active academic calendar year
 * (from tenant academicYear.startingDate, e.g. 2025-07-01 → 2025).
 */
/**
 * Overview for one curriculum batch:
 * curriculum_batch_mapping → term mappings + curriculum subjects + plan mappings.
 */
export async function findOverviewByCurriculumBatchMappingId({
  curriculumBatchMappingId,
  subjectTermWhere = {},
  subjectWhere = {},
  mappingWhere = {},
  planWhere = {},
  mappingRequired = false,
  page = 1,
  limit = 10,
} = {}) {
  const pageNum = resolvePositiveInt(page, 1);
  const limitNum = resolvePositiveInt(limit, 10);
  // Paginate subjects only when a specific term is requested.
  // Full batch overview returns every term (1..N) with all subjects.
  const paginateSubjects = subjectTermWhere.term !== undefined;
  const offset = paginateSubjects
    ? decimalMultiply(decimalSubtract(pageNum, 1), limitNum)
    : 0;

  const batchMapping = await model.curriculumBatchMappingModel.findOne({
    where: { curriculumBatchMappingId },
    attributes: ["curriculumBatchMappingId", "curriculumId", "batch"],
    include: [
      {
        model: model.curriculumBatchTermMappingModel,
        as: "termMappings",
        attributes: [
          "curriculumBatchTermMappingId",
          "term",
          "yearNumber",
          "year",
        ],
        required: false,
        separate: true,
        order: [["term", "ASC"]],
      },
      {
        model: model.curriculumModel,
        as: "curriculum",
        attributes: ["curriculumId", "name", "courseId"],
        required: true,
        where: buildScope(model.curriculumModel),
        include: [
          {
            model: model.courseModel,
            as: "course",
            attributes: [
              "courseId",
              "courseName",
              "courseCode",
              "termType",
              "totalTerms",
              "courseDuration",
            ],
            required: true,
          },
        ],
      },
    ],
  });

  if (!batchMapping) {
    return null;
  }

  const plainBatch = batchMapping.get({ plain: true });
  const batchTerms = [];
  for (const termMapping of plainBatch.termMappings || []) {
    batchTerms.push(Number(termMapping.term));
  }

  const where = {
    curriculumId: plainBatch.curriculumId,
    ...subjectTermWhere,
  };
  if (subjectTermWhere.term === undefined && batchTerms.length > 0) {
    where.term = { [Op.in]: batchTerms };
  }

  const queryOptions = {
    where,
    attributes: [
      "curriculumSubjectTermMappingId",
      "curriculumId",
      "subjectId",
      "term",
    ],
    include: [
      {
        model: model.subjectModel,
        as: "subject",
        attributes: [
          "subjectId",
          "subjectName",
          "subjectCode",
          "subjectType",
          "subjectCategory",
          "shortName",
          "description",
          "isActive",
          "term",
          "courseId",
        ],
        required: true,
        where: {
          ...buildScope(model.subjectModel),
          ...subjectWhere,
        },
        include: [
          {
            model: model.assessmentPlanSubjectMappingModel,
            as: "assessmentPlanMappings",
            attributes: [
              "assessmentPlanSubjectMappingId",
              "assessmentPlanId",
              "subjectId",
              "courseId",
              "sessionId",
              "academicYearId",
              "examSetupTypeId",
              "universityId",
              "instituteId",
              "createdAt",
              "updatedAt",
            ],
            where:
              Object.keys(mappingWhere).length > 0 ? mappingWhere : undefined,
            required: mappingRequired,
            include: [
              {
                model: model.assessmentPlanModel,
                as: "assessmentPlan",
                attributes: [
                  "assessmentPlanId",
                  "planName",
                  "planCode",
                  "description",
                  "courseId",
                  "sessionId",
                  "academicYearId",
                  "regulationId",
                  "term",
                  "gradingId",
                  "status",
                  "isActive",
                ],
                where:
                  Object.keys(planWhere).length > 0 ? planWhere : undefined,
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
                  {
                    model: model.assessmentPlanComponentModel,
                    as: "components",
                    attributes: [
                      "assessmentPlanComponentId",
                      "examSetupTypeId",
                      "weightagePercentage",
                      "maxAssessments",
                      "duration",
                    ],
                    required: false,
                    include: [
                      {
                        model: model.examSetupTypeModel,
                        as: "examSetupType",
                        attributes: ["examSetupTypeId", "examName"],
                        required: false,
                      },
                    ],
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
                model: model.examSetupTypeModel,
                as: "examSetupType",
                attributes: ["examSetupTypeId", "examName"],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    distinct: true,
    order: [
      ["term", "ASC"],
      ["curriculumSubjectTermMappingId", "ASC"],
    ],
  };

  if (paginateSubjects) {
    queryOptions.limit = limitNum;
    queryOptions.offset = offset;
  }

  const { count, rows } =
    await model.curriculumSubjectTermMappingModel.findAndCountAll(queryOptions);

  return {
    batchMapping: plainBatch,
    rows,
    ...paginationMeta(
      count,
      paginateSubjects ? pageNum : 1,
      paginateSubjects ? limitNum : count || 1,
    ),
  };
}

export async function getAssessmentPlanStatsData() {
  const subjects = await scoped(model.subjectModel).findAll({
    attributes: ["subjectId"],
  });

  const subjectIds = [];
  for (const subject of subjects) {
    subjectIds.push(subject.subjectId);
  }

  const mappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: subjectIds.length > 0 ? { subjectId: { [Op.in]: subjectIds } } : {},
    attributes: ["subjectId", "assessmentPlanId"],
  });

  const plans = await scoped(model.assessmentPlanModel).findAll({
    attributes: ["assessmentPlanId", "status", "isActive"],
  });

  return { subjects, mappings, plans };
}


export async function createAssessmentPlanSubjectMapping(data, options = {}) {
  return scoped(model.assessmentPlanSubjectMappingModel).create(data, {
    transaction: options.transaction,
  });
}

export async function getAssessmentPlanSubjectMappings({
  page = 1,
  limit = 10,
} = {}) {
  const pageNum = resolvePositiveInt(page, 1);
  const limitNum = resolvePositiveInt(limit, 10);
  const offset = decimalMultiply(decimalSubtract(pageNum, 1), limitNum);

  const { count, rows } =
    await model.assessmentPlanSubjectMappingModel.findAndCountAll({
      include: [
        {
          model: model.assessmentPlanModel,
          as: "assessmentPlan",
          attributes: [
            "assessmentPlanId",
            "planName",
            "planCode",
            "status",
            "isActive",
          ],
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
    ...paginationMeta(count, pageNum, limitNum),
    data: rows,
  };
}

export async function deleteAssessmentPlanSubjectMapping(
  mappingId,
  options = {},
) {
  const existing = await scoped(
    model.assessmentPlanSubjectMappingModel,
  ).findOne({
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

/**
 * Curriculum batches (current + previous) with course sessions for one academicYearId.
 * Path: curriculum_batch_mapping → curriculum → course → sessionCourseMappings → session
 */
export async function findCurriculumBatchCoursesWithSessions({
  batchWhere = {},
  curriculumWhere = {},
  academicYearId,
} = {}) {
  const sessionWhere = {
    ...buildScope(model.sessionModel, {
      scopeConfig: { academicYear: false },
    }),
  };
  if (academicYearId) {
    sessionWhere.academicYearId = academicYearId;
  }

  return scoped(model.curriculumBatchMappingModel).findAll({
    where: batchWhere,
    attributes: ["curriculumBatchMappingId", "curriculumId", "batch"],
    include: [
      {
        model: model.curriculumBatchTermMappingModel,
        as: "termMappings",
        attributes: [
          "curriculumBatchTermMappingId",
          "term",
          "yearNumber",
          "year",
        ],
        required: false,
        separate: true,
      },
      {
        model: model.curriculumModel,
        as: "curriculum",
        attributes: ["curriculumId", "name", "courseId"],
        required: true,
        where: {
          ...buildScope(model.curriculumModel),
          ...curriculumWhere,
        },
        include: [
          {
            model: model.courseModel,
            as: "course",
            attributes: [
              "courseId",
              "courseName",
              "courseCode",
              "termType",
              "totalTerms",
              "courseDuration",
            ],
            required: true,
            include: [
              {
                model: model.sessionCouseMappingModel,
                as: "sessionCourseMappings",
                required: true,
                attributes: ["sessionCourseMappingId", "sessionId", "courseId"],
                include: [
                  {
                    model: model.sessionModel,
                    as: "session",
                    attributes: [
                      "sessionId",
                      "sessionName",
                      "startingDate",
                      "endingDate",
                      "academicYearId",
                    ],
                    required: true,
                    where: sessionWhere,
                    include: [
                      {
                        model: model.acedmicYearModel,
                        as: "sessionAcedmic",
                        attributes: [
                          "academicYearId",
                          "yearTitle",
                          "startingDate",
                          "endingDate",
                          "isActive",
                        ],
                        required: true,
                        where: academicYearId
                          ? { academicYearId }
                          : buildScope(model.acedmicYearModel),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: model.curriculumSubjectTermMappingModel,
            as: "subjectTermMappings",
            attributes: ["curriculumSubjectTermMappingId", "subjectId", "term"],
            required: false,
            separate: true,
          },
        ],
      },
    ],
    order: [
      ["batch", "DESC"],
      ["curriculumBatchMappingId", "ASC"],
    ],
  });
}

export async function findAssignedSubjectMappings({
  courseIds = [],
  sessionIds = [],
  subjectIds = [],
} = {}) {
  if (!courseIds.length || !subjectIds.length) {
    return [];
  }

  const where = {
    courseId: { [Op.in]: courseIds },
    subjectId: { [Op.in]: subjectIds },
  };
  if (sessionIds.length) {
    where.sessionId = { [Op.in]: sessionIds };
  }

  return scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where,
    attributes: ["courseId", "sessionId", "subjectId"],
  });
}
