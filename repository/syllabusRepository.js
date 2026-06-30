import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { buildCourseTermOptions } from '../utility/courseTerms.js';

function omitAcademicYearScope(scopeWhere = {}) {
  const { academicYearId, ...rest } = scopeWhere;
  return rest;
}

function buildUnitWhere({ academicYearId, syllabusUnitId, subjectId, sessionId, semesterId }) {
  const where = {};
  if (academicYearId != null) where.academicYearId = Number(academicYearId);
  if (syllabusUnitId != null) where.syllabusUnitId = Number(syllabusUnitId);
  if (subjectId != null) where.subjectId = Number(subjectId);
  if (sessionId != null) where.sessionId = Number(sessionId);
  if (semesterId != null) where.semesterId = Number(semesterId);
  return where;
}
const unitIncludes = [
  {
    model: model.instituteModel,
    as: 'instituteUnit',
    attributes: ['instituteName', 'instituteCode'],
  },
  {
    model: model.acedmicYearModel,
    as: 'acedmicYearUnit',
    attributes: ['yearTitle', 'startingDate', 'endingDate'],
  },
  {
    model: model.sessionModel,
    as: 'sessionUnit',
    attributes: ['sessionName'],
  },
  {
    model: model.subjectModel,
    as: 'subjectUnit',
    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
    include: [
      {
        model: model.courseModel,
        as: 'courseInfo',
        attributes: ['termType'],
        required: false,
      },
    ],
  },
];

export async function addSyllabus(syllabusData, options = {}) {
  try {
    return await scoped(model.syllabusModel).create(syllabusData, options);
  } catch (error) {
    console.error('Error in add Syllabus :', error);
    throw error;
  }
}

export async function addSyllabusDetails(syllabusData, options = {}) {
  try {
    return await scoped(model.syllabusDetailsModel).bulkCreate(syllabusData, options);
  } catch (error) {
    console.error('Error in add Syllabus details:', error);
    throw error;
  }
}

