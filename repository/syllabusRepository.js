import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

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

export async function getSyllabusDetails(acedmicYearId) {
  try {
    return await scoped(model.syllabusModel).findAll({
      where: {
        ...(acedmicYearId && { acedmicYearId }),
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
      },
      include: [
        {
          model: model.instituteModel.unscoped(),
          as: 'syllabusInstitute',
          attributes: ['instituteName', 'instituteCode'],
          include: [
            {
              model: model.campusModel.unscoped(),
              as: 'campues',
              attributes: ['campusName', 'campusCode'],
            },
          ],
        },
        {
          model: model.acedmicYearModel.unscoped(),
          as: 'syllabusAcedmicYear',
          attributes: ['yearTitle', 'startingDate', 'endingDate'],
        },
        {
          model: model.courseModel.unscoped(),
          as: 'syllabusCourse',
          attributes: ['courseName', 'courseCode'],
        },
        {
          model: model.syllabusDetailsModel.unscoped(),
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
          model: model.courseModel.unscoped(),
          as: 'syllabusCourse',
          attributes: ['courseName', 'courseCode'],
          where: courseScope,
          required: true,
        },
        {
          model: model.syllabusDetailsModel.unscoped(),
          as: 'syllabusDetails',
          attributes: {
            exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'syllabus_id', 'subject_id'],
          },
          include: [
            {
              model: model.subjectModel.unscoped(),
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

export async function addSyllabusUnit(syllabusData) {
  try {
    return await scoped(model.syllabusUnitModel).bulkCreate(syllabusData);
  } catch (error) {
    console.error('Error in add Syllabus unit :', error);
    throw error;
  }
}

export async function syllabusUnitGet(filters = {}) {
  try {
    return await scoped(model.syllabusUnitModel).findAll({
      where: filters,
      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
      include: [
        {
          model: model.instituteModel.unscoped(),
          as: 'instituteUnit',
          attributes: ['instituteName', 'instituteCode'],
        },
        {
          model: model.acedmicYearModel.unscoped(),
          as: 'acedmicYearUnit',
          attributes: ['yearTitle', 'startingDate', 'endingDate'],
        },
        {
          model: model.sessionModel.unscoped(),
          as: 'sessionUnit',
          attributes: ['sessionName'],
        },
        {
          model: model.semesterModel.unscoped(),
          as: 'semesterUnit',
          attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        },
        {
          model: model.subjectModel.unscoped(),
          as: 'subjectUnit',
          attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching syllabus unit with details:', error);
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
          model: model.classSubjectMapperModel.unscoped(),
          as: 'semestermapping',
          attributes: ['classSubjectMapperId', 'subjectId', 'semesterId'],
          include: [
            {
              model: model.subjectModel.unscoped(),
              as: 'subjects',
              attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType'],
              include: [
                {
                  model: model.syllabusDetailsModel.unscoped(),
                  as: 'syllabusSubject',
                  attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                  include: [
                    {
                      model: model.examSetupTypeModel.unscoped(),
                      as: 'examSetupTypeSyllabus',
                      attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                      include: [
                        {
                          model: model.examStructureModel.unscoped(),
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
