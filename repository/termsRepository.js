import * as model from '../models/index.js';
import { classSectionTermsInclude } from '../utility/classSectionIncludes.js';
import { scoped } from '../utility/scoped.js';

function whereFromSession(session, model, where = {}) {
  const s = session.dataValues ?? session;
  const tenant = {
    universityId: s.universityId,
    instituteId: s.instituteId,
    academicYearId: s.academicYearId,
  };
  const attrs = model.rawAttributes || {};
  const merged = { ...where, ...tenant };
  const filtered = {};
  for (const [key, value] of Object.entries(merged)) {
    if (key in attrs && value != null) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export async function getSubjectsByCourseAndSession(courseId, session) {
  try {
    return await model.subjectModel.findAll({
      where: whereFromSession(session, model.subjectModel, { courseId }),
      attributes: ['subjectId', 'subjectName', 'term'],
      raw: true,
      nest: true,
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}

export async function getSubjectsByCourseAndAcademicYear(courseId, academicYearId) {
  try {
    return await scoped(model.subjectModel).findAll({
      where: { courseId, academicYearId },
      attributes: ['subjectId', 'subjectName', 'term'],
      raw: true,
      nest: true,
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}

export async function getSubjectsByCourseAndAcademicYearAndInstitute(
  courseId,
  instituteId,
  academicYearId
) {
  try {

    return await scoped(model.subjectModel).findAll({
      where: {
        courseId,
        instituteId,
        academicYearId,
      },
      attributes: ['subjectId', 'subjectName', 'term', 'subjectCode'],
      order: [
        ['term', 'ASC'],
        ['subjectName', 'ASC'],
      ],
      raw: true,
      nest: true,
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}

export async function getClassSectionsByCourseAndSession(courseId, sessionId) {
  try {
    const rows = await scoped(model.classSectionModel).findAll({
      where: { courseId, sessionId },
      attributes: [
        'classSectionsId',
        'section',
        'year',
        'specializationId',
      ],
      include: [classSectionTermsInclude()],
      order: [
        ['section', 'ASC'],
        [{ model: model.classSectionTermModel, as: 'classSectionTerms' }, 'term', 'ASC'],
      ],
    });

    const plainRows = [];
    for (const row of rows) {
      plainRows.push(row.get({ plain: true }));
    }
    return plainRows;
  } catch (error) {
    console.error('Error fetching class sections:', error);
    throw error;
  }
}

export async function getExamSetupTypeTermsByCourseAndSession(courseId, sessionId, session) {
  try {
    return await model.examSetupTypeTermModel.findAll({
      attributes: ['examSetupTypeTermId', 'examSetupTypeId', 'term'],
      where: whereFromSession(session, model.examSetupTypeTermModel, { courseId }),
      include: [
        {
          model: model.examSetupTypeModel,
          as: 'examSetupType',
          where: whereFromSession(session, model.examSetupTypeModel, {
            courseId,
            sessionId,
          }),
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching exam setup type terms:', error);
    throw error;
  }
}

export async function getExamSetupTypeTermsByCourseAndAcademicYear(courseId, academicYearId) {
  try {
    return await scoped(model.examSetupTypeTermModel).findAll({
      where: { courseId, academicYearId },
      include: [
        {
          model: model.examSetupTypeModel,
          as: 'examSetupType',
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching exam setup type terms:', error);
    throw error;
  }
}
