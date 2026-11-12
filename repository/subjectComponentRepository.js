import { Op, fn, col, literal } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const defaultAttributes = [
  "id",
  "componentName",
  "code",
  "description",
  "createdAt",
  "updatedAt",
  [
    literal(
      `(SELECT COUNT(*) FROM subject_component_mapping WHERE subject_component_mapping.subject_component_id = \`subject_component\`.\`id\`)`
    ),
    "mappedSubjectsCount",
  ],
];

export async function createSubjectComponent(data, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentModel).create(data, { transaction });
}

export async function findSubjectComponentById(id, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentModel).findOne({
    where: { id },
    attributes: defaultAttributes,
    transaction,
  });
}

export async function findSubjectComponentByCode(code, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentModel).findOne({
    where: { code },
    attributes: defaultAttributes,
    transaction,
  });
}

export async function findSubjectComponents(query = {}, options = {}) {
  const { transaction } = options;
  const where = {};

  if (query.search) {
    const searchVal = `%${query.search.trim()}%`;
    where[Op.or] = [
      { componentName: { [Op.like]: searchVal } },
      { code: { [Op.like]: searchVal } },
      { description: { [Op.like]: searchVal } },
    ];
  }

  const findOptions = {
    where,
    attributes: defaultAttributes,
    order: [["id", "ASC"]],
    transaction,
  };

  if (query.limit !== undefined && query.limit !== null && query.limit !== "") {
    const limit = parseInt(query.limit, 10);
    const page = parseInt(query.page || 1, 10);
    if (!isNaN(limit) && limit > 0) {
      findOptions.limit = limit;
      findOptions.offset = Math.max(0, (page - 1) * limit);
    }
  }

  return scoped(model.subjectComponentModel).findAndCountAll(findOptions);
}

export async function updateSubjectComponent(id, data, options = {}) {
  const { transaction } = options;
  const [affected] = await scoped(model.subjectComponentModel).update(data, {
    where: { id },
    transaction,
  });
  return affected;
}

export async function countMappedSubjectsByComponentId(componentId, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentMappingModel).count({
    where: { subjectComponentId: componentId },
    transaction,
  });
}

export async function deleteSubjectComponent(id, options = {}) {
  const { transaction } = options;
  const deleted = await scoped(model.subjectComponentModel).destroy({
    where: { id },
    transaction,
  });
  return deleted > 0;
}

/**
 * Mapping Repository Functions
 */
export async function getMappingsBySubjectId(subjectId, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentMappingModel).findAll({
    where: { subjectId },
    include: [
      {
        model: model.subjectComponentModel,
        as: "component",
        attributes: ["id", "componentName", "code", "description"],
      },
    ],
    transaction,
  });
}

export async function getMappingsByComponentId(componentId, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentMappingModel).findAll({
    where: { subjectComponentId: componentId },
    include: [
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId", "subjectName", "subjectCode", "courseId", "term"],
      },
    ],
    transaction,
  });
}

export async function addSubjectComponentMapping(subjectId, subjectComponentId, options = {}) {
  const { transaction } = options;
  const existing = await scoped(model.subjectComponentMappingModel).findOne({
    where: { subjectId, subjectComponentId },
    transaction,
  });
  if (existing) return existing;
  return scoped(model.subjectComponentMappingModel).create(
    { subjectId, subjectComponentId },
    { transaction }
  );
}

export async function removeSubjectComponentMapping(subjectId, subjectComponentId, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentMappingModel).destroy({
    where: { subjectId, subjectComponentId },
    transaction,
  });
}

export async function removeAllMappingsForSubject(subjectId, options = {}) {
  const { transaction } = options;
  return scoped(model.subjectComponentMappingModel).destroy({
    where: { subjectId },
    transaction,
  });
}
