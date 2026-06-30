import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { getTenantStore } from '../utility/requestContext.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { classSectionTermsInclude } from '../utility/classSectionIncludes.js';
import { buildCourseTermOptions } from '../utility/courseTerms.js';

function omitAcademicYearScope(scopeWhere = {}) {
  const { academicYearId, ...rest } = scopeWhere;
  return rest;
}

export async function getCourseByCourseId(courseId) {
  try {
    return await scoped(model.courseModel).findOne({
      attributes: ['courseId', 'universityId', 'courseDuration', 'isActive', 'termType', 'totalTerms'],
      where: { courseId },
    });
  } catch (error) {
    console.error('Error in getting course details:', error);
    throw error;
  }
}

export async function updateCourseById(courseId, data) {
  try {
    const existing = await scoped(model.courseModel).findOne({
      where: { courseId },
      attributes: ['courseId'],
    });
    if (!existing) {
      return null;
    }

    await scoped(model.courseModel).update(data, {
      where: { courseId },
    });

    return scoped(model.courseModel).findOne({
      where: { courseId },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
    });
  } catch (error) {
    console.error(`Error updating course ${courseId}:`, error);
    throw error;
  }
}

export async function addBulkCourse(courseData) {
  try {
    return await scoped(model.courseModel).bulkCreate(courseData);
  } catch (error) {
    console.error('Error in add course bulk:', error);
    throw error;
  }
}

export async function changeCourseStatuss(courseId, status) {
  try {
    const existing = await scoped(model.courseModel).findOne({
      where: { courseId },
      attributes: ['courseId'],
    });
    if (!existing) {
      return [0];
    }

    return await scoped(model.courseModel).update(status, {
      where: { courseId },
    });
  } catch (error) {
    console.error(`Error change coursse status ${courseId}:`, error);
    throw error;
  }
}

export async function assertCourseIsActive(courseId, action = 'perform this action') {
  const course = await scoped(model.courseModel).findOne({
    where: { courseId },
    attributes: ['courseId', 'isActive', 'courseName'],
  });

  if (!course) {
    throw new Error('Course not found');
  }

  if (!course.isActive) {
    const label = course.courseName ? `"${course.courseName}"` : `ID ${courseId}`;
    throw new Error(`Course ${label} is inactive and cannot ${action}`);
  }

  return course;
}

export async function getCourseByAcedmicId(academicYearId) {
  try {
    return await scoped(model.courseModel).findAll({
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      where: { academicYearId },
    });
  } catch (error) {
    console.error('Error in getting course details By Acedmic Year:', error);
    throw error;
  }
}

