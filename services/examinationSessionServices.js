import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as examinationSessionRepository from "../repository/examinationSessionRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function toPlain(record) {
  return record?.get ? record.get({ plain: true }) : record;
}

async function validateClassSectionTermIds(classSectionTerms = [], options = {}) {
  const termIds = uniqueValues(classSectionTerms.map((term) => Number(term.classSectionTermId)).filter(Boolean));
  if (!termIds.length) {
    return;
  }

  const validTerms = await examinationSessionRepository.findClassSectionTermsByIds(termIds, options);
  const validTermSet = new Set(validTerms.map((term) => term.classSectionTermId));
  const invalidTerm = termIds.find((id) => !validTermSet.has(id));
  if (invalidTerm !== undefined) {
    throw createBadRequestError(`The selected class section term (ID: ${invalidTerm}) is invalid or does not exist.`);
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
  const classSectionTermIds = uniqueValues(termsList.map((term) => term.classSectionTermId));

  if (classSectionTermIds.length) {
    const classSectionTerms = await examinationSessionRepository.findClassSectionTermsByIds(classSectionTermIds, options);
    const classSectionIds = uniqueValues(classSectionTerms.map((term) => term.classSectionsId));

    if (classSectionIds.length) {
      const classSections = await examinationSessionRepository.findClassSections({
        classSectionsId: { [Op.in]: classSectionIds },
      }, options);
      courseCount = uniqueValues(classSections.map((section) => section.courseId)).length;
    }

    const studentWhere = [];
    if (classSectionTermIds.length) studentWhere.push({ classSectionTermId: { [Op.in]: classSectionTermIds } });
    if (classSectionIds.length) studentWhere.push({ classSectionsId: { [Op.in]: classSectionIds } });

    if (studentWhere.length) {
      totalStudents = await examinationSessionRepository.countStudentClassSectionHistory({ [Op.or]: studentWhere }, options);
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
    const sessionRecord = await examinationSessionRepository.findExaminationSessionAssessmentTypeById(
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
  const components = await examinationSessionRepository.findAssessmentPlanComponentsBySetupTypeId(examSetupTypeId, options);
  return uniqueValues(components.map((component) => component.assessmentPlanId));
}

export async function createExaminationSession(sessionData, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const { classSectionTerms, ...mainData } = sessionData;

    if (mainData.assessmentTypeId) {
      const existing = await examinationSessionRepository.findExaminationSessionByAssessmentTypeId(
        mainData.assessmentTypeId,
        { ...options, transaction },
      );
      if (existing) {
        throw createBadRequestError("An examination session for this assessment type already exists.");
      }
    }

    await validateClassSectionTermIds(classSectionTerms, { ...options, transaction });
    const record = await examinationSessionRepository.createExaminationSession(mainData, { ...options, transaction });

    if (Array.isArray(classSectionTerms) && classSectionTerms.length) {
      const termsToCreate = classSectionTerms.map((term) => ({
        ...term,
        examinationSessionId: record.examinationSessionId,
      }));
      await examinationSessionRepository.createExaminationSessionTerms(termsToCreate, { ...options, transaction });
    }

    return getExaminationSessionById(record.examinationSessionId, { ...options, transaction });
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

  const { count, rows } = await examinationSessionRepository.findAndCountExaminationSessions(
    { where, limit: limitNum, offset },
    options,
  );

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: await Promise.all(rows.map((row) => buildSessionSummary(row, options))),
  };
}

export async function getExaminationSessionById(id, options = {}) {
  const parsedId = Number(id);
  if (Number.isNaN(parsedId)) {
    return null;
  }
  const sessionRecord = await examinationSessionRepository.getExaminationSessionById(parsedId, options);
  return buildSessionSummary(sessionRecord, options);
}

export async function updateExaminationSession(id, updateData = {}, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const sessionId = Number(id);
    const { classSectionTerms, ...mainUpdateData } = updateData;

    if (mainUpdateData.assessmentTypeId) {
      const existing = await examinationSessionRepository.findExaminationSessionByAssessmentTypeIdExcludingId(
        mainUpdateData.assessmentTypeId,
        sessionId,
        { ...options, transaction },
      );
      if (existing) {
        throw createBadRequestError("An examination session for this assessment type already exists.");
      }
    }

    if (Object.keys(mainUpdateData).length) {
      await examinationSessionRepository.updateExaminationSession(sessionId, mainUpdateData, { ...options, transaction });
    }

    if (Array.isArray(classSectionTerms)) {
      await validateClassSectionTermIds(classSectionTerms, { ...options, transaction });
      await examinationSessionRepository.deleteExaminationSessionTermsBySessionId(sessionId, { ...options, transaction });

      if (classSectionTerms.length) {
        const termsToCreate = classSectionTerms.map((term) => ({
          ...term,
          examinationSessionId: sessionId,
        }));
        await examinationSessionRepository.createExaminationSessionTerms(termsToCreate, { ...options, transaction });
      }
    }

    return getExaminationSessionById(sessionId, { ...options, transaction });
  });
}

export async function deleteExaminationSession(id, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const existing = await examinationSessionRepository.getExaminationSessionById(id, { ...options, transaction });
    if (!existing) {
      return null;
    }

    await examinationSessionRepository.deleteExaminationSession(id, { ...options, transaction });
    return { message: "Examination session deleted successfully" };
  });
}

