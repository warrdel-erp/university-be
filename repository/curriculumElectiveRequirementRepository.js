import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const defaultAttributes = [
  "id",
  "curriculumId",
  "term",
  "requirementCode",
  "requirementName",
  "curriculumCategoryId",
  "courseCount",
  "coursesRequired",
  "minCredits",
  "electivePoolId",
  "isActive",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
];

const defaultIncludes = [
  {
    model: model.curriculumCategoryModel,
    as: "curriculumCategory",
    attributes: ["id", "categoryName", "code"],
    required: false,
  },
  {
    model: model.electivePoolModel,
    as: "electivePool",
    attributes: ["id", "name", "code", "scope", "isActive"],
    include: [
      {
        model: model.electivePoolSubjectMappingModel,
        as: "poolSubjectMappings",
        attributes: ["id", "subjectId"],
        required: false,
      },
    ],
    required: false,
  },
  {
    model: model.curriculumModel,
    as: "curriculum",
    attributes: ["curriculumId", "name", "courseId"],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode", "totalTerms"],
        required: false,
      },
    ],
    required: false,
  },
];

export async function createCurriculumElectiveRequirement(data, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveRequirementModel).create(data, { transaction });
}

export async function findCurriculumElectiveRequirementById(id, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveRequirementModel).findOne({
    where: { id },
    attributes: defaultAttributes,
    include: defaultIncludes,
    transaction,
  });
}

export async function findCurriculumElectiveRequirementByCode(curriculumId, term, requirementCode, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveRequirementModel).findOne({
    where: { curriculumId, term, requirementCode },
    attributes: defaultAttributes,
    transaction,
  });
}

export async function findCurriculumElectiveRequirements(query = {}, options = {}) {
  const { transaction } = options;
  const where = {};

  if (query.curriculumId) {
    where.curriculumId = query.curriculumId;
  }

  if (query.term) {
    where.term = query.term;
  }

  if (query.curriculumCategoryId) {
    where.curriculumCategoryId = query.curriculumCategoryId;
  }

  if (query.electivePoolId) {
    where.electivePoolId = query.electivePoolId;
  }

  if (query.isActive !== undefined && query.isActive !== null && query.isActive !== "") {
    where.isActive =
      query.isActive === true ||
      query.isActive === "true" ||
      query.isActive === 1 ||
      query.isActive === "1";
  } else if (query.status) {
    if (query.status.toLowerCase() === "active") {
      where.isActive = true;
    } else if (query.status.toLowerCase() === "inactive") {
      where.isActive = false;
    }
  }

  if (query.search) {
    const searchVal = `%${query.search.trim()}%`;
    where[Op.or] = [
      { requirementCode: { [Op.like]: searchVal } },
      { requirementName: { [Op.like]: searchVal } },
    ];
  }

  const findOptions = {
    where,
    attributes: defaultAttributes,
    include: defaultIncludes,
    order: [
      ["term", "ASC"],
      ["id", "ASC"],
    ],
    distinct: true,
    transaction,
  };

  if (query.limit !== undefined && query.limit !== null) {
    const limit = parseInt(query.limit, 10);
    const page = parseInt(query.page || 1, 10);
    if (!isNaN(limit) && limit > 0) {
      findOptions.limit = limit;
      findOptions.offset = Math.max(0, (page - 1) * limit);
    }
  }

  return scoped(model.curriculumElectiveRequirementModel).findAndCountAll(findOptions);
}

export async function updateCurriculumElectiveRequirement(id, data, options = {}) {
  const { transaction } = options;
  const [affected] = await scoped(model.curriculumElectiveRequirementModel).update(data, {
    where: { id },
    transaction,
  });
  return affected;
}

export async function deleteCurriculumElectiveRequirement(id, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveRequirementModel).destroy({
    where: { id },
    transaction,
  });
}

/**
 * Fetches all eligible students for an elective requirement based on:
 * - Batches mapped to the curriculum (curriculum_batch_mapping)
 * - Programme/Course ID of the curriculum
 * - Term of the requirement (via studentClassSectionTerm)
 * - Existing elective subject mappings (student_elective_subject)
 */
export async function findEligibleStudentsForRequirement(requirement, query = {}, options = {}) {
  const mergedOptions = { ...query, ...options };
  const transaction = options.transaction || query.transaction;
  const curriculumId = requirement.curriculumId;
  const courseId = requirement.curriculum?.courseId;
  const targetTerm = mergedOptions.term !== undefined ? mergedOptions.term : requirement.term;

  // 1. Fetch mapped batch IDs for this curriculum
  const batchMappings = await scoped(model.curriculumBatchMappingModel).findAll({
    where: { curriculumId },
    attributes: ["curriculumBatchMappingId", "curriculumId", "batchId"],
    transaction,
  });

  const batchIds = batchMappings.map((bm) => bm.batchId).filter(Boolean);
  if (batchIds.length === 0) {
    return [];
  }

  // 2. Build where conditions for students
  const studentWhere = {
    batchId: { [Op.in]: batchIds },
  };
  if (courseId) {
    studentWhere.courseId = courseId;
  }

  const search = mergedOptions.studentSearch || mergedOptions.search;
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    studentWhere[Op.or] = [
      { firstName: { [Op.like]: s } },
      { lastName: { [Op.like]: s } },
      { scholarNumber: { [Op.like]: s } },
      { enrollNumber: { [Op.like]: s } },
    ];
  }

  // 3. Build classSectionTerm conditions
  const sectionWhere = {};
  const sectionFilter = mergedOptions.studentSection || mergedOptions.section;
  if (sectionFilter && sectionFilter.trim()) {
    sectionWhere.section = sectionFilter.trim();
  }

  const termWhere = {};
  if (!mergedOptions.allTerms && !mergedOptions.allBatchStudents && targetTerm != null) {
    termWhere.term = parseInt(targetTerm, 10);
  }

  const hasTermFilter = Object.keys(termWhere).length > 0;
  const hasSectionFilter = Object.keys(sectionWhere).length > 0;

  const findOptions = {
    where: studentWhere,
    attributes: [
      "studentId",
      "scholarNumber",
      "enrollNumber",
      "firstName",
      "middleName",
      "lastName",
      "batchId",
      "classSectionTermId",
    ],
    include: [
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch"],
        required: false,
      },
      {
        model: model.classSectionTermModel,
        as: "studentClassSectionTerm",
        attributes: ["classSectionTermId", "term", "classSectionsId"],
        where: hasTermFilter ? termWhere : undefined,
        required: hasTermFilter,
        include: [
          {
            model: model.classSectionModel,
            as: "classSection",
            attributes: ["classSectionsId", "section"],
            where: hasSectionFilter ? sectionWhere : undefined,
            required: hasSectionFilter,
          },
        ],
      },
      {
        model: model.studentElectiveSubjectModel,
        as: "electiveSubjectMappings",
        attributes: ["studentElectiveSubjectId", "electiveSubjectId"],
        required: false,
        include: [
          {
            model: model.electiveSubjectModel,
            as: "electiveSubject",
            attributes: [
              "electiveSubjectId",
              "electiveSubjectName",
              "electiveSubjectCode",
              "electiveSubjectType",
            ],
            required: false,
          },
        ],
      },
    ],
    order: [
      ["firstName", "ASC"],
      ["studentId", "ASC"],
    ],
    transaction,
  };

  return scoped(model.studentModel, { scopeConfig: { academicYear: false } }).findAll(findOptions);
}


