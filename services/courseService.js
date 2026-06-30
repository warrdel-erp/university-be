import * as courseRepository from "../repository/courseRepository.js";

import { resolveProgramTerm } from "../utility/classSectionIncludes.js";

import { buildTermName } from "../utility/courseTerms.js";

export const listCourses = async (options = {}) => {
  return courseRepository.getAllCourses(options);
};

export const getCourseWithSubjects = async (academicYearId) => {
  try {
    return await courseRepository.getCourseListWithSubjects(academicYearId);
  } catch (error) {
    console.error("Error in Course Service (getCourseWithSubjects):", error);

    throw error;
  }
};

export const getCourseWithSessions = async (courseId) => {
  try {
    return await courseRepository.getCourseWithSessionsData(courseId);
  } catch (error) {
    console.error("Error in Course Service (getCourseWithSessions):", error);

    throw error;
  }
};

export const getTermsWithClassSections = async (courseId, sessionId) => {
  try {
    const course = await courseRepository.getCourseByCourseId(courseId);

    if (!course) {
      const error = new Error("Course not found");

      error.statusCode = 404;

      throw error;
    }

    const coursePlain = course.get ? course.get({ plain: true }) : course;

    const { termType, totalTerms } = coursePlain;

    const classSections =
      await courseRepository.getClassSectionsByCourseAndSession(
        courseId,
        sessionId,
      );

    const grouped = [];

    for (let i = 1; i <= (totalTerms || 0); i++) {
      const termName = buildTermName(termType, i);

      const sections = classSections

        .filter((cs) => {
          const plain = cs.get ? cs.get({ plain: true }) : cs;

          const sectionTerm = resolveProgramTerm(plain);

          return sectionTerm != null && Number(sectionTerm) === i;
        })

        .map((cs) => {
          const plain = cs.get ? cs.get({ plain: true }) : cs;

          const termRow = (plain.classSectionTerms ?? []).find(
            (row) => Number(row.term) === i,
          );

          return {
            name: plain.section,

            id: plain.classSectionsId,

            classSectionTermId: termRow?.classSectionTermId ?? null,
          };
        })

        .filter((section) => section.name != null && section.id != null);

      grouped.push({
        termName,

        term: i,

        classSections: sections,
      });
    }

    return grouped;
  } catch (error) {
    console.error(
      "Error in Course Service (getTermsWithClassSections):",
      error,
    );

    throw error;
  }
};

export const getTermOptionsByCourse = async (courseId) => {
  try {
    const course = await courseRepository.getCourseByCourseId(courseId);

    if (!course) {
      const error = new Error("Course not found");

      error.statusCode = 404;

      throw error;
    }

    const termType = course.termType || "Term";

    const totalTerms = course.totalTerms || 0;

    const terms = [];

    for (let i = 1; i <= totalTerms; i++) {
      terms.push({
        termName: `${termType} ${i}`,

        term: i,
      });
    }

    return terms;
  } catch (error) {
    console.error("Error in Course Service (getTermOptionsByCourse):", error);

    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  const result = await courseRepository.deleteCourseById(courseId);

  if (!result) {
    const error = new Error("Course not found");

    error.statusCode = 404;

    throw error;
  }

  return result;
};
