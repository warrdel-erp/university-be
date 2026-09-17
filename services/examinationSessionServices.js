import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import * as examinationSessionEligibilityServices from "./examinationSessionEligibilityServices.js";
import * as examinationSessionEligibilityRepo from "../repository/examinationSessionEligibilityRepository.js";
import {
  lookupStudentCount,
  buildStudentGroupFromSchedule,
} from "../utility/studentCount.js";
import {
  getStudentCountMapByGroups,
  countStudentsForExamGroup,
} from "./studentCountServices.js";
import {
  capacityMapFromRows,
  deriveScheduleRoomFlags,
} from "../utility/roomCapacity.js";
import {
  EXAMINATION_SESSION_STATUS,
  EXAM_SCHEDULE_FILTER_STATUS,
  QUESTION_STATUS,
  ELIGIBILITY_STATUS,
  ELIGIBILITY_STATUS_LABEL,
  HALL_TICKET_STUDENT_QUERY_PURPOSE,
} from "../constant.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";
import * as examSessionAnswerSheetRepository from "../repository/examSessionAnswerSheetRepository.js";
import * as s3Helper from "../utility/s3Helper.js";
import { buildScope, scoped } from "../utility/scoped.js";
import * as model from "../models/index.js";
import { decimalAdd, decimalDivide, decimalMultiply, toIntegerNumber, decimalCompare, decimalGreaterThan } from "../utility/decimalMoney.js";
import {
  findCurriculumSubjectsForActiveYear,
  findActiveYearBatchTermsByCourseIds,
  resolveActiveAcademicYearContext,
} from "../utility/curriculumSubjectsByActiveYear.js";
import { resolveClassSectionTermIdsFromBatchTerm } from "./curriculumBatchTermServices.js";
import * as curriculumBatchTermRepository from "../repository/curriculumBatchTermRepository.js";
import * as acedmicYearRepository from "../repository/acedmicYearRepository.js";

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * Block unmapping when exam schedules already exist for the term on this session.
 */
async function assertTermsCanBeUnmapped(
  examinationSessionId,
  termsBeingRemoved,
  options = {},
) {
  if (!termsBeingRemoved.length) return;

  const checkedTerms = new Set();
  for (const sessionTerm of termsBeingRemoved) {
    const term = Number(sessionTerm.term);
    if (checkedTerms.has(term)) continue;
    checkedTerms.add(term);

    const hasSchedules =
      await examinationSessionRepository.hasExamSchedulesForTerm(
        examinationSessionId,
        term,
        options,
      );

    if (hasSchedules) {
      throw createBadRequestError(
        `Cannot unmap term ${term}: exam schedule(s) already exist for subjects in this term.`,
      );
    }
  }
}


function uniqueValues(values) {
  return [
    ...new Set(
      values.filter(
        (value) => value !== undefined && value !== null && value !== "",
      ),
    ),
  ];
}

function toPlain(record) {
  return record?.get ? record.get({ plain: true }) : record;
}

function extractTermNumbers(terms = []) {
  const result = [];
  for (const item of terms) {
    result.push(Number(item.term));
  }
  return uniqueValues(result);
}

/** Build term rows to insert; skips duplicates and terms already on the session. */
function buildMissingTermRows(terms, examinationSessionId, existingTermSet = new Set()) {
  const rows = [];
  const seen = new Set();
  for (const item of terms || []) {
    const term = Number(item.term);
    const courseId = item.courseId != null ? Number(item.courseId) : null;
    const sessionId = item.sessionId != null ? Number(item.sessionId) : null;
    const key = `${courseId}_${sessionId}_${term}`;
    if (seen.has(key) || existingTermSet.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      term,
      courseId,
      sessionId,
      examinationSessionId: Number(examinationSessionId),
      includeElectives: item.includeElectives,
      remarks: item.remarks,
    });
  }
  return rows;
}

async function assertNoTermOverlap(
  assessmentTypeId,
  terms,
  options = {},
  excludeSessionId,
) {
  if (!terms.length) return;

  const overlap = excludeSessionId
    ? await examinationSessionRepository.findOverlapTermForAssessmentTypeExcludingSession(
        assessmentTypeId,
        excludeSessionId,
        terms,
        options,
      )
    : await examinationSessionRepository.findOverlapTermForAssessmentType(
        assessmentTypeId,
        terms,
        options,
      );

  if (overlap) {
    throw createBadRequestError(
      "An examination session for this assessment type already exists with overlapping terms.",
    );
  }
}

/**
 * Before creating examination_session_term for (courseId + sessionId + term):
 * every current-batch curriculum subject for that course+term (batch-term year)
 * must have assessment_plan_subject_mapping for the same courseId + sessionId.
 */
async function assertCurriculumSubjectsHaveAssessmentPlanMapping(
  { courseId, sessionId, term, academicYearId },
  options = {},
) {
  if (!courseId || !sessionId || !term) {
    throw createBadRequestError(
      "courseId, sessionId and term are required to validate assessment plan subject mappings.",
    );
  }

  const curriculumFilters = {
    courseId: Number(courseId),
    terms: [Number(term)],
  };
  if (academicYearId != null) {
    curriculumFilters.academicYearId = Number(academicYearId);
  }

  const { rows: activeYearRows } = await findCurriculumSubjectsForActiveYear(
    curriculumFilters,
    options,
  );

  const subjectById = new Map();
  for (const row of activeYearRows) {
    const subjectId = Number(row.subjectId);
    if (subjectById.has(subjectId)) continue;
    const subject = row.subject;
    subjectById.set(subjectId, {
      subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      term: Number(row.term),
    });
  }

  if (subjectById.size === 0) {
    throw createBadRequestError(
      `No curriculum subjects found for courseId ${courseId}, term ${term}.`,
    );
  }

  const subjectIds = [...subjectById.keys()];
  const mappedIds =
    await examinationSessionRepository.findMappedSubjectIdsForCourseSessionTerm(
      { courseId, sessionId, subjectIds },
      options,
    );
  const mappedSet = new Set(mappedIds);

  const unmappedSubjects = [];
  for (const subjectId of subjectIds) {
    if (mappedSet.has(subjectId)) continue;
    unmappedSubjects.push(subjectById.get(subjectId));
  }

  if (unmappedSubjects.length === 0) {
    return;
  }

  throw createBadRequestError('All subjects are not mapped');
}

async function assertTermRowsHaveAssessmentPlanMappings(termRows, options = {}) {
  for (const row of termRows) {
    await assertCurriculumSubjectsHaveAssessmentPlanMapping(
      {
        courseId: row.courseId,
        sessionId: row.sessionId,
        term: row.term,
        academicYearId:
          row.academicYearId != null
            ? row.academicYearId
            : options.academicYearId,
      },
      options,
    );
  }
}

async function countMappedCoursesForSessionTerms(
  termsList,
  assessmentTypeId,
  sessionAcademicYearId,
  options = {},
) {
  if (!termsList.length || !assessmentTypeId) return 0;

  const sessionTermCourseIds = [];
  const sessionTermNumbers = [];
  const sessionTermSessionIds = [];
  const sessionTermMatchKeys = new Set();
  let termAcademicYearId = null;

  for (const row of termsList) {
    const courseId = row.courseId != null ? Number(row.courseId) : null;
    const term = Number(row.term);
    if (courseId == null || !decimalGreaterThan(term, 0)) continue;

    sessionTermCourseIds.push(courseId);
    sessionTermNumbers.push(term);
    if (row.sessionId != null) {
      sessionTermSessionIds.push(Number(row.sessionId));
    }
    sessionTermMatchKeys.add(`${courseId}_${term}`);
    if (termAcademicYearId == null && row.academicYearId != null) {
      termAcademicYearId = Number(row.academicYearId);
    }
  }

  if (!sessionTermCourseIds.length) return 0;

  const assessmentPlanIds = await getAssessmentPlanIds(
    Number(assessmentTypeId),
    options,
  );
  if (!assessmentPlanIds.length) return 0;

  const mappingWhere = {
    assessmentPlanId: { [Op.in]: assessmentPlanIds },
    courseId: { [Op.in]: uniqueValues(sessionTermCourseIds) },
  };
  if (sessionTermSessionIds.length > 0) {
    mappingWhere.sessionId = { [Op.in]: uniqueValues(sessionTermSessionIds) };
  }

  const subjectMappings =
    await examinationSessionRepository.findAssessmentPlanSubjectMappings(
      mappingWhere,
      options,
    );
  if (!subjectMappings.length) return 0;

  const mappingKeySet = new Set();
  const planSubjectIds = [];
  for (const mapping of subjectMappings) {
    if (mapping.curriculumBatchTermMappingId == null) continue;
    mappingKeySet.add(
      `${Number(mapping.curriculumBatchTermMappingId)}_${Number(mapping.subjectId)}`,
    );
    planSubjectIds.push(mapping.subjectId);
  }
  if (!mappingKeySet.size) return 0;

  const curriculumFilters = {
    courseIds: uniqueValues(sessionTermCourseIds),
    terms: uniqueValues(sessionTermNumbers),
    subjectIds: uniqueValues(planSubjectIds),
  };
  const resolvedAcademicYearId = termAcademicYearId ?? sessionAcademicYearId;
  if (resolvedAcademicYearId != null) {
    curriculumFilters.academicYearId = resolvedAcademicYearId;
  }

  const { rows: curriculumRows } = await findCurriculumSubjectsForActiveYear(
    curriculumFilters,
    options,
  );
  if (!curriculumRows.length) return 0;

  const courseIds = new Set();
  for (const row of curriculumRows) {
    if (!sessionTermMatchKeys.has(`${row.courseId}_${row.term}`)) continue;
    if (row.curriculumBatchTermMappingId == null) continue;
    if (
      !mappingKeySet.has(
        `${Number(row.curriculumBatchTermMappingId)}_${Number(row.subjectId)}`,
      )
    ) {
      continue;
    }
    courseIds.add(Number(row.courseId));
  }

  return courseIds.size;
}

