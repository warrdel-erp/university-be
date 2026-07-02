import * as courseRepository from "../repository/courseRepository.js";
import { groupClassSectionsByTerm } from "../utility/classSectionIncludes.js";
import { buildTermName, resolveTotalTerms } from "../utility/courseTerms.js";

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
    const { termType } = coursePlain;
    const totalTerms = resolveTotalTerms(coursePlain);

    const classSections =
      await courseRepository.getClassSectionsByCourseAndSession(
        courseId,
        sessionId,
      );

    const sectionPlains = [];
    for (const cs of classSections) {
      sectionPlains.push(cs.get ? cs.get({ plain: true }) : cs);
    }

    const byTerm = groupClassSectionsByTerm(sectionPlains, coursePlain);
    const grouped = [];

    for (let i = 1; i <= totalTerms; i++) {
      const placements = byTerm[i] ?? [];
      const sections = [];

      for (const placement of placements) {
        if (placement.section == null || placement.classSectionsId == null) {
          continue;
        }
        sections.push({
          name: placement.section,
          id: placement.classSectionsId,
          classSectionTermId: placement.classSectionTermId ?? null,
        });
      }

      grouped.push({
        termName: buildTermName(termType, i),
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
