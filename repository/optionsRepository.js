import * as model from '../models/index.js';
import { ROLES } from '../const/roles.js';
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

export async function getSpecializationOptions(courseId, instituteId, universityId) {
    return await model.specializationModel.findAll({
        attributes: [['specialization_name', 'label'], ['specialization_id', 'value']],
        where: {
            ...(courseId && { course_Id: courseId }),
            ...(instituteId && { instituteId: instituteId }),
            ...(universityId && { universityId: universityId }),
        }
    });
}

export async function getSubjectOptions(courseId, term, universityId, acedmicYearId) {
    return await model.subjectModel.findAll({
        attributes: [['subject_name', 'label'], ['subject_id', 'value']],
        where: {
            ...(courseId && { courseId }),
            ...(term && { term }),
            ...(universityId && { universityId }),
            ...(acedmicYearId && { acedmicYearId }),
        }
    });
}

export async function getTeacherOptions(instituteId, campusId) {
    return await model.employeeModel.findAll({
        attributes: [['employee_name', 'label'], ['employee_id', 'value']],
        include: [{
            model: model.userModel,
            as: 'user',
            attributes: [],
            required: true,
            include: [{
                model: model.userRoleModel,
                as: 'userRoles',
                attributes: [],
                where: {
                    role: ROLES.TEACHER
                },
                required: true
            }]
        }],
        where: {
            ...(instituteId && { instituteId }),
            ...(campusId && { campusId }),
        }
    });
}

