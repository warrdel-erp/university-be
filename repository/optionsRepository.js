import * as model from '../models/index.js';

export async function getAffiliatedUniversityOptions(instituteId) {
    return await model.affiliatedIniversityModel.findAll({
        attributes: [['affiliated_university_name', 'label'], ['affiliated_university_id', 'value']],
        where: {
            ...(instituteId && { instituteId: instituteId }),
        }
    });
}

export async function getCourseOptions(universityId, instituteId) {
    return await model.courseModel.findAll({
        attributes: [['course_name', 'label'], ['course_id', 'value']],
        where: {
            ...(universityId && { universityId: universityId }),
            ...(instituteId && { instituteId: instituteId }),
        }
    });
}

export async function getCourseData(courseId) {
    return await model.courseModel.findByPk(courseId, {
        attributes: ['totalTerms', 'termType']
    });
}

export async function getClassSectionOptions(courseId, term) {
    return await model.classSectionModel.findAll({
        attributes: [['section', 'label'], ['class_sections_id', 'value']],
        include: [{
            model: model.classModel,
            as: 'classGroup',
            where: {
                ...(term && { term }),
            },
            attributes: []
        }],
        where: {
            ...(courseId && { courseId: courseId }),
        }
    });
}
