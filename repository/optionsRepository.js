import * as model from '../models/index.js';
import { Op } from 'sequelize';
import { scoped, buildScope } from '../utility/scoped.js';
import { ROLES } from '../const/roles.js';
import { classSectionTermsInclude } from '../utility/classSectionIncludes.js';

export async function getAffiliatedUniversityOptions() {
    return await scoped(model.affiliatedIniversityModel).findAll({
        attributes: [['affiliated_university_name', 'label'], ['affiliated_university_id', 'value']],
    });
}

export async function getCourseOptions(courseLevelId) {
    return await scoped(model.courseModel).findAll({
        attributes: [['course_name', 'label'], ['course_id', 'value']],
        where: {
            ...(courseLevelId != null && { course_levelId: Number(courseLevelId) }),
        },
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

const lectureWindowOptionAttributes = [
    'lectureWindowId',
    'name',
    'description',
    'startDate',
    'endDate',
    'subjectId',
    'employeeId',
    'sessionId',
];

const lessonOptionAttributes = [
    'lessonId',
    'name',
    'description',
    'lectureWindowId',
    'subjectId',
    'employeeId',
    'sessionId',
];

export async function getEmployeeOptionDetail(employeeId) {
    return scoped(model.employeeModel).findOne({
        raw: true,
        nest: true,
        where: { employeeId: Number(employeeId) },
        attributes: ['employeeId', 'employeeName', 'employeeCode', 'pickColor'],
    });
}

export async function getSubjectOptionDetail(subjectId) {
    return scoped(model.subjectModel).findOne({
        raw: true,
        nest: true,
        where: { subjectId: Number(subjectId) },
        attributes: ['subjectId', 'subjectName', 'courseId', 'term'],
    });
}

export async function getLectureWindowOptionRows(filters) {
    const where = {
        academicYearId: Number(filters.academicYearId),
        employeeId: Number(filters.employeeId),
        subjectId: Number(filters.subjectId),
        startDate: { [Op.lte]: filters.date },
        endDate: { [Op.gte]: filters.date },
    };

    if (filters.sessionId != null) {
        where.sessionId = Number(filters.sessionId);
    }

    return scoped(model.lectureWindowModel).findAll({
        raw: true,
        nest: true,
        attributes: ['lectureWindowId', 'name'],
        where,
        order: [['startDate', 'DESC'], ['lectureWindowId', 'DESC']],
    });
}

export async function getLectureWindowOptionDetail(lectureWindowId, academicYearId) {
    return scoped(model.lectureWindowModel).findOne({
        raw: true,
        nest: true,
        attributes: lectureWindowOptionAttributes,
        where: {
            lectureWindowId: Number(lectureWindowId),
            academicYearId: Number(academicYearId),
        },
        include: [
            {
                model: model.subjectModel,
                as: 'lectureWindowSubject',
                attributes: ['subjectId', 'subjectName', 'courseId'],
            },
            {
                model: model.employeeModel,
                as: 'lectureWindowEmployee',
                attributes: ['employeeId', 'employeeName', 'employeeCode', 'pickColor'],
            },
            {
                model: model.sessionModel,
                as: 'lectureWindowSession',
                attributes: ['sessionId', 'sessionName', 'startingDate', 'endingDate'],
            },
        ],
    });
}

export async function getLessonOptionRows(filters) {
    return scoped(model.lessonModel).findAll({
        raw: true,
        nest: true,
        attributes: ['lessonId', 'name'],
        where: {
            lectureWindowId: Number(filters.lectureWindowId),
            academicYearId: Number(filters.academicYearId),
        },
        order: [['lessonId', 'ASC']],
    });
}

export async function getLessonOptionDetail(lessonId, academicYearId) {
    return scoped(model.lessonModel).findOne({
        raw: true,
        nest: true,
        attributes: lessonOptionAttributes,
        where: {
            lessonId: Number(lessonId),
            academicYearId: Number(academicYearId),
        },
        include: [
            {
                model: model.lectureWindowModel,
                as: 'lectureWindow',
                attributes: lectureWindowOptionAttributes,
            },
            {
                model: model.subjectModel,
                as: 'lessonSubject',
                attributes: ['subjectId', 'subjectName', 'courseId'],
            },
        ],
    });
}

export async function getTopicOptionRows(lessonId) {
    return scoped(model.topicModel).findAll({
        attributes: ['topicId', 'name'],
        where: { lessonId: Number(lessonId) },
        include: [{
            model: model.subTopicModel,
            as: 'subTopic',
            attributes: ['subTopicId', 'name'],
            required: false,
        }],
        order: [['topicId', 'ASC']],
    });
}