export async function createExaminationSessionTerm(termData, options = {}) {
  return sequelize.transaction(async (transaction) => {
    await validateClassSectionTermIds([termData], { ...options, transaction });
    return examinationSessionRepository.createExaminationSessionTerm(termData, { ...options, transaction });
  });
}

export async function deleteExaminationSessionTerm(examinationSessionTermId, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const existing = await examinationSessionRepository.findExaminationSessionTermById(
      examinationSessionTermId,
      { ...options, transaction },
    );
    if (!existing) {
      return null;
    }

    await examinationSessionRepository.deleteExaminationSessionTerm(examinationSessionTermId, { ...options, transaction });
    return { message: "Examination session term mapping deleted successfully" };
  });
}

export async function getClassSectionTermsBySetupType(examSetupTypeId, options = {}) {
  const setupTypeId = await getSetupTypeId(examSetupTypeId, options);
  if (!setupTypeId) {
    return [];
  }

  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) {
    return [];
  }

  const subjectMappings = await examinationSessionRepository.findAssessmentPlanSubjectMappings({
    assessmentPlanId: { [Op.in]: planIds },
  }, options);
  const subjectIds = uniqueValues(subjectMappings.map((mapping) => mapping.subjectId));
  if (!subjectIds.length) {
    return [];
  }

  const subjects = await examinationSessionRepository.findSubjects({
    subjectId: { [Op.in]: subjectIds },
  }, options);
  const subjectMap = new Map(subjects.map((subject) => [subject.subjectId, subject]));
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
    examinationSessionRepository.findCoursesByIds(uniqueValues(groups.map((group) => group.courseId)), options),
    examinationSessionRepository.findSessionsByIds(uniqueValues(groups.map((group) => group.sessionId)), options),
  ]);
  const courseMap = new Map(courses.map((course) => [course.courseId, course]));
  const sessionMap = new Map(sessions.map((session) => [session.sessionId, session]));
  const result = [];

  for (const group of groups) {
    const courseDetails = courseMap.get(group.courseId);
    if (!courseDetails) continue;

    const termsArray = [...group.terms].sort((a, b) => Number(a) - Number(b));
    const classSectionWhere = { courseId: group.courseId };
    if (group.sessionId) classSectionWhere.sessionId = group.sessionId;
    if (group.academicYearId) classSectionWhere.academicYearId = group.academicYearId;

    const classSections = await examinationSessionRepository.findClassSections(classSectionWhere, options);
    const classSectionIds = uniqueValues(classSections.map((section) => section.classSectionsId));
    const allTermDetails = classSectionIds.length && termsArray.length
      ? await examinationSessionRepository.findClassSectionTerms({
          classSectionsId: { [Op.in]: classSectionIds },
          term: { [Op.in]: termsArray },
        }, options)
      : [];

    const termDetails = await Promise.all(termsArray.map(async (term) => {
      const matchingItems = allTermDetails.filter(
        (item) => classSectionIds.includes(item.classSectionsId) && Number(item.term) === Number(term),
      );
      const studentWhere = [];
      const allClassSectionTermIds = uniqueValues(matchingItems.map((item) => item.classSectionTermId));
      const allClassSectionIds = uniqueValues(matchingItems.map((item) => item.classSectionsId));
      if (allClassSectionTermIds.length) studentWhere.push({ classSectionTermId: { [Op.in]: allClassSectionTermIds } });
      if (allClassSectionIds.length) studentWhere.push({ classSectionsId: { [Op.in]: allClassSectionIds } });

      const [studentCount, termSubjects] = await Promise.all([
        studentWhere.length
          ? examinationSessionRepository.countStudentClassSectionHistory({ [Op.or]: studentWhere }, options)
          : 0,
        examinationSessionRepository.findSubjects({
          subjectId: { [Op.in]: [...group.subjectIds] },
          courseId: group.courseId,
          term,
        }, options),
      ]);

      return {
        ...(matchingItems[0] || {}),
        term,
        studentCount,
        subjectCount: termSubjects.length,
        subjects: termSubjects,
      };
    }));

    result.push({
      course: courseDetails,
      session: group.sessionId ? sessionMap.get(group.sessionId) || null : null,
      academicYearId: group.academicYearId,
      terms: termDetails,
    });
  }

  return result;
}

