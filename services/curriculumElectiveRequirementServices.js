import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/curriculumElectiveRequirementRepository.js";
import * as models from "../models/index.js";
import { requestContext } from "../utility/requestContext.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizePayload(body = {}) {
  const payload = {};

  const curriculumId = body.curriculumId || body.curriculum_id;
  if (curriculumId !== undefined) {
    payload.curriculumId = parseInt(curriculumId, 10);
  }

  const term = body.term ?? body.termNumber;
  if (term !== undefined) {
    payload.term = parseInt(term, 10);
  }

  const reqCode = body.requirementCode || body.requirement_code || body.code;
  if (reqCode !== undefined) {
    payload.requirementCode = typeof reqCode === "string" ? reqCode.trim().toUpperCase() : reqCode;
  }

  const reqName = body.requirementName || body.requirement_name || body.name;
  if (reqName !== undefined) {
    payload.requirementName = typeof reqName === "string" ? reqName.trim() : reqName;
  }

  const catId = body.curriculumCategoryId || body.curriculum_category_id || body.categoryId;
  if (catId !== undefined) {
    payload.curriculumCategoryId = parseInt(catId, 10);
  }

  if (body.courseCount !== undefined) {
    payload.courseCount = Boolean(body.courseCount);
  } else if (body.course_count !== undefined) {
    payload.courseCount = Boolean(body.course_count);
  } else {
    payload.courseCount = true;
  }

  const coursesReq = body.coursesRequired ?? body.courses_required ?? body.number_of_courses_required;
  if (coursesReq !== undefined) {
    payload.coursesRequired = parseInt(coursesReq, 10);
  } else {
    payload.coursesRequired = 1;
  }

  const minCredits = body.minCredits ?? body.min_credits;
  if (minCredits !== undefined && minCredits !== null && minCredits !== "") {
    payload.minCredits = parseFloat(minCredits);
  } else if (minCredits === null || minCredits === "") {
    payload.minCredits = null;
  }

  const poolId = body.electivePoolId || body.elective_pool_id || body.poolId;
  if (poolId !== undefined) {
    payload.electivePoolId = parseInt(poolId, 10);
  }

  if (body.isActive !== undefined) {
    payload.isActive = Boolean(body.isActive);
  } else if (body.is_active !== undefined) {
    payload.isActive = Boolean(body.is_active);
  }

  return payload;
}

export async function addCurriculumElectiveRequirement(body) {
  const normalized = normalizePayload(body);
  const store = requestContext.getStore() || {};

  if (!normalized.curriculumId) {
    throw httpError("curriculumId is required", 400);
  }
  if (!normalized.term || normalized.term < 1) {
    throw httpError("Valid term is required (must be >= 1)", 400);
  }
  if (!normalized.requirementCode) {
    throw httpError("requirementCode is required (e.g. PE-1)", 400);
  }
  if (!normalized.requirementName) {
    throw httpError("requirementName is required (e.g. Professional Elective I)", 400);
  }
  if (!normalized.curriculumCategoryId) {
    throw httpError("curriculumCategoryId is required", 400);
  }
  if (!normalized.electivePoolId) {
    throw httpError("electivePoolId is required", 400);
  }

  // Validate curriculum exists and check totalTerms
  const curriculum = await models.curriculumModel.findByPk(normalized.curriculumId, {
    include: [{ model: models.courseModel, as: "course", attributes: ["totalTerms"] }],
  });
  if (!curriculum) {
    throw httpError(`Curriculum with id '${normalized.curriculumId}' not found`, 404);
  }
  if (curriculum.course?.totalTerms && normalized.term > curriculum.course.totalTerms) {
    throw httpError(
      `Term ${normalized.term} exceeds programme total terms (${curriculum.course.totalTerms})`,
      400
    );
  }

  // Validate curriculum category exists
  const category = await models.curriculumCategoryModel.findByPk(normalized.curriculumCategoryId);
  if (!category) {
    throw httpError(`Curriculum category with id '${normalized.curriculumCategoryId}' not found`, 404);
  }

  // Validate elective pool exists
  const pool = await models.electivePoolModel.findByPk(normalized.electivePoolId);
  if (!pool) {
    throw httpError(`Elective pool with id '${normalized.electivePoolId}' not found`, 404);
  }

  return sequelize.transaction(async (transaction) => {
    // Check if duplicate requirementCode exists in same curriculum and term
    const existing = await repo.findCurriculumElectiveRequirementByCode(
      normalized.curriculumId,
      normalized.term,
      normalized.requirementCode,
      { transaction }
    );
    if (existing) {
      throw httpError(
        `Requirement code '${normalized.requirementCode}' already exists for Term ${normalized.term} in this curriculum`,
        409
      );
    }

    const created = await repo.createCurriculumElectiveRequirement(
      {
        curriculumId: normalized.curriculumId,
        term: normalized.term,
        requirementCode: normalized.requirementCode,
        requirementName: normalized.requirementName,
        curriculumCategoryId: normalized.curriculumCategoryId,
        courseCount: normalized.courseCount ?? true,
        coursesRequired: normalized.coursesRequired ?? 1,
        minCredits: normalized.minCredits ?? null,
        electivePoolId: normalized.electivePoolId,
        isActive: normalized.isActive ?? true,
        createdBy: store.userId || null,
      },
      { transaction }
    );

    return repo.findCurriculumElectiveRequirementById(created.id, { transaction });
  });
}

