import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/curriculumElectiveRequirementRepository.js";
import * as assignmentRepo from "../repository/curriculumElectiveAssignmentRepository.js";
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

/**
 * Returns the comprehensive Overview dashboard data for a curriculum elective requirement
 * Matching the exact Overview UI screen (Header, KPIs, Progress Bar, Requirement Card, Course Offerings table).
 */
export async function getCurriculumElectiveRequirementOverview(id, query = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  // 1. Fetch eligible students for this requirement
  const eligibleStudents = await repo.findEligibleStudentsForRequirement(req, query, options);
  const totalEligibleStudents = eligibleStudents.length;

  const coursesRequired = req.coursesRequired || 1;
  const assignedStudentsList = eligibleStudents.filter((s) => {
    const json = s.toJSON ? s.toJSON() : s;
    const mappings = json.electiveSubjectMappings || [];
    return mappings.length >= coursesRequired;
  });

  const assignedCount = assignedStudentsList.length;
  const awaitingCount = Math.max(0, totalEligibleStudents - assignedCount);
  const progressPercentage =
    totalEligibleStudents > 0
      ? Number(((assignedCount / totalEligibleStudents) * 100).toFixed(1))
      : 0;
  const assignedPercentage =
    totalEligibleStudents > 0
      ? `${((assignedCount / totalEligibleStudents) * 100).toFixed(1)}%`
      : "0%";
  const awaitingPercentage =
    totalEligibleStudents > 0
      ? `${((awaitingCount / totalEligibleStudents) * 100).toFixed(1)}%`
      : "0%";

  let statusBadge = "Not Started";
  if (totalEligibleStudents > 0) {
    if (assignedCount >= totalEligibleStudents) {
      statusBadge = "Completed";
    } else if (assignedCount > 0) {
      statusBadge = "Assignment In Progress";
    }
  }

  // 2. Academic Context & Header details
  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const termRoman = req.term ? `Term ${romanNumerals[req.term - 1] || req.term}` : null;

  // Determine year for academicPeriod
  let academicYearNum = new Date().getFullYear();
  if (req.curriculum?.batchMappings?.[0]?.batch?.batch) {
    const batchYear = Number(req.curriculum.batchMappings[0].batch.batch);
    const termOffset = Math.floor((req.term - 1) / 2);
    academicYearNum = batchYear + termOffset;
  }
  const termSeason = (req.term % 2 !== 0) ? "Jul - Dec" : "Jan - Jun";
  const academicPeriod = termRoman ? `${termRoman} (${termSeason} ${academicYearNum})` : `${termSeason} ${academicYearNum}`;

  const courseCode = req.curriculum?.course?.courseCode || null;
  const courseName = req.curriculum?.course?.courseName || null;
  const programme = courseCode && courseName ? `${courseCode} (${courseName})` : (courseName || courseCode || null);

  const primaryBatch = req.curriculum?.batchMappings?.[0]?.batch?.batch || null;
  const totalTerms = req.curriculum?.course?.totalTerms || 10;
  const programDurationYears = Math.ceil(totalTerms / 2);
  let admissionBatchSpan = null;
  if (primaryBatch) {
    const endBatchShort = String(Number(primaryBatch) + programDurationYears).slice(-2);
    admissionBatchSpan = `Admission Batch ${primaryBatch}-${endBatchShort}`;
  }

  const poolName = req.electivePool?.name || null;
  const minCredits = req.minCredits != null ? parseFloat(req.minCredits) : 0;
  const poolSubtitle = `Select ${coursesRequired} course${coursesRequired > 1 ? "s" : ""} • Minimum ${minCredits} credits`;

  // 3. KPI Summary
  const applicableStudentsSubtitle = courseCode && primaryBatch ? `from ${courseCode} ${primaryBatch}-${String(Number(primaryBatch) + programDurationYears).slice(-2)}` : null;
  const eligibleCoursesCount = Array.isArray(req.electivePool?.poolSubjectMappings)
    ? req.electivePool.poolSubjectMappings.length
    : 0;

  const kpiSummary = {
    applicableStudents: totalEligibleStudents,
    applicableStudentsSubtitle,
    requiringAssignment: awaitingCount,
    requiringPercentage: awaitingPercentage,
    assignedStudents: assignedCount,
    assignedPercentage,
    eligibleCoursesCount,
    eligibleCoursesSubtitle: "from curriculum pool",
  };

  // 4. Assignment Progress
  const assignmentProgress = {
    progressPercentage,
    assignedCount,
    assignedPercentage,
    awaitingCount,
    awaitingPercentage,
    needsAttentionCount: 0,
    needsAttentionPercentage: "0%",
    progressText: `${assignedCount} of ${totalEligibleStudents} students have a confirmed eligible course assignment.`,
  };

  // 5. Curriculum Requirement Card
  const curriculumRequirement = {
    requirementCode: req.requirementCode,
    requirementName: req.requirementName,
    curriculumCategory: req.curriculumCategory
      ? {
          id: req.curriculumCategory.id,
          categoryName: req.curriculumCategory.categoryName,
          code: req.curriculumCategory.code,
        }
      : null,
    poolName,
    ruleText: `Select ${coursesRequired} course${coursesRequired > 1 ? "s" : ""} from the pool • Minimum ${minCredits} recognised credits`,
  };

  // 6. Eligible Elective Courses Table
  const poolSubjects = (req.electivePool?.poolSubjectMappings || [])
    .map((m) => m.subject)
    .filter(Boolean);

  const subjectIds = poolSubjects.map((s) => s.subjectId);

  // Credits map from curriculum_subject_term_mapping
  const cstmRows = subjectIds.length > 0
    ? await models.curriculumSubjectTermMappingModel.findAll({
        where: {
          curriculumId: req.curriculumId,
          subjectId: { [Op.in]: subjectIds },
        },
        attributes: ["subjectId", "credit"],
        transaction: options.transaction,
      })
    : [];
  const creditMap = new Map(cstmRows.map((r) => [r.subjectId, r.credit]));

  // Routine map from timeTableCellModel + timeTableRoutineModel
  const routineCells = subjectIds.length > 0
    ? await models.timeTableCellModel.findAll({
        where: { subjectId: { [Op.in]: subjectIds } },
        include: [
          {
            model: models.timeTableRoutineModel,
            as: "timeTableRoutine",
            attributes: ["isPublish"],
          },
        ],
        transaction: options.transaction,
      })
    : [];
  const routineMap = new Map();
  for (const cell of routineCells) {
    if (!routineMap.has(cell.subjectId)) {
      routineMap.set(cell.subjectId, cell.timeTableRoutine?.isPublish ? "Published" : "Draft");
    } else if (cell.timeTableRoutine?.isPublish) {
      routineMap.set(cell.subjectId, "Published");
    }
  }

  // Count assigned students per subject
  const studentCountMap = new Map();
  for (const st of eligibleStudents) {
    const jsonSt = st.toJSON ? st.toJSON() : st;
    for (const alloc of jsonSt.electiveSubjectMappings || []) {
      const subId = alloc.subjectId || alloc.electiveSubjectId;
      if (subId) {
        studentCountMap.set(subId, (studentCountMap.get(subId) || 0) + 1);
      }
    }
  }

  let eligibleElectiveCourses = poolSubjects.map((s) => {
    const credit = creditMap.has(s.subjectId) ? creditMap.get(s.subjectId) : null;
    const creditsText = credit != null ? String(credit) : "Not Mapped";
    const offeringStatus = routineMap.get(s.subjectId) || "Not Offered";
    const subAssignedCount = studentCountMap.get(s.subjectId) || 0;
    const assignedStudentsText = offeringStatus === "Not Offered" ? "-" : String(subAssignedCount);

    return {
      subjectId: s.subjectId,
      courseCode: s.subjectCode,
      courseTitle: s.subjectName,
      credits: credit,
      creditsText,
      offeringStatus,
      assignedStudentsCount: subAssignedCount,
      assignedStudentsText,
    };
  });

  // Support table search filter (?courseSearch=... or ?search=...)
  const courseSearch = query.courseSearch || query.search;
  if (courseSearch && courseSearch.trim()) {
    const cs = courseSearch.trim().toLowerCase();
    eligibleElectiveCourses = eligibleElectiveCourses.filter(
      (c) =>
        (c.courseCode && c.courseCode.toLowerCase().includes(cs)) ||
        (c.courseTitle && c.courseTitle.toLowerCase().includes(cs))
    );
  }

  return {
    id: req.id,
    requirementCode: req.requirementCode,
    requirementName: req.requirementName,
    statusBadge,
    academicContext: {
      term: req.term,
      termRoman,
      academicPeriod,
      programmeCode: courseCode,
      programmeName: courseName,
      programme,
      admissionBatch: primaryBatch,
      admissionBatchSpan,
      poolName,
      coursesRequired,
      minCredits,
      poolSubtitle,
    },
    kpiSummary,
    assignmentProgress,
    curriculumRequirement,
    eligibleElectiveCourses,
  };
}

