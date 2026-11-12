import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/curriculumCategoryRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizePayload(body = {}) {
  const payload = {};

  if (body.categoryName !== undefined) {
    payload.categoryName = body.categoryName;
  } else if (body.category_name !== undefined) {
    payload.categoryName = body.category_name;
  }

  if (body.code !== undefined) {
    payload.code = typeof body.code === "string" ? body.code.trim().toUpperCase() : body.code;
  }

  if (body.isElectiveCoursework !== undefined) {
    payload.isElectiveCoursework = Boolean(body.isElectiveCoursework);
  } else if (body.is_elective_coursework !== undefined) {
    payload.isElectiveCoursework = Boolean(body.is_elective_coursework);
  }

  if (body.description !== undefined) {
    payload.description = body.description === "" ? null : body.description;
  }

  return payload;
}

export async function addCurriculumCategory(body) {
  const normalized = normalizePayload(body);

  if (!normalized.categoryName) {
    throw httpError("categoryName is required", 400);
  }
  if (!normalized.code) {
    throw httpError("code is required", 400);
  }

  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findCurriculumCategoryByCode(normalized.code, { transaction });
    if (existing) {
      throw httpError(`Curriculum category with code '${normalized.code}' already exists`, 409);
    }

    const created = await repo.createCurriculumCategory(
      {
        categoryName: normalized.categoryName,
        code: normalized.code,
        isElectiveCoursework: normalized.isElectiveCoursework ?? true,
        description: normalized.description ?? null,
      },
      { transaction }
    );

    return created.get({ plain: true });
  });
}

export async function getAllCurriculumCategories(queryParams = {}) {
  const result = await repo.findCurriculumCategories(queryParams);

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

export async function getCurriculumCategoryById(id) {
  const category = await repo.findCurriculumCategoryById(id);
  if (!category) {
    throw httpError(`Curriculum category not found with ID ${id}`, 404);
  }
  return category;
}

export async function updateCurriculumCategory(id, body) {
  const normalized = normalizePayload(body);

  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findCurriculumCategoryById(id, { transaction });
    if (!existing) {
      throw httpError(`Curriculum category not found with ID ${id}`, 404);
    }

    if (normalized.code && normalized.code !== existing.code) {
      const duplicate = await repo.findCurriculumCategoryByCode(normalized.code, { transaction });
      if (duplicate && duplicate.id !== Number(id)) {
        throw httpError(`Curriculum category with code '${normalized.code}' already exists`, 409);
      }
    }

    const updateData = {};
    if (normalized.categoryName !== undefined) updateData.categoryName = normalized.categoryName;
    if (normalized.code !== undefined) updateData.code = normalized.code;
    if (normalized.isElectiveCoursework !== undefined) updateData.isElectiveCoursework = normalized.isElectiveCoursework;
    if (normalized.description !== undefined) updateData.description = normalized.description;

    await repo.updateCurriculumCategory(id, updateData, { transaction });

    return repo.findCurriculumCategoryById(id, { transaction });
  });
}

export async function deleteCurriculumCategory(id) {
  return sequelize.transaction(async (transaction) => {
    const existing = await repo.findCurriculumCategoryById(id, { transaction });
    if (!existing) {
      throw httpError(`Curriculum category not found with ID ${id}`, 404);
    }

    const deleted = await repo.deleteCurriculumCategory(id, { transaction });
    if (!deleted) {
      throw httpError(`Failed to delete curriculum category with ID ${id}`, 500);
    }

    return true;
  });
}

