import { requestContext } from "./requestContext.js";

/**
 * Multi-tenant query scoping for Sequelize models.
 *
 * Reads tenant context from requestContext (set in authUser middleware):
 *   universityId, instituteId, academicYearId, userId, role
 *
 * Two ways to use:
 *   1. Explicit:  scoped(model.departmentModel).findAll({ where: { ... } })
 *   2. Automatic: applyMultiTenancy(sequelize) patches all models at startup
 *      so model.departmentModel.findAll() is scoped without wrapping.
 *
 * Scoping is skipped when no requestContext exists (e.g. login, background jobs)
 * or when store.bypass is true (set for routes like /campus, /institute).
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

  return {
    findAll: (options = {}) =>
      getOriginal(model, "findAll")({
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    findOne: (options = {}) =>
      getOriginal(model, "findOne")({
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    findByPk: (id, options = {}) =>
      getOriginal(model, "findOne")({
        ...options,
        where: { ...baseWhere, ...options.where, [pk]: id },
      }),

    findAndCountAll: (options = {}) =>
      getOriginal(model, "findAndCountAll")({
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    update: (data, options = {}) =>
      getOriginal(model, "update")(data, {
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    delete: (options = {}) =>
      getOriginal(model, "destroy")({
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    count: (options = {}) =>
      getOriginal(model, "count")({
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    destroy: (options = {}) =>
      getOriginal(model, "destroy")({
        ...options,
        where: { ...baseWhere, ...options.where },
      }),

    create: (data, options = {}) =>
      getOriginal(model, "create")({ ...data, ...baseWhere }, options),

    bulkCreate: (rows, options = {}) =>
      getOriginal(model, "bulkCreate")(
        rows.map((row) => ({ ...row, ...baseWhere })),
        { validate: true, ...options }
      ),
  };
};

/**
 * Patches all Sequelize models so direct model.findAll() calls are auto-scoped.
 * Called once in models/index.js after all models are registered.
 */
export const applyMultiTenancy = (sequelize) => {
  for (const model of Object.values(sequelize.models)) {
    if (model._scopePatched) {
      continue;
    }

    model._scopeOriginals = {
      findAll: model.findAll.bind(model),
      findOne: model.findOne.bind(model),
      findByPk: model.findByPk.bind(model),
      findAndCountAll: model.findAndCountAll.bind(model),
      count: model.count.bind(model),
    };

    const pk = model.primaryKeyAttribute || "id";

    model.findAll = (options = {}) => {
      const baseWhere = buildScope(model);
      return model._scopeOriginals.findAll({
        ...options,
        where: { ...baseWhere, ...options.where },
      });
    };

    model.findOne = (options = {}) => {
      const baseWhere = buildScope(model);
      return model._scopeOriginals.findOne({
        ...options,
        where: { ...baseWhere, ...options.where },
      });
    };

    model.findAndCountAll = (options = {}) => {
      const baseWhere = buildScope(model);
      return model._scopeOriginals.findAndCountAll({
        ...options,
        where: { ...baseWhere, ...options.where },
      });
    };

    model.count = (options = {}) => {
      const baseWhere = buildScope(model);
      return model._scopeOriginals.count({
        ...options,
        where: { ...baseWhere, ...options.where },
      });
    };

    model.findByPk = (id, options = {}) => {
      const baseWhere = buildScope(model);
      return model._scopeOriginals.findOne({
        ...options,
        where: { ...baseWhere, ...options.where, [pk]: id },
      });
    };

    model._scopePatched = true;
  }
};
