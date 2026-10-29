import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/electivePoolRepository.js";
import { requestContext } from "../utility/requestContext.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizePayload(body = {}) {
  const payload = {};

  if (body.name !== undefined) {
    payload.name = typeof body.name === "string" ? body.name.trim() : body.name;
  } else if (body.poolName !== undefined) {
    payload.name = typeof body.poolName === "string" ? body.poolName.trim() : body.poolName;
  } else if (body.pool_name !== undefined) {
    payload.name = typeof body.pool_name === "string" ? body.pool_name.trim() : body.pool_name;
  }

  if (body.code !== undefined) {
    payload.code = typeof body.code === "string" ? body.code.trim().toUpperCase() : body.code;
  } else if (body.poolCode !== undefined) {
    payload.code = typeof body.poolCode === "string" ? body.poolCode.trim().toUpperCase() : body.poolCode;
  }

  if (body.description !== undefined) {
    payload.description = body.description === "" ? null : body.description;
  }

  // Scope: default is 'programme' as instructed
  if (body.scope !== undefined && body.scope !== null && body.scope !== "") {
    const s = String(body.scope).toLowerCase().trim();
    if (!["institute", "programme", "batch"].includes(s)) {
      throw httpError("scope must be one of: 'institute', 'programme', 'batch'", 400);
    }
    payload.scope = s;
  } else {
    payload.scope = "programme";
  }

  const courseId = body.courseId || body.course_id || body.programmeId || body.programme_id;
  if (courseId !== undefined) {
    payload.courseId = courseId ? parseInt(courseId, 10) : null;
  }

  const batchId = body.batchId || body.batch_id;
  if (batchId !== undefined) {
    payload.batchId = batchId ? parseInt(batchId, 10) : null;
  }

  const instituteId = body.instituteId || body.institute_id;
  if (instituteId !== undefined) {
    payload.instituteId = instituteId ? parseInt(instituteId, 10) : null;
  }

  const universityId = body.universityId || body.university_id;
  if (universityId !== undefined) {
    payload.universityId = universityId ? parseInt(universityId, 10) : null;
  }

  const campusId = body.campusId || body.campus_id;
  if (campusId !== undefined) {
    payload.campusId = campusId ? parseInt(campusId, 10) : null;
  }

  if (body.isActive !== undefined) {
    payload.isActive = Boolean(body.isActive);
  } else if (body.is_active !== undefined) {
    payload.isActive = Boolean(body.is_active);
  }

  return payload;
}

export async function addElectivePool(body) {
  const normalized = normalizePayload(body);
  const store = requestContext.getStore() || {};

  if (!normalized.name) {
    throw httpError("Pool Name (name) is required", 400);
  }
  if (!normalized.code) {
    throw httpError("Pool Code (code) is required", 400);
  }

  // Validate scope-specific requirements
  if ((normalized.scope === "programme" || normalized.scope === "batch") && !normalized.courseId) {
    throw httpError(`Programme (courseId) is required when scope is '${normalized.scope}'`, 400);
  }
  if (normalized.scope === "batch" && !normalized.batchId) {
    throw httpError("Batch (batchId) is required when scope is 'batch'", 400);
  }

  const instituteId = normalized.instituteId || store.instituteId;
  if (!instituteId) {
    throw httpError("instituteId is required", 400);
  }

  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findElectivePoolByCode(normalized.code, { transaction });
    if (existing) {
      throw httpError(`Elective pool with code '${normalized.code}' already exists`, 409);
    }

    const created = await repo.createElectivePool(
      {
        name: normalized.name,
        code: normalized.code,
        description: normalized.description || null,
        scope: normalized.scope,
        courseId: normalized.courseId || null,
        batchId: normalized.batchId || null,
        instituteId,
        universityId: normalized.universityId || store.universityId || null,
        campusId: normalized.campusId || store.campusId || null,
        isActive: normalized.isActive ?? true,
        createdBy: store.userId || null,
      },
      { transaction }
    );

    return repo.findElectivePoolById(created.id, { transaction });
  });
}

export async function getAllElectivePools(query = {}) {
  const result = await repo.findElectivePools(query);

  const formattedRows = result.rows.map((pool) => {
    const json = pool.toJSON();
    const mappedCoursesCount = Array.isArray(json.poolSubjectMappings)
      ? json.poolSubjectMappings.length
      : 0;
    delete json.poolSubjectMappings;
    return {
      ...json,
      mappedCoursesCount,
    };
  });

  const limit = query.limit !== undefined ? parseInt(query.limit, 10) : null;
  const page = query.page !== undefined ? parseInt(query.page, 10) : 1;
  const total = result.count;
  const totalPages = limit && limit > 0 ? Math.ceil(total / limit) : 1;

  return {
    rows: formattedRows,
    paginationData: {
      total,
      page,
      limit: limit || total,
      totalPages,
    },
  };
}

export async function getElectivePoolById(id) {
  const pool = await repo.findElectivePoolById(id);
  if (!pool) {
    throw httpError("Elective pool not found", 404);
  }
  return pool;
}

export async function updateElectivePool(id, body) {
  const existing = await repo.findElectivePoolById(id);
  if (!existing) {
    throw httpError("Elective pool not found", 404);
  }

  const normalized = normalizePayload(body);
  const store = requestContext.getStore() || {};

  return sequelize.transaction(async (transaction) => {
    if (normalized.code && normalized.code !== existing.code) {
      const codeCheck = await repo.findElectivePoolByCode(normalized.code, { transaction });
      if (codeCheck && codeCheck.id !== parseInt(id, 10)) {
        throw httpError(`Elective pool with code '${normalized.code}' already exists`, 409);
      }
    }

    const updateData = {
      updatedBy: store.userId || null,
    };

    if (normalized.name !== undefined) updateData.name = normalized.name;
    if (normalized.code !== undefined) updateData.code = normalized.code;
    if (normalized.description !== undefined) updateData.description = normalized.description;
    if (normalized.scope !== undefined) updateData.scope = normalized.scope;
    if (normalized.courseId !== undefined) updateData.courseId = normalized.courseId;
    if (normalized.batchId !== undefined) updateData.batchId = normalized.batchId;
    if (normalized.isActive !== undefined) updateData.isActive = normalized.isActive;

    await repo.updateElectivePool(id, updateData, { transaction });
    return repo.findElectivePoolById(id, { transaction });
  });
}

export async function toggleStatusElectivePool(id) {
  const existing = await repo.findElectivePoolById(id);
  if (!existing) {
    throw httpError("Elective pool not found", 404);
  }

  const newStatus = !existing.isActive;
  await repo.updateElectivePool(id, { isActive: newStatus });
  return repo.findElectivePoolById(id);
}

export async function deleteElectivePool(id) {
  const existing = await repo.findElectivePoolById(id);
  if (!existing) {
    throw httpError("Elective pool not found", 404);
  }
  return repo.deleteElectivePool(id);
}

