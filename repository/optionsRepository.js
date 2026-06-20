import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';
import { ROLES } from '../const/roles.js';

export async function getAffiliatedUniversityOptions() {
    return await scoped(model.affiliatedIniversityModel).findAll({
        attributes: [['affiliated_university_name', 'label'], ['affiliated_university_id', 'value']],
    });
}

export async function getCourseOptions() {
    return await scoped(model.courseModel).findAll({
        attributes: [['course_name', 'label'], ['course_id', 'value']],
    });
}

export async function getCourseData(courseId) {
    return await scoped(model.courseModel).findByPk(courseId, {
        attributes: ['totalTerms', 'termType'],
    });
}

export async function getClassSectionOptions(courseId, term) {
    return await scoped(model.classSectionModel).findAll({
        attributes: [['section', 'label'], ['class_sections_id', 'value']],
        where: {
            ...(courseId && { courseId }),
        },
        include: [{
            model: model.classModel,
            as: 'classGroup',
            where: {
                ...(term && { term }),
            },
            attributes: [],
        }],
    });
}

export async function getSpecializationOptions(courseId) {
    return await scoped(model.specializationModel).findAll({
        attributes: [['specialization_name', 'label'], ['specialization_id', 'value']],
        where: {
            ...(courseId && { course_Id: courseId }),
        },
    });
}

export async function getSubjectOptions(courseId, term, acedmicYearId) {
    return await scoped(model.subjectModel).findAll({
        attributes: [["subject_name", "label"], ["subject_id", "value"]],
        where: {
            ...(courseId && { courseId }),
            ...(term && { term }),
            ...(acedmicYearId && { acedmicYearId }),
        },
    });
}

export async function getTeacherOptions(campusId) {
    return await scoped(model.employeeModel).findAll({
        attributes: [['employee_name', 'label'], ['employee_id', 'value']],
        where: {
            ...(campusId && { campusId }),
        },
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
                    role: ROLES.TEACHER,
                },
                required: true,
            }],
        }],
    });
}

export async function findSessionCourseMappingByCourseAndSession(
    courseId,
    sessionId,
) {
    return scoped(model.sessionCouseMappingModel).findOne({
        attributes: ["sessionCourseMappingId"],
        where: { courseId, sessionId },
    });
}

/** V2 fee plan profiles for course + session (via session_course_mapping). */
export async function getFeePlanProfileOptions(courseId, sessionId) {
    const mapping = await findSessionCourseMappingByCourseAndSession(
        courseId,
        sessionId,
    );
    if (!mapping) {
        return { courseSessionId: null, rows: [] };
    }

    const courseSessionId = mapping.get("sessionCourseMappingId");
    const rows = await scoped(model.feePlanProfileModel).findAll({
        attributes: ["feePlanProfileId", "name"],
        where: { courseSessionId, publishStatus: "published" },
        order: [["feePlanProfileId", "ASC"]],
    });

    return { courseSessionId, rows };
}

export async function getTopicOptions(filters) {
    return await scoped(model.topicModel).findAll({
        attributes: [['name', 'label'], ['topic_id', 'value']],
        where: filters,
    });
}
