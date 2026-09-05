import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import * as examinationSessionEligibilityServices from "./examinationSessionEligibilityServices.js";
import * as examinationSessionEligibilityRepo from "../repository/examinationSessionEligibilityRepository.js";
import {
  countWholeTermStudentsByTerms,
  getStudentCountMapByGroups,
  lookupStudentCount,
} from "../utility/studentCount.js";
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
import * as examSessionAnswerSheetRepository from "../repository/examSessionAnswerSheetRepository.js";
import * as s3Helper from "../utility/s3Helper.js";
import { buildScope, scoped } from "../utility/scoped.js";
import * as model from "../models/index.js";

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
    if (seen.has(term) || existingTermSet.has(term)) continue;
    seen.add(term);
    rows.push({
      term,
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

async function buildSessionSummary(sessionRecord, options = {}) {
  if (!sessionRecord) {
    return null;
  }

  const sessionPlain = toPlain(sessionRecord);
  let courseCount = 0;
  let totalStudents = 0;
  const termsList = sessionPlain.examinationSessionTerms || [];
  const termNumbers = uniqueValues(termsList.map((term) => term.term));
  const academicYearId = Number(sessionPlain.academicYearId);

  if (termNumbers.length && academicYearId) {
    const courseIds =
      await examinationSessionRepository.findDistinctCourseIdsByTerms(
        termNumbers,
        academicYearId,
        options,
      );
    courseCount = courseIds.length;

    totalStudents = await countWholeTermStudentsByTerms(
      termNumbers,
      academicYearId,
      options,
    );
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
    status,
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

  if (status) where.status = status;
  if (academicYearId) where.academicYearId = Number(academicYearId);
  if (assessmentTypeId) where.assessmentTypeId = Number(assessmentTypeId);
  if (universityId) where.universityId = Number(universityId);
  if (instituteId) where.instituteId = Number(instituteId);
  if (search) where.sessionName = { [Op.like]: `%${search}%` };

  const { count, rows } =
    await examinationSessionRepository.findAndCountExaminationSessions(
      { where, limit: limitNum, offset },
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
        existingTermSet.add(Number(row.term));
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
    const tx = { ...options, transaction };

    const existingTerms =
      await examinationSessionRepository.findExaminationSessionTerms(
        examinationSessionId,
        tx,
      );
    for (const existing of existingTerms) {
      if (Number(existing.term) === termNumber) return existing;
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

    const record =
      await examinationSessionRepository.createExaminationSessionTerm(
        termData,
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
 * Courses / terms / subjects from assessment_plan_subject_mapping
 * for an exam setup type (or the session’s assessmentTypeId).
 */
export async function getClassSectionTermsBySetupType(
  examSetupTypeId,
  options = {},
) {
  const setupTypeId = await getSetupTypeId(examSetupTypeId, options);
  if (!setupTypeId) return [];

  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) return [];

  // Source of truth: assessment_plan_subject_mapping for this exam type’s plans.
  const subjectMappings =
    await examinationSessionRepository.findAssessmentPlanSubjectMappings(
      { assessmentPlanId: { [Op.in]: planIds } },
      options,
    );
  if (!subjectMappings.length) return [];

  const mappedSubjectIds = uniqueValues(
    subjectMappings.map((m) => m.subjectId),
  );
  const subjects = await examinationSessionRepository.findSubjects(
    { subjectId: { [Op.in]: mappedSubjectIds } },
    options,
  );
  const subjectMap = new Map();
  for (const subject of subjects) {
    subjectMap.set(subject.subjectId, subject);
  }

  // Group by course + session from the mapping rows.
  const courseSessionMap = new Map();
  for (const mapping of subjectMappings) {
    if (!mapping.courseId) continue;
    const subject = subjectMap.get(mapping.subjectId);
    if (!subject) continue;

    const key = `${mapping.courseId}_${mapping.sessionId || 0}`;
    if (!courseSessionMap.has(key)) {
      courseSessionMap.set(key, {
        courseId: Number(mapping.courseId),
        sessionId: mapping.sessionId != null ? Number(mapping.sessionId) : null,
        academicYearId:
          mapping.academicYearId != null
            ? Number(mapping.academicYearId)
            : null,
        subjectsByTerm: new Map(),
      });
    }

    const group = courseSessionMap.get(key);
    const term = Number(subject.term);
    if (!Number.isFinite(term) || term <= 0) continue;

    if (!group.subjectsByTerm.has(term)) {
      group.subjectsByTerm.set(term, []);
    }
    group.subjectsByTerm.get(term).push(subject);
  }

  const groups = [...courseSessionMap.values()];
  if (!groups.length) return [];

  const studentCountGroups = [];
  for (const group of groups) {
    if (group.sessionId == null || group.academicYearId == null) continue;
    for (const term of group.subjectsByTerm.keys()) {
      studentCountGroups.push({
        courseId: group.courseId,
        sessionId: group.sessionId,
        term,
        academicYearId: group.academicYearId,
      });
    }
  }
  const studentCountMap = await getStudentCountMapByGroups(
    studentCountGroups,
    options,
  );

  const courseIds = [];
  const sessionIds = [];
  for (const group of groups) {
    courseIds.push(group.courseId);
    if (group.sessionId != null) sessionIds.push(group.sessionId);
  }

  const [courses, sessions, courseSessionMappings] = await Promise.all([
    examinationSessionRepository.findCoursesByIds(
      uniqueValues(courseIds),
      options,
    ),
    examinationSessionRepository.findSessionsByIds(
      uniqueValues(sessionIds),
      options,
    ),
    examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
      uniqueValues(courseIds),
      uniqueValues(sessionIds),
      options,
    ),
  ]);

  const courseMap = new Map();
  for (const course of courses) {
    courseMap.set(course.courseId, course);
  }
  const sessionMap = new Map();
  for (const session of sessions) {
    sessionMap.set(session.sessionId, session);
  }
  const courseSessionMappingMap = new Map();
  for (const row of courseSessionMappings) {
    const plain = row.get ? row.get({ plain: true }) : row;
    courseSessionMappingMap.set(
      `${plain.courseId}_${plain.sessionId}`,
      plain.sessionCourseMappingId,
    );
  }

  const result = [];
  for (const group of groups) {
    const courseDetails = courseMap.get(group.courseId);
    if (!courseDetails) continue;

    const termsArray = [...group.subjectsByTerm.keys()].sort(
      (a, b) => Number(a) - Number(b),
    );
    const termDetails = [];
    for (const term of termsArray) {
      const termSubjects = group.subjectsByTerm.get(term);
      termDetails.push({
        term,
        studentCount: lookupStudentCount(studentCountMap, {
          courseId: group.courseId,
          sessionId: group.sessionId,
          term,
          academicYearId: group.academicYearId,
        }),
        subjectCount: termSubjects.length,
        subjects: termSubjects,
      });
    }

    result.push({
      course: courseDetails,
      termType: courseDetails.termType || null,
      session: group.sessionId ? sessionMap.get(group.sessionId) || null : null,
      courseSessionMappingId:
        group.sessionId != null
          ? courseSessionMappingMap.get(
              `${group.courseId}_${group.sessionId}`,
            ) || null
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

  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) return [];

  const mappingWhere = { assessmentPlanId: { [Op.in]: planIds } };
  if (courseId) mappingWhere.courseId = Number(courseId);
  if (sessionId) mappingWhere.sessionId = Number(sessionId);

  const plainSession = toPlain(sessionRecord);
  const sessionTermSet = new Set();
  if (plainSession?.examinationSessionTerms) {
    for (const sessionTerm of plainSession.examinationSessionTerms) {
      sessionTermSet.add(Number(sessionTerm.term));
    }
  }
  const hasSessionTermScope = Boolean(examinationSessionId && plainSession);

  const subjectMappings =
    await examinationSessionRepository.findAssessmentPlanSubjectMappings(
      mappingWhere,
      options,
    );

  const subjectIds = uniqueValues(
    subjectMappings.map((mapping) => mapping.subjectId),
  );
  if (!subjectIds.length) return [];

  const subjectWhere = { subjectId: { [Op.in]: subjectIds }, isActive: true };
  if (academicYearId) subjectWhere.academicYearId = Number(academicYearId);

  const [subjects, mappings] = await Promise.all([
    examinationSessionRepository.findSubjects(subjectWhere, options),
    examinationSessionRepository.findAssessmentPlanSubjectMappingsWithSession(
      {
        subjectId: { [Op.in]: subjectIds },
      },
      options,
    ),
  ]);

  if (!subjects.length) return [];

  const courses = await examinationSessionRepository.findCoursesByIds(
    uniqueValues(subjects.map((subject) => subject.courseId)),
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
  for (const subject of subjects) {
    const sessionInfo = subjectSessionMap.get(subject.subjectId) || {};
    const key = `${subject.courseId}_${sessionInfo.sessionId || 0}`;
    if (!courseSessionGroups.has(key)) {
      const course = courseMap.get(subject.courseId) || {};
      courseSessionGroups.set(key, {
        courseId: subject.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        termType: course.termType,
        sessionId: sessionInfo.sessionId,
        sessionName: sessionInfo.sessionName,
        academicYearId: subject.academicYearId,
        termsMap: new Map(),
      });
    }

    const group = courseSessionGroups.get(key);
    const subjectTerm = Number(subject.term);
    if (!group.termsMap.has(subjectTerm)) {
      group.termsMap.set(subjectTerm, []);
    }
    group.termsMap.get(subjectTerm).push({
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      term: subjectTerm,
      courseId: subject.courseId,
      sessionId: sessionInfo.sessionId,
    });
  }

  const courseSessionMappingsList = await examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
    uniqueValues([...courseSessionGroups.values()].map(g => g.courseId)),
    uniqueValues([...courseSessionGroups.values()].map(g => g.sessionId)),
    options
  );

  const courseSessionMappingMap = new Map(
    courseSessionMappingsList.map(m => [`${m.courseId}_${m.sessionId}`, m.sessionCourseMappingId])
  );

  return [...courseSessionGroups.values()]
    .map((group) => {
      let totalSubjects = 0;
      const terms = [...group.termsMap.keys()]
        .sort((a, b) => a - b)
        .reduce((acc, term) => {
          if (hasSessionTermScope && !sessionTermSet.has(Number(term))) {
            return acc;
          }
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

      const courseSessionMappingId = courseSessionMappingMap.get(`${group.courseId}_${group.sessionId}`) || null;

      return {
        examinationSessionId: plainSession?.examinationSessionId || null,
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

  if (!examinationSession.assessmentTypeId) return [];

  const sessionTermRows =
    await examinationSessionRepository.findExaminationSessionTerms(
      parsedExaminationSessionId,
      options,
    );
  const sessionTermSet = new Set();
  for (const row of sessionTermRows) {
    sessionTermSet.add(Number(row.term));
  }
  if (!sessionTermSet.size) return [];

  const assessmentPlanIds = await getAssessmentPlanIds(
    Number(examinationSession.assessmentTypeId),
    options,
  );
  if (!assessmentPlanIds.length) return [];

  const mappingWhere = { assessmentPlanId: { [Op.in]: assessmentPlanIds } };
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

  const uniqueSubjectIds = [];
  const subjectSessionMap = new Map();
  for (const mapping of subjectMappings) {
    if (subjectSessionMap.has(mapping.subjectId)) continue;
    uniqueSubjectIds.push(mapping.subjectId);
    subjectSessionMap.set(mapping.subjectId, mapping.sessionId);
  }

  // Mapped subjects ∩ session terms (examination_session_term.term).
  const subjectWhere = {
    subjectId: { [Op.in]: uniqueSubjectIds },
    isActive: true,
    term: { [Op.in]: [...sessionTermSet] },
  };
  if (filterCombinations.length > 0) {
    const orSubjects = [];
    for (const comb of filterCombinations) {
      const allowedTerms = [];
      for (const term of comb.terms) {
        if (sessionTermSet.has(Number(term))) allowedTerms.push(Number(term));
      }
      if (!allowedTerms.length) continue;
      orSubjects.push({
        courseId: comb.courseId,
        term: { [Op.in]: allowedTerms },
      });
    }
    if (!orSubjects.length) return [];
    subjectWhere[Op.or] = orSubjects;
  }

  const mappedSubjects = await examinationSessionRepository.findSubjects(
    subjectWhere,
    options,
  );
  if (!mappedSubjects.length) return [];

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

  const scheduleBySubjectId = new Map();
  const examScheduleIds = [];
  const studentGroups = [];

  for (const sched of allSchedules) {
    if (scheduleBySubjectId.has(sched.subjectId)) continue;
    const plain = toPlain(sched);
    scheduleBySubjectId.set(sched.subjectId, plain);
    examScheduleIds.push(sched.examScheduleId);
    studentGroups.push({
      sessionId: plain.sessionId,
      courseId: plain.subjectSchedule ? plain.subjectSchedule.courseId : null,
      term: plain.term,
      academicYearId: plain.academicYearId,
    });
  }

  if (needsSchedulingOnly) {
    const result = [];
    for (const subject of mappedSubjects) {
      if (scheduleBySubjectId.has(subject.subjectId)) continue;

      const subjectSessionId = subjectSessionMap.get(subject.subjectId) || null;
      const mappingInfo = subjectSessionId
        ? courseSessionMappingMap.get(`${subject.courseId}_${subjectSessionId}`)
        : null;

      result.push({
        subjectId: subject.subjectId,
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
        studentCount: 0,
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

  if (examScheduleIds.length > 0) {
    const enrichmentPromises = [
      examinationSessionRepository.findRoomCapacitiesByExamSchedules(
        examScheduleIds,
        options,
      ),
      getStudentCountMapByGroups(studentGroups, options),
    ];

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

    const enrichmentResults = await Promise.all(enrichmentPromises);
    const roomCapacities = enrichmentResults[0];
    studentCountMap = enrichmentResults[1];
    const teacherAssignments = skipTeacherAndPaper ? [] : enrichmentResults[2];
    const questionPapers = skipTeacherAndPaper ? [] : enrichmentResults[3];

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
    const hasSchedule = scheduleBySubjectId.has(subject.subjectId);

    if (isExamScheduled === true && !hasSchedule) continue;
    if (isExamScheduled === false && hasSchedule) continue;

    let schedInfo = null;

    if (hasSchedule) {
      const plainSched = scheduleBySubjectId.get(subject.subjectId);
      let teacherAssignment =
        teacherAssignmentByScheduleId.get(plainSched.examScheduleId) || [];

      const roomCapacity =
        roomCapacityByScheduleId.get(Number(plainSched.examScheduleId)) || 0;
      const studentCount = lookupStudentCount(studentCountMap, {
        sessionId: plainSched.sessionId,
        courseId: plainSched.subjectSchedule
          ? plainSched.subjectSchedule.courseId
          : null,
        term: plainSched.term,
        academicYearId: plainSched.academicYearId,
      });
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
    const studentCount = hasSchedule && schedInfo ? schedInfo.studentCount : 0;
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

    const subjectSessionId = subjectSessionMap.get(subject.subjectId) || null;
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
  return sequelize.transaction(async (transaction) => {
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
      { ...options, transaction },
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

  const mappedSubjects = await getMappedSubjectsBySessionAndTerm(
    { examinationSessionId: parsedSessionId },
    { ...options, skipTeacherAndPaperEnrichment: true },
  );

  let scheduledSubjectsCount = 0;
  for (const sub of mappedSubjects) {
    if (sub.isExamScheduled === true) {
      scheduledSubjectsCount++;
    }
  }
  const totalSubjectsCount = mappedSubjects.length;

  const schedules = await examinationSessionRepository.findSchedulesForSkuStats(
    parsedSessionId,
    options,
  );
  const totalExamSchedule = schedules.length;
  const examScheduleIds = [];
  for (const schedule of schedules) {
    examScheduleIds.push(schedule.examScheduleId);
  }

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

