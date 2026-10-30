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

