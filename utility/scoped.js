import { requestContext } from "./requestContext.js";

/**
 * Multi-tenant query scoping for Sequelize models.
 *
 * Reads tenant context from requestContext (user defaults from saveUserDefaults):
 *   universityId, instituteId, academicYearId, defaultRole, userId
 *
 * Use explicit scoping only:
 *   scoped(model.departmentModel).findAll({ where: { ... } })
 *
 * Scoping is skipped when no requestContext exists (e.g. background jobs).
 */

const ACADEMIC_YEAR_FIELD = "academicYearId";

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

function scopeFieldsForModel(model) {
  const attrs = model.rawAttributes || {};
  const config = model.scopeConfig || {};
  const store = requestContext.getStore();
  const filtered = {};

  if (!store) {
    return filtered;
  }

  if (config.university && "universityId" in attrs && store.universityId != null) {
    filtered.universityId = store.universityId;
  }

  if (config.institute && "instituteId" in attrs && store.instituteId != null) {
    filtered.instituteId = store.instituteId;
  }

  if (config.academicYear && ACADEMIC_YEAR_FIELD in attrs && store.academicYearId != null) {
    filtered[ACADEMIC_YEAR_FIELD] = store.academicYearId;
  }

  return filtered;
}

/**
 * Builds tenant WHERE filters for a model based on requestContext and model.scopeConfig.
 */
export const buildScope = (model, options = {}) => {
  const where = {};
  if (!model) return where;
  const config = { ...(model.scopeConfig || {}), ...(options.scopeConfig || {}) };
  const store = requestContext.getStore();
  const attrs = model.rawAttributes || {};

  if (!store) {
    return where;
  }

  if (config.university) {
    if (!store?.universityId) {
      throw new Error(`Error in university scope ${model.name}`);
    }
    where.universityId = store.universityId;
  }

  if (config.institute) {
    if (!store?.instituteId) {
      throw new Error(`Error in institute scope ${model.name}`);
    }
    where.instituteId = store.instituteId;
  }

  if (config.academicYear) {
    if (!store?.academicYearId) {
      throw new Error(`Error in academic year scope ${model.name}`);
    }
    where[ACADEMIC_YEAR_FIELD] = store.academicYearId;
  }

  if (store.defaultRole?.toLowerCase() === "teacher" && (config.teacherRestricted || "teacherId" in attrs)) {
    if (!store?.userId) {
      throw new Error(`Error in teacher scope ${model.name}`);
    }
    where["teacherId" in attrs ? "teacherId" : "userId"] = store.userId;
  }

  if (store?.accessFilter) {
    for (const [key, value] of Object.entries(store.accessFilter)) {
      if (key in attrs) {
        where[key] = value;
      }
    }
  }

  return where;
};

export const scoped = (model) => {
  const baseWhere = buildScope(model);
  const pk = model.primaryKeyAttribute || "id";
  const writeScope = scopeFieldsForModel(model);

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