async function buildSessionSummary(sessionRecord, options = {}) {
  if (!sessionRecord) {
    return null;
  }

  const sessionPlain = toPlain(sessionRecord);
  let totalStudents = 0;
  const termsList = sessionPlain.examinationSessionTerms || [];
  const academicYearId = Number(sessionPlain.academicYearId);
  const assessmentTypeId = Number(sessionPlain.assessmentTypeId);

  const courseCount = await countMappedCoursesForSessionTerms(
    termsList,
    assessmentTypeId,
    academicYearId,
    options,
  );

  if (termsList.length && academicYearId) {
    const studentGroups = [];
    const seen = new Set();

    for (const row of termsList) {
      if (row.courseId == null || row.sessionId == null || row.term == null) {
        continue;
      }
      const group = {
        sessionId: Number(row.sessionId),
        courseId: Number(row.courseId),
        term: Number(row.term),
        academicYearId:
          row.academicYearId != null
            ? Number(row.academicYearId)
            : academicYearId,
      };
      const key = `${group.sessionId}_${group.courseId}_${group.term}_${group.academicYearId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      studentGroups.push(group);
    }

    if (studentGroups.length) {
      const countMap = await getStudentCountMapByGroups(studentGroups, options);
      for (const group of studentGroups) {
        totalStudents += lookupStudentCount(countMap, group);
      }
    }
  }

  return {
    ...sessionPlain,
    courseCount,
    totalStudents,
  };
}

async function getSetupTypeId(examSetupTypeId, options = {}) {
  let setupTypeId = Number(examSetupTypeId);
  if (!setupTypeId && options.examinationSessionId) {
    const sessionRecord =
      await examinationSessionRepository.findExaminationSessionAssessmentTypeById(
        options.examinationSessionId,
        options,
      );
    if (sessionRecord?.assessmentTypeId) {
      setupTypeId = Number(sessionRecord.assessmentTypeId);
    }
  }
  return setupTypeId;
}

async function getAssessmentPlanIds(examSetupTypeId, options = {}) {
  const components =
    await examinationSessionRepository.findAssessmentPlanComponentsBySetupTypeId(
      examSetupTypeId,
      options,
    );
  return uniqueValues(
    components.map((component) => component.assessmentPlanId),
  );
}

async function initializeEligibilityRecords(
  examinationSessionId,
  defaultAcademicYearId,
  transaction,
) {
  const session =
    await examinationSessionRepository.getExaminationSessionById(
      examinationSessionId,
      { transaction },
    );
  if (!session) return;

  const academicYearId = Number(
    defaultAcademicYearId != null
      ? defaultAcademicYearId
      : session.academicYearId,
  );
  if (!academicYearId) return;

  const rawStudentsList =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      examinationSessionId,
      { purpose: HALL_TICKET_STUDENT_QUERY_PURPOSE.ELIGIBILITY_SYNC },
      transaction,
    );
  if (!rawStudentsList.length) return;

  const existingMap =
    await examinationSessionEligibilityRepo.getEligibilityStatusesMap(
      examinationSessionId,
      { transaction },
    );

  const eligibilityRecords = [];
  const seenStudentIds = new Set();

  for (const raw of rawStudentsList) {
    const student = raw.student;
    const studentId = Number(student.studentId);
    if (seenStudentIds.has(studentId) || existingMap.has(studentId)) continue;
    seenStudentIds.add(studentId);

    let initialStatus = ELIGIBILITY_STATUS.REVIEW;
    let reviewReason = null;
    try {
      const calculated =
        examinationSessionEligibilityServices.calculateStudentEligibility(raw);
      if (calculated.eligibilityStatus === ELIGIBILITY_STATUS_LABEL.READY) {
        initialStatus = ELIGIBILITY_STATUS.READY;
      } else {
        reviewReason = calculated.reasonText;
        if (
          !reviewReason &&
          calculated.reviewReasons &&
          calculated.reviewReasons.length > 0
        ) {
          reviewReason = calculated.reviewReasons[0].message;
        }
      }
    } catch (_error) {
      initialStatus = ELIGIBILITY_STATUS.REVIEW;
      reviewReason = null;
    }

    eligibilityRecords.push({
      universityId: student.universityId,
      instituteId: student.instituteId,
      academicYearId,
      studentId,
      examinationSessionId: Number(examinationSessionId),
      status: initialStatus,
      reviewReason,
    });
  }

  await examinationSessionEligibilityRepo.bulkCreateRecords(
    eligibilityRecords,
    { transaction },
  );
}

export async function createExaminationSession(sessionData, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const { terms, ...mainData } = sessionData;
    const tx = { ...options, transaction };
    const termsToCreate = buildMissingTermRows(terms, 0);

    if (termsToCreate.length) {
      await assertTermRowsHaveAssessmentPlanMappings(termsToCreate, {
        ...tx,
        academicYearId: mainData.academicYearId,
      });
    }

    if (mainData.assessmentTypeId) {
      if (termsToCreate.length) {
        await assertNoTermOverlap(
          mainData.assessmentTypeId,
          extractTermNumbers(termsToCreate),
          tx,
        );
      } else {
        const existing =
          await examinationSessionRepository.findExaminationSessionByAssessmentTypeId(
            mainData.assessmentTypeId,
            tx,
          );
        if (existing) {
          throw createBadRequestError(
            "An examination session for this assessment type already exists.",
          );
        }
      }
    }

    const record = await examinationSessionRepository.createExaminationSession(
      mainData,
      tx,
    );

    if (termsToCreate.length) {
      for (const row of termsToCreate) {
        row.examinationSessionId = record.examinationSessionId;
      }
      await examinationSessionRepository.createExaminationSessionTerms(
        termsToCreate,
        tx,
      );
      await initializeEligibilityRecords(
        record.examinationSessionId,
        mainData.academicYearId,
        transaction,
      );
    }

    return getExaminationSessionById(record.examinationSessionId, tx);
  });
}

export async function getExaminationSessions(filters = {}, options = {}) {
  const {
    search,
    status = "all",
    academicYearId,
    assessmentTypeId,
    universityId,
    instituteId,
    page = 1,
    limit = 10,
  } = filters;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;
  const where = {};

  if (academicYearId) where.academicYearId = Number(academicYearId);
  if (assessmentTypeId) where.assessmentTypeId = Number(assessmentTypeId);
  if (universityId) where.universityId = Number(universityId);
  if (instituteId) where.instituteId = Number(instituteId);
  if (search) where.sessionName = { [Op.like]: `%${search}%` };

  const lifecycleStatus = status === "all" ? undefined : status;

  const { count, rows } =
    await examinationSessionRepository.findAndCountExaminationSessions(
      { where, limit: limitNum, offset, lifecycleStatus },
      options,
    );

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: await Promise.all(
      rows.map((row) => buildSessionSummary(row, options)),
    ),
  };
}

export async function getExaminationSessionById(id, options = {}) {
  const parsedId = Number(id);
  if (Number.isNaN(parsedId)) {
    return null;
  }
  const sessionRecord =
    await examinationSessionRepository.getExaminationSessionById(
      parsedId,
      options,
    );
  return buildSessionSummary(sessionRecord, options);
}

export async function updateExaminationSession(
  id,
  updateData = {},
  options = {},
) {
  return sequelize.transaction(async (transaction) => {
    const sessionId = Number(id);
    const { terms, ...mainUpdateData } = updateData;
    const tx = { ...options, transaction };

    const currentSession =
      await examinationSessionRepository.getExaminationSessionById(
        sessionId,
        tx,
      );
    if (!currentSession) return null;

    if (Object.keys(mainUpdateData).length) {
      await examinationSessionRepository.updateExaminationSession(
        sessionId,
        mainUpdateData,
        tx,
      );
    }

    if (Array.isArray(terms) && terms.length) {
      const existingTerms =
        await examinationSessionRepository.findExaminationSessionTerms(
          sessionId,
          tx,
        );
      const existingTermSet = new Set();
      for (const row of existingTerms) {
        const courseId = row.courseId != null ? Number(row.courseId) : null;
        const sessionIdValue =
          row.sessionId != null ? Number(row.sessionId) : null;
        existingTermSet.add(
          `${courseId}_${sessionIdValue}_${Number(row.term)}`,
        );
      }

      const termsToCreate = buildMissingTermRows(
        terms,
        sessionId,
        existingTermSet,
      );

      if (termsToCreate.length) {
        const assessmentTypeId = Number(
          mainUpdateData.assessmentTypeId != null
            ? mainUpdateData.assessmentTypeId
            : currentSession.assessmentTypeId,
        );
        await assertNoTermOverlap(
          assessmentTypeId,
          extractTermNumbers(termsToCreate),
          tx,
          sessionId,
        );
        await assertTermRowsHaveAssessmentPlanMappings(termsToCreate, {
          ...tx,
          academicYearId:
            mainUpdateData.academicYearId != null
              ? mainUpdateData.academicYearId
              : currentSession.academicYearId,
        });
        await examinationSessionRepository.createExaminationSessionTerms(
          termsToCreate,
          tx,
        );
      }
    }

    await initializeEligibilityRecords(
      sessionId,
      mainUpdateData.academicYearId,
      transaction,
    );

    return getExaminationSessionById(sessionId, tx);
  });
}

export async function deleteExaminationSession(id, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const existing =
      await examinationSessionRepository.getExaminationSessionById(id, {
        ...options,
        transaction,
      });
    if (!existing) {
      return null;
    }

    await examinationSessionRepository.deleteExaminationSession(id, {
      ...options,
      transaction,
    });
    return { message: "Examination session deleted successfully" };
  });
}

export async function createExaminationSessionTerm(termData, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const examinationSessionId = Number(termData.examinationSessionId);
    const termNumber = Number(termData.term);
    const courseId =
      termData.courseId != null ? Number(termData.courseId) : null;
    const sessionId =
      termData.sessionId != null ? Number(termData.sessionId) : null;
    const tx = { ...options, transaction };

    const existingTerms =
      await examinationSessionRepository.findExaminationSessionTerms(
        examinationSessionId,
        tx,
      );
    for (const existing of existingTerms) {
      const existingCourseId =
        existing.courseId != null ? Number(existing.courseId) : null;
      const existingSessionId =
        existing.sessionId != null ? Number(existing.sessionId) : null;
      if (
        Number(existing.term) === termNumber &&
        existingCourseId === courseId &&
        existingSessionId === sessionId
      ) {
        return existing;
      }
    }

    const session =
      await examinationSessionRepository.getExaminationSessionById(
        examinationSessionId,
        tx,
      );
    if (!session) {
      throw createBadRequestError("Examination session not found.");
    }

    await assertNoTermOverlap(
      session.assessmentTypeId,
      [termNumber],
      tx,
      examinationSessionId,
    );

    await assertCurriculumSubjectsHaveAssessmentPlanMapping(
      {
        courseId,
        sessionId,
        term: termNumber,
        academicYearId: session.academicYearId,
      },
      tx,
    );

    const record =
      await examinationSessionRepository.createExaminationSessionTerm(
        {
          examinationSessionId,
          term: termNumber,
          courseId,
          sessionId,
          includeElectives: termData.includeElectives,
          remarks: termData.remarks,
        },
        tx,
      );

    await initializeEligibilityRecords(
      examinationSessionId,
      undefined,
      transaction,
    );

    return record;
  });
}

export async function deleteExaminationSessionTerm(
  examinationSessionTermId,
  options = {},
) {
  return sequelize.transaction(async (transaction) => {
    const existing =
      await examinationSessionRepository.findExaminationSessionTermById(
        examinationSessionTermId,
        { ...options, transaction },
      );
    if (!existing) {
      return null;
    }

    await assertTermsCanBeUnmapped(
      existing.examinationSessionId,
      [existing],
      { ...options, transaction },
    );

    await examinationSessionRepository.deleteExaminationSessionTerm(
      examinationSessionTermId,
      { ...options, transaction },
    );
    return { message: "Examination session term mapping deleted successfully" };
  });
}

/**
 * Courses / terms for an exam setup type.
 * Terms = curriculum (batch from curriculum_batch_mapping); counts from assessment plan mapping.
 * Response terms omit the subjects array.
 */
export async function getClassSectionTermsBySetupType(
  examSetupTypeId,
  options = {},
) {
  const setupTypeId = await getSetupTypeId(examSetupTypeId, options);
  if (!setupTypeId) return [];

  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) return [];

  const [plans, mappings] = await Promise.all([
    examinationSessionRepository.findAssessmentPlansByIds(planIds, options),
    examinationSessionRepository.findAssessmentPlanSubjectMappings(
      { assessmentPlanId: { [Op.in]: planIds } },
      options,
    ),
  ]);

  const courseIdList = [];
  for (const plan of plans) courseIdList.push(plan.courseId);
  for (const mapping of mappings) courseIdList.push(mapping.courseId);
  const courseIds = uniqueValues(courseIdList);
  if (!courseIds.length) return [];

  // examSetupTypeId → plans/mappings → all course terms, grouped by courseId + sessionId.
  const [
    { academicYearId, rows: batchTermRows },
    { rows: subjectRows },
  ] = await Promise.all([
    findActiveYearBatchTermsByCourseIds(courseIds, options),
    findCurriculumSubjectsForActiveYear({ courseIds }, options),
  ]);

  const groupKeys = new Map();
  // groupKey → curriculumBatchTermMappingId → Set(subjectId)
  const mappedByGroupCbtm = new Map();
  // groupKey → `${batch}_${term}` → Set(subjectId) — same cohort when CBTM ids differ
  const mappedByGroupBatchTerm = new Map();
  const mappedCbtmIds = [];

  function groupKeyOf(courseId, sessionId) {
    return `${Number(courseId)}_${sessionId != null ? Number(sessionId) : 0}`;
  }

  function ensureGroup(courseId, sessionId, academicYearIdValue) {
    const key = groupKeyOf(courseId, sessionId);
    if (!groupKeys.has(key)) {
      groupKeys.set(key, {
        courseId: Number(courseId),
        sessionId: sessionId != null ? Number(sessionId) : null,
        academicYearId:
          academicYearIdValue != null
            ? Number(academicYearIdValue)
            : academicYearId,
      });
    }
    return key;
  }

  function addToNestedSet(rootMap, groupKey, nestedKey, subjectId) {
    if (!rootMap.has(groupKey)) rootMap.set(groupKey, new Map());
    const nested = rootMap.get(groupKey);
    if (!nested.has(nestedKey)) nested.set(nestedKey, new Set());
    nested.get(nestedKey).add(Number(subjectId));
  }

  for (const mapping of mappings) {
    const key = ensureGroup(
      mapping.courseId,
      mapping.sessionId,
      mapping.academicYearId,
    );
    if (mapping.curriculumBatchTermMappingId == null) continue;
    const cbtmId = Number(mapping.curriculumBatchTermMappingId);
    mappedCbtmIds.push(cbtmId);
    addToNestedSet(mappedByGroupCbtm, key, cbtmId, mapping.subjectId);
  }

  for (const courseId of courseIds) {
    let hasGroup = false;
    for (const group of groupKeys.values()) {
      if (group.courseId === Number(courseId)) {
        hasGroup = true;
        break;
      }
    }
    if (!hasGroup) {
      ensureGroup(courseId, null, academicYearId);
    }
  }

  const enrichmentRows = mappedCbtmIds.length
    ? await curriculumBatchTermRepository.findEnrichmentByIds(
        mappedCbtmIds,
        options,
      )
    : [];
  const enrichmentById = new Map();
  for (const row of enrichmentRows) {
    enrichmentById.set(row.curriculumBatchTermMappingId, row);
  }

  for (const mapping of mappings) {
    if (mapping.curriculumBatchTermMappingId == null) continue;
    const ctx = enrichmentById.get(Number(mapping.curriculumBatchTermMappingId));
    if (!ctx) continue;
    const key = groupKeyOf(mapping.courseId, mapping.sessionId);
    addToNestedSet(
      mappedByGroupBatchTerm,
      key,
      `${ctx.batchYear}_${ctx.term}`,
      mapping.subjectId,
    );
  }

  // courseId → curriculumBatchTermMappingId → term bucket
  const termsByCourse = new Map();

  function ensureTermBucket(courseId, term, batch, yearNumber, curriculumBatchTermMappingId) {
    const cid = Number(courseId);
    const cbtmId = Number(curriculumBatchTermMappingId);
    const t = toIntegerNumber(term);
    const b = toIntegerNumber(batch);
    if (!cbtmId || !decimalGreaterThan(b, 0) || !decimalGreaterThan(t, 0)) {
      return null;
    }

    if (!termsByCourse.has(cid)) termsByCourse.set(cid, new Map());
    const termMap = termsByCourse.get(cid);
    if (!termMap.has(cbtmId)) {
      termMap.set(cbtmId, {
        term: t,
        batch: b,
        yearNumber: yearNumber != null ? Number(yearNumber) : null,
        curriculumBatchTermMappingId: cbtmId,
        subjectIds: new Set(),
      });
    }
    return termMap.get(cbtmId);
  }

  for (const row of batchTermRows) {
    ensureTermBucket(
      row.courseId,
      row.term,
      row.batch,
      row.yearNumber,
      row.curriculumBatchTermMappingId,
    );
  }

  for (const row of subjectRows) {
    const bucket = ensureTermBucket(
      row.courseId,
      row.term,
      row.batch,
      row.yearNumber,
      row.curriculumBatchTermMappingId,
    );
    if (!bucket) continue;
    bucket.subjectIds.add(Number(row.subjectId));
  }

  // Only link mapped subject IDs to active-year term buckets.
  for (const mapping of mappings) {
    if (mapping.curriculumBatchTermMappingId == null) continue;
    const cbtmId = Number(mapping.curriculumBatchTermMappingId);
    const courseId = Number(mapping.courseId);
    const existing = termsByCourse.get(courseId)?.get(cbtmId);
    if (existing) {
      existing.subjectIds.add(Number(mapping.subjectId));
    }
  }

  const groups = [...groupKeys.values()];
  const courseIdsOut = [];
  const sessionIdsOut = [];
  for (const group of groups) {
    courseIdsOut.push(group.courseId);
    if (group.sessionId != null) sessionIdsOut.push(group.sessionId);
  }

  const [courses, sessions, courseSessionMappings] = await Promise.all([
    examinationSessionRepository.findCoursesByIds(
      uniqueValues(courseIdsOut),
      options,
    ),
    examinationSessionRepository.findSessionsByIds(
      uniqueValues(sessionIdsOut),
      options,
    ),
    examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
      uniqueValues(courseIdsOut),
      uniqueValues(sessionIdsOut),
      options,
    ),
  ]);

  const courseMap = new Map();
  for (const course of courses) courseMap.set(course.courseId, course);
  const sessionMap = new Map();
  for (const session of sessions) sessionMap.set(session.sessionId, session);
  const csmMap = new Map();
  for (const row of courseSessionMappings) {
    const plain = row.get ? row.get({ plain: true }) : row;
    csmMap.set(
      `${plain.courseId}_${plain.sessionId}`,
      plain.sessionCourseMappingId,
    );
  }

  const result = [];
  for (const group of groups) {
    const course = courseMap.get(group.courseId);
    if (!course) continue;

    const termMap = termsByCourse.get(group.courseId);
    const terms = termMap ? [...termMap.values()] : [];
    terms.sort((a, b) => {
      const byBatch = decimalCompare(a.batch, b.batch);
      return byBatch !== 0 ? byBatch : decimalCompare(a.term, b.term);
    });

    const groupKey = groupKeyOf(group.courseId, group.sessionId);
    const mappedForGroup = mappedByGroupCbtm.get(groupKey);
    const mappedBatchTermForGroup = mappedByGroupBatchTerm.get(groupKey);

    const termDetails = [];
    for (const bucket of terms) {
      const mappedSubjects = new Set();
      const byCbtm = mappedForGroup
        ? mappedForGroup.get(bucket.curriculumBatchTermMappingId)
        : null;
      if (byCbtm) {
        for (const subjectId of byCbtm) mappedSubjects.add(subjectId);
      }
      const byBatchTerm = mappedBatchTermForGroup
        ? mappedBatchTermForGroup.get(`${bucket.batch}_${bucket.term}`)
        : null;
      if (byBatchTerm) {
        for (const subjectId of byBatchTerm) mappedSubjects.add(subjectId);
      }

      let mappedSubjectCount = 0;
      for (const subjectId of mappedSubjects) {
        if (!bucket.subjectIds.has(subjectId)) continue;
        mappedSubjectCount = toIntegerNumber(
          decimalAdd(mappedSubjectCount, 1),
        );
      }

      const cohortContext = {
        courseId: group.courseId,
        term: bucket.term,
        yearNumber: bucket.yearNumber,
        batch: bucket.batch,
      };
      const classSectionTermIds = await resolveClassSectionTermIdsFromBatchTerm(
        cohortContext,
        {
          sessionId: group.sessionId,
          academicYearId: group.academicYearId,
        },
        options,
      );

      let studentCount = 0;
      if (group.sessionId != null && group.academicYearId != null) {
        studentCount = await countStudentsForExamGroup(
          group.sessionId,
          group.courseId,
          bucket.term,
          group.academicYearId,
          {
            batchYear: bucket.batch,
            yearNumber: bucket.yearNumber,
            curriculumBatchTermMappingId: bucket.curriculumBatchTermMappingId,
            transaction: options.transaction,
          },
        );
      }

      termDetails.push({
        term: bucket.term,
        batch: bucket.batch,
        yearNumber: bucket.yearNumber,
        curriculumBatchTermMappingId: bucket.curriculumBatchTermMappingId,
        classSectionTermIds,
        mappedSubjectCount,
        totalSubjects: toIntegerNumber(bucket.subjectIds.size),
        studentCount,
      });
    }

    result.push({
      course,
      termType: course.termType || null,
      session: group.sessionId ? sessionMap.get(group.sessionId) || null : null,
      courseSessionMappingId:
        group.sessionId != null
          ? csmMap.get(`${group.courseId}_${group.sessionId}`) || null
          : null,
      academicYearId: group.academicYearId,
      terms: termDetails,
    });
  }

  return result;
}

export async function getExaminationStructure(
  {
    examinationSessionId,
    examSetupTypeId,
    academicYearId,
    courseId,
    sessionId,
  } = {},
  options = {},
) {
  let setupTypeId = Number(examSetupTypeId);
  let sessionRecord = null;

  if (examinationSessionId) {
    sessionRecord =
      await examinationSessionRepository.getExaminationSessionById(
        examinationSessionId,
        options,
      );
    if (!sessionRecord) return [];
    setupTypeId = Number(sessionRecord.assessmentTypeId);
  }

  if (!setupTypeId) return [];

  const plainSession = toPlain(sessionRecord);

  // When examinationSessionId is given, return only what is stored in
  // examination_session_term — no curriculum / subject enrichment needed.
  if (examinationSessionId && plainSession) {
    const sessionTerms = plainSession.examinationSessionTerms || [];
    if (sessionTerms.length === 0) return [];

    // Group by (courseId, sessionId)
    const groupMap = new Map();
    for (const st of sessionTerms) {
      const cId = Number(st.courseId);
      const sId = st.sessionId != null ? Number(st.sessionId) : null;
      const gKey = `${cId}_${sId ?? 0}`;
      if (!groupMap.has(gKey)) {
        groupMap.set(gKey, {
          courseId: cId,
          sessionId: sId,
          academicYearId: Number(st.academicYearId) || null,
          terms: [],
        });
      }
      groupMap.get(gKey).terms.push({
        examinationSessionTermId: Number(st.examinationSessionTermId),
        term: Number(st.term),
        includeElectives: st.includeElectives,
        remarks: st.remarks ?? null,
      });
    }

    const allCourseIds = uniqueValues([...groupMap.values()].map((g) => g.courseId));
    const allSessionIds = uniqueValues(
      [...groupMap.values()].map((g) => g.sessionId).filter((id) => id != null),
    );

    const [courses, sessions, csmRows] = await Promise.all([
      examinationSessionRepository.findCoursesByIds(allCourseIds, options),
      examinationSessionRepository.findSessionsByIds(allSessionIds, options),
      examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
        allCourseIds,
        allSessionIds,
        options,
      ),
    ]);

    const courseMap = new Map(courses.map((c) => [c.courseId, c]));
    const sessionMap = new Map(sessions.map((s) => [s.sessionId, s]));
    const csmMap = new Map(
      csmRows.map((r) => {
        const p = r.get ? r.get({ plain: true }) : r;
        return [`${p.courseId}_${p.sessionId}`, p.sessionCourseMappingId];
      }),
    );

    return [...groupMap.values()].map((group) => {
      const course = courseMap.get(group.courseId);
      const session = group.sessionId ? sessionMap.get(group.sessionId) || null : null;
      group.terms.sort((a, b) => a.term - b.term);

      return {
        examinationSessionId: Number(examinationSessionId),
        courseId: group.courseId,
        courseName: course?.courseName || null,
        courseCode: course?.courseCode || null,
        termType: course?.termType || null,
        totalTerms: course?.totalTerms || null,
        sessionId: group.sessionId,
        sessionName: session?.sessionName || null,
        courseSessionMappingId:
          group.sessionId != null
            ? csmMap.get(`${group.courseId}_${group.sessionId}`) || null
            : null,
        academicYearId: group.academicYearId,
        terms: group.terms,
      };
    });
  }

  // ----------------------------------------------------------------
  // Legacy path: no examinationSessionId — filter by examSetupTypeId
  // ----------------------------------------------------------------
  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) return [];

  const mappingWhere = { assessmentPlanId: { [Op.in]: planIds } };
  if (courseId) mappingWhere.courseId = Number(courseId);
  if (sessionId) mappingWhere.sessionId = Number(sessionId);

  const subjectMappings =
    await examinationSessionRepository.findAssessmentPlanSubjectMappings(
      mappingWhere,
      options,
    );

  const subjectIds = uniqueValues(
    subjectMappings.map((mapping) => mapping.subjectId),
  );
  if (!subjectIds.length) return [];

  let activeBatchYear;
  let resolvedAcademicYearId;
  if (academicYearId) {
    const academicYear =
      await acedmicYearRepository.getSingleacedmicYearDetails(
        Number(academicYearId),
        options,
      );
    if (!academicYear?.startingDate) return [];
    resolvedAcademicYearId = toIntegerNumber(academicYear.academicYearId);
    activeBatchYear = toIntegerNumber(
      String(academicYear.startingDate).slice(0, 4),
    );
  } else {
    const ctx = await resolveActiveAcademicYearContext(options);
    resolvedAcademicYearId = ctx.academicYearId;
    activeBatchYear = ctx.activeBatchYear;
  }

  const curriculumFilters = {
    subjectIds,
    activeBatchYear,
    academicYearId: resolvedAcademicYearId,
  };
  if (courseId) curriculumFilters.courseId = Number(courseId);

  const { rows: curriculumRows } = await findCurriculumSubjectsForActiveYear(
    curriculumFilters,
    options,
  );
  if (!curriculumRows.length) return [];

  const mappingKeySet = new Set();
  for (const mapping of subjectMappings) {
    if (mapping.curriculumBatchTermMappingId == null) continue;
    mappingKeySet.add(
      `${Number(mapping.curriculumBatchTermMappingId)}_${Number(mapping.subjectId)}`,
    );
  }

  const mappings =
    await examinationSessionRepository.findAssessmentPlanSubjectMappingsWithSession(
      {
        subjectId: { [Op.in]: subjectIds },
      },
      options,
    );

  const courseIdsFromCurriculum = uniqueValues(
    curriculumRows.map((row) => row.courseId),
  );
  const courses = await examinationSessionRepository.findCoursesByIds(
    courseIdsFromCurriculum,
    options,
  );
  const courseMap = new Map(courses.map((course) => [course.courseId, course]));
  const subjectSessionMap = new Map(
    mappings.map((mapping) => [
      mapping.subjectId,
      {
        sessionId: mapping.sessionId,
        sessionName: mapping["session.sessionName"] || null,
      },
    ]),
  );

  const courseSessionGroups = new Map();
  const seenSubjectInGroup = new Map();

  for (const row of curriculumRows) {
    if (row.curriculumBatchTermMappingId == null) continue;
    if (
      !mappingKeySet.has(
        `${Number(row.curriculumBatchTermMappingId)}_${Number(row.subjectId)}`,
      )
    ) {
      continue;
    }

    const sessionInfo = subjectSessionMap.get(row.subjectId) || {};
    const key = `${row.courseId}_${sessionInfo.sessionId || 0}`;
    if (!courseSessionGroups.has(key)) {
      const course = courseMap.get(row.courseId) || {};
      courseSessionGroups.set(key, {
        courseId: row.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        termType: course.termType,
        sessionId: sessionInfo.sessionId,
        sessionName: sessionInfo.sessionName,
        academicYearId: resolvedAcademicYearId,
        termsMap: new Map(),
      });
      seenSubjectInGroup.set(key, new Set());
    }

    const group = courseSessionGroups.get(key);
    const subjectTerm = Number(row.term);
    const dedupeKey = `${row.curriculumBatchTermMappingId}_${row.subjectId}`;
    const seen = seenSubjectInGroup.get(key);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    if (!group.termsMap.has(subjectTerm)) {
      group.termsMap.set(subjectTerm, []);
    }
    group.termsMap.get(subjectTerm).push({
      subjectId: row.subjectId,
      subjectName: row.subject.subjectName,
      subjectCode: row.subject.subjectCode,
      term: subjectTerm,
      courseId: row.courseId,
      sessionId: sessionInfo.sessionId,
    });
  }

  const courseSessionMappingsList =
    await examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
      uniqueValues([...courseSessionGroups.values()].map((g) => g.courseId)),
      uniqueValues([...courseSessionGroups.values()].map((g) => g.sessionId)),
      options,
    );

  const courseSessionMappingMap = new Map(
    courseSessionMappingsList.map((m) => [
      `${m.courseId}_${m.sessionId}`,
      m.sessionCourseMappingId,
    ]),
  );

  return [...courseSessionGroups.values()]
    .map((group) => {
      let totalSubjects = 0;
      const terms = [...group.termsMap.keys()]
        .sort((a, b) => a - b)
        .reduce((acc, term) => {
          const termSubjects = group.termsMap.get(term);
          totalSubjects += termSubjects.length;
          acc.push({
            term,
            termTitle: `${group.termType === "Year" ? "Year" : "Semester"} ${term}`,
            subjectCount: termSubjects.length,
            subjects: termSubjects,
          });
          return acc;
        }, []);

      const courseSessionMappingId =
        courseSessionMappingMap.get(
          `${group.courseId}_${group.sessionId}`,
        ) || null;

      return {
        examinationSessionId: null,
        courseId: group.courseId,
        courseName: group.courseName,
        courseCode: group.courseCode,
        termType: group.termType,
        sessionId: group.sessionId,
        sessionName: group.sessionName,
        courseSessionMappingId,
        academicYearId: group.academicYearId,
        totalSubjects,
        terms,
      };
    })
    .filter((group) => group.terms.length > 0);
}

export async function getMappedSubjectsBySessionAndTermNeed(params, options = {}) {
  return getMappedSubjectsBySessionAndTerm(
    { ...params, isExamScheduled: true },
    options,
  );
}

export async function getMappedSubjectsBySessionAndTerm(
  {
    examinationSessionId,
    selections,
    isExamScheduled,
    teacherAssignmentStatus,
    isModerationActive,
    filterStatus,
    date,
  },
  options = {},
) {
  const parsedExaminationSessionId = Number(examinationSessionId);
  const skipTeacherAndPaper = options.skipTeacherAndPaperEnrichment === true;
  const needsSchedulingOnly =
    filterStatus === EXAM_SCHEDULE_FILTER_STATUS.NEEDS_SCHEDULING;

  let filterCombinations = [];
  let filterCourseIds = [];
  let filterSessionIds = [];

  if (selections && selections.length > 0) {
    const mappingIds = [];
    for (const sel of selections) {
      mappingIds.push(sel.courseSessionMappingId);
    }
    const dbMappings =
      await examinationSessionRepository.findSessionCourseMappingsByIds(
        mappingIds,
        options,
      );
    const dbMappingsMap = new Map();
    for (const mapping of dbMappings) {
      dbMappingsMap.set(mapping.sessionCourseMappingId, mapping);
    }

    for (const sel of selections) {
      const mapping = dbMappingsMap.get(sel.courseSessionMappingId);
      if (!mapping) continue;
      filterCombinations.push({
        courseId: mapping.courseId,
        sessionId: mapping.sessionId,
        terms: sel.terms || [],
      });
      filterCourseIds.push(mapping.courseId);
      filterSessionIds.push(mapping.sessionId);
    }
  }

  const examinationSession =
    await examinationSessionRepository.findExaminationSessionAssessmentTypeById(
      parsedExaminationSessionId,
      options,
    );
  if (!examinationSession) {
    const error = new Error("Examination session not found");
    error.statusCode = 404;
    throw error;
  }

  const hasPublishedOnlyFilter =
    isExamScheduled !== undefined ||
    teacherAssignmentStatus !== undefined ||
    isModerationActive !== undefined;

  if (hasPublishedOnlyFilter && examinationSession.status !== EXAMINATION_SESSION_STATUS.PUBLISHED) {
    throw createBadRequestError(
      "Exam planning filters are available only for a published examination session.",
    );
  }

  if (!examinationSession.assessmentTypeId && isExamScheduled !== true) return [];

  const sessionTermRows =
    await examinationSessionRepository.findExaminationSessionTerms(
      parsedExaminationSessionId,
      options,
    );

  let mappedSubjects = [];
  const subjectSessionMap = new Map();
  let activeAcademicYearId = null;

  // Question-paper / scheduled path: subjects come from exam_schedule (not curriculum ∩ plan).
  if (isExamScheduled === true) {
    const scheduleRows =
      await examinationSessionRepository.findSchedulesForSkuStats(
        parsedExaminationSessionId,
        options,
      );
    if (!scheduleRows.length) return [];

    const seenSubject = new Set();
    for (const schedule of scheduleRows) {
      const plain = toPlain(schedule);
      if (date && plain.examDate !== date) continue;

      const subject = plain.subjectSchedule;
      const courseId = subject ? Number(subject.courseId) : null;
      if (filterCourseIds.length > 0 && courseId != null) {
        let courseOk = false;
        for (const id of filterCourseIds) {
          if (Number(id) === courseId) {
            courseOk = true;
            break;
          }
        }
        if (!courseOk) continue;
      }
      if (filterSessionIds.length > 0) {
        let sessionOk = false;
        for (const id of filterSessionIds) {
          if (Number(id) === Number(plain.sessionId)) {
            sessionOk = true;
            break;
          }
        }
        if (!sessionOk) continue;
      }
      if (filterCombinations.length > 0) {
        let allowed = false;
        for (const comb of filterCombinations) {
          if (courseId != null && Number(comb.courseId) !== courseId) continue;
          if (Number(comb.sessionId) !== Number(plain.sessionId)) continue;
          for (const term of comb.terms) {
            if (Number(term) === Number(plain.term)) {
              allowed = true;
              break;
            }
          }
          if (allowed) break;
        }
        if (!allowed) continue;
      }

      if (seenSubject.has(plain.subjectId)) continue;
      seenSubject.add(plain.subjectId);

      subjectSessionMap.set(plain.subjectId, plain.sessionId);
      activeAcademicYearId = plain.academicYearId;
      mappedSubjects.push({
        subjectId: plain.subjectId,
        curriculumBatchTermMappingId:
          plain.curriculumBatchTermMappingId || null,
        subjectName: subject ? subject.subjectName : null,
        subjectCode: subject ? subject.subjectCode : null,
        subjectType: null,
        subjectCategory: null,
        courseId,
        term: plain.term,
        academicYearId: plain.academicYearId,
        course: null,
      });
    }

    if (!mappedSubjects.length) return [];

    // Enrich subject details + course termType
    const subjectIds = [];
    for (const sub of mappedSubjects) subjectIds.push(sub.subjectId);
    const subjectRows = await examinationSessionRepository.findSubjects(
      { subjectId: { [Op.in]: subjectIds }, isActive: true },
      options,
    );
    const subjectDetailMap = new Map();
    for (const row of subjectRows) {
      subjectDetailMap.set(row.subjectId, row);
    }
    for (const sub of mappedSubjects) {
      const detail = subjectDetailMap.get(sub.subjectId);
      if (!detail) continue;
      sub.subjectName = detail.subjectName;
      sub.subjectCode = detail.subjectCode;
      sub.subjectType = detail.subjectType;
      sub.subjectCategory = detail.subjectCategory;
      sub.courseId = detail.courseId;
      sub.course = detail.course
        ? { termType: detail.course.termType }
        : null;
    }
  } else {
    if (!sessionTermRows.length) return [];

    // examination_session_term defines course+session+term+academicYear.
    // Subjects = current batch's curriculum subjects for that term
    //   (curriculum_batch_term_mapping.year + .term)
    //   ∩ assessment_plan_subject_mapping for the same course+session.
    const sessionTermCourseIds = [];
    const sessionTermNumbers = [];
    const sessionTermSessionIds = [];
    const sessionTermMatchKeys = new Set();
    const sessionTermByCourseTerm = new Map();
    let sessionAcademicYearId = null;

    for (const row of sessionTermRows) {
      const courseId = row.courseId != null ? Number(row.courseId) : null;
      const term = Number(row.term);
      if (courseId == null || !decimalGreaterThan(term, 0)) continue;

      if (filterCourseIds.length > 0) {
        let courseOk = false;
        for (const id of filterCourseIds) {
          if (Number(id) === courseId) {
            courseOk = true;
            break;
          }
        }
        if (!courseOk) continue;
      }
      if (filterSessionIds.length > 0 && row.sessionId != null) {
        let sessionOk = false;
        for (const id of filterSessionIds) {
          if (Number(id) === Number(row.sessionId)) {
            sessionOk = true;
            break;
          }
        }
        if (!sessionOk) continue;
      }

      sessionTermCourseIds.push(courseId);
      sessionTermNumbers.push(term);
      if (row.sessionId != null) {
        sessionTermSessionIds.push(Number(row.sessionId));
      }
      sessionTermMatchKeys.add(`${courseId}_${term}`);
      sessionTermByCourseTerm.set(`${courseId}_${term}`, {
        sessionId: row.sessionId != null ? Number(row.sessionId) : null,
        academicYearId:
          row.academicYearId != null ? Number(row.academicYearId) : null,
      });
      if (sessionAcademicYearId == null && row.academicYearId != null) {
        sessionAcademicYearId = Number(row.academicYearId);
      }
    }

    if (!sessionTermCourseIds.length || !sessionTermNumbers.length) return [];

    const assessmentPlanIds = await getAssessmentPlanIds(
      Number(examinationSession.assessmentTypeId),
      options,
    );
    if (!assessmentPlanIds.length) return [];

    const mappingWhere = {
      assessmentPlanId: { [Op.in]: assessmentPlanIds },
      courseId: { [Op.in]: uniqueValues(sessionTermCourseIds) },
    };
    if (sessionTermSessionIds.length > 0) {
      mappingWhere.sessionId = { [Op.in]: uniqueValues(sessionTermSessionIds) };
    }
    if (filterCourseIds.length > 0) {
      mappingWhere.courseId = { [Op.in]: filterCourseIds };
    }
    if (filterSessionIds.length > 0) {
      mappingWhere.sessionId = { [Op.in]: filterSessionIds };
    }

    const subjectMappings =
      await examinationSessionRepository.findAssessmentPlanSubjectMappings(
        mappingWhere,
        options,
      );
    if (!subjectMappings.length) return [];

    const mappingKeySet = new Set();
    const planSubjectIds = [];
    for (const mapping of subjectMappings) {
      if (mapping.curriculumBatchTermMappingId == null) continue;
      mappingKeySet.add(
        `${Number(mapping.curriculumBatchTermMappingId)}_${Number(mapping.subjectId)}`,
      );
      planSubjectIds.push(mapping.subjectId);
      if (mapping.sessionId != null) {
        subjectSessionMap.set(Number(mapping.subjectId), Number(mapping.sessionId));
      }
    }

    const curriculumFilters = {
      courseIds: uniqueValues(sessionTermCourseIds),
      terms: uniqueValues(sessionTermNumbers),
      subjectIds: uniqueValues(planSubjectIds),
    };
    if (sessionAcademicYearId != null) {
      curriculumFilters.academicYearId = sessionAcademicYearId;
    }

    const curriculumResult = await findCurriculumSubjectsForActiveYear(
      curriculumFilters,
      options,
    );
    activeAcademicYearId = curriculumResult.academicYearId;
    const curriculumRows = curriculumResult.rows;
    if (!curriculumRows.length) return [];

    const seenMapped = new Set();
    for (const row of curriculumRows) {
      if (!sessionTermMatchKeys.has(`${row.courseId}_${row.term}`)) continue;
      if (row.curriculumBatchTermMappingId == null) continue;
      if (
        !mappingKeySet.has(
          `${Number(row.curriculumBatchTermMappingId)}_${Number(row.subjectId)}`,
        )
      ) {
        continue;
      }

      if (filterCombinations.length > 0) {
        let allowed = false;
        for (const comb of filterCombinations) {
          if (Number(comb.courseId) !== row.courseId) continue;
          for (const term of comb.terms) {
            if (Number(term) !== row.term) continue;
            allowed = true;
            break;
          }
          if (allowed) break;
        }
        if (!allowed) continue;
      }

      const dedupeKey = `${row.curriculumBatchTermMappingId}_${row.subjectId}`;
      if (seenMapped.has(dedupeKey)) continue;
      seenMapped.add(dedupeKey);

      const termMeta = sessionTermByCourseTerm.get(
        `${row.courseId}_${row.term}`,
      );
      const subjectSessionId =
        subjectSessionMap.get(row.subjectId) ??
        (termMeta ? termMeta.sessionId : null);
      if (subjectSessionId != null) {
        subjectSessionMap.set(row.subjectId, subjectSessionId);
      }

      mappedSubjects.push({
        subjectId: row.subjectId,
        curriculumBatchTermMappingId: Number(row.curriculumBatchTermMappingId),
        subjectName: row.subject.subjectName,
        subjectCode: row.subject.subjectCode,
        subjectType: row.subject.subjectType,
        subjectCategory: row.subject.subjectCategory,
        courseId: row.courseId,
        term: row.term,
        batch: row.batch,
        yearNumber: row.yearNumber,
        academicYearId:
          (termMeta && termMeta.academicYearId) ||
          activeAcademicYearId ||
          row.academicYearId,
        course: null,
      });
    }
    if (!mappedSubjects.length) return [];

    const courseIdsForTermType = uniqueValues(
      mappedSubjects.map((sub) => sub.courseId),
    );
    const coursesForTermType =
      await examinationSessionRepository.findCoursesByIds(
        courseIdsForTermType,
        options,
      );
    const courseTermTypeMap = new Map();
    for (const course of coursesForTermType) {
      courseTermTypeMap.set(course.courseId, course.termType);
    }
    for (const sub of mappedSubjects) {
      sub.course = { termType: courseTermTypeMap.get(sub.courseId) || null };
    }
  }

  const subjectIds = [];
  const courseSessionMapIds = [];
  const courseSessionMapSessionIds = [];
  for (const sub of mappedSubjects) {
    subjectIds.push(sub.subjectId);
    courseSessionMapIds.push(sub.courseId);
    const sid = subjectSessionMap.get(sub.subjectId);
    if (sid != null) courseSessionMapSessionIds.push(sid);
  }

  const [allSchedules, dbMappings] = await Promise.all([
    examinationSessionRepository.findExamSchedulesBySubjects(
      parsedExaminationSessionId,
      subjectIds,
      { ...options, date },
    ),
    examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
      uniqueValues(courseSessionMapIds),
      uniqueValues(courseSessionMapSessionIds),
      options,
    ),
  ]);

  const courseSessionMappingMap = new Map();
  for (const m of dbMappings) {
    const plain = m.get ? m.get({ plain: true }) : m;
    courseSessionMappingMap.set(`${plain.courseId}_${plain.sessionId}`, {
      sessionCourseMappingId: plain.sessionCourseMappingId,
      courseName: plain.courses ? plain.courses.courseName : null,
      sessionName: plain.session ? plain.session.sessionName : null,
    });
  }

  const scheduleBySubjectCbtm = new Map();
  const examScheduleIds = [];
  const studentGroups = [];

  function subjectCbtmKey(subjectId, curriculumBatchTermMappingId) {
    return `${Number(subjectId)}_${
      curriculumBatchTermMappingId != null
        ? Number(curriculumBatchTermMappingId)
        : 0
    }`;
  }

  for (const sched of allSchedules) {
    const plain = toPlain(sched);
    const key = subjectCbtmKey(
      plain.subjectId,
      plain.curriculumBatchTermMappingId,
    );
    if (scheduleBySubjectCbtm.has(key)) continue;
    scheduleBySubjectCbtm.set(key, plain);
    examScheduleIds.push(plain.examScheduleId);
  }

  for (const subject of mappedSubjects) {
    const key = subjectCbtmKey(
      subject.subjectId,
      subject.curriculumBatchTermMappingId,
    );
    const plainSched = scheduleBySubjectCbtm.get(key);
    if (plainSched) {
      const group = buildStudentGroupFromSchedule(plainSched);
      if (group) studentGroups.push(group);
      continue;
    }

    const subjectSessionId = subjectSessionMap.get(subject.subjectId);
    if (
      subjectSessionId == null ||
      subject.courseId == null ||
      subject.term == null ||
      subject.academicYearId == null
    ) {
      continue;
    }

    studentGroups.push({
      sessionId: Number(subjectSessionId),
      courseId: Number(subject.courseId),
      academicYearId: Number(subject.academicYearId),
      term: Number(subject.term),
      batchYear: subject.batch != null ? Number(subject.batch) : null,
      yearNumber:
        subject.yearNumber != null ? Number(subject.yearNumber) : null,
      curriculumBatchTermMappingId:
        subject.curriculumBatchTermMappingId != null
          ? Number(subject.curriculumBatchTermMappingId)
          : null,
    });
  }

  if (needsSchedulingOnly) {
    const countMap = studentGroups.length
      ? await getStudentCountMapByGroups(studentGroups, options)
      : new Map();
    const result = [];
    for (const subject of mappedSubjects) {
      const key = subjectCbtmKey(
        subject.subjectId,
        subject.curriculumBatchTermMappingId,
      );
      if (scheduleBySubjectCbtm.has(key)) continue;

      const subjectSessionId = subjectSessionMap.get(subject.subjectId) || null;
      const mappingInfo = subjectSessionId
        ? courseSessionMappingMap.get(`${subject.courseId}_${subjectSessionId}`)
        : null;

      const studentCount = lookupStudentCount(countMap, {
        sessionId: subjectSessionId,
        courseId: subject.courseId,
        academicYearId: subject.academicYearId,
        term: subject.term,
        batchYear: subject.batch,
        yearNumber: subject.yearNumber,
        curriculumBatchTermMappingId: subject.curriculumBatchTermMappingId,
      });

      result.push({
        subjectId: subject.subjectId,
        curriculumBatchTermMappingId:
          subject.curriculumBatchTermMappingId || null,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        term: subject.term,
        termType: subject.course ? subject.course.termType : null,
        courseId: subject.courseId,
        academicYearId: subject.academicYearId || null,
        courseName: mappingInfo ? mappingInfo.courseName : null,
        sessionId: subjectSessionId,
        sessionName: mappingInfo ? mappingInfo.sessionName : null,
        courseSessionMappingId: mappingInfo
          ? mappingInfo.sessionCourseMappingId
          : null,
        studentCount,
        isExamScheduled: false,
        examScheduleId: null,
        needsScheduling: true,
        roomPending: false,
        needsRoom: false,
        ready: false,
        published: false,
        deadline: null,
        examDetails: null,
        teacherAssignment: [],
      });
    }
    return result;
  }

  const roomCapacityByScheduleId = new Map();
  const teacherAssignmentByScheduleId = new Map();
  const questionPapersByScheduleId = new Map();
  let studentCountMap = new Map();

  const enrichmentPromises = [
    studentGroups.length
      ? getStudentCountMapByGroups(studentGroups, options)
      : Promise.resolve(new Map()),
  ];

  if (examScheduleIds.length > 0) {
    enrichmentPromises.push(
      examinationSessionRepository.findRoomCapacitiesByExamSchedules(
        examScheduleIds,
        options,
      ),
    );

    if (!skipTeacherAndPaper) {
      enrichmentPromises.push(
        examinationSessionRepository.findTeacherAssignmentsByExamSchedules(
          examScheduleIds,
          options,
        ),
        examinationSessionRepository.findQuestionPapersByExamSchedules(
          examScheduleIds,
          options,
        ),
      );
    }
  }

  const enrichmentResults = await Promise.all(enrichmentPromises);
  studentCountMap = enrichmentResults[0];

  if (examScheduleIds.length > 0) {
    const roomCapacities = enrichmentResults[1];
    const teacherAssignments = skipTeacherAndPaper
      ? []
      : enrichmentResults[2] || [];
    const questionPapers = skipTeacherAndPaper
      ? []
      : enrichmentResults[3] || [];

    const capacityMap = capacityMapFromRows(roomCapacities);
    for (const [scheduleId, capacity] of capacityMap) {
      roomCapacityByScheduleId.set(scheduleId, capacity);
    }

    for (const qp of questionPapers) {
      const list = questionPapersByScheduleId.get(qp.examScheduleId) || [];
      list.push(qp);
      questionPapersByScheduleId.set(qp.examScheduleId, list);
    }

    for (const ta of teacherAssignments) {
      const list = teacherAssignmentByScheduleId.get(ta.examScheduleId) || [];
      list.push({
        teacherExamAssignmentId: ta.teacherExamAssignmentId,
        userId:
          ta.userId ||
          (ta.teacherEmployee ? ta.teacherEmployee.userId : null),
        assignedAt: ta.createdAt,
        deadline: ta.deadline,
        user:
          ta.teacherEmployee && ta.teacherEmployee.user
            ? {
                userId: ta.teacherEmployee.user.userId,
                userName: ta.teacherEmployee.user.userName,
                email: ta.teacherEmployee.user.email,
                phone: ta.teacherEmployee.user.phone,
                employeeCode: ta.teacherEmployee.employeeCode,
              }
            : null,
      });
      teacherAssignmentByScheduleId.set(ta.examScheduleId, list);
    }
  }

  const finalResponse = [];

  for (const subject of mappedSubjects) {
    const subjectKey = subjectCbtmKey(
      subject.subjectId,
      subject.curriculumBatchTermMappingId,
    );
    const hasSchedule = scheduleBySubjectCbtm.has(subjectKey);

    if (isExamScheduled === true && !hasSchedule) continue;
    if (isExamScheduled === false && hasSchedule) continue;

    let schedInfo = null;
    const subjectSessionId = subjectSessionMap.get(subject.subjectId) || null;
    const subjectGroup = {
      sessionId: subjectSessionId,
      courseId: subject.courseId,
      academicYearId: subject.academicYearId,
      term: subject.term,
      batchYear: subject.batch,
      yearNumber: subject.yearNumber,
      curriculumBatchTermMappingId: subject.curriculumBatchTermMappingId,
    };

    if (hasSchedule) {
      const plainSched = scheduleBySubjectCbtm.get(subjectKey);
      let teacherAssignment =
        teacherAssignmentByScheduleId.get(plainSched.examScheduleId) || [];

      const roomCapacity =
        roomCapacityByScheduleId.get(Number(plainSched.examScheduleId)) || 0;
      const studentCount = lookupStudentCount(
        studentCountMap,
        buildStudentGroupFromSchedule(plainSched),
      );
      const roomFlags = deriveScheduleRoomFlags({
        roomCapacity,
        studentCount,
        published: plainSched.published || false,
        hasSchedule: true,
      });

      let moderationActive = false;
      let isApproved = false;
      const questionPapers =
        questionPapersByScheduleId.get(plainSched.examScheduleId) || [];

      if (!skipTeacherAndPaper && teacherAssignment.length > 0) {
        const enrichedTeachers = [];
        for (const ta of teacherAssignment) {
          let matchingQP = null;
          for (const qp of questionPapers) {
            if (qp.createdBy === ta.userId) {
              matchingQP = qp;
              break;
            }
          }
          if (matchingQP) {
            moderationActive = true;
            if (matchingQP.status === QUESTION_STATUS.APPROVED) {
              isApproved = true;
            }
            const qpPayload = {
              id: matchingQP.id,
              status: matchingQP.status,
              finalApproval: matchingQP.finalApproval,
              createdBy: matchingQP.createdBy,
              createdAt: matchingQP.createdAt,
              updatedAt: matchingQP.updatedAt,
            };
            if (matchingQP.status === "Approved") {
              qpPayload.updatedBy = matchingQP.updatedBy ?? null;
              qpPayload.updatedByName = matchingQP.updater
                ? matchingQP.updater.userName
                : matchingQP["updater.userName"] ?? null;
            }
            enrichedTeachers.push({ ...ta, questionPaper: qpPayload });
          } else {
            enrichedTeachers.push({ ...ta, questionPaper: null });
          }
        }
        teacherAssignment = enrichedTeachers;
      }

      schedInfo = {
        examScheduleId: plainSched.examScheduleId,
        curriculumBatchTermMappingId:
          plainSched.curriculumBatchTermMappingId || null,
        examDate: plainSched.examDate,
        examTime: plainSched.examTime,
        duration: plainSched.duration,
        maximumMarks: plainSched.maximumMarks || null,
        type: plainSched.type,
        examinationSessionSlotId: plainSched.examinationSessionSlotId,
        examinationSessionSlot: plainSched.examinationSessionSlot || null,
        roomCapacity: roomFlags.roomCapacity,
        studentCount,
        needsRoom: roomFlags.roomCapacity < studentCount,
        confirmed: roomFlags.confirmed,
        published: plainSched.published || false,
        teacherAssignment,
        isModerationActive: moderationActive,
        isApproved,
      };
    }

    const roomCapacity = hasSchedule && schedInfo ? schedInfo.roomCapacity : 0;
    const studentCount = hasSchedule && schedInfo
      ? schedInfo.studentCount
      : lookupStudentCount(studentCountMap, subjectGroup);
    const published = schedInfo ? schedInfo.published : false;
    const flags = deriveScheduleRoomFlags({
      roomCapacity,
      studentCount,
      published,
      hasSchedule,
    });

    const needsScheduling = !hasSchedule;
    const roomPending = flags.roomPending;
    const needsRoom = flags.needsRoom;
    // ready = scheduled + enough room capacity + not yet published (publishable only)
    const ready = flags.ready;

    const mappingInfo = subjectSessionId
      ? courseSessionMappingMap.get(`${subject.courseId}_${subjectSessionId}`)
      : null;

    let isNotAssigned = false;
    let isAssigned = false;
    let isModerationActiveStatus = false;
    let isFullyApproved = false;
    let deadline = null;

    if (hasSchedule) {
      const qpList =
        questionPapersByScheduleId.get(schedInfo.examScheduleId) || [];
      const teacherList = schedInfo.teacherAssignment || [];

      let nearestDeadline = null;
      for (const t of teacherList) {
        if (t.deadline == null) continue;
        const d = new Date(t.deadline);
        if (nearestDeadline == null || d < nearestDeadline) {
          nearestDeadline = d;
        }
      }
      deadline = nearestDeadline;

      // Paper workflow:
      // - approved: finalApproval = Approved
      // - moderationActive: paper exists but not finally approved (Pending / awaiting final)
      // - assigned: teachers assigned, no paper yet
      // - notAssigned: no teachers
      let hasFullyApprovedPaper = false;
      let hasModerationActivePaper = false;
      for (const qp of qpList) {
        if (qp.finalApproval === QUESTION_STATUS.APPROVED) {
          hasFullyApprovedPaper = true;
        } else {
          hasModerationActivePaper = true;
        }
      }

      if (hasFullyApprovedPaper) {
        isFullyApproved = true;
      } else if (teacherList.length === 0) {
        isNotAssigned = true;
      } else if (hasModerationActivePaper) {
        isModerationActiveStatus = true;
      } else {
        isAssigned = true;
      }
    }

    // Room filters use boolean flags; paper filters use assignment/paper state.
    // They are independent so a room-ready subject stays ready even if teachers are assigned.
    if (filterStatus && filterStatus !== EXAM_SCHEDULE_FILTER_STATUS.ALL) {
      let matchesFilter = false;
      if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.NEEDS_SCHEDULING) {
        matchesFilter = needsScheduling;
      } else if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.ROOM_PENDING) {
        matchesFilter = roomPending;
      } else if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.READY) {
        matchesFilter = ready;
      } else if (filterStatus === EXAM_SCHEDULE_FILTER_STATUS.PUBLISHED) {
        matchesFilter = published;
      } else if (filterStatus === "approved") {
        matchesFilter = isFullyApproved;
      } else if (filterStatus === "notAssigned") {
        matchesFilter = isNotAssigned;
      } else if (filterStatus === "moderationActive") {
        matchesFilter = isModerationActiveStatus;
      } else if (filterStatus === "assigned") {
        matchesFilter = isAssigned;
      }
      if (!matchesFilter) continue;
    }

    finalResponse.push({
      subjectId: subject.subjectId,
      curriculumBatchTermMappingId: hasSchedule
        ? schedInfo?.curriculumBatchTermMappingId ||
          subject.curriculumBatchTermMappingId ||
          null
        : subject.curriculumBatchTermMappingId || null,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      term: subject.term,
      termType: subject.course ? subject.course.termType : null,
      courseId: subject.courseId,
      courseName: mappingInfo ? mappingInfo.courseName : null,
      sessionId: subjectSessionId,
      sessionName: mappingInfo ? mappingInfo.sessionName : null,
      courseSessionMappingId: mappingInfo
        ? mappingInfo.sessionCourseMappingId
        : null,
      studentCount,
      isExamScheduled: hasSchedule,
      examScheduleId: schedInfo ? schedInfo.examScheduleId : null,
      needsScheduling,
      roomPending,
      needsRoom,
      ready,
      published,
      deadline: deadline ? deadline.toISOString() : null,
      examDetails: hasSchedule
        ? {
            curriculumBatchTermMappingId:
              schedInfo.curriculumBatchTermMappingId || null,
            examDate: schedInfo.examDate,
            examTime: schedInfo.examTime,
            duration: schedInfo.duration,
            maximumMarks: schedInfo.maximumMarks,
            type: schedInfo.type,
            examinationSessionSlot: schedInfo.examinationSessionSlot,
            questionPapers:
              questionPapersByScheduleId.get(schedInfo.examScheduleId) || [],
          }
        : null,
      teacherAssignment: hasSchedule ? schedInfo.teacherAssignment : [],
    });
  }

  return finalResponse;
}


export async function getQuestionPaperSummary(
  examinationSessionId,
  options = {},
) {
  const parsedSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedSessionId)) {
    throw new Error("Invalid examinationSessionId");
  }

  const examinationSession =
    await examinationSessionRepository.findExaminationSessionAssessmentTypeById(
      parsedSessionId,
      options,
    );
  if (!examinationSession) {
    const error = new Error("Examination session not found");
    error.statusCode = 404;
    throw error;
  }

  let totalCourses = 0;
  if (examinationSession.assessmentTypeId) {
    const assessmentPlanIds = await getAssessmentPlanIds(
      Number(examinationSession.assessmentTypeId),
      options,
    );
    if (assessmentPlanIds.length > 0) {
      const subjectMappings =
        await examinationSessionRepository.findAssessmentPlanSubjectMappings(
          { assessmentPlanId: { [Op.in]: assessmentPlanIds } },
          options,
        );
      const uniqueSubjectIds = [
        ...new Set(subjectMappings.map((m) => m.subjectId)),
      ];
      totalCourses = uniqueSubjectIds.length;
    }
  }

  const schedules = await scoped(model.examScheduleModel).findAll({
    where: { examinationSessionId: parsedSessionId },
    attributes: ["examScheduleId", "subjectId"],
    transaction: options.transaction,
  });
  const totalExamSchedule = schedules.length;

  if (totalExamSchedule === 0) {
    return {
      totalCourses,
      totalExamSchedule: 0,
      notAssigned: 0,
      awaitingSubmission: 0,
      withModerator: 0,
      changesRequested: 0,
      approved: 0,
      readyForEncryption: 0,
      readyToPrint: 0,
      totalPapers: 0,
    };
  }

  const examScheduleIds = schedules.map((s) => s.examScheduleId);

  const [teacherAssignments, questionPapers] = await Promise.all([
    scoped(model.teacherExamAssignmentModel).findAll({
      where: { examScheduleId: { [Op.in]: examScheduleIds } },
      attributes: ["examScheduleId", "employeeId"],
      transaction: options.transaction,
    }),
    scoped(model.questionPaperModel).findAll({
      where: { examScheduleId: { [Op.in]: examScheduleIds } },
      attributes: ["examScheduleId", "status", "finalApproval"],
      transaction: options.transaction,
    }),
  ]);

  const assignedScheduleIds = new Set(
    teacherAssignments.map((ta) => ta.examScheduleId),
  );
  const questionPapersByScheduleId = new Map();
  for (const qp of questionPapers) {
    if (!questionPapersByScheduleId.has(qp.examScheduleId)) {
      questionPapersByScheduleId.set(qp.examScheduleId, []);
    }
    questionPapersByScheduleId.get(qp.examScheduleId).push(qp);
  }

  let notAssigned = 0;
  let awaitingSubmission = 0;
  let withModerator = 0;
  let changesRequested = 0;
  let approved = 0;
  let readyForEncryption = 0;
  let readyToPrint = 0;

  for (const schedule of schedules) {
    const sId = schedule.examScheduleId;
    const hasTeacher = assignedScheduleIds.has(sId);
    const papers = questionPapersByScheduleId.get(sId) || [];

    if (!hasTeacher) {
      notAssigned++;
      continue;
    }

    if (papers.length === 0) {
      awaitingSubmission++;
      continue;
    }

    const isFinalApproved = papers.some(
      (p) => p.finalApproval === QUESTION_STATUS.APPROVED,
    );
    const isRejected = papers.some(
      (p) =>
        p.finalApproval === QUESTION_STATUS.REJECTED ||
        p.status === QUESTION_STATUS.REJECTED,
    );
    const isWithModerator = papers.some(
      (p) => p.finalApproval !== QUESTION_STATUS.APPROVED,
    );

    if (isFinalApproved) {
      approved++;
      readyForEncryption++;
      readyToPrint++;
    } else if (isRejected) {
      changesRequested++;
    } else if (isWithModerator) {
      withModerator++;
    }
  }

  return {
    totalCourses,
    totalExamSchedule,
    notAssigned,
    awaitingSubmission,
    withModerator,
    changesRequested,
    approved,
    readyForEncryption,
    readyToPrint,
    totalPapers: questionPapers.length,
  };
}

export async function publishExaminationSession(examinationSessionId, userId, options = {}) {
  return withAuditEvent(AUDIT_EVENTS.EXAMINATION_SESSION_PUBLISH, async ({ transaction }) => {
    const session = await examinationSessionRepository.getExaminationSessionById(examinationSessionId, { ...options, transaction });
    if (!session) {
      throw new Error("Examination session not found");
    }

    // Only subjects with ready=true (scheduled + room capacity OK + not yet published) are publishable.
    const mappedSubjects = await getMappedSubjectsBySessionAndTerm(
      { examinationSessionId, filterStatus: EXAM_SCHEDULE_FILTER_STATUS.READY },
      { ...options, transaction, skipTeacherAndPaperEnrichment: true },
    );

    const readyExamScheduleIds = [];
    for (const sub of mappedSubjects) {
      if (sub.examScheduleId !== null) {
        readyExamScheduleIds.push(sub.examScheduleId);
      }
    }

    if (readyExamScheduleIds.length === 0) {
      const error = new Error(
        "No ready subjects to publish. Subjects need a schedule and enough room capacity before they can be published.",
      );
      error.statusCode = 400;
      throw error;
    }

    await examinationSessionRepository.updateExaminationSession(
      examinationSessionId,
      { status: "Published", updatedBy: userId },
      { ...options, transaction, individualHooks: true },
    );

    await examinationSessionRepository.publishExamSchedulesByIds(
      readyExamScheduleIds,
      userId,
      { ...options, transaction },
    );

    return {
      message: "Examination session published successfully",
      publishedSchedulesCount: readyExamScheduleIds.length,
    };
  });
}

export async function getSessionSkuStats(examinationSessionId, options = {}) {
  const parsedSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedSessionId)) {
    throw createBadRequestError("Invalid examinationSessionId");
  }

  const schedules = await examinationSessionRepository.findSchedulesForSkuStats(
    parsedSessionId,
    options,
  );

  let scheduledSubjectsCount = 0;
  const examScheduleIds = [];
  for (const schedule of schedules) {
    examScheduleIds.push(schedule.examScheduleId);
    if (schedule.published === true || schedule.published === 1) {
      scheduledSubjectsCount = toIntegerNumber(
        decimalAdd(scheduledSubjectsCount, 1),
      );
    }
  }
  const totalSubjectsCount = toIntegerNumber(schedules.length);
  const totalExamSchedule = totalSubjectsCount;

  let totalQuestionPapers = 0;
  let approvedQuestionPapers = 0;
  if (examScheduleIds.length > 0) {
    const qpCounts =
      await examinationSessionRepository.findQuestionPapersCountForSchedules(
        examScheduleIds,
        options,
      );
    totalQuestionPapers = qpCounts.total;
    approvedQuestionPapers = qpCounts.approved;
  }

  const [hallTicketsCount, answerSheetScan] = await Promise.all([
    examinationSessionRepository.countHallTicketsBySession(
      parsedSessionId,
      options,
    ),
    examinationSessionRepository.countAnswerSheetScanStatsBySession(
      parsedSessionId,
      options,
    ),
  ]);

  let totalBundles = 0;
  let receivedBundles = 0;

  if (schedules.length > 0) {
    const uniqueDates = [];
    const uniqueSlotIds = [];
    const dateSeen = new Set();
    const slotSeen = new Set();
    for (const schedule of schedules) {
      if (schedule.examDate && !dateSeen.has(schedule.examDate)) {
        dateSeen.add(schedule.examDate);
        uniqueDates.push(schedule.examDate);
      }
      if (
        schedule.examinationSessionSlotId &&
        !slotSeen.has(schedule.examinationSessionSlotId)
      ) {
        slotSeen.add(schedule.examinationSessionSlotId);
        uniqueSlotIds.push(schedule.examinationSessionSlotId);
      }
    }

    if (uniqueDates.length > 0 && uniqueSlotIds.length > 0) {
      const bundleCounts =
        await examinationSessionRepository.countBundlesByDatesAndSlots(
          uniqueDates,
          uniqueSlotIds,
          options,
        );
      totalBundles = bundleCounts.total;
      receivedBundles = bundleCounts.received;
    }
  }

  return {
    subjects: {
      total: totalSubjectsCount,
      scheduled: scheduledSubjectsCount,
    },
    questionPapers: {
      total: totalQuestionPapers,
      approved: approvedQuestionPapers,
    },
    hallTickets: {
      total: hallTicketsCount,
      totalExamSchedules: totalExamSchedule,
    },
    bundles: {
      total: totalBundles,
      received: receivedBundles,
    },
    scanned: {
      total: answerSheetScan.total,
      scanned: answerSheetScan.scanned,
    },
    submit: {
      total: answerSheetScan.total,
      submit: answerSheetScan.submit,
    },
  };
}


export async function getExaminationSessionAnswerSheets(examinationSessionId) {
  if (!examinationSessionId) {
    throw createBadRequestError("examinationSessionId is required");
  }
  const session = await examinationSessionRepository.getExaminationSessionById(examinationSessionId);
  if (!session) {
    const error = new Error(`Examination session with ID ${examinationSessionId} not found`);
    error.statusCode = 404;
    throw error;
  }
  const records = await examSessionAnswerSheetRepository.findByExaminationSession(examinationSessionId);

  const result = await Promise.all(
    records.map(async (record) => {
      const plain = toPlain(record);
      let downloadUrl = null;
      if (plain.s3File?.s3Key) {
        try {
          downloadUrl = await s3Helper.getDownloadSignedUrl(plain.s3File.s3Key);
        } catch (err) {
          console.error("Error generating signed download URL for file:", err);
        }
      }
      return {
        ...plain,
        s3File: plain.s3File
          ? {
              ...plain.s3File,
              downloadUrl,
            }
          : null,
      };
    })
  );

  return result;
}

function percentOf(part, total) {
  if (!total) {
    return 0;
  }
  return decimalMultiply(decimalDivide(part, total), 100);
}

function stageStatus(percentage) {
  if (percentage >= 100) {
    return "Completed";
  }
  if (percentage <= 0) {
    return "Not Started";
  }
  return "In Progress";
}

function averagePercentages(percentages) {
  if (!percentages.length) {
    return 0;
  }
  let sum = 0;
  for (const value of percentages) {
    sum = decimalAdd(sum, value);
  }
  return percentOf(sum, percentages.length * 100);
}

export async function getExaminationTimeline(examinationSessionId) {
  const parsedSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedSessionId)) {
    throw createBadRequestError("Invalid examinationSessionId");
  }

  const session =
    await examinationSessionRepository.getExaminationSessionById(
      parsedSessionId,
    );
  if (!session) {
    const error = new Error(
      `Examination session with ID ${parsedSessionId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const schedules =
    await examinationSessionRepository.findExamSchedulesForTimeline(
      parsedSessionId,
    );

  const examScheduleIds = [];
  for (const schedule of schedules) {
    examScheduleIds.push(schedule.examScheduleId);
  }

  const seatCountBySchedule =
    await examinationSessionRepository.countSeatsByExamScheduleIds(
      examScheduleIds,
    );

  const data = [];
  for (const schedule of schedules) {
    const plain = toPlain(schedule);
    const rooms = plain.roomCapacities || [];
    const roomNumbers = [];
    for (const room of rooms) {
      if (room.classRoom && room.classRoom.roomNumber) {
        roomNumbers.push(room.classRoom.roomNumber);
      }
    }

    const studentCount =
      seatCountBySchedule.get(Number(plain.examScheduleId)) || 0;

    data.push({
      examScheduleId: plain.examScheduleId,
      examDate: plain.examDate,
      examTime: plain.examTime,
      duration: plain.duration,
      type: plain.type,
      maximumMarks: plain.maximumMarks,
      term: plain.term,
      sessionId: plain.sessionId,
      subjectId: plain.subjectId,
      academicYearId: plain.academicYearId,
      examinationSessionSlotId: plain.examinationSessionSlotId,
      published: plain.published,
      subject: plain.subjectSchedule || null,
      slot: plain.examinationSessionSlot || null,
      rooms: roomNumbers,
      capacity: studentCount,
    });
  }

  return {
    examinationSessionId: parsedSessionId,
    total: data.length,
    data,
  };
}

export async function getPlanningOverview(examinationSessionId) {
  const parsedSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedSessionId)) {
    throw createBadRequestError("Invalid examinationSessionId");
  }

  const session =
    await examinationSessionRepository.getExaminationSessionById(
      parsedSessionId,
    );
  if (!session) {
    const error = new Error(
      `Examination session with ID ${parsedSessionId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const schedules =
    await examinationSessionRepository.findSchedulesForSkuStats(
      parsedSessionId,
    );

  const examScheduleIds = [];
  for (const schedule of schedules) {
    examScheduleIds.push(toPlain(schedule).examScheduleId);
  }

  const [roomOpsMap, hallTicketMap, answerSheetMap] = await Promise.all([
    examinationSessionRepository.countRoomBundleReadyByExamScheduleIds(
      examScheduleIds,
    ),
    examinationSessionRepository.countHallTicketCoverageByExamScheduleIds(
      parsedSessionId,
      examScheduleIds,
    ),
    examinationSessionRepository.countAnswerSheetStatsByExamScheduleIds(
      examScheduleIds,
    ),
  ]);

  const examPercentages = [];
  const stepTotals = {
    roomsAssigned: [],
    invigilators: [],
    bundles: [],
    hallTickets: [],
    answerSheets: [],
    results: [],
  };

  for (const schedule of schedules) {
    const plain = toPlain(schedule);
    const scheduleId = Number(plain.examScheduleId);
    const roomOps = roomOpsMap.get(scheduleId) || {
      rooms: 0,
      bundlesReady: 0,
      invigilatorsAssigned: 0,
    };
    const hallTickets = hallTicketMap.get(scheduleId) || {
      students: 0,
      generated: 0,
      resultsPublished: 0,
    };
    const sheets = answerSheetMap.get(scheduleId) || {
      students: 0,
      scanned: 0,
      marked: 0,
    };

    const students =
      hallTickets.students > 0 ? hallTickets.students : sheets.students;

    const roomsPct = roomOps.rooms > 0 ? 100 : 0;
    const invigilatorsPct = percentOf(
      roomOps.invigilatorsAssigned,
      roomOps.rooms,
    );
    const bundlesPct = percentOf(roomOps.bundlesReady, roomOps.rooms);
    const hallTicketsPct = percentOf(hallTickets.generated, students);
    const scannedPct = percentOf(sheets.scanned, students || sheets.students);
    const markedPct = percentOf(sheets.marked, students || sheets.students);
    const answerSheetsPct =
      (students || sheets.students) > 0
        ? percentOf(scannedPct + markedPct, 200)
        : 0;
    const resultsPct = percentOf(hallTickets.resultsPublished, students);

    const percentage = averagePercentages([
      roomsPct,
      invigilatorsPct,
      bundlesPct,
      hallTicketsPct,
      answerSheetsPct,
      resultsPct,
    ]);

    stepTotals.roomsAssigned.push(roomsPct);
    stepTotals.invigilators.push(invigilatorsPct);
    stepTotals.bundles.push(bundlesPct);
    stepTotals.hallTickets.push(hallTicketsPct);
    stepTotals.answerSheets.push(answerSheetsPct);
    stepTotals.results.push(resultsPct);
    examPercentages.push(percentage);
  }

  const publishedExams = schedules.filter(
    (s) => Boolean(toPlain(s).published) || toPlain(s).published === 1,
  ).length;
  const publishedPercentage = percentOf(publishedExams, schedules.length);
  const overallPercentage = averagePercentages(examPercentages);

  return {
    examinationSessionId: parsedSessionId,
    sessionName: session.sessionName,
    status: session.status,
    publishedAt: session.publishedAt,
    percentage: publishedPercentage,
    statusLabel: stageStatus(publishedPercentage),
    overallProgressPercentage: overallPercentage,
    totalExams: schedules.length,
    publishedExams,
    publishedPercentage,
    stages: {
      roomsAssigned: {
        percentage: averagePercentages(stepTotals.roomsAssigned),
        status: stageStatus(averagePercentages(stepTotals.roomsAssigned)),
      },
      invigilators: {
        percentage: averagePercentages(stepTotals.invigilators),
        status: stageStatus(averagePercentages(stepTotals.invigilators)),
      },
      bundles: {
        percentage: averagePercentages(stepTotals.bundles),
        status: stageStatus(averagePercentages(stepTotals.bundles)),
      },
      hallTickets: {
        percentage: averagePercentages(stepTotals.hallTickets),
        status: stageStatus(averagePercentages(stepTotals.hallTickets)),
      },
      answerSheets: {
        percentage: averagePercentages(stepTotals.answerSheets),
        status: stageStatus(averagePercentages(stepTotals.answerSheets)),
      },
      results: {
        percentage: averagePercentages(stepTotals.results),
        status: stageStatus(averagePercentages(stepTotals.results)),
      },
    },
  };
}

export async function getProgressMetrics(examinationSessionId) {
  const parsedSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedSessionId)) {
    throw createBadRequestError("Invalid examinationSessionId");
  }

  const session =
    await examinationSessionRepository.getExaminationSessionById(
      parsedSessionId,
    );
  if (!session) {
    const error = new Error(
      `Examination session with ID ${parsedSessionId} not found`,
    );
    error.statusCode = 404;
    throw error;
  }

  const schedules =
    await examinationSessionRepository.findSchedulesForSkuStats(
      parsedSessionId,
    );

  const examScheduleIds = [];
  for (const schedule of schedules) {
    examScheduleIds.push(schedule.examScheduleId);
  }

  const [roomBundleMap, answerSheetBySchedule, hallTicketBySchedule] =
    await Promise.all([
      examinationSessionRepository.countRoomBundleReadyByExamScheduleIds(
        examScheduleIds,
      ),
      examinationSessionRepository.countAnswerSheetStatsByExamScheduleIds(
        examScheduleIds,
      ),
      examinationSessionRepository.countHallTicketCoverageByExamScheduleIds(
        parsedSessionId,
        examScheduleIds,
      ),
    ]);

  let totalRooms = 0;
  let totalBundlesReady = 0;
  let totalSeatStudents = 0;
  let totalHallTicketsGenerated = 0;
  let totalStudents = 0;
  let totalScanned = 0;
  let totalMarked = 0;

  for (const schedule of schedules) {
    const roomStats = roomBundleMap.get(Number(schedule.examScheduleId)) || {
      rooms: 0,
      bundlesReady: 0,
    };
    const sheetStats = answerSheetBySchedule.get(
      Number(schedule.examScheduleId),
    ) || {
      students: 0,
      scanned: 0,
      marked: 0,
    };
    const hallTicketStats = hallTicketBySchedule.get(
      Number(schedule.examScheduleId),
    ) || {
      students: 0,
      generated: 0,
    };

    totalRooms += roomStats.rooms;
    totalBundlesReady += roomStats.bundlesReady;
    totalSeatStudents += hallTicketStats.students;
    totalHallTicketsGenerated += hallTicketStats.generated;
    totalStudents += sheetStats.students;
    totalScanned += sheetStats.scanned;
    totalMarked += sheetStats.marked;
  }

  const sessionBundlePct = percentOf(totalBundlesReady, totalRooms);
  const sessionHallTicketPct = percentOf(
    totalHallTicketsGenerated,
    totalSeatStudents,
  );
  const sessionOperationsPercentage =
    totalRooms > 0 && totalSeatStudents > 0
      ? percentOf(sessionBundlePct + sessionHallTicketPct, 200)
      : totalRooms > 0
        ? sessionBundlePct
        : sessionHallTicketPct;

  return {
    examinationSessionId: parsedSessionId,
    operations: {
      percentage: sessionOperationsPercentage,
      rooms: totalRooms,
      bundlesReady: totalBundlesReady,
      hallTickets: {
        percentage: sessionHallTicketPct,
        generated: totalHallTicketsGenerated,
        students: totalSeatStudents,
      },
    },
    digitization: {
      percentage: percentOf(totalScanned, totalStudents),
      students: totalStudents,
      scanned: totalScanned,
      marked: totalMarked,
    },
  };
}

function localDateOnlyString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Examination sessions dashboard overview.
 * Optional examinationSessionId scopes metrics to one session.
 */
export async function getExaminationSessionOverview(examinationSessionId) {
  const parsedSessionId =
    examinationSessionId != null && examinationSessionId !== ""
      ? Number(examinationSessionId)
      : null;

  if (parsedSessionId != null && Number.isNaN(parsedSessionId)) {
    throw createBadRequestError("Invalid examinationSessionId");
  }

  if (parsedSessionId != null) {
    const session =
      await examinationSessionRepository.getExaminationSessionById(
        parsedSessionId,
      );
    if (!session) {
      const error = new Error(
        `Examination session with ID ${parsedSessionId} not found`,
      );
      error.statusCode = 404;
      throw error;
    }
  }

  const today = localDateOnlyString();
  const stats = await examinationSessionRepository.getDashboardOverviewStats({
    examinationSessionId: parsedSessionId,
    today,
  });

  const totalStudentsForResults =
    stats.totalStudents > 0 ? stats.totalStudents : stats.totalAnswerSheets;

  return {
    today: {
      examsCount: stats.todayExamsCount,
    },
    students: {
      total: stats.totalStudents,
    },
    exams: {
      total: stats.totalExams,
    },
    answerSheets: {
      scanned: stats.scannedAnswerSheets,
      total: stats.totalAnswerSheets,
      pending: Math.max(
        0,
        stats.totalAnswerSheets - stats.scannedAnswerSheets,
      ),
    },
    bundles: {
      notReturned: stats.bundlesNotReturned,
      total: stats.totalBundles,
      returned: Math.max(0, stats.totalBundles - stats.bundlesNotReturned),
    },
    finalResults: {
      created: stats.finalResultsCreated,
      total: totalStudentsForResults,
      pending: Math.max(
        0,
        totalStudentsForResults - stats.finalResultsCreated,
      ),
    },
  };
}

