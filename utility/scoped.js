import { requestContext } from "./requestContext.js";

// DB/models use "acedmicYearId" (typo); request context uses "academicYearId".
const ACADEMIC_YEAR_FIELD = "acedmicYearId";

const isScoped = (configValue, field, attrs) =>
  configValue !== false && (configValue === true || field in attrs);

export const buildScope = (model) => {
  const where = {};
  const config = model.scopeConfig || {};
  const store = requestContext.getStore();
  const attrs = model.rawAttributes || {};

  if (!store) return where;

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

const mergeScope = (model, options = {}) => {
  const baseWhere = buildScope(model);
  return { ...options, where: { ...baseWhere, ...options.where } };
};

export const scoped = (model) => ({
  findAll: (options = {}) => model.findAll(mergeScope(model, options)),

  findOne: (options = {}) => model.findOne(mergeScope(model, options)),

  findByPk: (id, options = {}) => {
    const pk = model.primaryKeyAttribute || "id";
    const scopedOptions = mergeScope(model, options);
    return model.findOne({
      ...scopedOptions,
      where: { ...scopedOptions.where, [pk]: id }
    });
  },

  findAndCountAll: (options = {}) => model.findAndCountAll(mergeScope(model, options)),

  update: (data, options = {}) => model.update(data, mergeScope(model, options)),

  delete: (options = {}) => model.destroy(mergeScope(model, options)),

  count: (options = {}) => model.count(mergeScope(model, options)),

  destroy: (options = {}) => model.destroy(mergeScope(model, options)),

  create: (data, options = {}) =>
    model.create({ ...data, ...buildScope(model) }, options),

  bulkCreate: (rows, options = {}) =>
    model.bulkCreate(
      rows.map((row) => ({ ...row, ...buildScope(model) })),
      { validate: true, ...options }
    )
});

export const applyMultiTenancy = (sequelize) => {
  const methods = ["findAll", "findOne", "findByPk", "findAndCountAll", "count"];

  Object.values(sequelize.models).forEach((model) => {
    const wrapper = scoped(model);
    methods.forEach((method) => {
      model[method] = (...args) => wrapper[method](...args);
    });
  });
};