export async function getAllCourseByInstituteId(instituteId) {
  try {
    const store = getTenantStore();
    if (!store?.universityId) {
      throw new Error('University scope required');
    }

    return await scoped(model.courseModel).findAll({
      where: {
        instituteId,
        universityId: store.universityId,
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      order: [['courseName', 'ASC']],
    });
  } catch (error) {
    console.error('Error in getting course details By InstituteI:', error);
    throw error;
  }
}

export async function getCourseByName(courseName) {
  try {
    return await scoped(model.courseModel).findOne({
      attributes: ['courseId'],
      where: {
        courseName: {
          [Op.like]: `%${courseName}%`,
        },
      },
    });
  } catch (error) {
    console.error('Error in getting course details By Course Name:', error);
    throw error;
  }
}

export async function getClassByName(className, Section) {
  try {
    const parsedYear = Number(className);
    const where = Number.isInteger(parsedYear) && parsedYear > 0
      ? { year: parsedYear }
      : {};

    const results = await scoped(model.classSectionModel).findAll({
      where,
    });

    if (results.length === 0) {
      throw new Error('No class sections found for the given class name');
    }

    const matchedClassSectionsIds = [];

    for (const classSection of results) {
      const section = await scoped(model.sectionModel).findOne({
        where: { sectionId: classSection.sectionId },
      });

      if (section && section.sectionName === Section) {
        matchedClassSectionsIds.push({
          classSectionsId: classSection.classSectionsId,
        });
      }
    }

    return matchedClassSectionsIds;
  } catch (error) {
    console.error('Error in getting course details by class name:', error);
    throw error;
  }
}

export async function getStudentBySectionId(classSectionId) {
  try {
    return await scoped(model.classStudentMapperModel).findAll({
      attributes: ['studentId'],
      include: [
        {
          model: model.studentModel,
          as: 'studentMapped',
          attributes: ['scholarNumber', 'email', 'phoneNumber'],
        },
      ],
      where: {
        class_sections_id: classSectionId,
      },
    });
  } catch (error) {
    console.error('Error in getting student by SectionId:', error);
    throw error;
  }
}

export async function getEmployeeByemployeeId(employeeId) {
  try {
    return await scoped(model.employeeModel).findAll({
      attributes: ['employeeName'],
      include: [
        {
          model: model.employeeAddressModel,
          as: 'address',
          attributes: ['phoneNumber', 'mobileNumber', 'personal_email', 'officalEmailId'],
        },
      ],
      where: { employeeId },
    });
  } catch (error) {
    console.error('Error in getting employee details:', error);
    throw error;
  }
}

export async function getAllCourses({ campusId } = {}) {
  try {
    const instituteScope = buildScope(model.instituteModel);

    return await scoped(model.courseModel).findAll({
      include: [
        {
          model: model.instituteModel,
          as: 'instituted',
          attributes: ['instituteId', 'instituteName', 'instituteCode', 'campusId'],
          where: { ...instituteScope, ...(campusId && { campusId }) },
          required: true,
        },
        {
          model: model.affiliatedIniversityModel,
          as: 'affiliated',
          attributes: ['affiliatedUniversityId', 'affiliatedUniversityName'],
          required: false,
        },
        {
          model: model.employeeCodeMasterType,
          as: 'courseLevelCourses',
          attributes: ['employeeCodeMasterTypeId', 'code', 'description'],
          required: false,
        },
        {
          model: model.sessionCouseMappingModel,
          as: 'sessionCourseMappings',
          attributes: ['sessionCourseMappingId'],
          required: false,
          include: [
            {
              model: model.sessionModel,
              as: 'session',
              attributes: ['sessionId', 'sessionName', 'academicYearId'],
              where: buildScope(model.sessionModel),
              required: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error in Course Repository (getAllCourses):', error);
    throw error;
  }
}

export async function getCourseWithSessionsData(courseId) {
  try {
    const classSectionScope = buildScope(model.classSectionModel);

    const course = await scoped(model.courseModel).findOne({
      where: { courseId },
      include: [
        {
          model: model.sessionCouseMappingModel,
          as: 'sessionCourseMappings',
          attributes: ['sessionCourseMappingId', 'courseId', 'sessionId'],
          required: false,
          include: [
            {
              model: model.sessionModel,
              as: 'session',
              attributes: [
                'sessionId',
                'sessionName',
                'startingDate',
                'endingDate',
                'classTillDate',
                'academicYearId',
              ],
              where: buildScope(model.sessionModel),
              required: true,
              include: [
                {
                  model: model.classSectionModel,
                  as: 'classSession',
                  attributes: ['classSectionsId', 'section'],
                  required: false,
                  where: { courseId, ...classSectionScope },
                  include: [classSectionTermsInclude()],
                },
              ],
            },
          ],
        },
      ],
    });
    if (!course) return null;

    const coursePayload = course.get({ plain: true });
    const dedupedSessionIds = new Set();
    coursePayload.sessionCourseMappings = (coursePayload.sessionCourseMappings || []).filter(
      (sessionCourseMapping) => {
        const sessionId = sessionCourseMapping.session?.sessionId;
        if (sessionId == null) return false;
        if (dedupedSessionIds.has(sessionId)) return false;
        dedupedSessionIds.add(sessionId);
        return true;
      }
    );

    const totalTerms = coursePayload.totalTerms || 0;
    const termTypePrefix = `${coursePayload.termType ?? ''} `;

    for (const sessionCourseMapping of coursePayload.sessionCourseMappings) {
      const session = sessionCourseMapping.session;
      if (!session) continue;

      const termNumbersHavingClasses = new Set();
      for (const classSectionRow of session.classSession || []) {
        for (const termRow of classSectionRow.classSectionTerms || []) {
          if (termRow.term) {
            termNumbersHavingClasses.add(termRow.term);
          }
        }
      }
      session.missingTerms = Array.from({ length: totalTerms }, (_, index) => index + 1)
        .filter((termNumber) => !termNumbersHavingClasses.has(termNumber))
        .map((termNumber) => termTypePrefix + termNumber);

      const dedupedClassSectionIds = new Set();
      session.classSession = (session.classSession || [])
        .filter(
          (classSectionRow) =>
            classSectionRow?.classSectionsId &&
            !dedupedClassSectionIds.has(classSectionRow.classSectionsId) &&
            dedupedClassSectionIds.add(classSectionRow.classSectionsId)
        )
        .map((classSectionRow) => ({
          classSectionsId: classSectionRow.classSectionsId,
          section: classSectionRow.section,
        }));
    }

    return coursePayload;
  } catch (error) {
    console.error('Error in Course Repository (getCourseWithSessionsData):', error);
    throw error;
  }
}

export async function getClassSectionsByCourseAndSession(courseId, sessionId) {
  try {
    return await scoped(model.classSectionModel).findAll({
      where: { courseId, sessionId },
      include: [classSectionTermsInclude()],
      attributes: ['classSectionsId', 'section'],
    });
  } catch (error) {
    console.error('Error in Course Repository (getClassSectionsByCourseAndSession):', error);
    throw error;
  }
}

export async function getCourseListWithSubjects(academicYearId) {
  try {
    const subjectScope = buildScope(model.subjectModel);

    return await scoped(model.courseModel).findAll({
      include: [
        {
          model: model.subjectModel,
          as: 'subjectInfo',
          attributes: ['subjectId', 'subjectCode'],
          where: {
            ...subjectScope,
            ...(academicYearId && { academicYearId }),
          },
          required: false,
        },
        {
          model: model.affiliatedIniversityModel,
          as: 'affiliated',
          attributes: ['affiliatedUniversityId', 'affiliatedUniversityName'],
          required: false,
        },
        {
          model: model.employeeCodeMasterType,
          as: 'courseLevelCourses',
          attributes: ['employeeCodeMasterTypeId', 'code', 'description'],
          required: false,
        },
      ],
    });
  } catch (error) {
    console.error('Error in Course Repository (getCourseListWithSubjects):', error);
    throw error;
  }
}

export async function getSessionAcademicYearId(sessionId) {
  try {
    const session = await scoped(model.sessionModel).findOne({
      where: { sessionId },
      attributes: ['academicYearId'],
      raw: true,
    });
    return session?.academicYearId ?? null;
  } catch (error) {
    console.error('Error in Course Repository (getSessionAcademicYearId):', error);
    throw error;
  }
}

export async function getSemestersByCourseId(courseId) {
  try {
    const course = await scoped(model.courseModel).findOne({
      where: { courseId: Number(courseId) },
      attributes: ['courseId', 'termType', 'totalTerms', 'courseDuration'],
      raw: true,
    });
    if (!course) return [];
    return buildCourseTermOptions(course);
  } catch (error) {
    console.error('Error in Course Repository (getSemestersByCourseId):', error);
    throw error;
  }
}

/** Explicit academic year — scoped() would override with request context year. */
export async function getSemestersByCourseAndYear(courseId, academicYearId) {
  try {
    const options = await getSemestersByCourseId(courseId);
    const yearId = Number(academicYearId);
    return options.map((opt) => ({ ...opt, academicYearId: yearId }));
  } catch (error) {
    console.error('Error in Course Repository (getSemestersByCourseAndYear):', error);
    throw error;
  }
}

export async function deleteCourseById(courseId) {
  try {
    const numericCourseId = Number(courseId);

    const course = await scoped(model.courseModel).findOne({
      where: { courseId: numericCourseId },
      attributes: ['courseId', 'courseName'],
    });

    if (!course) {
      return null;
    }

    const sessionMappingCount = await model.sessionCouseMappingModel.count({
      where: { courseId: numericCourseId },
    });

    if (sessionMappingCount > 0) {
      throw new Error('Cannot delete course: it is mapped to one or more sessions');
    }

    await scoped(model.courseModel).destroy({
      where: { courseId: numericCourseId },
    });

    return {
      courseId: numericCourseId,
      courseName: course.courseName ?? course.dataValues?.courseName,
      message: 'Course deleted successfully',
    };
  } catch (error) {
    console.error(`Error deleting course ${courseId}:`, error);
    throw error;
  }
}