export async function getExaminationStructure(
  { examinationSessionId, examSetupTypeId, academicYearId, courseId, sessionId } = {},
  options = {},
) {
  let setupTypeId = Number(examSetupTypeId);
  let sessionRecord = null;

  if (examinationSessionId) {
    sessionRecord = await examinationSessionRepository.getExaminationSessionById(examinationSessionId, options);
    if (!sessionRecord) return [];
    setupTypeId = Number(sessionRecord.assessmentTypeId);
  }

  if (!setupTypeId) return [];

  const planIds = await getAssessmentPlanIds(setupTypeId, options);
  if (!planIds.length) return [];

  const mappingWhere = { assessmentPlanId: { [Op.in]: planIds } };
  if (courseId) mappingWhere.courseId = Number(courseId);
  if (sessionId) mappingWhere.sessionId = Number(sessionId);

  const subjectMappings = await examinationSessionRepository.findAssessmentPlanSubjectMappings(mappingWhere, options);
  const subjectIds = uniqueValues(subjectMappings.map((mapping) => mapping.subjectId));
  if (!subjectIds.length) return [];

  const subjectWhere = { subjectId: { [Op.in]: subjectIds }, isActive: true };
  if (academicYearId) subjectWhere.academicYearId = Number(academicYearId);

  const subjects = await examinationSessionRepository.findSubjects(subjectWhere, options);
  if (!subjects.length) return [];

  const courses = await examinationSessionRepository.findCoursesByIds(uniqueValues(subjects.map((subject) => subject.courseId)), options);
  const courseMap = new Map(courses.map((course) => [course.courseId, course]));
  const mappings = await examinationSessionRepository.findAssessmentPlanSubjectMappingsWithSession({
    subjectId: { [Op.in]: subjectIds },
  }, options);
  const subjectSessionMap = new Map(mappings.map((mapping) => [
    mapping.subjectId,
    {
      sessionId: mapping.sessionId,
      sessionName: mapping["session.sessionName"] || null,
    },
  ]));
  const mappedCstMap = new Map();
  const plainSession = toPlain(sessionRecord);

  if (plainSession?.examinationSessionTerms) {
    const classSectionIds = uniqueValues(
      plainSession.examinationSessionTerms
        .map((term) => term.classSectionTerm?.classSectionsId),
    );
    const classSections = classSectionIds.length
      ? await examinationSessionRepository.findClassSections({ classSectionsId: { [Op.in]: classSectionIds } }, options)
      : [];
    const classSectionMap = new Map(classSections.map((section) => [section.classSectionsId, section]));

    for (const sessionTerm of plainSession.examinationSessionTerms) {
      const classSectionTerm = sessionTerm.classSectionTerm;
      const classSection = classSectionMap.get(classSectionTerm?.classSectionsId);
      if (classSection) {
        mappedCstMap.set(`${classSection.courseId}_${classSectionTerm.term}`, classSectionTerm.classSectionTermId);
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

  return [...courseSessionGroups.values()].map((group) => {
    let totalSubjects = 0;
    const terms = [...group.termsMap.keys()].sort((a, b) => a - b).map((term) => {
      const termSubjects = group.termsMap.get(term);
      totalSubjects += termSubjects.length;
      return {
        term,
        termTitle: `${group.termType === "Year" ? "Year" : "Semester"} ${term}`,
        classSectionTermId: mappedCstMap.get(`${group.courseId}_${term}`) || null,
        subjectCount: termSubjects.length,
        subjects: termSubjects,
      };
    });

    return {
      examinationSessionId: plainSession?.examinationSessionId || null,
      courseId: group.courseId,
      courseName: group.courseName,
      courseCode: group.courseCode,
      sessionId: group.sessionId,
      sessionName: group.sessionName,
      academicYearId: group.academicYearId,
      totalSubjects,
      terms,
    };
  });
}

export async function getMappedSubjectsBySessionAndTerm(
  { examinationSessionId, term, courseId, sessionId },
  options = {},
) {
  const parsedExaminationSessionId = Number(examinationSessionId);
  if (Number.isNaN(parsedExaminationSessionId)) return [];

  const targetTerm = term !== undefined && term !== null && term !== "" ? Number(term) : null;
  const targetCourseId = courseId !== undefined && courseId !== null && courseId !== "" ? Number(courseId) : null;
  const targetSessionId = sessionId !== undefined && sessionId !== null && sessionId !== "" ? Number(sessionId) : null;
  const examinationSession = await examinationSessionRepository.findExaminationSessionAssessmentTypeById(
    parsedExaminationSessionId,
    options,
  );
  if (!examinationSession?.assessmentTypeId) return [];

  const assessmentPlanIds = await getAssessmentPlanIds(Number(examinationSession.assessmentTypeId), options);
  if (!assessmentPlanIds.length) return [];

  const mappingWhere = { assessmentPlanId: { [Op.in]: assessmentPlanIds } };
  if (targetCourseId !== null) mappingWhere.courseId = targetCourseId;
  if (targetSessionId !== null) mappingWhere.sessionId = targetSessionId;

  const subjectMappings = await examinationSessionRepository.findAssessmentPlanSubjectMappings(mappingWhere, options);
  const uniqueSubjectIds = uniqueValues(subjectMappings.map((mapping) => mapping.subjectId));
  if (!uniqueSubjectIds.length) return [];

  const subjectSessionMap = new Map(subjectMappings.map((mapping) => [mapping.subjectId, mapping.sessionId]));
  const subjectWhere = { subjectId: { [Op.in]: uniqueSubjectIds }, isActive: true };
  if (targetCourseId !== null) subjectWhere.courseId = targetCourseId;
  if (targetTerm !== null) subjectWhere.term = targetTerm;

  const subjects = await examinationSessionRepository.findSubjects(subjectWhere, options);
  
  const scheduledSubjectIdsList = await examinationSessionRepository.findExamScheduledSubjectIds(
    parsedExaminationSessionId,
    subjects.map((sub) => sub.subjectId),
    options
  );
  const scheduledSubjectIds = new Set(scheduledSubjectIdsList);

  return subjects.map((subject) => ({
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    subjectType: subject.subjectType,
    subjectCategory: subject.subjectCategory,
    term: subject.term,
    courseId: subject.courseId,
    sessionId: subjectSessionMap.get(subject.subjectId) || null,
    isExamScheduled: scheduledSubjectIds.has(subject.subjectId),
  }));
}

