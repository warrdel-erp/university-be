import * as model from '../models/index.js';
import { Op, fn, col } from 'sequelize';
import sequelize from '../database/sequelizeConfig.js';
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
    const scopeWhere = buildScope(model.courseModel);
    const where = omitAcademicYearScope(scopeWhere);
    where.courseId = courseId;
    return await model.courseModel.findOne({
      attributes: ['courseId', 'courseName', 'courseCode', 'universityId', 'instituteId', 'courseDuration', 'isActive', 'termType', 'totalTerms'],
      where,
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
      if (classSection.section === Section) {
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

export async function getEmployeeByuserId(userId) {
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
      where: { userId },
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
      attributes: ['classSectionsId', 'section', 'year'],
      order: [['year', 'ASC'], ['section', 'ASC']],
      raw: true,
    });
  } catch (error) {
    console.error('Error in Course Repository (getClassSectionsByCourseAndSession):', error);
    throw error;
  }
}

export async function countStudentsByClassSectionIds(classSectionsIds) {
  const ids = [];
  for (const classSectionsId of classSectionsIds) {
    ids.push(Number(classSectionsId));
  }

  const countMap = new Map();
  for (const id of ids) {
    countMap.set(id, 0);
  }
  if (!ids.length) {
    return countMap;
  }

  const termWhere = { classSectionsId: { [Op.in]: ids } };

  const [studentRows, mapperRows, overlapRows] = await Promise.all([
    scoped(model.studentModel).findAll({
      attributes: [
        [col('studentClassSectionTerm.class_sections_id'), 'classSectionsId'],
        [fn('COUNT', fn('DISTINCT', col('students.student_id'))), 'studentCount'],
      ],
      include: [{
        model: model.classSectionTermModel,
        as: 'studentClassSectionTerm',
        attributes: [],
        required: true,
        where: termWhere,
      }],
      group: [col('studentClassSectionTerm.class_sections_id')],
      raw: true,
      subQuery: false,
    }),
    scoped(model.classStudentMapperModel).findAll({
      attributes: [
        [col('studentTermPlacement.class_sections_id'), 'classSectionsId'],
        [fn('COUNT', fn('DISTINCT', col('class_student_mapper.student_id'))), 'studentCount'],
      ],
      include: [{
        model: model.classSectionTermModel,
        as: 'studentTermPlacement',
        attributes: [],
        required: true,
        where: termWhere,
      }],
      group: [col('studentTermPlacement.class_sections_id')],
      raw: true,
      subQuery: false,
    }),
    scoped(model.classStudentMapperModel).findAll({
      attributes: [
        [col('studentTermPlacement.class_sections_id'), 'classSectionsId'],
        [fn('COUNT', fn('DISTINCT', col('class_student_mapper.student_id'))), 'overlapCount'],
      ],
      include: [
        {
          model: model.classSectionTermModel,
          as: 'studentTermPlacement',
          attributes: [],
          required: true,
          where: termWhere,
        },
        {
          model: model.studentModel,
          as: 'studentMapped',
          attributes: [],
          required: true,
          include: [{
            model: model.classSectionTermModel,
            as: 'studentClassSectionTerm',
            attributes: [],
            required: true,
            where: {
              classSectionsId: { [Op.eq]: col('studentTermPlacement.class_sections_id') },
            },
          }],
        },
      ],
      group: [col('studentTermPlacement.class_sections_id')],
      raw: true,
      subQuery: false,
    }),
  ]);

  const studentCountBySection = new Map();
  for (const row of studentRows) {
    studentCountBySection.set(Number(row.classSectionsId), Number(row.studentCount));
  }

  const mapperCountBySection = new Map();
  for (const row of mapperRows) {
    mapperCountBySection.set(Number(row.classSectionsId), Number(row.studentCount));
  }

  const overlapCountBySection = new Map();
  for (const row of overlapRows) {
    overlapCountBySection.set(Number(row.classSectionsId), Number(row.overlapCount));
  }

  for (const id of ids) {
    const studentCount = studentCountBySection.get(id) ?? 0;
    const mapperCount = mapperCountBySection.get(id) ?? 0;
    const overlapCount = overlapCountBySection.get(id) ?? 0;
    countMap.set(id, studentCount + mapperCount - overlapCount);
  }

  return countMap;
}

export async function getSessionSummaryById(sessionId) {
  try {
    const scopeWhere = buildScope(model.sessionModel);
    const where = omitAcademicYearScope(scopeWhere);
    where.sessionId = sessionId;
    return await model.sessionModel.findOne({
      where,
      attributes: ['sessionId', 'sessionName'],
      raw: true,
    });
  } catch (error) {
    console.error('Error in Course Repository (getSessionSummaryById):', error);
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

export async function getSubjectsByTeacherUserId(userId, searchKey) {
  try {
    const searchFilter = searchKey
      ? {
          [Op.or]: [
            { subjectName: { [Op.like]: `%${searchKey}%` } },
            { subjectCode: { [Op.like]: `%${searchKey}%` } },
          ],
        }
      : {};

    const subjects = await scoped(model.subjectModel).findAll({
      attributes: [
        "subjectId",
        "subjectName",
        "subjectCode",
      ],
      include: [
        {
          model: model.teacherSubjectMappingModel,
          as: "employeeSubject",
          attributes: [],
          required: false,
          where: {
            userId,
          },
        },
        {
          model: model.timeTableCellModel,
          as: "timeTableCells",
          attributes: [],
          required: false,
          include: [
            {
              model: model.timeTableCellTeachersModel,
              as: "timeTableCellTeachers",
              attributes: [],
              required: false,
              where: {
                userId,
              },
            },
          ],
        },
      ],
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              {
                "$employeeSubject.user_id$": userId,
              },
              {
                "$timeTableCells->timeTableCellTeachers.user_id$": userId,
              },
            ],
          },
          searchFilter,
        ],
      },
      group: [
        "subject.subject_id",
        "subject.subject_name",
        "subject.subject_code",
      ],
      raw: true,
    });

    return subjects;
  } catch (error) {
    console.error("Error fetching subjects by teacher userId:", error);
    throw error;
  }
}

export async function getSubjectByTeacherUserIdAndSubjectId(userId, subjectId) {
  try {
    const subject = await scoped(model.subjectModel).findOne({
      attributes: [
        "subjectId",
        "subjectName",
        "subjectCode",
      ],
      include: [
        {
          model: model.teacherSubjectMappingModel,
          as: "employeeSubject",
          attributes: [],
          required: false,
          where: {
            userId,
          },
        },
        {
          model: model.timeTableCellModel,
          as: "timeTableCells",
          attributes: [],
          required: false,
          include: [
            {
              model: model.timeTableCellTeachersModel,
              as: "timeTableCellTeachers",
              attributes: [],
              required: false,
              where: {
                userId,
              },
            },
          ],
        },
      ],
      where: {
        subjectId,
        [Op.or]: [
          {
            "$employeeSubject.user_id$": userId,
          },
          {
            "$timeTableCells->timeTableCellTeachers.user_id$": userId,
          },
        ],
      },
      group: [
        "subject.subject_id",
        "subject.subject_name",
        "subject.subject_code",
      ],
      raw: true,
    });

    return subject;
  } catch (error) {
    console.error("Error fetching subject by teacher userId and subjectId:", error);
    throw error;
  }
}