export async function getSyllabusDetails(academicYearId) {
  try {
    return await scoped(model.syllabusModel).findAll({
      where: {
        ...(academicYearId && { academicYearId }),
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
      },
      include: [
        {
          model: model.instituteModel,
          as: 'syllabusInstitute',
          attributes: ['instituteName', 'instituteCode'],
          include: [
            {
              model: model.campusModel,
              as: 'campues',
              attributes: ['campusName', 'campusCode'],
            },
          ],
        },
        {
          model: model.acedmicYearModel,
          as: 'syllabusAcedmicYear',
          attributes: ['yearTitle', 'startingDate', 'endingDate'],
        },
        {
          model: model.courseModel,
          as: 'syllabusCourse',
          attributes: ['courseName', 'courseCode'],
        },
        {
          model: model.syllabusDetailsModel,
          as: 'syllabusDetails',
          attributes: {
            exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
          },
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching Syllabus with details:', error);
    throw error;
  }
}

export async function getSingleSyllabusDetails(SyllabusId) {
  try {
    const syllabus = await scoped(model.syllabusModel).findOne({
      where: { syllabusId: SyllabusId },
      attributes: ['syllabusId'],
    });
    if (!syllabus) {
      return null;
    }

    return await scoped(model.syllabusDetailsModel).findOne({
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      where: { syllabusId: SyllabusId },
    });
  } catch (error) {
    console.error('Error fetching Syllabus details:', error);
    throw error;
  }
}

export async function deleteSyllabus(SyllabusId) {
  const existing = await scoped(model.syllabusModel).findOne({
    where: { syllabusId: SyllabusId },
    attributes: ['syllabusId'],
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.syllabusModel).destroy({ where: { syllabusId: SyllabusId } });
  return deleted > 0;
}

export async function updateSyllabus(SyllabusId, syllabusData) {
  try {
    const existing = await scoped(model.syllabusModel).findOne({
      where: { syllabusId: SyllabusId },
      attributes: ['syllabusId'],
    });
    if (!existing) {
      return [0];
    }

    return await scoped(model.syllabusModel).update(syllabusData, {
      where: { syllabusId: SyllabusId },
    });
  } catch (error) {
    console.error(`Error updating Syllabus creation ${SyllabusId}:`, error);
    throw error;
  }
}

export async function courseAllSubject(courseId, sessionId) {
  try {
    const courseScope = buildScope(model.courseModel);

    return await scoped(model.syllabusModel).findAll({
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'institute_id', 'acedmic_year_id', 'course_id'],
      },
      where: { courseId, sessionId },
      include: [
        {
          model: model.courseModel,
          as: 'syllabusCourse',
          attributes: ['courseName', 'courseCode'],
          where: courseScope,
          required: true,
        },
        {
          model: model.syllabusDetailsModel,
          as: 'syllabusDetails',
          attributes: {
            exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'syllabus_id', 'subject_id'],
          },
          include: [
            {
              model: model.subjectModel,
              as: 'syllabusSubject',
              attributes: {
                exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
              },
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching Syllabus details:', error);
    throw error;
  }
}

export async function getSubjectForUnitResolution(subjectId) {
  try {
    return scoped(model.subjectModel).findOne({
      where: { subjectId: Number(subjectId) },
      attributes: ['subjectId', 'courseId', 'term', 'instituteId', 'campusId', 'academicYearId'],
      include: [
        {
          model: model.courseModel,
          as: 'courseInfo',
          attributes: ['courseId', 'termType'],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching subject for syllabus unit:', error);
    throw error;
  }
}

export async function validateSubjectForSyllabusUnit({ subjectId, academicYearId, sessionId }) {
  const subject = await scoped(model.subjectModel).findOne({
    where: {
      subjectId: Number(subjectId),
      academicYearId: Number(academicYearId),
    },
    attributes: ['subjectId', 'courseId', 'academicYearId'],
  });

  if (!subject) {
    throw new Error('Subject not found for this academic year');
  }

  const session = await scoped(model.sessionModel).findOne({
    where: {
      sessionId: Number(sessionId),
      academicYearId: Number(academicYearId),
    },
    attributes: ['sessionId'],
  });

  if (!session) {
    throw new Error('Session not found for this academic year');
  }

  const courseSession = await scoped(model.sessionCouseMappingModel).findOne({
    where: {
      sessionId: Number(sessionId),
      courseId: subject.courseId,
    },
    attributes: ['sessionCourseMappingId'],
  });

  if (!courseSession) {
    throw new Error('Session is not mapped to the subject course');
  }

  return subject;
}

export async function getSemestersForCourse(courseId) {
  try {
    const course = await scoped(model.courseModel).findOne({
      where: { courseId: Number(courseId) },
      attributes: ['courseId', 'termType', 'totalTerms', 'courseDuration'],
      raw: true,
    });
    if (!course) return [];
    return buildCourseTermOptions(course);
  } catch (error) {
    console.error('Error fetching semesters for syllabus unit:', error);
    throw error;
  }
}

export async function backfillSubjectCampusId(subjectId) {
  try {
    const subject = await scoped(model.subjectModel).findOne({
      where: { subjectId: Number(subjectId) },
      attributes: ['subjectId', 'campusId', 'instituteId'],
    });

    if (!subject || subject.campusId) {
      return subject?.campusId ?? null;
    }

    const institute = await scoped(model.instituteModel).findOne({
      where: { instituteId: subject.instituteId },
      attributes: ['campusId'],
      raw: true,
    });

    if (!institute?.campusId) {
      return null;
    }

    await scoped(model.subjectModel).update(
      { campusId: institute.campusId },
      { where: { subjectId: Number(subjectId) } },
    );

    return institute.campusId;
  } catch (error) {
    console.error('Error backfilling subject campusId:', error);
    throw error;
  }
}

export async function addSyllabusUnit(syllabusData) {
  try {
    return await scoped(model.syllabusUnitModel).bulkCreate(syllabusData);
  } catch (error) {
    console.error('Error in add Syllabus unit :', error);
    throw error;
  }
}

export async function syllabusUnitGet(subjectId) {
  try {
    return await scoped(model.syllabusUnitModel).findAll({
      where: { subjectId: Number(subjectId) },
      attributes: { exclude: ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'] },
      order: [['unitNumber', 'ASC']],
      include: unitIncludes,
    });
  } catch (error) {
    console.error('Error fetching syllabus unit with details:', error);
    throw error;
  }
}

export async function getSyllabusUnitById(syllabusUnitId, academicYearId) {
  try {
    return await scoped(model.syllabusUnitModel).findOne({
      where: buildUnitWhere({ syllabusUnitId, academicYearId }),
      attributes: { exclude: ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'] },
    });  } catch (error) {
    console.error('Error fetching syllabus unit by id:', error);
    throw error;
  }
}

export async function updateSyllabusUnit(syllabusUnitId, academicYearId, data) {
  try {
    const existing = await getSyllabusUnitById(syllabusUnitId, academicYearId);
    if (!existing) {
      return null;
    }

    await scoped(model.syllabusUnitModel).update(data, {
      where: buildUnitWhere({ syllabusUnitId, academicYearId }),
    });
    return getSyllabusUnitById(syllabusUnitId, academicYearId);
  } catch (error) {
    console.error('Error updating syllabus unit:', error);
    throw error;
  }
}

export async function deleteSyllabusUnit(syllabusUnitId) {
  try {
    const existing = await scoped(model.syllabusUnitModel).findByPk(Number(syllabusUnitId));
    if (!existing) {
      return false;
    }

    const deleted = await scoped(model.syllabusUnitModel).destroy({
      where: { syllabusUnitId: Number(syllabusUnitId) },
    });
    return deleted > 0;
  } catch (error) {
    console.error('Error deleting syllabus unit:', error);
    throw error;
  }
}

export async function semesterAllSubject(semesterId) {
  try {
    return await scoped(model.semesterModel).findAll({
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      where: { semesterId },
      include: [
        {
          model: model.classSubjectMapperModel,
          as: 'semestermapping',
          attributes: ['classSubjectMapperId', 'subjectId', 'semesterId'],
          include: [
            {
              model: model.subjectModel,
              as: 'subjects',
              attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType'],
              include: [
                {
                  model: model.syllabusDetailsModel,
                  as: 'syllabusSubject',
                  attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                  include: [
                    {
                      model: model.examSetupTypeModel,
                      as: 'examSetupTypeSyllabus',
                      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                      include: [
                        {
                          model: model.examStructureModel,
                          as: 'examStructure',
                          attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching Syllabus details subject:', error);
    throw error;
  }
}
