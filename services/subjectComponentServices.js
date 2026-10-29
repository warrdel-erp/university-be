import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/subjectComponentRepository.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizePayload(body = {}) {
  const payload = {};

  if (body.componentName !== undefined) {
    payload.componentName = body.componentName;
  } else if (body.component_name !== undefined) {
    payload.componentName = body.component_name;
  } else if (body.name !== undefined) {
    payload.componentName = body.name;
  }

  if (body.code !== undefined) {
    payload.code = typeof body.code === "string" ? body.code.trim().toUpperCase() : body.code;
  }

  if (body.description !== undefined) {
    payload.description = body.description === "" ? null : body.description;
  }

  return payload;
}

export async function addSubjectComponent(body) {
  const normalized = normalizePayload(body);

  if (!normalized.componentName) {
    throw httpError("componentName is required", 400);
  }
  if (!normalized.code) {
    throw httpError("code is required", 400);
  }

  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findSubjectComponentByCode(normalized.code, { transaction });
    if (existing) {
      throw httpError(`Subject component with code '${normalized.code}' already exists`, 409);
    }

    const created = await repo.createSubjectComponent(
      {
        componentName: normalized.componentName,
        code: normalized.code,
        description: normalized.description ?? null,
      },
      { transaction }
    );

    return created.get({ plain: true });
  });
}

export async function getAllSubjectComponents(queryParams = {}) {
  const result = await repo.findSubjectComponents(queryParams);

  if (queryParams.limit !== undefined && queryParams.limit !== null && queryParams.limit !== "") {
    const limit = parseInt(queryParams.limit, 10);
    const page = parseInt(queryParams.page || 1, 10);
    return {
      rows: result.rows,
      paginationData: {
        total: result.count,
        page,
        limit,
      },
    };
  }

  return {
    rows: result.rows,
    paginationData: null,
  };
}

export async function getSubjectComponentById(id) {
  const component = await repo.findSubjectComponentById(id);
  if (!component) {
    throw httpError(`Subject component not found with ID ${id}`, 404);
  }
  return component;
}

export async function updateSubjectComponent(id, body) {
  const normalized = normalizePayload(body);

  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findSubjectComponentById(id, { transaction });
    if (!existing) {
      throw httpError(`Subject component not found with ID ${id}`, 404);
    }

    if (normalized.code && normalized.code !== existing.code) {
      const duplicate = await repo.findSubjectComponentByCode(normalized.code, { transaction });
      if (duplicate && duplicate.id !== Number(id)) {
        throw httpError(`Subject component with code '${normalized.code}' already exists`, 409);
      }
    }

    const updateData = {};
    if (normalized.componentName !== undefined) updateData.componentName = normalized.componentName;
    if (normalized.code !== undefined) updateData.code = normalized.code;
    if (normalized.description !== undefined) updateData.description = normalized.description;

    await repo.updateSubjectComponent(id, updateData, { transaction });

    return repo.findSubjectComponentById(id, { transaction });
  });
}

export async function deleteSubjectComponent(id, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findSubjectComponentById(id, { transaction });
    if (!existing) {
      throw httpError(`Subject component not found with ID ${id}`, 404);
    }

    const mappedCount = await repo.countMappedSubjectsByComponentId(id, { transaction });
    if (mappedCount > 0 && !options.force) {
      throw httpError(
        `Cannot delete component: It is currently assigned to ${mappedCount} subject(s). Unmap them first or pass force=true`,
        409
      );
    }

    const deleted = await repo.deleteSubjectComponent(id, { transaction });
    if (!deleted) {
      throw httpError(`Failed to delete subject component with ID ${id}`, 500);
    }

    return true;
  });
}

/**
 * Mapping Services: Subject <-> Components
 */
export async function syncSubjectComponents(subjectId, componentIds = [], options = {}) {
  const { transaction } = options;
  if (!subjectId) return [];

  // Remove existing mappings for this subject
  await repo.removeAllMappingsForSubject(subjectId, { transaction });

  const ids = Array.isArray(componentIds) ? [...new Set(componentIds.map(Number))] : [];
  if (ids.length === 0) return [];

  const created = [];
  for (const compId of ids) {
    const row = await repo.addSubjectComponentMapping(subjectId, compId, { transaction });
    created.push(row);
  }
  return created;
}

export async function assignComponentsToSubject(subjectId, componentIds = []) {
  if (!subjectId) {
    throw httpError("subjectId is required", 400);
  }

  return sequelize.transaction(async (transaction) => {
    const subject = await scoped(model.subjectModel).findOne({
      where: { subjectId },
      transaction,
    });
    if (!subject) {
      throw httpError(`Subject with ID ${subjectId} not found`, 404);
    }

    // Verify all componentIds exist
    if (componentIds.length > 0) {
      const validComponents = await scoped(model.subjectComponentModel).findAll({
        where: { id: componentIds },
        attributes: ["id"],
        transaction,
      });
      if (validComponents.length !== componentIds.length) {
        throw httpError("One or more componentIds are invalid", 400);
      }
    }

    // Remove existing mappings for this subject
    await repo.removeAllMappingsForSubject(subjectId, { transaction });

    // Insert new mappings
    for (const compId of componentIds) {
      await repo.addSubjectComponentMapping(subjectId, compId, { transaction });
    }

    return repo.getMappingsBySubjectId(subjectId, { transaction });
  });
}

export async function getComponentsForSubject(subjectId) {
  if (!subjectId) {
    throw httpError("subjectId is required", 400);
  }
  const subject = await scoped(model.subjectModel).findOne({
    where: { subjectId },
    attributes: ["subjectId", "subjectName", "subjectCode"],
  });
  if (!subject) {
    throw httpError(`Subject with ID ${subjectId} not found`, 404);
  }

  const mappings = await repo.getMappingsBySubjectId(subjectId);
  return {
    subject,
    components: mappings.map((m) => m.component),
  };
}

export async function unmapComponentFromSubject(subjectId, componentId) {
  if (!subjectId || !componentId) {
    throw httpError("subjectId and componentId are required", 400);
  }
  const deleted = await repo.removeSubjectComponentMapping(subjectId, componentId);
  if (!deleted) {
    throw httpError(`Mapping between subject ${subjectId} and component ${componentId} not found`, 404);
  }
  return true;
}

