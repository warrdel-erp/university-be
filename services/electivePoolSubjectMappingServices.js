import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/electivePoolSubjectMappingRepository.js";
import * as poolRepo from "../repository/electivePoolRepository.js";
import { requestContext } from "../utility/requestContext.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export async function getAvailableSubjects(query = {}) {
  const electivePoolId = query.electivePoolId || query.poolId;

  let mappedSubjectIdsSet = new Set();
  if (electivePoolId) {
    const mappedIds = await repo.findMappedSubjectIdsForPool(parseInt(electivePoolId, 10));
    mappedSubjectIdsSet = new Set(mappedIds);
  }

  const result = await repo.getAvailableSubjects(query);

  const formattedRows = result.rows.map((subj) => {
    const json = subj.toJSON();
    const isMapped = mappedSubjectIdsSet.has(json.subjectId);
    return {
      subjectId: json.subjectId,
      subjectName: json.subjectName,
      subjectCode: json.subjectCode,
      subjectType: json.subjectType,
      isActive: json.isActive,
      term: json.term,
      programme: json.course
        ? {
            courseId: json.course.courseId,
            courseName: json.course.courseName,
            courseCode: json.course.courseCode,
          }
        : null,
      components: Array.isArray(json.components)
        ? json.components.map((c) => ({
            id: c.id,
            componentName: c.componentName,
            code: c.code,
          }))
        : [],
      selectionStatus: isMapped ? "Already in Pool" : "Available",
      isAlreadyInPool: isMapped,
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

export async function mapSubjectsToPool(body) {
  const electivePoolId = body.electivePoolId || body.poolId;
  const subjectIds = body.subjectIds || (body.subjectId ? [body.subjectId] : []);

  if (!electivePoolId) {
    throw httpError("electivePoolId is required", 400);
  }
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    throw httpError("subjectIds must be a non-empty array", 400);
  }

  const pool = await poolRepo.findElectivePoolById(electivePoolId);
  if (!pool) {
    throw httpError(`Elective pool with id '${electivePoolId}' not found`, 404);
  }

  const store = requestContext.getStore() || {};

  return sequelize.transaction(async (transaction) => {
    const inserted = await repo.mapSubjectsToPool(
      parseInt(electivePoolId, 10),
      subjectIds,
      store.userId || null,
      { transaction }
    );

    const allMapped = await repo.getMappedSubjectsForPool(electivePoolId, { transaction });

    return {
      poolId: parseInt(electivePoolId, 10),
      poolName: pool.name,
      poolCode: pool.code,
      addedCount: inserted.length,
      totalMappedCount: allMapped.length,
    };
  });
}

export async function unmapSubjectFromPool(body) {
  const electivePoolId = body.electivePoolId || body.poolId;
  const subjectId = body.subjectId;

  if (!electivePoolId) {
    throw httpError("electivePoolId is required", 400);
  }
  if (!subjectId) {
    throw httpError("subjectId is required", 400);
  }

  const deleted = await repo.unmapSubjectFromPool(
    parseInt(electivePoolId, 10),
    parseInt(subjectId, 10)
  );

  if (!deleted) {
    throw httpError("Subject was not mapped to this elective pool", 404);
  }

  return {
    poolId: parseInt(electivePoolId, 10),
    subjectId: parseInt(subjectId, 10),
    removed: true,
  };
}

export async function getMappedSubjectsForPool(poolId) {
  if (!poolId) {
    throw httpError("poolId is required", 400);
  }

  const pool = await poolRepo.findElectivePoolById(poolId);
  if (!pool) {
    throw httpError(`Elective pool with id '${poolId}' not found`, 404);
  }

  const mappings = await repo.getMappedSubjectsForPool(parseInt(poolId, 10));
  const allComponents = await model.subjectComponentModel.findAll();

  const subjects = [];
  for (const m of mappings) {
    const s = m.subject ? (m.subject.toJSON ? m.subject.toJSON() : m.subject) : {};
    let scmMappings = Array.isArray(s.subjectComponentMappings)
      ? [...s.subjectComponentMappings]
      : [];

    // Fallback: If no components are explicitly mapped, auto-detect from subjectCategory or subjectType
    if (scmMappings.length === 0 && (s.subjectCategory || s.subjectType)) {
      const raw = (s.subjectCategory || s.subjectType || "").trim().toLowerCase();
      const matched = allComponents.find(
        (c) =>
          c.componentName.toLowerCase() === raw ||
          raw.includes(c.componentName.toLowerCase()) ||
          c.code.toLowerCase() === raw ||
          (raw.includes("theor") && c.componentName.toLowerCase() === "theory") ||
          (raw.includes("pract") && c.componentName.toLowerCase() === "practical") ||
          (raw.includes("work") && c.componentName.toLowerCase() === "workshop") ||
          (raw.includes("semi") && c.componentName.toLowerCase() === "seminar") ||
          (raw.includes("lab") && c.componentName.toLowerCase() === "lab"),
      );

      if (matched && s.subjectId) {
        const [createdMapping] = await model.subjectComponentMappingModel.findOrCreate({
          where: {
            subjectId: s.subjectId,
            subjectComponentId: matched.id,
          },
          defaults: {
            subjectId: s.subjectId,
            subjectComponentId: matched.id,
          },
        });
        scmMappings.push({
          id: createdMapping.id,
          subjectId: s.subjectId,
          subjectComponentId: matched.id,
          component: matched,
        });
      }
    }

    const components = scmMappings.map((scm) => {
      const comp = scm.component || {};
      return {
        subjectComponentMappingId: scm.id,
        subject_component_mapping_id: scm.id,
        id: comp.id ?? scm.subjectComponentId,
        componentId: comp.id ?? scm.subjectComponentId,
        componentName: comp.componentName ?? null,
        code: comp.code ?? null,
        description: comp.description ?? null,
      };
    });

    subjects.push({
      mappingId: m.id,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      subjectType: s.subjectType,
      subjectCategory: s.subjectCategory || null,
      isActive: s.isActive,
      term: s.term,
      subjectComponentMappingId: components[0]?.subjectComponentMappingId || null,
      programme: s.course
        ? {
            courseId: s.course.courseId,
            courseName: s.course.courseName,
            courseCode: s.course.courseCode,
          }
        : null,
      components,
    });
  }

  return {
    pool: {
      id: pool.id,
      name: pool.name,
      code: pool.code,
      scope: pool.scope,
    },
    totalCount: subjects.length,
    subjects,
  };
}

