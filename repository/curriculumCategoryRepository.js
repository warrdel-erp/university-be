import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const defaultAttributes = [
  "id",
  "categoryName",
  "code",
  "isElectiveCoursework",
  "description",
  "createdAt",
  "updatedAt",
];

export async function createCurriculumCategory(data, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumCategoryModel).create(data, { transaction });
}

export async function findCurriculumCategoryById(id, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumCategoryModel).findOne({
    where: { id },
    attributes: defaultAttributes,
    transaction,
  });
}

export async function findCurriculumCategoryByCode(code, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumCategoryModel).findOne({
    where: { code },
    attributes: defaultAttributes,
    transaction,
  });
}

export async function findCurriculumCategories(query = {}, options = {}) {
  const { transaction } = options;
  const where = {};

  if (query.isElectiveCoursework !== undefined && query.isElectiveCoursework !== null && query.isElectiveCoursework !== "") {
    where.isElectiveCoursework =
      query.isElectiveCoursework === true ||
      query.isElectiveCoursework === "true" ||
      query.isElectiveCoursework === 1 ||
      query.isElectiveCoursework === "1";
  }

  if (query.search) {
    const searchVal = `%${query.search.trim()}%`;
    where[Op.or] = [
      { categoryName: { [Op.like]: searchVal } },
      { code: { [Op.like]: searchVal } },
      { description: { [Op.like]: searchVal } },
    ];
  }

  const findOptions = {
    where,
    attributes: defaultAttributes,
    order: [["id", "DESC"]],
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

  return scoped(model.curriculumCategoryModel).findAndCountAll(findOptions);
}

export async function updateCurriculumCategory(id, data, options = {}) {
  const { transaction } = options;
  const [affected] = await scoped(model.curriculumCategoryModel).update(data, {
    where: { id },
    transaction,
  });
  return affected;
}

export async function deleteCurriculumCategory(id, options = {}) {
  const { transaction } = options;
  const deleted = await scoped(model.curriculumCategoryModel).destroy({
    where: { id },
    transaction,
  });
  return deleted > 0;
}

