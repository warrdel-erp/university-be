import { requestContext } from "./requestContext.js";

/**
 * Multi-tenant query scoping for Sequelize models.
 *
 * Reads tenant context from requestContext (set in authUser middleware):
 *   universityId, instituteId, academicYearId, userId, role
 *
 * Use explicit scoping only:
 *   scoped(model.departmentModel).findAll({ where: { ... } })
 *
 * Scoping is skipped when no requestContext exists (e.g. login, background jobs)
 * or when store.bypass is true (set for routes like /institute, /acedmicYear).
 */

const ACADEMIC_YEAR_FIELD = "acedmicYearId";

function isScoped(configValue, field, attrs) {
  return configValue !== false && (configValue === true || field in attrs);
}

function getOriginal(model, method) {
  if (model._scopeOriginals?.[method]) {
    return model._scopeOriginals[method];
  }
  return model[method].bind(model);
}

function mergeScopedWhere(baseWhere, optionsWhere = {}, pkField, pkValue) {
  const where = { ...optionsWhere, ...baseWhere };
  if (pkField != null && pkValue != null) {
    where[pkField] = pkValue;
  }
  return where;
}

function scopeFieldsForModel(model, scopeWhere) {
  const attrs = model.rawAttributes || {};
  const filtered = {};
  for (const [key, value] of Object.entries(scopeWhere)) {
    if (key in attrs) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Builds tenant WHERE filters for a model based on requestContext.
 * Override per model via model.scopeConfig: { university, institute, academicYear, teacherRestricted }
 */
export const buildScope = (model) => {
  const where = {};
  const config = model.scopeConfig || {};
  const store = requestContext.getStore();
  const attrs = model.rawAttributes || {};

  if (!store || store.bypass) {
    return where;
  }

  if (isScoped(config.university, "universityId", attrs)) {
    if (!store.universityId) {
      throw new Error(`Error in university scope ${model.name}`);
    }
    where.universityId = store.universityId;
  }

  if (isScoped(config.institute, "instituteId", attrs)) {
    if (!store.instituteId) {
      throw new Error(`Error in institute scope ${model.name}`);
    }
    where.instituteId = store.instituteId;
  }

  if (isScoped(config.academicYear, ACADEMIC_YEAR_FIELD, attrs)) {
    if (!store.academicYearId) {
      throw new Error(`Error in academic year scope ${model.name}`);
    }
    where[ACADEMIC_YEAR_FIELD] = store.academicYearId;
  }

  if (store.role === "teacher" && (config.teacherRestricted || "teacherId" in attrs)) {
    if (!store.userId) {
      throw new Error(`Error in teacher scope ${model.name}`);
    }
    where["teacherId" in attrs ? "teacherId" : "userId"] = store.userId;
  }

  return where;
};

export const scoped = (model) => {
  const baseWhere = buildScope(model);
  const pk = model.primaryKeyAttribute || "id";
  const writeScope = scopeFieldsForModel(model, baseWhere);

  return {
    findAll: (options = {}) =>
      getOriginal(model, "findAll")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    findOne: (options = {}) =>
      getOriginal(model, "findOne")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    findByPk: (id, options = {}) =>
      getOriginal(model, "findOne")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where, pk, id),
      }),

    findAndCountAll: (options = {}) =>
      getOriginal(model, "findAndCountAll")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    update: (data, options = {}) =>
      getOriginal(model, "update")(data, {
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    delete: (options = {}) =>
      getOriginal(model, "destroy")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    count: (options = {}) =>
      getOriginal(model, "count")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    destroy: (options = {}) =>
      getOriginal(model, "destroy")({
        ...options,
        where: mergeScopedWhere(baseWhere, options.where),
      }),

    create: (data, options = {}) =>
      getOriginal(model, "create")({ ...data, ...writeScope }, options),

    bulkCreate: (rows, options = {}) =>
      getOriginal(model, "bulkCreate")(
        rows.map((row) => ({ ...row, ...writeScope })),
        { validate: true, ...options }
      ),
  };
};
