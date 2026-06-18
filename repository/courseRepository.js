import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';

export async function getCourseByCourseId(courseId) {
  try {
    return await scoped(model.courseModel).findOne({
      attributes: ['universityId', 'courseDuration', 'isActive', 'termType', 'totalTerms'],
      where: { courseId },
    });
  } catch (error) {
    console.error('Error in getting course details:', error);
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

export async function getCourseByAcedmicId(acedmicYearId) {
  try {
    return await scoped(model.courseModel).findAll({
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      where: { acedmicYearId },
    });
  } catch (error) {
    console.error('Error in getting course details By Acedmic Year:', error);
    throw error;
  }
}

export async function getAllCourseByInstituteId() {
  try {
    return await scoped(model.courseModel).findAll({
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
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
    const results = await model.classSectionModel.unscoped().findAll({
      where: {
        class: {
          [Op.like]: `%${className}%`,
        },
      },
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
          model: model.studentModel.unscoped(),
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
          model: model.employeeAddressModel.unscoped(),
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

export async function getAllCourses({ acedmicYearId, campusId } = {}) {
  try {
    const instituteScope = buildScope(model.instituteModel);
    const sessionScope = buildScope(model.sessionModel);

    return await scoped(model.courseModel).findAll({
      include: [
        {
          model: model.instituteModel.unscoped(),
          as: 'instituted',
          attributes: ['instituteId', 'instituteName', 'instituteCode', 'campusId'],
          where: { ...instituteScope, ...(campusId && { campusId }) },
          required: true,
        },
        {
          model: model.affiliatedIniversityModel.unscoped(),
          as: 'affiliated',
          attributes: ['affiliatedUniversityId', 'affiliatedUniversityName'],
          required: false,
        },
        {
          model: model.employeeCodeMasterType.unscoped(),
          as: 'courseLevelCourses',
          attributes: ['employeeCodeMasterTypeId', 'code', 'description'],
          required: false,
        },
        {
          model: model.sessionCouseMappingModel.unscoped(),
          as: 'sessionCourseMappings',
          attributes: ['sessionCourseMappingId'],
          required: false,
          include: [
            {
              model: model.sessionModel.unscoped(),
              as: 'session',
              attributes: ['sessionId', 'sessionName', 'acedmicYearId'],
              where: {
                ...sessionScope,
                ...(acedmicYearId && { acedmicYearId }),
              },
              required: Boolean(acedmicYearId),
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

export async function getCourseWithSessionsData(
  courseId,
  acedmicYearId,
  instituteIdFromUser
) {
  try {
    const courseInstituteRow = await scoped(model.courseModel).findOne({
      where: { courseId },
      attributes: ['instituteId'],
      include: [{ model: model.instituteModel.unscoped(), as: 'instituted', attributes: ['campusId'] }],
    });
    if (!courseInstituteRow) return null;

    const { instituteId: courseInstituteId, instituted } = courseInstituteRow.get({ plain: true });
    const instituteCampusId = instituted?.campusId;
    let allowedInstituteIds = [courseInstituteId];

    if (instituteIdFromUser != null) {
      if (instituteCampusId != null) {
        const institutesOnSameCampus = await scoped(model.instituteModel).findAll({
          where: { campusId: instituteCampusId },
          attributes: ['instituteId'],
        });
        if (
          institutesOnSameCampus.some(
            (institute) => institute.instituteId === instituteIdFromUser
          )
        ) {
          allowedInstituteIds = [instituteIdFromUser];
        }
      } else if (instituteIdFromUser === courseInstituteId) {
        allowedInstituteIds = [instituteIdFromUser];
      }
    }

    const instituteScopeWhere =
      allowedInstituteIds.length === 1
        ? { instituteId: allowedInstituteIds[0] }
        : { instituteId: { [Op.in]: allowedInstituteIds } };

    const mappingScope = buildScope(model.sessionCouseMappingModel);
    const sessionScope = buildScope(model.sessionModel);
    const classScope = buildScope(model.classModel);

    const course = await scoped(model.courseModel).findOne({
      where: { courseId },
      include: [
        {
          model: model.sessionCouseMappingModel.unscoped(),
          as: 'sessionCourseMappings',
          attributes: ['sessionCourseMappingId', 'courseId', 'sessionId'],
          where: mappingScope,
          required: false,
          include: [
            {
              model: model.sessionModel.unscoped(),
              as: 'session',
              attributes: [
                'sessionId',
                'sessionName',
                'startingDate',
                'endingDate',
                'classTillDate',
                'acedmicYearId',
              ],
              where: {
                ...sessionScope,
                ...(acedmicYearId ? { acedmicYearId } : {}),
              },
              required: Boolean(acedmicYearId),
              include: [
                {
                  model: model.classSectionModel.unscoped(),
                  as: 'classSession',
                  attributes: ['classSectionsId', 'section'],
                  required: false,
                  where: { courseId, ...instituteScopeWhere },
                },
                {
                  model: model.classModel.unscoped(),
                  as: 'classes',
                  attributes: ['classId', 'term'],
                  required: false,
                  where: { courseId, ...classScope, ...instituteScopeWhere },
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

      const termNumbersHavingClasses = new Set(
        (session.classes || []).map((classRow) => classRow.term).filter(Boolean)
      );
      session.missingTerms = Array.from({ length: totalTerms }, (_, index) => index + 1)
        .filter((termNumber) => !termNumbersHavingClasses.has(termNumber))
        .map((termNumber) => termTypePrefix + termNumber);
      delete session.classes;

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
      include: [
        {
          model: model.classModel.unscoped(),
          as: 'classGroup',
          attributes: ['term'],
        },
      ],
      attributes: ['classSectionsId', 'section'],
    });
  } catch (error) {
    console.error('Error in Course Repository (getClassSectionsByCourseAndSession):', error);
    throw error;
  }
}

export async function getCourseListWithSubjects(acedmicYearId) {
  try {
    const subjectScope = buildScope(model.subjectModel);

    return await scoped(model.courseModel).findAll({
      include: [
        {
          model: model.subjectModel.unscoped(),
          as: 'subjectInfo',
          attributes: ['subjectId', 'subjectCode'],
          where: {
            ...subjectScope,
            ...(acedmicYearId && { acedmicYearId }),
          },
          required: false,
        },
        {
          model: model.affiliatedIniversityModel.unscoped(),
          as: 'affiliated',
          attributes: ['affiliatedUniversityId', 'affiliatedUniversityName'],
          required: false,
        },
        {
          model: model.employeeCodeMasterType.unscoped(),
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
