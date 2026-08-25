import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";
import * as examinationSessionEligibilityServices from "./examinationSessionEligibilityServices.js";
import * as examinationSessionEligibilityRepo from "../repository/examinationSessionEligibilityRepository.js";
import { scoped } from "../utility/scoped.js";
import * as model from "../models/index.js";

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
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

async function validateClassSectionTermIds(
  classSectionTerms = [],
  options = {},
) {
  const termIds = uniqueValues(
    classSectionTerms
      .map((term) => Number(term.classSectionTermId))
      .filter(Boolean),
  );
  if (!termIds.length) {
    return;
  }

  const validTerms =
    await examinationSessionRepository.findClassSectionTermsByIds(
      termIds,
      options,
    );
  const validTermSet = new Set(
    validTerms.map((term) => term.classSectionTermId),
  );
  const invalidTerm = termIds.find((id) => !validTermSet.has(id));
  if (invalidTerm !== undefined) {
    throw createBadRequestError(
      `The selected class section term (ID: ${invalidTerm}) is invalid or does not exist.`,
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
  const classSectionTermIds = uniqueValues(
    termsList.map((term) => term.classSectionTermId),
  );

  if (classSectionTermIds.length) {
    const classSectionTerms =
      await examinationSessionRepository.findClassSectionTermsByIds(
        classSectionTermIds,
        options,
      );
    const classSectionIds = uniqueValues(
      classSectionTerms.map((term) => term.classSectionsId),
    );

    if (classSectionIds.length) {
      const classSections =
        await examinationSessionRepository.findClassSections(
          {
            classSectionsId: { [Op.in]: classSectionIds },
          },
          options,
        );
      courseCount = uniqueValues(
        classSections.map((section) => section.courseId),
      ).length;
    }

    totalStudents =
      await examinationSessionRepository.countDistinctStudentsByClassSectionTermIds(
        classSectionTermIds,
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
  const rawStudentsList =
    await studentHallTicketRepository.getStudentsByExaminationSessionId(
      examinationSessionId,
      {},
      transaction,
    );

  const eligibilityRecords = [];
  const seenStudentIds = new Set();

  for (const raw of rawStudentsList) {
    if (seenStudentIds.has(raw.student.studentId)) continue;
    seenStudentIds.add(raw.student.studentId);

    const calculated =
      examinationSessionEligibilityServices.calculateStudentEligibility(raw);
    const initialStatus =
      calculated.eligibilityStatus === "Ready" ? "READY" : "REVIEW";

    eligibilityRecords.push({
      universityId: raw.student.universityId,
      instituteId: raw.student.instituteId,
      academicYearId:
        raw.examinationSession?.academicYearId ?? defaultAcademicYearId,
      studentId: raw.student.studentId,
      examinationSessionId: examinationSessionId,
      status: initialStatus,
      reviewReason:
        initialStatus !== "READY" ? calculated.reviewReasons[0]?.message : null,
    });
  }

  if (eligibilityRecords.length > 0) {
    await examinationSessionEligibilityRepo.bulkCreateRecords(
      eligibilityRecords,
      { transaction },
    );
  }
}

export async function createExaminationSession(sessionData, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const { classSectionTerms, ...mainData } = sessionData;

    if (mainData.assessmentTypeId) {
      if (Array.isArray(classSectionTerms) && classSectionTerms.length > 0) {
        const newTermIds = classSectionTerms.map((t) =>
          Number(t.classSectionTermId),
        );
        const existingOverlap =
          await examinationSessionRepository.findOverlapTermForAssessmentType(
            mainData.assessmentTypeId,
            newTermIds,
            { ...options, transaction },
          );
        if (existingOverlap) {
          throw createBadRequestError(
            "An examination session for this assessment type already exists with overlapping terms.",
          );
        }
      } else {
        const existing =
          await examinationSessionRepository.findExaminationSessionByAssessmentTypeId(
            mainData.assessmentTypeId,
            { ...options, transaction },
          );
        if (existing) {
          throw createBadRequestError(
            "An examination session for this assessment type already exists.",
          );
        }
      }
    }

    await validateClassSectionTermIds(classSectionTerms, {
      ...options,
      transaction,
    });
    const record = await examinationSessionRepository.createExaminationSession(
      mainData,
      { ...options, transaction },
    );

    if (Array.isArray(classSectionTerms) && classSectionTerms.length) {
      const termsToCreate = classSectionTerms.map((term) => ({
        ...term,
        examinationSessionId: record.examinationSessionId,
      }));
      await examinationSessionRepository.createExaminationSessionTerms(
        termsToCreate,
        { ...options, transaction },
      );

      // Calculate initial eligibility for students in the created terms
      await initializeEligibilityRecords(
        record.examinationSessionId,
        mainData.academicYearId,
        transaction,
      );
    }

    return getExaminationSessionById(record.examinationSessionId, {
      ...options,
      transaction,
    });
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
    const { classSectionTerms, ...mainUpdateData } = updateData;

    const activeAssessmentTypeId =
      mainUpdateData.assessmentTypeId ||
      (
        await examinationSessionRepository.getExaminationSessionById(
          sessionId,
          { ...options, transaction },
        )
      )?.assessmentTypeId;

    if (activeAssessmentTypeId) {
      let targetTerms = classSectionTerms;
      if (!Array.isArray(targetTerms)) {
        const existingTerms =
          await examinationSessionRepository.findExaminationSessionTerms(
            sessionId,
            { ...options, transaction },
          );
        targetTerms = existingTerms.map((t) => ({
          classSectionTermId: t.classSectionTermId,
        }));
      }

      if (targetTerms.length > 0) {
        const termIds = targetTerms.map((t) => Number(t.classSectionTermId));
        const existingOverlap =
          await examinationSessionRepository.findOverlapTermForAssessmentTypeExcludingSession(
            activeAssessmentTypeId,
            sessionId,
            termIds,
            { ...options, transaction },
          );
        if (existingOverlap) {
          throw createBadRequestError(
            "An examination session for this assessment type already exists with overlapping terms.",
          );
        }
      } else {
        const existing =
          await examinationSessionRepository.findExaminationSessionByAssessmentTypeIdExcludingId(
            activeAssessmentTypeId,
            sessionId,
            { ...options, transaction },
          );
        if (existing) {
          throw createBadRequestError(
            "An examination session for this assessment type already exists.",
          );
        }
      }
    }

    if (Object.keys(mainUpdateData).length) {
      await examinationSessionRepository.updateExaminationSession(
        sessionId,
        mainUpdateData,
        { ...options, transaction },
      );
    }

    if (Array.isArray(classSectionTerms)) {
      await validateClassSectionTermIds(classSectionTerms, {
        ...options,
        transaction,
      });
      await examinationSessionRepository.deleteExaminationSessionTermsBySessionId(
        sessionId,
        { ...options, transaction },
      );

      if (classSectionTerms.length) {
        const termsToCreate = classSectionTerms.map((term) => ({
          ...term,
          examinationSessionId: sessionId,
        }));
        await examinationSessionRepository.createExaminationSessionTerms(
          termsToCreate,
          { ...options, transaction },
        );
        await initializeEligibilityRecords(
          sessionId,
          mainUpdateData.academicYearId,
          transaction,
        );
      }
    }

    return getExaminationSessionById(sessionId, { ...options, transaction });
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
    await validateClassSectionTermIds([termData], { ...options, transaction });
    const record =
      await examinationSessionRepository.createExaminationSessionTerm(
        termData,
        { ...options, transaction },
      );

    await initializeEligibilityRecords(
      termData.examinationSessionId,
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

    await examinationSessionRepository.deleteExaminationSessionTerm(
      examinationSessionTermId,
      { ...options, transaction },
    );
    return { message: "Examination session term mapping deleted successfully" };
  });
}

export async function getClassSectionTermsBySetupType(
  examSetupTypeId,
  options = {},
) {
  const setupTypeId = await getSetupTypeId(examSetupTypeId, options);
  if (!setupTypeId) {
    return [];
  }

  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) {
    return [];
  }

  const subjectMappings =
    await examinationSessionRepository.findAssessmentPlanSubjectMappings(
      {
        assessmentPlanId: { [Op.in]: planIds },
      },
      options,
    );
  const subjectIds = uniqueValues(
    subjectMappings.map((mapping) => mapping.subjectId),
  );
  if (!subjectIds.length) {
    return [];
  }

  const subjects = await examinationSessionRepository.findSubjects(
    {
      subjectId: { [Op.in]: subjectIds },
    },
    options,
  );
  const subjectMap = new Map(
    subjects.map((subject) => [subject.subjectId, subject]),
  );
  const courseSessionMap = new Map();

  for (const mapping of subjectMappings) {
    const subject = subjectMap.get(mapping.subjectId);
    if (!mapping.courseId || !subject) continue;

    const key = `${mapping.courseId}_${mapping.sessionId || 0}`;
    if (!courseSessionMap.has(key)) {
      courseSessionMap.set(key, {
        courseId: mapping.courseId,
        sessionId: mapping.sessionId || null,
        academicYearId: mapping.academicYearId || null,
        subjectIds: new Set(),
        terms: new Set(),
      });
    }

    const group = courseSessionMap.get(key);
    group.subjectIds.add(mapping.subjectId);
    if (subject.term != null) group.terms.add(subject.term);
  }

  const groups = [...courseSessionMap.values()];
  if (!groups.length) {
    return [];
  }

  const [courses, sessions] = await Promise.all([
    examinationSessionRepository.findCoursesByIds(
      uniqueValues(groups.map((group) => group.courseId)),
      options,
    ),
    examinationSessionRepository.findSessionsByIds(
      uniqueValues(groups.map((group) => group.sessionId)),
      options,
    ),
  ]);
  const courseMap = new Map(courses.map((course) => [course.courseId, course]));
  const sessionMap = new Map(
    sessions.map((session) => [session.sessionId, session]),
  );
  const result = [];

  for (const group of groups) {
    const courseDetails = courseMap.get(group.courseId);
    if (!courseDetails) continue;

    const termsArray = [...group.terms].sort((a, b) => Number(a) - Number(b));
    const classSectionWhere = { courseId: group.courseId };
    if (group.sessionId) classSectionWhere.sessionId = group.sessionId;
    if (group.academicYearId)
      classSectionWhere.academicYearId = group.academicYearId;

    const classSections = await examinationSessionRepository.findClassSections(
      classSectionWhere,
      options,
    );
    const classSectionIds = uniqueValues(
      classSections.map((section) => section.classSectionsId),
    );
    const allTermDetails =
      classSectionIds.length && termsArray.length
        ? await examinationSessionRepository.findClassSectionTerms(
            {
              classSectionsId: { [Op.in]: classSectionIds },
              term: { [Op.in]: termsArray },
            },
            options,
          )
        : [];

    const termDetails = await Promise.all(
      termsArray.map(async (term) => {
        const matchingItems = allTermDetails.filter(
          (item) =>
            classSectionIds.includes(item.classSectionsId) &&
            Number(item.term) === Number(term),
        );
        const allClassSectionTermIds = uniqueValues(
          matchingItems.map((item) => item.classSectionTermId),
        );

        const [studentCount, termSubjects] = await Promise.all([
          allClassSectionTermIds.length
            ? examinationSessionRepository.countDistinctStudentsByClassSectionTermIds(
                allClassSectionTermIds,
                options,
              )
            : 0,
          examinationSessionRepository.findSubjects(
            {
              subjectId: { [Op.in]: [...group.subjectIds] },
              courseId: group.courseId,
              term,
            },
            options,
          ),
        ]);

        return {
          ...(matchingItems[0] || {}),
          term,
          studentCount,
          subjectCount: termSubjects.length,
          subjects: termSubjects,
        };
      }),
    );

    result.push({
      course: courseDetails,
      termType: courseDetails.termType || null,
      session: group.sessionId ? sessionMap.get(group.sessionId) || null : null,
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
  const classSectionIds = plainSession?.examinationSessionTerms
    ? uniqueValues(
        plainSession.examinationSessionTerms.map(
          (term) => term.classSectionTerm?.classSectionsId,
        ),
      )
    : [];

  const [subjectMappings, classSections] = await Promise.all([
    examinationSessionRepository.findAssessmentPlanSubjectMappings(
      mappingWhere,
      options,
    ),
    classSectionIds.length
      ? examinationSessionRepository.findClassSections(
          { classSectionsId: { [Op.in]: classSectionIds } },
          options,
        )
      : [],
  ]);

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
  const mappedCstMap = new Map();

  const classSectionMap = new Map(
    classSections.map((section) => [section.classSectionsId, section]),
  );

  if (plainSession?.examinationSessionTerms) {
    for (const sessionTerm of plainSession.examinationSessionTerms) {
      const classSectionTerm = sessionTerm.classSectionTerm;
      const classSection = classSectionMap.get(
        classSectionTerm?.classSectionsId,
      );
      if (classSection) {
        mappedCstMap.set(
          `${classSection.courseId}_${classSectionTerm.term}`,
          classSectionTerm.classSectionTermId,
        );
      }
    }
  }

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
          const classSectionTermId = mappedCstMap.get(
            `${group.courseId}_${term}`,
          );
          if (classSectionTermId) {
            const termSubjects = group.termsMap.get(term);
            totalSubjects += termSubjects.length;
            acc.push({
              term,
              termTitle: `${group.termType === "Year" ? "Year" : "Semester"} ${term}`,
              classSectionTermId,
              subjectCount: termSubjects.length,
              subjects: termSubjects,
            });
          }
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

function buildStudentCountGroupKey(sessionId, courseId, term, academicYearId) {
  return `${Number(sessionId)}_${Number(courseId)}_${Number(term)}_${Number(academicYearId)}`;
}

function buildStudentCountMap(counts) {
  const studentCountByGroup = new Map();
  for (const row of counts) {
    studentCountByGroup.set(
      buildStudentCountGroupKey(
        row.sessionId,
        row.courseId,
        row.term,
        row.academicYearId,
      ),
      parseInt(row.studentCount, 10) || 0,
    );
  }
  return studentCountByGroup;
}

export async function resolveSelectionFilters(selections, options = {}) {
  const filterCombinations = [];
  const filterCourseIds = [];
  const filterSessionIds = [];

  if (!selections || selections.length === 0) {
    return { filterCombinations, filterCourseIds, filterSessionIds };
  }

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

  return { filterCombinations, filterCourseIds, filterSessionIds };
}

function buildCourseSessionMappingInfoMap(dbMappings) {
  const courseSessionMappingMap = new Map();
  for (const mapping of dbMappings) {
    const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
    courseSessionMappingMap.set(`${plain.courseId}_${plain.sessionId}`, {
      sessionCourseMappingId: plain.sessionCourseMappingId,
      courseName: plain.courses?.courseName || null,
      sessionName: plain.session?.sessionName || null,
    });
  }
  return courseSessionMappingMap;
}

async function loadCourseSessionMappingInfoMap(
  courseIds,
  sessionIds,
  options = {},
) {
  if (courseIds.length === 0 || sessionIds.length === 0) {
    return new Map();
  }

  const dbMappings =
    await examinationSessionRepository.findSessionCourseMappingsByCoursesAndSessions(
      courseIds,
      sessionIds,
      options,
    );
  return buildCourseSessionMappingInfoMap(dbMappings);
}

function indexSchedulesBySubject(allSchedules) {
  const scheduleBySubjectId = new Map();
  const examScheduleIds = [];
  const sessionsForCounts = new Set();
  const coursesForCounts = new Set();
  const termsForCounts = new Set();
  const acedmicYearsForCounts = new Set();

  for (const sched of allSchedules) {
    if (scheduleBySubjectId.has(sched.subjectId)) continue;

    const plainSched = toPlain(sched);
    scheduleBySubjectId.set(sched.subjectId, plainSched);
    examScheduleIds.push(sched.examScheduleId);

    if (sched.sessionId) sessionsForCounts.add(sched.sessionId);
    if (sched.subjectSchedule?.courseId) {
      coursesForCounts.add(sched.subjectSchedule.courseId);
    }
    if (sched.term) termsForCounts.add(sched.term);
    if (sched.academicYearId) acedmicYearsForCounts.add(sched.academicYearId);
  }

  return {
    scheduleBySubjectId,
    examScheduleIds,
    sessionsForCounts,
    coursesForCounts,
    termsForCounts,
    acedmicYearsForCounts,
  };
}

function indexRoomCapacityBySchedule(roomCapacities) {
  const roomCapacityByScheduleId = new Map();
  for (const rc of roomCapacities) {
    roomCapacityByScheduleId.set(
      rc.examScheduleId,
      Number(rc.capacity) || 0,
    );
  }
  return roomCapacityByScheduleId;
}

function indexQuestionPapersBySchedule(questionPapers) {
  const questionPapersByScheduleId = new Map();
  for (const qp of questionPapers) {
    if (!questionPapersByScheduleId.has(qp.examScheduleId)) {
      questionPapersByScheduleId.set(qp.examScheduleId, []);
    }
    questionPapersByScheduleId.get(qp.examScheduleId).push(qp);
  }
  return questionPapersByScheduleId;
}

function indexTeacherAssignmentsBySchedule(teacherAssignments) {
  const teacherAssignmentByScheduleId = new Map();
  for (const ta of teacherAssignments) {
    if (!teacherAssignmentByScheduleId.has(ta.examScheduleId)) {
      teacherAssignmentByScheduleId.set(ta.examScheduleId, []);
    }
    teacherAssignmentByScheduleId.get(ta.examScheduleId).push({
      teacherExamAssignmentId: ta.teacherExamAssignmentId,
      userId: ta.userId || ta.teacherEmployee?.userId,
      assignedAt: ta.createdAt,
      deadline: ta.deadline,
      user: ta.teacherEmployee?.user
        ? {
            userId: ta.teacherEmployee.user.userId,
            userName: ta.teacherEmployee.user.userName,
            email: ta.teacherEmployee.user.email,
            phone: ta.teacherEmployee.user.phone,
            employeeCode: ta.teacherEmployee.employeeCode,
          }
        : null,
    });
  }
  return teacherAssignmentByScheduleId;
}

function attachQuestionPapersToTeachers(teacherAssignment, questionPapers) {
  let moderationActive = false;
  let isApproved = false;

  if (teacherAssignment.length === 0) {
    return { teacherAssignment, moderationActive, isApproved };
  }

  const questionPaperByUserId = new Map();
  for (const qp of questionPapers) {
    if (!questionPaperByUserId.has(qp.createdBy)) {
      questionPaperByUserId.set(qp.createdBy, qp);
    }
  }

  const enrichedTeachers = [];
  for (const ta of teacherAssignment) {
    const matchingQP = questionPaperByUserId.get(ta.userId);
    if (!matchingQP) {
      enrichedTeachers.push({ ...ta, questionPaper: null });
      continue;
    }

    moderationActive = true;
    if (matchingQP.status === "Approved") {
      isApproved = true;
    }

    enrichedTeachers.push({
      ...ta,
      questionPaper: {
        id: matchingQP.id,
        status: matchingQP.status,
        finalApproval: matchingQP.finalApproval,
        createdBy: matchingQP.createdBy,
        createdAt: matchingQP.createdAt,
        updatedAt: matchingQP.updatedAt,
        ...(matchingQP.status === "Approved" && {
          updatedBy: matchingQP.updatedBy ?? null,
          updatedByName: matchingQP.updater?.userName ?? null,
        }),
      },
    });
  }

  return {
    teacherAssignment: enrichedTeachers,
    moderationActive,
    isApproved,
  };
}

function resolvePaperWorkflowStatus(teacherList, qpList) {
  let isNotAssigned = false;
  let isAssigned = false;
  let isModerationActiveStatus = false;
  let isFullyApproved = false;
  let deadline = null;

  const deadlines = [];
  for (const teacher of teacherList) {
    if (teacher.deadline !== null && teacher.deadline !== undefined) {
      deadlines.push(teacher.deadline);
    }
  }
  if (deadlines.length > 0) {
    deadline = new Date(Math.min(...deadlines.map((d) => new Date(d))));
  }

  let hasFullyApprovedPaper = false;
  let hasModerationActivePaper = false;
  for (const qp of qpList) {
    if (qp.finalApproval === "Approved" || qp.status === "Approved") {
      hasFullyApprovedPaper = true;
    }
    if (qp.status === "Approved" && qp.finalApproval !== "Approved") {
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

  return {
    isNotAssigned,
    isAssigned,
    isModerationActiveStatus,
    isFullyApproved,
    deadline,
  };
}

function resolveMappedSubjectQueryStatus({
  hasSchedule,
  isFullyApproved,
  isNotAssigned,
  isModerationActiveStatus,
  isAssigned,
  roomPending,
  ready,
  published,
}) {
  if (!hasSchedule) return "needsScheduling";
  if (isFullyApproved) return "approved";
  if (isNotAssigned) return "notAssigned";
  if (isModerationActiveStatus) return "moderationActive";
  if (isAssigned) return "assigned";
  if (roomPending) return "roomPending";
  if (ready) return "ready";
  if (published) return "published";
  return "needsScheduling";
}

async function loadScheduleEnrichmentMaps(
  {
    examScheduleIds,
    sessionsForCounts,
    coursesForCounts,
    termsForCounts,
    acedmicYearsForCounts,
  },
  options = {},
) {
  const empty = {
    roomCapacityByScheduleId: new Map(),
    teacherAssignmentByScheduleId: new Map(),
    questionPapersByScheduleId: new Map(),
    studentCountByGroup: new Map(),
  };

  if (examScheduleIds.length === 0) {
    return empty;
  }

  const skipTeacherAndPaperEnrichment = options.skipTeacherAndPaperEnrichment === true;
  const canFetchStudentCounts =
    sessionsForCounts.size > 0 &&
    coursesForCounts.size > 0 &&
    termsForCounts.size > 0;

  const promises = [
    examinationSessionRepository.findRoomCapacitiesByExamSchedules(
      examScheduleIds,
      options,
    ),
    skipTeacherAndPaperEnrichment
      ? Promise.resolve([])
      : examinationSessionRepository.findTeacherAssignmentsByExamSchedules(
          examScheduleIds,
          options,
        ),
    skipTeacherAndPaperEnrichment
      ? Promise.resolve([])
      : examinationSessionRepository.findQuestionPapersByExamSchedules(
          examScheduleIds,
          options,
        ),
    canFetchStudentCounts
      ? examScheduleRepository.getStudentCountsByGroups(
          Array.from(sessionsForCounts),
          Array.from(coursesForCounts),
          Array.from(termsForCounts),
          Array.from(acedmicYearsForCounts),
          options,
        )
      : Promise.resolve([]),
  ];

  const [roomCapacities, teacherAssignments, questionPapers, counts] =
    await Promise.all(promises);

  return {
    roomCapacityByScheduleId: indexRoomCapacityBySchedule(roomCapacities),
    teacherAssignmentByScheduleId:
      indexTeacherAssignmentsBySchedule(teacherAssignments),
    questionPapersByScheduleId: indexQuestionPapersBySchedule(questionPapers),
    studentCountByGroup: buildStudentCountMap(counts || []),
  };
}

function buildMappedSubjectRow({
  subject,
  hasSchedule,
  schedInfo,
  subjectSessionId,
  mappingInfo,
  questionPapers,
}) {
  const hasAssignedRoom =
    hasSchedule && schedInfo ? schedInfo.roomCapacity > 0 : false;
  const roomCapacity = hasSchedule && schedInfo ? schedInfo.roomCapacity : 0;
  const studentCount = hasSchedule && schedInfo ? schedInfo.studentCount : 0;

  const needsScheduling = !hasSchedule;
  const roomPending =
    hasSchedule && (!hasAssignedRoom || roomCapacity < studentCount);
  const needsRoom = false;
  const ready = hasSchedule && roomCapacity >= studentCount;
  const published = schedInfo ? schedInfo.published : false;

  const teacherList = hasSchedule ? schedInfo.teacherAssignment : [];
  const qpList = hasSchedule ? questionPapers : [];
  const paperStatus = hasSchedule
    ? resolvePaperWorkflowStatus(teacherList, qpList)
    : {
        isNotAssigned: false,
        isAssigned: false,
        isModerationActiveStatus: false,
        isFullyApproved: false,
        deadline: null,
      };

  const queryStatus = resolveMappedSubjectQueryStatus({
    hasSchedule,
    isFullyApproved: paperStatus.isFullyApproved,
    isNotAssigned: paperStatus.isNotAssigned,
    isModerationActiveStatus: paperStatus.isModerationActiveStatus,
    isAssigned: paperStatus.isAssigned,
    roomPending,
    ready,
    published,
  });

  return {
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    term: subject.term,
    termType: subject.course?.termType || null,
    courseId: subject.courseId,
    courseName: mappingInfo ? mappingInfo.courseName : null,
    sessionId: subjectSessionId,
    sessionName: mappingInfo ? mappingInfo.sessionName : null,
    courseSessionMappingId: mappingInfo
      ? mappingInfo.sessionCourseMappingId
      : null,
    isExamScheduled: hasSchedule,
    examScheduleId: schedInfo?.examScheduleId || null,
    needsScheduling,
    roomPending,
    needsRoom,
    ready,
    published,
    deadline: paperStatus.deadline
      ? paperStatus.deadline.toISOString()
      : null,
    examDetails: hasSchedule
      ? {
          examDate: schedInfo.examDate,
          examTime: schedInfo.examTime,
          duration: schedInfo.duration,
          maximumMarks: schedInfo.maximumMarks,
          type: schedInfo.type,
          examinationSessionSlot: schedInfo.examinationSessionSlot,
          questionPapers: qpList,
        }
      : null,
    teacherAssignment: teacherList,
    queryStatus,
  };
}

export async function getMappedSubjectsBySessionAndTermNeed(params, options = {}) {
  // Force isExamScheduled to true to only fetch scheduled exams
  const updatedParams = {
    ...params,
    isExamScheduled: true
  };
  return await getMappedSubjectsBySessionAndTerm(updatedParams, options);
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

  const [selectionFilters, examinationSession] = await Promise.all([
    resolveSelectionFilters(selections, options),
    examinationSessionRepository.findExaminationSessionAssessmentTypeById(
      parsedExaminationSessionId,
      options,
    ),
  ]);

  if (!examinationSession) {
    const error = new Error("Examination session not found");
    error.statusCode = 404;
    throw error;
  }

  const hasPublishedOnlyFilter =
    isExamScheduled !== undefined ||
    teacherAssignmentStatus !== undefined ||
    isModerationActive !== undefined;

  if (hasPublishedOnlyFilter && examinationSession.status !== "Published") {
    throw createBadRequestError(
      "Exam planning filters are available only for a published examination session.",
    );
  }

  if (!examinationSession.assessmentTypeId) return [];

  const assessmentPlanIds = await getAssessmentPlanIds(
    Number(examinationSession.assessmentTypeId),
    options,
  );
  if (!assessmentPlanIds.length) return [];

  const { filterCombinations, filterCourseIds, filterSessionIds } =
    selectionFilters;

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

  const uniqueSubjectIds = uniqueValues(
    subjectMappings.map((mapping) => mapping.subjectId),
  );
  const subjectSessionMap = new Map();
  for (const mapping of subjectMappings) {
    subjectSessionMap.set(mapping.subjectId, mapping.sessionId);
  }

  const subjectWhere = {
    subjectId: { [Op.in]: uniqueSubjectIds },
    isActive: true,
  };

  if (filterCombinations.length > 0) {
    const orSubjects = [];
    for (const comb of filterCombinations) {
      orSubjects.push({
        courseId: comb.courseId,
        term: { [Op.in]: comb.terms },
      });
    }
    subjectWhere[Op.or] = orSubjects;
  }

  const mappedSubjects = await examinationSessionRepository.findSubjects(
    subjectWhere,
    options,
  );
  if (!mappedSubjects.length) return [];

  const courseSessionMapIds = uniqueValues(
    mappedSubjects.map((sub) => sub.courseId),
  );
  const courseSessionMapSessionIds = uniqueValues(
    mappedSubjects.map((sub) => subjectSessionMap.get(sub.subjectId)),
  );
  const subjectIds = [];
  for (const sub of mappedSubjects) {
    subjectIds.push(sub.subjectId);
  }

  const [courseSessionMappingMap, allSchedules] = await Promise.all([
    loadCourseSessionMappingInfoMap(
      courseSessionMapIds,
      courseSessionMapSessionIds,
      options,
    ),
    examinationSessionRepository.findExamSchedulesBySubjects(
      parsedExaminationSessionId,
      subjectIds,
      { ...options, date },
    ),
  ]);

  const scheduleIndex = indexSchedulesBySubject(allSchedules);
  const enrichment = await loadScheduleEnrichmentMaps(scheduleIndex, options);

  const applyStatusFilter = filterStatus && filterStatus !== "all";
  const finalResponse = [];

  for (const subject of mappedSubjects) {
    const hasSchedule = scheduleIndex.scheduleBySubjectId.has(subject.subjectId);

    if (isExamScheduled === true && !hasSchedule) continue;
    if (isExamScheduled === false && hasSchedule) continue;

    let schedInfo = null;

    if (hasSchedule) {
      const plainSched = scheduleIndex.scheduleBySubjectId.get(
        subject.subjectId,
      );
      const baseTeacherAssignment =
        enrichment.teacherAssignmentByScheduleId.get(
          plainSched.examScheduleId,
        ) || [];
      const questionPapers =
        enrichment.questionPapersByScheduleId.get(plainSched.examScheduleId) ||
        [];
      const roomCapacity =
        enrichment.roomCapacityByScheduleId.get(plainSched.examScheduleId) || 0;
      const studentCount =
        enrichment.studentCountByGroup.get(
          buildStudentCountGroupKey(
            plainSched.sessionId,
            plainSched.subjectSchedule?.courseId,
            plainSched.term,
            plainSched.academicYearId,
          ),
        ) || 0;
      const hasAssignedRoom = roomCapacity > 0;

      const {
        teacherAssignment,
        moderationActive,
        isApproved,
      } = attachQuestionPapersToTeachers(baseTeacherAssignment, questionPapers);

      schedInfo = {
        examScheduleId: plainSched.examScheduleId,
        examDate: plainSched.examDate,
        examTime: plainSched.examTime,
        duration: plainSched.duration,
        maximumMarks: plainSched.maximumMarks || null,
        type: plainSched.type,
        examinationSessionSlotId: plainSched.examinationSessionSlotId,
        examinationSessionSlot: plainSched.examinationSessionSlot || null,
        roomCapacity,
        studentCount,
        needsRoom: roomCapacity < studentCount,
        confirmed: hasAssignedRoom && roomCapacity === studentCount,
        published: plainSched.published || false,
        teacherAssignment,
        isModerationActive: moderationActive,
        isApproved,
      };
    }

    const subjectSessionId = subjectSessionMap.get(subject.subjectId) || null;
    const mappingInfo = subjectSessionId
      ? courseSessionMappingMap.get(`${subject.courseId}_${subjectSessionId}`)
      : null;

    const row = buildMappedSubjectRow({
      subject,
      hasSchedule,
      schedInfo,
      subjectSessionId,
      mappingInfo,
      questionPapers: hasSchedule
        ? enrichment.questionPapersByScheduleId.get(schedInfo.examScheduleId) ||
          []
        : [],
    });

    if (applyStatusFilter && row.queryStatus !== filterStatus) continue;

    delete row.queryStatus;
    finalResponse.push(row);
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

    const isApproved = papers.some(
      (p) => p.finalApproval === "Approved" || p.status === "Approved",
    );
    const isRejected = papers.some(
      (p) => p.finalApproval === "Rejected" || p.status === "Rejected",
    );
    const isPending = papers.some(
      (p) => p.finalApproval === "Pending" || p.status === "Pending",
    );

    if (isApproved) {
      approved++;
      readyForEncryption++;
      readyToPrint++;
    } else if (isRejected) {
      changesRequested++;
    } else if (isPending) {
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

    // Update session status to Published
    await examinationSessionRepository.updateExaminationSession(examinationSessionId, { status: "Published", updatedBy: userId }, { ...options, transaction });

    // Fetch all mapped subjects to locate those in "Ready" status
    const mappedSubjects = await getMappedSubjectsBySessionAndTerm(
      { examinationSessionId },
      { ...options, transaction, skipTeacherAndPaperEnrichment: true }
    );

    // Identify examScheduleIds of those subjects that are "Ready"
    const readyExamScheduleIds = mappedSubjects
      .filter((sub) => sub.ready === true && sub.examScheduleId !== null)
      .map((sub) => sub.examScheduleId);

    if (readyExamScheduleIds.length > 0) {
      await model.examScheduleModel.update(
        { published: true, updatedBy: userId },
        {
          where: { examScheduleId: { [Op.in]: readyExamScheduleIds } },
          transaction,
        }
      );
    }

    return {
      message: "Examination session published successfully",
      publishedSchedulesCount: readyExamScheduleIds.length,
    };
  });
}

export async function getSessionSkuStats(examinationSessionId, options = {}) {
  const parsedSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedSessionId)) {
    throw new Error("Invalid examinationSessionId");
  }

  // 1. Get total mapped subjects vs scheduled
  const mappedSubjects = await getMappedSubjectsBySessionAndTerm(
    { examinationSessionId: parsedSessionId },
    { ...options, skipTeacherAndPaperEnrichment: true }
  );
  const totalSubjectsCount = mappedSubjects.length;
  const scheduledSubjectsCount = mappedSubjects.filter(sub => sub.isExamScheduled === true).length;

  // 2. Get total question papers vs approved
  const schedules = await examinationSessionRepository.findSchedulesForSkuStats(parsedSessionId, options);
  const totalExamSchedule = schedules.length;
  const examScheduleIds = schedules.map(s => s.examScheduleId);

  let totalQuestionPapers = 0;
  let approvedQuestionPapers = 0;

  if (examScheduleIds.length > 0) {
    const qpCounts = await examinationSessionRepository.findQuestionPapersCountForSchedules(examScheduleIds, options);
    totalQuestionPapers = qpCounts.total;
    approvedQuestionPapers = qpCounts.approved;
  }

  // 3. Hall tickets count
  const hallTicketsCount = await examinationSessionRepository.countHallTicketsBySession(parsedSessionId, options);

  // 4. Bundles count: Match by date + slot of examSchedules
  let totalBundles = 0;
  let receivedBundles = 0;
  if (schedules.length > 0) {
    const uniqueDates = [...new Set(schedules.map(s => s.examDate).filter(Boolean))];
    const uniqueSlotIds = [...new Set(schedules.map(s => s.examinationSessionSlotId).filter(Boolean))];
    if (uniqueDates.length > 0 && uniqueSlotIds.length > 0) {
      const bundleCounts = await examinationSessionRepository.countBundlesByDatesAndSlots(uniqueDates, uniqueSlotIds, options);
      totalBundles = bundleCounts.total;
      receivedBundles = bundleCounts.received;
    }
  }

  return {
    subjects: {
      total: totalSubjectsCount,
      scheduled: scheduledSubjectsCount
    },
    questionPapers: {
      total: totalQuestionPapers,
      approved: approvedQuestionPapers
    },
    hallTickets: {
      total: hallTicketsCount,
      totalExamSchedules: totalExamSchedule
    },
    bundles: {
      total: totalBundles,
      received: receivedBundles
    }
  };
}


