import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function getSubjectsByCourseAndAcademicYear(courseId, acedmicYearId) {
  try {
    return await scoped(model.subjectModel).findAll({
      where: { courseId, acedmicYearId },
      attributes: ['subjectId', 'subjectName', 'term'],
      raw: true,
      nest: true,
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}

export async function getSubjectsByCourseAndAcademicYearAndInstitute(courseId, acedmicYearId) {
  try {
    return await scoped(model.subjectModel).findAll({
      where: { courseId, acedmicYearId },
      attributes: ['subjectId', 'subjectName', 'term', 'subjectCode'],
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
    return await scoped(model.classSectionModel).findAll({
      where: { courseId, sessionId },
      attributes: ['classSectionsId', 'section'],
      include: [
        {
          model: model.classModel.unscoped(),
          as: 'classGroup',
          attributes: ['classId', 'term'],
        },
      ],
      raw: true,
      nest: true,
    });
  } catch (error) {
    console.error('Error fetching class sections:', error);
    throw error;
  }
}

export async function getExamSetupTypeTermsByCourseAndAcademicYear(courseId, acedmicYearId) {
  try {
    return await scoped(model.examSetupTypeTermModel).findAll({
      where: { courseId, acedmicYearId },
      include: [
        {
          model: model.examSetupTypeModel.unscoped(),
          as: 'examSetupType',
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching exam setup type terms:', error);
    throw error;
  }
}