function formatRequirementResponse(reqObj) {
  const json = reqObj.toJSON ? reqObj.toJSON() : reqObj;
  let poolPreview = null;
  if (json.electivePool) {
    const eligibleCoursesCount = Array.isArray(json.electivePool.poolSubjectMappings)
      ? json.electivePool.poolSubjectMappings.length
      : 0;
    poolPreview = {
      id: json.electivePool.id,
      name: json.electivePool.name,
      code: json.electivePool.code,
      scope: json.electivePool.scope,
      isActive: json.electivePool.isActive,
      eligibleCoursesCount,
    };
  }

  return {
    ...json,
    electivePool: poolPreview,
  };
}

export async function getAllCurriculumElectiveRequirements(query = {}) {
  const result = await repo.findCurriculumElectiveRequirements(query);

  const formattedRows = result.rows.map(formatRequirementResponse);

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

export async function getCurriculumElectiveRequirementById(id, query = {}, options = {}) {
  const req = await repo.findCurriculumElectiveRequirementById(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const baseResponse = formatRequirementResponse(req);

  // If includeStudents is explicitly false, omit student details
  if (query.includeStudents === false || query.includeStudents === "false") {
    return baseResponse;
  }

  const eligibleStudents = await repo.findEligibleStudentsForRequirement(req, query, options);

  const coursesRequired = req.coursesRequired || 1;
  let allocatedCount = 0;

  const formattedStudents = eligibleStudents.map((s) => {
    const json = s.toJSON ? s.toJSON() : s;
    const fullName = [json.firstName, json.middleName, json.lastName]
      .filter((part) => part && String(part).trim().length > 0)
      .join(" ");

    const allocatedElectives = (json.electiveSubjectMappings || []).map((m) => ({
      studentElectiveSubjectId: m.studentElectiveSubjectId,
      electiveSubjectId: m.electiveSubjectId,
      electiveSubjectName: m.electiveSubject?.electiveSubjectName || null,
      electiveSubjectCode: m.electiveSubject?.electiveSubjectCode || null,
      electiveSubjectType: m.electiveSubject?.electiveSubjectType || null,
    }));

    let status = "Pending";
    if (allocatedElectives.length >= coursesRequired) {
      status = "Allocated";
      allocatedCount += 1;
    } else if (allocatedElectives.length > 0) {
      status = "Partially Allocated";
    }

    return {
      studentId: json.studentId,
      scholarNumber: json.scholarNumber,
      enrollNumber: json.enrollNumber,
      firstName: json.firstName,
      middleName: json.middleName,
      lastName: json.lastName,
      fullName,
      batchId: json.batchId,
      batchYear: json.batch?.batch || null,
      term: json.studentClassSectionTerm?.term ?? req.term,
      section: json.studentClassSectionTerm?.classSection?.section || null,
      status,
      allocatedElectives,
    };
  });

  const filterStatus = query.studentStatus || query.status;
  let filteredStudents = formattedStudents;
  if (filterStatus && filterStatus.trim()) {
    const fs = filterStatus.trim().toLowerCase();
    filteredStudents = formattedStudents.filter(
      (st) => st.status.toLowerCase() === fs
    );
  }

  const totalEligibleStudents = formattedStudents.length;
  const pendingStudents = Math.max(0, totalEligibleStudents - allocatedCount);

  const studentLimit = query.studentLimit ? parseInt(query.studentLimit, 10) : null;
  const studentPage = query.studentPage ? Math.max(1, parseInt(query.studentPage, 10)) : 1;

  let finalStudents = filteredStudents;
  let studentsPagination = undefined;

  if (studentLimit && studentLimit > 0) {
    const offset = (studentPage - 1) * studentLimit;
    finalStudents = filteredStudents.slice(offset, offset + studentLimit);
    studentsPagination = {
      total: filteredStudents.length,
      page: studentPage,
      limit: studentLimit,
      totalPages: Math.ceil(filteredStudents.length / studentLimit),
    };
  }

  return {
    ...baseResponse,
    studentsSummary: {
      totalEligibleStudents,
      allocatedStudents: allocatedCount,
      pendingStudents,
    },
    students: finalStudents,
    ...(studentsPagination ? { studentsPagination } : {}),
  };
}

export async function updateCurriculumElectiveRequirement(id, body) {
  const existing = await repo.findCurriculumElectiveRequirementById(id);
  if (!existing) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const normalized = normalizePayload(body);
  const store = requestContext.getStore() || {};

  return sequelize.transaction(async (transaction) => {
    if (
      normalized.requirementCode &&
      normalized.requirementCode !== existing.requirementCode
    ) {
      const codeCheck = await repo.findCurriculumElectiveRequirementByCode(
        existing.curriculumId,
        normalized.term || existing.term,
        normalized.requirementCode,
        { transaction }
      );
      if (codeCheck && codeCheck.id !== parseInt(id, 10)) {
        throw httpError(
          `Requirement code '${normalized.requirementCode}' already exists for this term`,
          409
        );
      }
    }

    const updateData = {
      updatedBy: store.userId || null,
    };

    if (normalized.term !== undefined) updateData.term = normalized.term;
    if (normalized.requirementCode !== undefined) updateData.requirementCode = normalized.requirementCode;
    if (normalized.requirementName !== undefined) updateData.requirementName = normalized.requirementName;
    if (normalized.curriculumCategoryId !== undefined) updateData.curriculumCategoryId = normalized.curriculumCategoryId;
    if (normalized.courseCount !== undefined) updateData.courseCount = normalized.courseCount;
    if (normalized.coursesRequired !== undefined) updateData.coursesRequired = normalized.coursesRequired;
    if (normalized.minCredits !== undefined) updateData.minCredits = normalized.minCredits;
    if (normalized.electivePoolId !== undefined) updateData.electivePoolId = normalized.electivePoolId;
    if (normalized.isActive !== undefined) updateData.isActive = normalized.isActive;

    await repo.updateCurriculumElectiveRequirement(id, updateData, { transaction });
    return repo.findCurriculumElectiveRequirementById(id, { transaction });
  });
}

export async function toggleStatusCurriculumElectiveRequirement(id) {
  const existing = await repo.findCurriculumElectiveRequirementById(id);
  if (!existing) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const newStatus = !existing.isActive;
  await repo.updateCurriculumElectiveRequirement(id, { isActive: newStatus });
  return repo.findCurriculumElectiveRequirementById(id);
}

export async function deleteCurriculumElectiveRequirement(id) {
  const existing = await repo.findCurriculumElectiveRequirementById(id);
  if (!existing) {
    throw httpError("Curriculum elective requirement not found", 404);
  }
  return repo.deleteCurriculumElectiveRequirement(id);
}