/**
 * Returns the Course Offerings tab data for a curriculum elective requirement (Image 1 Screen).
 * Includes 4 KPI Cards, Filters, and Table of courses with offering status, routine status,
 * sections count, shared capacity, assigned students count, and 5-rule assignment availability.
 */
export async function getCurriculumElectiveRequirementCourseOfferings(id, query = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  // 1. Fetch eligible students for counting assigned students
  const eligibleStudents = await repo.findEligibleStudentsForRequirement(req, {}, options);
  const totalEligibleStudents = eligibleStudents.length;

  const coursesRequired = req.coursesRequired || 1;
  const assignedStudentsList = eligibleStudents.filter((s) => {
    const json = s.toJSON ? s.toJSON() : s;
    const mappings = json.electiveSubjectMappings || [];
    return mappings.length >= coursesRequired;
  });
  const totalAssignedStudentsCount = assignedStudentsList.length;

  // Student count per course
  const studentCountMap = new Map();
  for (const st of eligibleStudents) {
    const jsonSt = st.toJSON ? st.toJSON() : st;
    for (const alloc of jsonSt.electiveSubjectMappings || []) {
      const subId = alloc.subjectId || alloc.electiveSubjectId;
      if (subId) {
        studentCountMap.set(subId, (studentCountMap.get(subId) || 0) + 1);
      }
    }
  }

  // 2. Academic Context
  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const termRoman = req.term ? `Term ${romanNumerals[req.term - 1] || req.term}` : null;

  let academicYearNum = new Date().getFullYear();
  if (req.curriculum?.batchMappings?.[0]?.batch?.batch) {
    const batchYear = Number(req.curriculum.batchMappings[0].batch.batch);
    const termOffset = Math.floor((req.term - 1) / 2);
    academicYearNum = batchYear + termOffset;
  }
  const termSeason = req.term % 2 !== 0 ? "Jul - Dec" : "Jan - Jun";
  const academicPeriod = termRoman ? `${termRoman} (${termSeason} ${academicYearNum})` : `${termSeason} ${academicYearNum}`;

  const courseCode = req.curriculum?.course?.courseCode || null;
  const courseName = req.curriculum?.course?.courseName || null;
  const programme = courseCode && courseName ? `${courseCode} (${courseName})` : (courseName || courseCode || null);

  const primaryBatch = req.curriculum?.batchMappings?.[0]?.batch?.batch || null;
  const totalTerms = req.curriculum?.course?.totalTerms || 10;
  const programDurationYears = Math.ceil(totalTerms / 2);
  let admissionBatchSpan = null;
  if (primaryBatch) {
    const endBatchShort = String(Number(primaryBatch) + programDurationYears).slice(-2);
    admissionBatchSpan = `Admission Batch ${primaryBatch}-${endBatchShort}`;
  }

  const poolName = req.electivePool?.name || null;
  const minCredits = req.minCredits != null ? parseFloat(req.minCredits) : 0;
  const poolSubtitle = `Select ${coursesRequired} course${coursesRequired > 1 ? "s" : ""} • Minimum ${minCredits} recognised credits`;

  // 3. Pool subjects
  const poolSubjects = (req.electivePool?.poolSubjectMappings || [])
    .map((m) => m.subject)
    .filter(Boolean);

  const subjectIds = poolSubjects.map((s) => s.subjectId);

  // Mapped credits from curriculum_subject_term_mapping
  const cstmRows = subjectIds.length > 0
    ? await models.curriculumSubjectTermMappingModel.findAll({
        where: {
          curriculumId: req.curriculumId,
          subjectId: { [Op.in]: subjectIds },
        },
        attributes: ["subjectId", "credit"],
        transaction: options.transaction,
      })
    : [];
  const creditMap = new Map(cstmRows.map((r) => [r.subjectId, r.credit]));

  // Routines & Sections from timetable
  const routineCells = subjectIds.length > 0
    ? await models.timeTableCellModel.findAll({
        where: { subjectId: { [Op.in]: subjectIds } },
        include: [
          {
            model: models.timeTableRoutineModel,
            as: "timeTableRoutine",
            attributes: ["timeTableRoutineId", "isPublish", "classSectionTermId"],
            include: [
              {
                model: models.classSectionTermModel,
                as: "timeTableClassSectionTerm",
                attributes: ["classSectionTermId", "term", "classSectionsId"],
                include: [
                  {
                    model: models.classSectionModel,
                    as: "classSection",
                    attributes: ["classSectionsId", "section", "expectedCapacity"],
                  },
                ],
              },
            ],
          },
        ],
        transaction: options.transaction,
      })
    : [];

  const subjectRoutineMap = new Map();
  for (const cell of routineCells) {
    const r = cell.timeTableRoutine;
    if (!r) continue;
    const subId = cell.subjectId;
    if (!subjectRoutineMap.has(subId)) {
      subjectRoutineMap.set(subId, {
        isPublish: Boolean(r.isPublish),
        sections: new Map(),
      });
    }
    const info = subjectRoutineMap.get(subId);
    if (r.isPublish) {
      info.isPublish = true;
    }
    const cst = r.timeTableClassSectionTerm;
    const sec = cst?.classSection;
    if (sec && !info.sections.has(sec.classSectionsId)) {
      info.sections.set(sec.classSectionsId, {
        section: sec.section,
        capacity: sec.expectedCapacity || 0,
      });
    }
  }

  // Build each course offering record
  let courses = poolSubjects.map((s, idx) => {
    const credit = creditMap.has(s.subjectId) ? creditMap.get(s.subjectId) : null;
    const isCreditMapped = credit != null;
    const recognisedCreditsText = isCreditMapped ? String(credit) : "Not Mapped";

    const routineInfo = subjectRoutineMap.get(s.subjectId);
    let offeringStatus = "Not Created";
    let routineStatus = "Not Scheduled";
    let sectionsCount = 0;
    let sharedCapacity = null;

    if (routineInfo) {
      offeringStatus = routineInfo.isPublish ? "Published" : "Draft";
      routineStatus = routineInfo.isPublish ? "Published" : "Draft";
      sectionsCount = routineInfo.sections.size;
      let totalCap = 0;
      for (const sec of routineInfo.sections.values()) {
        totalCap += sec.capacity;
      }
      sharedCapacity = totalCap > 0 ? totalCap : (sectionsCount > 0 ? sectionsCount * 30 : null);
    }

    const assignedCount = studentCountMap.get(s.subjectId) || 0;
    const assignedStudentsText = offeringStatus === "Not Created" ? "-" : String(assignedCount);

    // Evaluate 5 conditions of Assignment Availability:
    let assignmentAvailability = "Not Available";
    if (!isCreditMapped) {
      assignmentAvailability = "Credit Mapping Required";
    } else if (
      offeringStatus === "Published" &&
      routineStatus === "Published" &&
      (sharedCapacity == null || sharedCapacity > assignedCount || sectionsCount > 0)
    ) {
      assignmentAvailability = "Available";
    }

    return {
      index: idx + 1,
      subjectId: s.subjectId,
      courseCode: s.subjectCode,
      courseTitle: s.subjectName,
      recognisedCredits: credit,
      recognisedCreditsText,
      offeringStatus,
      routineStatus,
      sectionsCount,
      sectionsText: sectionsCount > 0 ? String(sectionsCount) : "-",
      sharedCapacity,
      sharedCapacityText: sharedCapacity != null ? String(sharedCapacity) : "-",
      assignedStudentsCount: assignedCount,
      assignedStudentsText,
      assignmentAvailability,
    };
  });

  // Calculate top 4 KPI cards
  const eligibleCourses = poolSubjects.length;
  const coursesWithOfferings = courses.filter((c) => c.offeringStatus !== "Not Created").length;
  const availableForAssignment = courses.filter((c) => c.assignmentAvailability === "Available").length;
  const assignedStudents = totalAssignedStudentsCount;

  const kpiSummary = {
    eligibleCourses,
    eligibleCoursesSubtitle: "from curriculum pool",
    coursesWithOfferings,
    coursesWithOfferingsSubtitle: "with teaching offerings in this term",
    availableForAssignment,
    availableForAssignmentSubtitle: "published offering, published routine, valid credits and eligible for this requirement",
    assignedStudents,
    assignedStudentsSubtitle: "under this requirement",
  };

  // Apply filters if provided in query
  if (query.search && query.search.trim()) {
    const s = query.search.trim().toLowerCase();
    courses = courses.filter(
      (c) =>
        (c.courseCode && c.courseCode.toLowerCase().includes(s)) ||
        (c.courseTitle && c.courseTitle.toLowerCase().includes(s))
    );
  }

  if (query.offeringStatus && query.offeringStatus.trim() && query.offeringStatus.toLowerCase() !== "all") {
    const os = query.offeringStatus.trim().toLowerCase();
    courses = courses.filter((c) => c.offeringStatus.toLowerCase() === os);
  }

  if (query.routineStatus && query.routineStatus.trim() && query.routineStatus.toLowerCase() !== "all") {
    const rs = query.routineStatus.trim().toLowerCase();
    courses = courses.filter((c) => c.routineStatus.toLowerCase() === rs);
  }

  if (query.assignmentAvailability && query.assignmentAvailability.trim() && query.assignmentAvailability.toLowerCase() !== "all") {
    const aa = query.assignmentAvailability.trim().toLowerCase();
    courses = courses.filter((c) => c.assignmentAvailability.toLowerCase() === aa);
  }

  if (query.recognisedCredits !== undefined && query.recognisedCredits !== null && query.recognisedCredits !== "all") {
    const cred = parseFloat(query.recognisedCredits);
    courses = courses.filter((c) => c.recognisedCredits === cred);
  }

  // Pagination for course offerings table
  const total = courses.length;
  const limit = query.limit ? parseInt(query.limit, 10) : null;
  const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;

  let pagedCourses = courses;
  let paginationData = undefined;

  if (limit && limit > 0) {
    const offset = (page - 1) * limit;
    pagedCourses = courses.slice(offset, offset + limit);
    paginationData = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  return {
    id: req.id,
    requirementCode: req.requirementCode,
    requirementName: req.requirementName,
    statusBadge: totalAssignedStudentsCount > 0 ? "Assignment In Progress" : "Not Started",
    academicContext: {
      term: req.term,
      termRoman,
      academicPeriod,
      programmeCode: courseCode,
      programmeName: courseName,
      programme,
      admissionBatch: primaryBatch,
      admissionBatchSpan,
      poolName,
      coursesRequired,
      minCredits,
      poolSubtitle,
    },
    kpiSummary,
    courseOfferings: pagedCourses,
    ...(paginationData ? { paginationData } : {}),
  };
}

/**
 * Get Elective Requirement Assignments (Student-wise or Course-wise)
 * Matches Image 3 (Student-wise) and Image 4 (Course-wise)
 */
export async function getCurriculumElectiveRequirementAssignments(id, query = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  // 1. Academic context
  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const termRoman = req.term ? `Term ${romanNumerals[req.term - 1] || req.term}` : "Term V";

  let academicYearNum = new Date().getFullYear();
  if (req.curriculum?.batchMappings?.[0]?.batch?.batch) {
    const batchYear = Number(req.curriculum.batchMappings[0].batch.batch);
    const termOffset = Math.floor((req.term - 1) / 2);
    academicYearNum = batchYear + termOffset;
  }
  const termSeason = req.term % 2 !== 0 ? "Jul - Dec" : "Jan - Jun";
  const academicPeriod = termRoman ? `${termRoman} (${termSeason} ${academicYearNum})` : `${termSeason} ${academicYearNum}`;

  const courseCode = req.curriculum?.course?.courseCode || "";
  const courseName = req.curriculum?.course?.courseName || "";
  const programme = courseCode && courseName ? `${courseCode} (${courseName})` : courseName || "Academic Programme";

  const primaryBatch = req.curriculum?.batchMappings?.[0]?.batch?.batch || null;
  const totalTerms = req.curriculum?.course?.totalTerms || 10;
  const programDurationYears = Math.ceil(totalTerms / 2);
  let admissionBatchSpan = primaryBatch ? `Admission Batch ${primaryBatch}` : "Admission Batch";
  if (primaryBatch) {
    const endBatchShort = String(Number(primaryBatch) + programDurationYears).slice(-2);
    admissionBatchSpan = `Admission Batch ${primaryBatch}-${endBatchShort}`;
  }

  const poolName = req.electivePool?.name || "Elective Pool";
  const coursesRequired = req.coursesRequired || 1;
  const minCredits = req.minCredits != null ? parseFloat(req.minCredits) : 3;
  const poolSubtitle = `Select ${coursesRequired} course${coursesRequired > 1 ? "s" : ""} • Minimum ${minCredits} credits`;

  // 2. Applicable Students for this requirement
  const students = await repo.findEligibleStudentsForRequirement(
    req,
    { allBatchStudents: true },
    options
  );
  const totalStudents = students.length;

  // 3. Current active assignments
  const activeAssignments = await assignmentRepo.findAssignmentsByRequirement(req.id, {
    transaction: options.transaction,
    includeStudent: true,
    includeSubject: true,
  });

  const assignmentMap = new Map();
  for (const a of activeAssignments) {
    if (a.status === "Assigned") {
      assignmentMap.set(a.studentId, a);
    }
  }

  const assignedCount = assignmentMap.size;
  const awaitingCount = Math.max(0, totalStudents - assignedCount);
  const assignedPercentage = totalStudents > 0 ? Number(((assignedCount / totalStudents) * 100).toFixed(1)) : 0;
  const awaitingPercentage = totalStudents > 0 ? Number(((awaitingCount / totalStudents) * 100).toFixed(1)) : 0;

  // 4. Common KPI Summary (Matches both Image 3 & Image 4)
  const kpiSummary = {
    applicableStudents: {
      count: totalStudents,
      label: "Applicable Students",
      subtitle: `from ${primaryBatch} · Term ${termRoman}`,
    },
    assigned: {
      count: assignedCount,
      percentage: assignedPercentage,
      label: "Assigned",
      subtitle: `${assignedPercentage}% of ${totalStudents} students`,
    },
    awaitingAssignment: {
      count: awaitingCount,
      percentage: awaitingPercentage,
      label: "Awaiting Assignment",
      subtitle: `${awaitingPercentage}% of ${totalStudents} students`,
    },
    needsAttention: {
      count: 0,
      label: "Needs Attention",
      subtitle: "no blocking issues",
    },
  };

  // 5. Assignment Rule Banner
  const assignmentRule = {
    coursesRequired,
    minCredits,
    ruleText: `${coursesRequired} course${coursesRequired > 1 ? "s" : ""} · Minimum ${minCredits} recognised credits`,
  };

  const academicContext = {
    term: req.term,
    termRoman,
    academicPeriod,
    programmeCode: courseCode,
    programmeName: courseName,
    programme,
    admissionBatch: primaryBatch,
    admissionBatchSpan,
    poolName,
    coursesRequired,
    minCredits,
    poolSubtitle,
  };

  const viewMode = (query.view || "student-wise").toLowerCase().trim();

  // ==========================================
  // VIEW A: STUDENT-WISE (Image 3)
  // ==========================================
  if (viewMode === "student-wise") {
    // Subject credits mapping
    const poolSubjects = (req.electivePool?.poolSubjectMappings || []).map((m) => m.subject).filter(Boolean);
    const subjectIds = poolSubjects.map((s) => s.subjectId);

    const cstmRows = subjectIds.length > 0
      ? await models.curriculumSubjectTermMappingModel.findAll({
          where: {
            curriculumId: req.curriculumId,
            subjectId: { [Op.in]: subjectIds },
          },
          attributes: ["subjectId", "credit"],
          transaction: options.transaction,
        })
      : [];
    const creditMap = new Map(cstmRows.map((r) => [r.subjectId, r.credit]));

    let studentRows = students.map((s, idx) => {
      const studentName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
      const enrolmentNo = s.enrollNumber || s.scholarNumber || `ENR${s.studentId}`;
      const assign = assignmentMap.get(s.studentId);
      const isAssigned = !!assign;
      const assignedSubject = assign ? assign.subject : null;

      const rawCredit = assignedSubject ? creditMap.get(assignedSubject.subjectId) : null;
      const cred = rawCredit !== null && rawCredit !== undefined ? rawCredit : (isAssigned ? minCredits : null);

      return {
        srNo: idx + 1,
        studentId: s.studentId,
        studentName,
        enrolmentNo,
        scholarNumber: s.scholarNumber || null,
        assignedCourse: assignedSubject
          ? {
              subjectId: assignedSubject.subjectId,
              courseCode: assignedSubject.subjectCode,
              courseTitle: assignedSubject.subjectName,
              fullTitle: `${assignedSubject.subjectName} (${assignedSubject.subjectCode})`,
            }
          : null,
        assignedCourseText: assignedSubject
          ? `${assignedSubject.subjectName} ${assignedSubject.subjectCode}`
          : "-",
        recognisedCredits: cred,
        recognisedCreditsText: isAssigned ? String(cred) : "-",
        assignmentSource: isAssigned ? (assign.assignmentSource || "Direct") : "-",
        status: isAssigned ? "Assigned" : "Awaiting",
        statusBadge: isAssigned
          ? { label: "Assigned", color: "green" }
          : { label: "Awaiting", color: "grey" },
        availableActions: isAssigned ? ["View / Edit"] : ["Assign"],
      };
    });

    // Apply Student-wise Filters
    if (query.search && String(query.search).trim()) {
      const s = String(query.search).trim().toLowerCase();
      studentRows = studentRows.filter(
        (row) =>
          row.studentName.toLowerCase().includes(s) ||
          row.enrolmentNo.toLowerCase().includes(s) ||
          (row.scholarNumber && row.scholarNumber.toLowerCase().includes(s))
      );
    }

    if (query.assignmentStatus && query.assignmentStatus !== "All" && query.assignmentStatus !== "All Statuses") {
      studentRows = studentRows.filter((row) => row.status.toLowerCase() === query.assignmentStatus.toLowerCase());
    }

    if (query.courseId) {
      const cId = parseInt(query.courseId, 10);
      studentRows = studentRows.filter((row) => row.assignedCourse?.subjectId === cId);
    }

    if (query.course && query.course !== "All" && query.course !== "All Courses") {
      const cStr = String(query.course).toLowerCase();
      studentRows = studentRows.filter((row) =>
        row.assignedCourseText.toLowerCase().includes(cStr)
      );
    }

    if (query.assignmentSource && query.assignmentSource !== "All" && query.assignmentSource !== "All Sources") {
      studentRows = studentRows.filter(
        (row) => row.assignmentSource.toLowerCase() === query.assignmentSource.toLowerCase()
      );
    }

    // Pagination
    const total = studentRows.length;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
    const offset = (page - 1) * limit;
    const pagedStudents = studentRows.slice(offset, offset + limit);

    return {
      id: req.id,
      requirementCode: req.requirementCode,
      requirementName: req.requirementName,
      statusBadge: assignedCount > 0 ? "Assignment In Progress" : "Not Started",
      academicContext,
      kpiSummary,
      assignmentRule,
      view: "student-wise",
      students: pagedStudents,
      paginationData: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ==========================================
  // VIEW B: COURSE-WISE (Image 4)
  // ==========================================
  const poolSubjects = (req.electivePool?.poolSubjectMappings || []).map((m) => m.subject).filter(Boolean);
  const subjectIds = poolSubjects.map((s) => s.subjectId);

  // Subject credits
  const cstmRows = subjectIds.length > 0
    ? await models.curriculumSubjectTermMappingModel.findAll({
        where: {
          curriculumId: req.curriculumId,
          subjectId: { [Op.in]: subjectIds },
        },
        attributes: ["subjectId", "credit"],
        transaction: options.transaction,
      })
    : [];
  const creditMap = new Map(cstmRows.map((r) => [r.subjectId, r.credit]));

  // Timetable Routine capacity
  const routineCells = subjectIds.length > 0
    ? await models.timeTableCellModel.findAll({
        where: { subjectId: { [Op.in]: subjectIds } },
        include: [
          {
            model: models.timeTableRoutineModel,
            as: "timeTableRoutine",
            attributes: ["timeTableRoutineId", "isPublish", "classSectionTermId"],
            include: [
              {
                model: models.classSectionTermModel,
                as: "timeTableClassSectionTerm",
                attributes: ["classSectionTermId", "classSectionsId"],
                include: [
                  {
                    model: models.classSectionModel,
                    as: "classSection",
                    attributes: ["classSectionsId", "expectedCapacity", "section"],
                  },
                ],
              },
            ],
          },
        ],
        transaction: options.transaction,
      })
    : [];

  const subjectCapacityMap = new Map();
  for (const cell of routineCells) {
    const subId = cell.subjectId;
    const routine = cell.timeTableRoutine;
    const cap = routine?.timeTableClassSectionTerm?.classSection?.expectedCapacity || 40;
    if (!subjectCapacityMap.has(subId)) {
      subjectCapacityMap.set(subId, { capacity: 0, sections: new Set() });
    }
    const entry = subjectCapacityMap.get(subId);
    if (routine?.classSectionTermId && !entry.sections.has(routine.classSectionTermId)) {
      entry.sections.add(routine.classSectionTermId);
      entry.capacity += Number(cap) || 40;
    }
  }

  // Build Course-wise Rows
  let courseRows = [];
  let sr = 1;
  for (const sub of poolSubjects) {
    const assignedFromThisReq = Array.from(assignmentMap.values()).filter(
      (a) => a.subjectId === sub.subjectId
    ).length;

    const assignedPercentage = totalStudents > 0
      ? Number(((assignedFromThisReq / totalStudents) * 100).toFixed(1))
      : 0;

    const totalEnrolledAcrossAll = await assignmentRepo.countTotalSubjectEnrollments(sub.subjectId, {
      transaction: options.transaction,
    });

    const capInfo = subjectCapacityMap.get(sub.subjectId);
    const totalCapacity = capInfo && capInfo.capacity > 0 ? capInfo.capacity : 40;
    const enrolledSeats = Math.max(assignedFromThisReq, totalEnrolledAcrossAll);
    const remainingSeats = Math.max(0, totalCapacity - enrolledSeats);
    const isFull = remainingSeats <= 0;

    const rawCredit = creditMap.get(sub.subjectId);
    const cred = rawCredit !== null && rawCredit !== undefined ? rawCredit : minCredits;

    // Teaching type inference
    let teachingType = "Theory";
    const nameLower = (sub.subjectName || "").toLowerCase();
    if (nameLower.includes("studio") && nameLower.includes("theory")) {
      teachingType = "Theory + Studio";
    } else if (nameLower.includes("studio")) {
      teachingType = "Studio Based";
    }

    courseRows.push({
      srNo: sr++,
      subjectId: sub.subjectId,
      courseCode: sub.subjectCode,
      courseTitle: sub.subjectName,
      teachingType,
      recognisedCredits: cred,
      recognisedCreditsText: String(cred),
      assignedStudents: {
        count: assignedFromThisReq,
        percentage: assignedPercentage,
        text: `${assignedFromThisReq} (${assignedPercentage}% of ${totalStudents} students)`,
      },
      seatOccupancy: {
        enrolledSeats,
        totalCapacity,
        remainingSeats,
        occupancyPercentage: totalCapacity > 0 ? Number(((enrolledSeats / totalCapacity) * 100).toFixed(1)) : 0,
        occupancyText: `${enrolledSeats} / ${totalCapacity}`,
        remainingText: `${remainingSeats} seats remaining`,
        tooltip: "Total students enrolled in this course offering across all participating programmes, batches and terms. Capacity is managed centrally through Timetable & Routine.",
      },
      assignmentAvailability: isFull ? "Full" : "Available",
      assignmentAvailabilityBadge: isFull
        ? { label: "Full", remainingText: "No seats available", color: "red" }
        : { label: "Available", remainingText: `${remainingSeats} seats remaining`, color: "green" },
      availableActions: isFull ? ["View Students"] : ["Manage Students ->"],
    });
  }

  // Course-wise Filters
  if (query.search && String(query.search).trim()) {
    const s = String(query.search).trim().toLowerCase();
    courseRows = courseRows.filter(
      (c) =>
        c.courseCode.toLowerCase().includes(s) ||
        c.courseTitle.toLowerCase().includes(s)
    );
  }

  if (query.courseAvailability && query.courseAvailability !== "All" && query.courseAvailability !== "All Courses") {
    courseRows = courseRows.filter(
      (c) => c.assignmentAvailability.toLowerCase() === query.courseAvailability.toLowerCase()
    );
  }

  const total = courseRows.length;
  const limit = query.limit ? parseInt(query.limit, 10) : 10;
  const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
  const offset = (page - 1) * limit;
  const pagedCourses = courseRows.slice(offset, offset + limit);

  return {
    id: req.id,
    requirementCode: req.requirementCode,
    requirementName: req.requirementName,
    statusBadge: assignedCount > 0 ? "Assignment In Progress" : "Not Started",
    academicContext,
    kpiSummary,
    assignmentRule,
    view: "course-wise",
    courseAssignments: pagedCourses,
    paginationData: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Assign a single student to an elective course
 */
export async function assignStudentToCurriculumElective(id, payload = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const studentId = parseInt(payload.studentId, 10);
  if (!studentId || isNaN(studentId)) {
    throw httpError("Valid studentId is required", 400);
  }

  const subjectId = parseInt(payload.subjectId, 10);
  if (!subjectId || isNaN(subjectId)) {
    throw httpError("Valid subjectId is required", 400);
  }

  // 1. Validate student exists
  const student = await models.studentModel.findByPk(studentId, {
    transaction: options.transaction,
  });
  if (!student) {
    throw httpError("Student not found", 404);
  }

  // 2. Validate subject belongs to elective pool
  const poolSubjects = (req.electivePool?.poolSubjectMappings || []).map((m) => m.subjectId);
  if (!poolSubjects.includes(subjectId)) {
    throw httpError("Selected course does not belong to the elective pool for this requirement", 400);
  }

  // 3. User & Tenant context
  const store = requestContext.getStore() || {};
  const userId = store.userId || 1;
  const universityId = store.universityId || student.universityId || 1;
  const instituteId = store.instituteId || student.instituteId || 1;
  const academicYearId = store.academicYearId || null;

  const assignment = await assignmentRepo.upsertAssignment(
    {
      curriculumElectiveRequirementId: req.id,
      studentId,
      subjectId,
      assignmentSource: payload.assignmentSource || "Direct",
      status: "Assigned",
      universityId,
      instituteId,
      academicYearId,
      userId,
    },
    options
  );

  return {
    success: true,
    message: "Student successfully assigned to elective course",
    assignment,
  };
}

/**
 * Unassign a student from an elective requirement
 */
export async function unassignStudentFromCurriculumElective(id, studentId, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const sId = parseInt(studentId, 10);
  if (!sId || isNaN(sId)) {
    throw httpError("Valid studentId is required", 400);
  }

  const removed = await assignmentRepo.unassignStudent(req.id, sId, options);
  if (!removed) {
    throw httpError("Active assignment not found for this student", 404);
  }

  return {
    success: true,
    message: "Student unassigned successfully",
  };
}

/**
 * Bulk assign multiple students to an elective course
 */
export async function bulkAssignStudentsToCurriculumElective(id, payload = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const { studentIds = [], subjectId, assignmentSource = "Direct" } = payload;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw httpError("studentIds array cannot be empty", 400);
  }

  const sId = parseInt(subjectId, 10);
  if (!sId || isNaN(sId)) {
    throw httpError("Valid subjectId is required", 400);
  }

  // Validate pool subject
  const poolSubjects = (req.electivePool?.poolSubjectMappings || []).map((m) => m.subjectId);
  if (!poolSubjects.includes(sId)) {
    throw httpError("Selected course does not belong to the elective pool for this requirement", 400);
  }

  const store = requestContext.getStore() || {};
  const userId = store.userId || 1;
  const universityId = store.universityId || 1;
  const instituteId = store.instituteId || 1;
  const academicYearId = store.academicYearId || null;

  const records = studentIds.map((studentId) => ({
    curriculumElectiveRequirementId: req.id,
    studentId: parseInt(studentId, 10),
    subjectId: sId,
    assignmentSource,
    status: "Assigned",
    universityId,
    instituteId,
    academicYearId,
    userId,
  }));

  const results = await assignmentRepo.bulkUpsertAssignments(records, options);

  return {
    success: true,
    count: results.length,
    message: `${results.length} students assigned successfully to course`,
  };
}

/**
 * Bulk unassign multiple students from an elective requirement
 */
export async function bulkUnassignStudentsFromCurriculumElective(id, payload = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const { studentIds = [] } = payload;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw httpError("studentIds array cannot be empty", 400);
  }

  const numericIds = studentIds.map((id) => parseInt(id, 10)).filter(Boolean);
  const deletedCount = await assignmentRepo.bulkUnassignStudents(req.id, numericIds, options);

  return {
    success: true,
    deletedCount,
    message: `${deletedCount} students unassigned successfully`,
  };
}

/**
 * Get Course Students for Manage Students Modal (Image 4 "Manage Students ->" action)
 * Returns assigned students to this course AND available students who can be assigned
 */
export async function getCourseStudentsForManagement(id, subjectId, query = {}, options = {}) {
  const req = await repo.findRequirementForOverview(id, options);
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const sId = parseInt(subjectId, 10);
  if (!sId || isNaN(sId)) {
    throw httpError("Valid subjectId is required", 400);
  }

  const poolMapping = (req.electivePool?.poolSubjectMappings || []).find((m) => m.subjectId === sId);
  if (!poolMapping || !poolMapping.subject) {
    throw httpError("Selected course does not belong to the elective pool for this requirement", 400);
  }
  const course = poolMapping.subject;

  // Recognised credits
  const cstm = await models.curriculumSubjectTermMappingModel.findOne({
    where: { curriculumId: req.curriculumId, subjectId: sId },
    attributes: ["credit"],
    transaction: options.transaction,
  });
  const recognisedCredits = cstm?.credit != null ? cstm.credit : (req.minCredits || 3);

  // Timetable Routine capacity
  const routineCells = await models.timeTableCellModel.findAll({
    where: { subjectId: sId },
    include: [
      {
        model: models.timeTableRoutineModel,
        as: "timeTableRoutine",
        attributes: ["timeTableRoutineId", "isPublish", "classSectionTermId"],
        include: [
          {
            model: models.classSectionTermModel,
            as: "timeTableClassSectionTerm",
            attributes: ["classSectionTermId", "classSectionsId"],
            include: [
              {
                model: models.classSectionModel,
                as: "classSection",
                attributes: ["classSectionsId", "expectedCapacity", "section"],
              },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  let totalCapacity = 0;
  const seenSections = new Set();
  for (const cell of routineCells) {
    const routine = cell.timeTableRoutine;
    if (routine?.classSectionTermId && !seenSections.has(routine.classSectionTermId)) {
      seenSections.add(routine.classSectionTermId);
      totalCapacity += Number(routine?.timeTableClassSectionTerm?.classSection?.expectedCapacity) || 40;
    }
  }
  if (totalCapacity === 0) totalCapacity = 40;

  const enrolledSeatsAcrossAll = await assignmentRepo.countTotalSubjectEnrollments(sId, options);
  const enrolledSeats = Math.max(0, enrolledSeatsAcrossAll);
  const remainingSeats = Math.max(0, totalCapacity - enrolledSeats);
  const isFull = remainingSeats <= 0;

  // Students and active assignments
  const allStudents = await repo.findEligibleStudentsForRequirement(req, { allBatchStudents: true }, options);
  const activeAssignments = await assignmentRepo.findAssignmentsByRequirement(req.id, {
    transaction: options.transaction,
    includeStudent: true,
  });

  const assignmentByStudentId = new Map();
  for (const a of activeAssignments) {
    if (a.status === "Assigned") {
      assignmentByStudentId.set(a.studentId, a);
    }
  }

  let assignedStudents = [];
  let availableStudents = [];

  for (const s of allStudents) {
    const studentName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
    const enrolmentNo = s.enrollNumber || s.scholarNumber || `ENR${s.studentId}`;
    const assign = assignmentByStudentId.get(s.studentId);

    if (assign && assign.subjectId === sId) {
      assignedStudents.push({
        studentId: s.studentId,
        studentName,
        enrolmentNo,
        scholarNumber: s.scholarNumber || null,
        assignmentSource: assign.assignmentSource || "Direct",
        assignedAt: assign.createdAt,
        status: "Assigned",
      });
    } else if (!assign) {
      availableStudents.push({
        studentId: s.studentId,
        studentName,
        enrolmentNo,
        scholarNumber: s.scholarNumber || null,
        status: "Awaiting",
      });
    }
  }

  // Search filter
  if (query.search && String(query.search).trim()) {
    const term = String(query.search).trim().toLowerCase();
    assignedStudents = assignedStudents.filter(
      (st) =>
        st.studentName.toLowerCase().includes(term) ||
        st.enrolmentNo.toLowerCase().includes(term) ||
        (st.scholarNumber && st.scholarNumber.toLowerCase().includes(term))
    );
    availableStudents = availableStudents.filter(
      (st) =>
        st.studentName.toLowerCase().includes(term) ||
        st.enrolmentNo.toLowerCase().includes(term) ||
        (st.scholarNumber && st.scholarNumber.toLowerCase().includes(term))
    );
  }

  return {
    requirementId: req.id,
    requirementCode: req.requirementCode,
    requirementName: req.requirementName,
    courseInfo: {
      subjectId: course.subjectId,
      courseCode: course.subjectCode,
      courseTitle: course.subjectName,
      recognisedCredits,
      seatOccupancy: {
        enrolledSeats,
        totalCapacity,
        remainingSeats,
        isFull,
        occupancyPercentage: totalCapacity > 0 ? Number(((enrolledSeats / totalCapacity) * 100).toFixed(1)) : 0,
        occupancyText: `${enrolledSeats} / ${totalCapacity}`,
        remainingText: `${remainingSeats} seats remaining`,
      },
    },
    summary: {
      totalAssignedToThisCourse: assignedStudents.length,
      totalAvailableToAssign: availableStudents.length,
      remainingSeats,
      canAssignMore: remainingSeats > 0,
    },
    assignedStudents,
    availableStudents,
  };
}


