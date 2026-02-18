import * as model from '../models/index.js'
import { Op } from 'sequelize';

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
