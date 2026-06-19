import { requestContext } from "./requestContext.js";

const ACADEMIC_YEAR_FIELD = "acedmicYearId";

/*
Example:

model.scopeConfig = {
    university: true,
    institute: true,
    academicYear: false,
    teacherRestricted: true
}
*/

function getScope(model) {
  const store = requestContext.getStore();
  const scope = {};

  if (!store || store.bypass) {
    return scope;
  }

  const config = model.scopeConfig || {};
  const attrs = model.rawAttributes || {};

  if (config.university !== false && attrs.universityId) {
    if (!store.universityId) {
      throw new Error("University missing");
    }

    scope.universityId = store.universityId;
  }

  if (config.institute !== false && attrs.instituteId) {
    if (!store.instituteId) {
      throw new Error("Institute missing");
    }

    scope.instituteId = store.instituteId;
  }

  if (config.academicYear !== false && attrs[ACADEMIC_YEAR_FIELD]) {
    if (!store.academicYearId) {
      throw new Error("Academic year missing");
    }

    scope[ACADEMIC_YEAR_FIELD] = store.academicYearId;
  }

  if (
    store.role === "teacher" &&
    (config.teacherRestricted || attrs.teacherId)
  ) {
    if (!store.userId) {
      throw new Error("Teacher missing");
    }

    if (attrs.teacherId) {
      scope.teacherId = store.userId;
    } else {
      scope.userId = store.userId;
    }
  }

  return scope;
}

function mergeWhere(scope, where = {}) {
  return {
    ...where,
    ...scope,
  };
}

function getCreateData(model, data) {
  const scope = getScope(model);

  const allowed = {};

  Object.keys(scope).forEach((key) => {
    if (model.rawAttributes[key]) {
      allowed[key] = scope[key];
    }
  });

  return {
    ...data,
    ...allowed,
  };
}

export function scoped(model) {
  const scope = getScope(model);

  return {
    findAll(options = {}) {
      return model.findAll({
        ...options,
        where: mergeWhere(scope, options.where),
      });
    },

    findOne(options = {}) {
      return model.findOne({
        ...options,
        where: mergeWhere(scope, options.where),
      });
    },

    findByPk(id, options = {}) {
      return model.findOne({
        ...options,
        where: mergeWhere(scope, {
          ...(options.where || {}),
          [model.primaryKeyAttribute || "id"]: id,
        }),
      });
    },

    count(options = {}) {
      return model.count({
        ...options,
        where: mergeWhere(scope, options.where),
      });
    },

    findAndCountAll(options = {}) {
      return model.findAndCountAll({
        ...options,
        where: mergeWhere(scope, options.where),
      });
    },

    update(data, options = {}) {
      return model.update(data, {
        ...options,
        where: mergeWhere(scope, options.where),
      });
    },

    destroy(options = {}) {
      return model.destroy({
        ...options,
        where: mergeWhere(scope, options.where),
      });
    },

    create(data, options = {}) {
      return model.create(getCreateData(model, data), options);
    },

    bulkCreate(rows, options = {}) {
      return model.bulkCreate(
        rows.map((row) => getCreateData(model, row)),
        options,
      );
    },
  };
}
