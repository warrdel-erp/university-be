import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function mapSubjectsToPool(electivePoolId, subjectIds = [], createdBy = null, options = {}) {
  const { transaction } = options;

  if (!subjectIds.length) {
    return [];
  }

  // Find existing mappings to prevent duplicates
  const existingMappings = await model.electivePoolSubjectMappingModel.findAll({
    where: {
      electivePoolId,
      subjectId: { [Op.in]: subjectIds },
    },
    attributes: ["subjectId"],
    transaction,
  });

  const existingSubjectIds = new Set(existingMappings.map((m) => m.subjectId));
  const newSubjectIds = subjectIds.filter((id) => !existingSubjectIds.has(Number(id)));

  if (!newSubjectIds.length) {
    return [];
  }

  const rowsToInsert = newSubjectIds.map((subjectId) => ({
    electivePoolId,
    subjectId,
    createdBy,
  }));

  return model.electivePoolSubjectMappingModel.bulkCreate(rowsToInsert, { transaction });
}

export async function unmapSubjectFromPool(electivePoolId, subjectId, options = {}) {
  const { transaction } = options;
  return model.electivePoolSubjectMappingModel.destroy({
    where: {
      electivePoolId,
      subjectId,
    },
    transaction,
  });
}

export async function getMappedSubjectsForPool(electivePoolId, options = {}) {
  const { transaction } = options;

  return model.electivePoolSubjectMappingModel.findAll({
    where: { electivePoolId },
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
          "isActive",
          "term",
        ],
        include: [
          {
            model: model.courseModel,
            as: "course",
            attributes: ["courseId", "courseName", "courseCode"],
            required: false,
          },
          {
            model: model.subjectComponentMappingModel,
            as: "subjectComponentMappings",
            attributes: ["id", "subjectId", "subjectComponentId"],
            required: false,
            include: [
              {
                model: model.subjectComponentModel,
                as: "component",
                attributes: ["id", "componentName", "code", "description"],
                required: false,
              },
            ],
          },
          {
            model: model.subjectComponentModel,
            as: "components",
            attributes: ["id", "componentName", "code"],
            through: { attributes: [] },
            required: false,
          },
        ],
      },
    ],
    order: [["id", "DESC"]],
    transaction,
  });
}

export async function getAvailableSubjects(query = {}, options = {}) {
  const { transaction } = options;
  const where = {};

  if (query.courseId || query.programmeId) {
    where.courseId = query.courseId || query.programmeId;
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

  if (query.subjectType) {
    const rawList = String(query.subjectType).split(",").map((s) => s.trim()).filter(Boolean);
    if (rawList.length === 1 && rawList[0].toLowerCase() === "all") {
      // allow all if explicitly requested via ?subjectType=all
    } else if (rawList.length === 1) {
      const canonicalMap = {
        core: "Core",
        elective: "Elective",
        "open elective": "Open Elective",
        openelective: "Open Elective",
        "department elective": "Department Elective",
        departmentelective: "Department Elective",
        foundation: "Foundation",
      };
      where.subjectType = canonicalMap[rawList[0].toLowerCase()] || rawList[0];
    } else if (rawList.length > 1) {
      where.subjectType = { [Op.in]: rawList };
    }
  } else {
    where.subjectType = "Elective";
  }

  if (query.search) {
    const searchVal = `%${query.search.trim()}%`;
    where[Op.or] = [
      { subjectName: { [Op.like]: searchVal } },
      { subjectCode: { [Op.like]: searchVal } },
    ];
  }

  const componentInclude = {
    model: model.subjectComponentModel,
    as: "components",
    attributes: ["id", "componentName", "code"],
    through: { attributes: [] },
    required: false,
  };

  if (query.componentId) {
    componentInclude.where = { id: query.componentId };
    componentInclude.required = true;
  }

  const findOptions = {
    where,
    attributes: [
      "subjectId",
      "subjectName",
      "subjectCode",
      "subjectType",
      "isActive",
      "term",
      "courseId",
    ],
    include: [
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      componentInclude,
    ],
    order: [["subjectId", "DESC"]],
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

  return scoped(model.subjectModel).findAndCountAll(findOptions);
}

export async function findMappedSubjectIdsForPool(electivePoolId, options = {}) {
  const { transaction } = options;
  const rows = await model.electivePoolSubjectMappingModel.findAll({
    where: { electivePoolId },
    attributes: ["subjectId"],
    raw: true,
    transaction,
  });
  return rows.map((r) => r.subjectId);
}

