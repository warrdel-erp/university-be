import { Op, Sequelize } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const defaultAttributes = [
  "id",
  "name",
  "code",
  "description",
  "scope",
  "courseId",
  "batchId",
  "instituteId",
  "universityId",
  "campusId",
  "isActive",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
];

export async function createElectivePool(data, options = {}) {
  const { transaction } = options;
  return scoped(model.electivePoolModel).create(data, { transaction });
}

export async function findElectivePoolById(id, options = {}) {
  const { transaction } = options;
  return scoped(model.electivePoolModel).findOne({
    where: { id },
    attributes: defaultAttributes,
    include: [
      {
        model: model.courseModel,
        as: "programme",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "status"],
        required: false,
      },
      {
        model: model.instituteModel,
        as: "institute",
        attributes: ["instituteId", "instituteName", "instituteCode"],
        required: false,
      },
    ],
    transaction,
  });
}

export async function findElectivePoolByCode(code, options = {}) {
  const { transaction } = options;
  return scoped(model.electivePoolModel).findOne({
    where: { code },
    attributes: defaultAttributes,
    transaction,
  });
}

export async function findElectivePools(query = {}, options = {}) {
  const { transaction } = options;
  const where = {};

  if (query.scope) {
    where.scope = query.scope;
  }

  if (query.courseId || query.programmeId) {
    where.courseId = query.courseId || query.programmeId;
  }

  if (query.batchId) {
    where.batchId = query.batchId;
  }

  if (query.instituteId) {
    where.instituteId = query.instituteId;
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
      { name: { [Op.like]: searchVal } },
      { code: { [Op.like]: searchVal } },
      { description: { [Op.like]: searchVal } },
    ];
  }

  const findOptions = {
    where,
    attributes: defaultAttributes,
    include: [
      {
        model: model.courseModel,
        as: "programme",
        attributes: ["courseId", "courseName", "courseCode"],
        required: false,
      },
      {
        model: model.batchModel,
        as: "batch",
        attributes: ["batchId", "batch", "status"],
        required: false,
      },
      {
        model: model.instituteModel,
        as: "institute",
        attributes: ["instituteId", "instituteName", "instituteCode"],
        required: false,
      },
      {
        model: model.electivePoolSubjectMappingModel,
        as: "poolSubjectMappings",
        attributes: ["id"],
        required: false,
      },
    ],
    order: [["id", "DESC"]],
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

  return scoped(model.electivePoolModel).findAndCountAll(findOptions);
}

export async function updateElectivePool(id, data, options = {}) {
  const { transaction } = options;
  const [affected] = await scoped(model.electivePoolModel).update(data, {
    where: { id },
    transaction,
  });
  return affected;
}

export async function deleteElectivePool(id, options = {}) {
  const { transaction } = options;
  return scoped(model.electivePoolModel).destroy({
    where: { id },
    transaction,
  });
}

