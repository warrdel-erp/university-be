import * as model from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { scoped, buildScope } from '../utility/scoped.js';
import { ROLES } from '../const/roles.js';
import { classSectionTermsInclude } from '../utility/classSectionIncludes.js';

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

export async function getCourseProgramData(courseId) {
    return await scoped(model.courseModel).findByPk(courseId, {
        attributes: ['courseDuration', 'totalTerms', 'termType'],
    });
}

export async function getClassSectionOptions(courseId, term, sessionId, year) {
    return await scoped(model.classSectionModel).findAll({
        attributes: [
            ['section', 'label'],
            ['class_sections_id', 'value'],
            'year',
        ],
        where: {
            ...(courseId && { courseId }),
            ...(sessionId && { sessionId }),
            ...(year != null && { year: Number(year) }),
        },
        include: [classSectionTermsInclude({ term, required: term != null })],
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

export async function getSubjectOptions(courseId, term, academicYearId) {
    const subjectWhere = {
        ...(courseId && { courseId: Number(courseId) }),
        ...(term && { term: Number(term) }),
        ...(academicYearId && { academicYearId: Number(academicYearId) }),
    };

    const mappedRows = await scoped(model.classSubjectMapperModel).findAll({
        attributes: ['subjectId'],
        include: [{
            model: model.subjectModel,
            as: 'subjects',
            attributes: [],
            required: true,
            where: {
                ...subjectWhere,
                ...buildScope(model.subjectModel),
            },
        }],
    });

    const mappedSubjectIds = [...new Set(mappedRows.map((row) => row.subjectId))];

    return scoped(model.subjectModel).findAll({
        attributes: [['subject_name', 'label'], ['subject_id', 'value']],
        where: {
            ...subjectWhere,
            ...(mappedSubjectIds.length > 0 && {
                subjectId: { [Op.notIn]: mappedSubjectIds },
            }),
        },
        order: [['subject_name', 'ASC']],
    });
}

export async function getTeacherOptions(campusId) {
    return await scoped(model.employeeModel).findAll({
        attributes: [
            ['employee_name', 'label'],
            [Sequelize.col('user.user_id'), 'value'],
            ['employee_id', 'employeeId'],
        ],
        where: {
            ...(campusId && { campusId }),
        },
        include: [
            {
                model: model.userModel,
                as: 'user',
                attributes: [],
                required: true,
                where: { isTeacher: true },
            },
        ],
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
    const { instituteId: _i, universityId: _u, ...safeFilters } = filters ?? {};
    return await scoped(model.topicModel).findAll({
        attributes: [['name', 'label'], ['topic_id', 'value']],
        where: safeFilters,
    });
}
