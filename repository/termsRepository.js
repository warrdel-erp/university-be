import * as model from '../models/index.js'
import { Op } from 'sequelize';
// import { Term, Subject, Course, Session } from '../models/index.js';

import {
  courseModel,
  subjectModel,
  sessionModel,
  semesterModel
} from '../models/index.js';
export async function getSubjectsByCourseAndAcademicYear(courseId, acedmicYearId) {
  try {
    const subjects = await model.subjectModel.findAll({
      where: { courseId, acedmicYearId },
      attributes: ['subjectId', 'subjectName', 'term'],
      raw: true,
      nest: true
    });
    return subjects;
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}

export async function getSubjectsByCourseAndAcademicYearAndInstitute(courseId, acedmicYearId, instituteId) {
  try {
    const subjects = await model.subjectModel.findAll({
      where: { courseId, acedmicYearId, instituteId },
      attributes: ['subjectId', 'subjectName', 'term'],
      raw: true,
      nest: true
    });
    return subjects;
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}


export async function getClassSectionsByCourseAndSession(courseId, sessionId) {
  try {
    const classSections = await model.classSectionModel.findAll({
      where: { courseId, sessionId },
      attributes: ['classSectionsId', 'section'],
      include: [
        {
          model: model.classModel,
          as: 'classGroup',
          attributes: ['classId', 'term']
        },
      ],
      raw: true,
      nest: true
    });
    return classSections;
  } catch (error) {
    console.error('Error fetching class sections:', error);
    throw error;
  }
}


export const getTermsWithSubjectRepo = async (instituteId, academicYearId) => {
  return await courseModel.findAll({
    where: { instituteId },
    attributes: ['id', 'courseName'],
    include: [
      {
        model: semesterModel,
        as: "semesters",
        required: true,
        include: [
          {
            model: subjectModel,
            as: "subjects",
            attributes: ['id', 'subjectName']
          },
          {
            model: sessionModel,
            as: "session",
            required: true,
            where: { acedmic_year_id: academicYearId },
            attributes: ['session_id', 'session_name']
          }
        ]
      }
    ]
  });
};