import * as model from '../models/index.js';
import { Op, Sequelize, fn, col } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';
import { getAcademicYearId } from '../utility/requestContext.js';
import {
    classSectionTermsInclude,
    resolveProgramTerm,
    resolveProgramYear,
    studentClassSectionTermWithSectionInclude,
} from '../utility/classSectionIncludes.js';
import { buildCourseTermOptions } from '../utility/courseTerms.js';
import { toMoneyNumber } from '../utility/decimalMoney.js';

function omitAcademicYearScope(scopeWhere = {}) {
    const { academicYearId, ...rest } = scopeWhere;
    return rest;
}

/** Promotion reads use explicit academicYearId; scoped() would override it with request context. */
function promotionClassSectionWhere(filters = {}) {
    const { academicYearId, ...rest } = filters;
    return {
        ...omitAcademicYearScope(buildScope(model.classSectionModel)),
        ...rest,
        ...(academicYearId != null && { academicYearId }),
    };
}

async function assertScopedStudent(studentId, options = {}) {
    return scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ['studentId'],
        transaction: options.transaction,
    });
}

function toIdList(value) {
    if (value == null) {
        return null;
    }
    if (Array.isArray(value)) {
        const ids = [];
        for (const item of value) {
            const n = Number(item);
            if (Number.isFinite(n)) {
                ids.push(n);
            }
        }
        return ids.length > 0 ? ids : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? [n] : null;
}

function whereEqualOrIn(value) {
    const ids = toIdList(value);
    if (ids == null) {
        return undefined;
    }
    if (ids.length === 1) {
        return ids[0];
    }
    return { [Op.in]: ids };
}

function buildStudentListWhere(search, courseId, sessionId) {
    const where = {};

    const courseFilter = whereEqualOrIn(courseId);
    if (courseFilter !== undefined) {
        where.courseId = courseFilter;
    }

    const sessionFilter = whereEqualOrIn(sessionId);
    if (sessionFilter !== undefined) {
        where.sessionId = sessionFilter;
    }

    if (search) {
        const term = `%${search}%`;
        where[Op.or] = [
            { firstName: { [Op.like]: term } },
            { lastName: { [Op.like]: term } },
            { middleName: { [Op.like]: term } },
            { scholarNumber: { [Op.like]: term } },
            { enrollNumber: { [Op.like]: term } },
            { fatherName: { [Op.like]: term } },
            { birthDate: { [Op.like]: term } },
            { '$course.course_name$': { [Op.like]: term } },
        ];
    }

    return where;
}

/**
 * Placement studentIds: history status=current when present, else classSectionTerm FK.
 * Returns null when no placement filters are set.
 * Filters accept a single id or id list.
 */
async function resolvePlacementStudentIds({ classSectionsId, year, term }) {
    if (classSectionsId == null && year == null && term == null) {
        return null;
    }

    const classSectionsIdFilter = whereEqualOrIn(classSectionsId);
    const yearFilter = whereEqualOrIn(year);
    const termFilter = whereEqualOrIn(term);

    const historyWhere = { status: 'current' };
    if (classSectionsIdFilter !== undefined) {
        historyWhere.classSectionsId = classSectionsIdFilter;
    }

    const historyInclude = [];
    if (yearFilter !== undefined) {
        historyInclude.push({
            model: model.classSectionModel,
            as: 'classSection',
            attributes: [],
            required: true,
            where: { year: yearFilter },
        });
    }
    if (termFilter !== undefined) {
        historyInclude.push({
            model: model.classSectionTermModel,
            as: 'classSectionTerm',
            attributes: [],
            required: true,
            where: { term: termFilter },
        });
    }

    const historyMatchedRows = await model.studentClassSectionsHistoryModel.findAll({
        attributes: ['studentId'],
        where: historyWhere,
        include: historyInclude,
        raw: true,
    });

    const historyMatchedIds = [];
    for (const row of historyMatchedRows) {
        historyMatchedIds.push(Number(row.studentId));
    }

    const currentHistoryRows = await model.studentClassSectionsHistoryModel.findAll({
        attributes: ['studentId'],
        where: { status: 'current' },
        raw: true,
    });

    const studentsWithCurrentHistory = new Set();
    for (const row of currentHistoryRows) {
        studentsWithCurrentHistory.add(Number(row.studentId));
    }

    const fkRows = await scoped(model.studentModel).findAll({
        attributes: ['studentId'],
        include: [
            studentClassSectionTermWithSectionInclude({
                classSectionsId: classSectionsIdFilter !== undefined ? classSectionsId : undefined,
                term: termFilter !== undefined ? term : undefined,
                sectionWhere: yearFilter !== undefined ? { year: yearFilter } : undefined,
                termRequired: true,
                sectionRequired: yearFilter !== undefined,
                includeSectionTerms: false,
            }),
        ],
        raw: true,
    });

    const placementIds = [];
    const seen = new Set();

    for (const id of historyMatchedIds) {
        if (!seen.has(id)) {
            seen.add(id);
            placementIds.push(id);
        }
    }

    for (const row of fkRows) {
        const id = Number(row.studentId);
        if (studentsWithCurrentHistory.has(id) || seen.has(id)) {
            continue;
        }
        seen.add(id);
        placementIds.push(id);
    }

    return placementIds;
}

const studentSessionAttrs = ['sessionId', 'sessionName', 'academicYearId'];
const sessionYearAttrs = ['academicYearId', 'yearTitle', 'startingDate', 'endingDate', 'isActive'];

function getRequestAcademicYearId() {
    return getAcademicYearId();
}

function studentSessionWithAcademicYearInclude(options = {}) {
    let academicYearId = options.academicYearId;
    if (academicYearId == null) {
        academicYearId = getRequestAcademicYearId();
    }

    const include = {
        model: model.sessionModel,
        as: 'studentSession',
        attributes: studentSessionAttrs,
        include: [
            {
                model: model.acedmicYearModel,
                as: 'sessionAcedmic',
                attributes: sessionYearAttrs,
            },
        ],
    };

    if (academicYearId != null) {
        include.required = true;
        const academicYearFilter = Array.isArray(academicYearId)
            ? (academicYearId.length === 1
                ? Number(academicYearId[0])
                : { [Op.in]: academicYearId.map(Number) })
            : Number(academicYearId);
        include.where = { academicYearId: academicYearFilter };
        const scope = buildScope(model.sessionModel);
        if (scope.universityId != null) {
            include.where.universityId = scope.universityId;
        }
        if (scope.instituteId != null) {
            include.where.instituteId = scope.instituteId;
        }
    }

    return include;
}

function studentSessionIncludeWithoutAcademicYear() {
    const include = {
        model: model.sessionModel,
        as: 'studentSession',
        attributes: studentSessionAttrs,
        include: [
            {
                model: model.acedmicYearModel,
                as: 'sessionAcedmic',
                attributes: sessionYearAttrs,
            },
        ],
    };

    const scope = omitAcademicYearScope(buildScope(model.sessionModel));
    if (scope.universityId != null) {
        include.where = { universityId: scope.universityId };
    }
    if (scope.instituteId != null) {
        if (!include.where) {
            include.where = {};
        }
        include.where.instituteId = scope.instituteId;
    }

    return include;
}

function studentWithFeePlanInitiateWhere() {
    return {
        feePlanProfileId: { [Op.ne]: null },
        ...omitAcademicYearScope(buildScope(model.studentModel)),
    };
}

/** Scoped read: student must belong to the logged-in academic year (via session). */
export async function assertStudentInRequestAcademicYear(studentId, options = {}) {
    const academicYearId = getRequestAcademicYearId();
    if (academicYearId == null) {
        return null;
    }

    return scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: options.attributes ?? ['studentId'],
        include: [studentSessionWithAcademicYearInclude({ academicYearId })],
        transaction: options.transaction,
    });
}

export async function addStudent(data, transaction) {
    try {
        const result = await scoped(model.studentModel).create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Student:", error);
        throw error;
    }
};

export async function addStudentExcel(data, transaction) {
    try {
        const result = await scoped(model.studentModel).create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Student bluk  error:", error);
        throw error;
    }
};

export async function addStudentsEntranceDetail(data, transaction) {
    try {
        const result = await model.studentsEntranceDetail.bulkCreate(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add students Entrance Detail:", error);
        throw error;
    }
};

export async function addStudentsAddress(data, transaction) {
    try {
        const result = await model.studentsAddress.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add students Address:", error);
        throw error;
    }
};

export async function addStudentsCorsAddress(data, transaction) {
    try {
        const result = await model.studentCorsAddressModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add students Cors Address:", error);
        throw error;
    }
};

export async function studentMetaData(data, transaction) {
    try {
        const result = await model.studentMetaData.bulkCreate(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in adding meta data student:", error);
        throw error;
    }
};

export async function getAllStudents({
    page,
    limit,
    search,
    courseId,
    sessionId,
    classSectionsId,
    year,
    term,
    academicYearId,
    excludeStudentIds,
    includeStudentIds,
}) {
    try {
        const resolvedAcademicYearId = academicYearId != null
            ? academicYearId
            : getRequestAcademicYearId();

        const baseInclude = [
            {
                model: model.userModel,
                as: "userStudent",
                attributes: ["universityId", "userId"],
            },
            {
                model: model.campusModel,
                as: "campus",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
            },
            {
                model: model.instituteModel,
                as: "institute",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
            },
            {
                model: model.affiliatedIniversityModel,
                as: "affiliatedUniversity",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
            },
            {
                model: model.courseModel,
                as: "course",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
            },
            studentClassSectionInclude,
            studentSessionWithAcademicYearInclude({ academicYearId: resolvedAcademicYearId }),
            {
                model: model.specializationModel,
                as: "specialization",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "specializationId", "course_Id", "specializationCode"] },
            },
            {
                model: model.studentsEntranceDetail,
                as: "entranceDetails",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
                model: model.studentsAddress,
                as: "studentAddress",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
                model: model.employeeCodeMasterType,
                as: "courseLevel",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id"] },
                include: [
                    {
                        model: model.employeeCodeMaster,
                        as: "codes",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    },
                ],
            },
            {
                model: model.studentMetaData,
                as: "studentMetaData",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.employeeCodeMasterType,
                        as: "typs",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include: [
                            {
                                model: model.employeeCodeMaster,
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ],
                    },
                ],
            },
            {
                model: model.feePlanProfileModel,
                as: "studentFeePlanProfile",
                required: false,
                attributes: ["feePlanProfileId", "name", "planType"],
            },
        ];

        const whereCondition = buildStudentListWhere(search, courseId, sessionId);

        const classSectionTermWhere = {};
        if (term?.length) classSectionTermWhere.term = { [Op.in]: term.map(Number) };

        const classSectionWhere = {};
        if (classSectionsId?.length) classSectionWhere.classSectionsId = { [Op.in]: classSectionsId.map(Number) };
        if (year?.length) classSectionWhere.year = { [Op.in]: year.map(Number) };
        if (academicYearId?.length) classSectionWhere.academicYearId = { [Op.in]: academicYearId.map(Number) };

        const hasTermFilter = Object.keys(classSectionTermWhere).length > 0;
        const hasSectionFilter = Object.keys(classSectionWhere).length > 0;

        const classSectionTermIncludeForFilter = {
            model: model.classSectionTermModel,
            as: "studentClassSectionTerm",
            attributes: [],
            required: hasTermFilter || hasSectionFilter,
            ...(hasTermFilter && { where: classSectionTermWhere }),
            include: [{
                model: model.classSectionModel,
                as: "classSection",
                attributes: [],
                required: hasSectionFilter,
                ...(hasSectionFilter && { where: classSectionWhere }),
            }],
        };

        if (excludeStudentIds != null && excludeStudentIds.length > 0) {
            const excludeSet = new Set();
            for (const id of excludeStudentIds) {
                excludeSet.add(Number(id));
            }

            if (whereCondition.studentId != null && whereCondition.studentId[Op.in]) {
                const nextIds = [];
                for (const id of whereCondition.studentId[Op.in]) {
                    if (!excludeSet.has(Number(id))) {
                        nextIds.push(id);
                    }
                }
                if (nextIds.length === 0) {
                    return {
                        result: [],
                        totalCount: 0,
                        page,
                        limit,
                        totalPages: 0,
                    };
                }
                whereCondition.studentId = { [Op.in]: nextIds };
            } else if (whereCondition.studentId != null) {
                if (excludeSet.has(Number(whereCondition.studentId))) {
                    return {
                        result: [],
                        totalCount: 0,
                        page,
                        limit,
                        totalPages: 0,
                    };
                }
            } else {
                const excluded = [];
                for (const id of excludeSet) {
                    excluded.push(id);
                }
                whereCondition.studentId = { [Op.notIn]: excluded };
            }
        }

        if (includeStudentIds != null) {
            if (includeStudentIds.length === 0) {
                return {
                    result: [],
                    totalCount: 0,
                    page,
                    limit,
                    totalPages: 0,
                };
            }

            const includeSet = new Set();
            for (const id of includeStudentIds) {
                includeSet.add(Number(id));
            }

            if (whereCondition.studentId != null && whereCondition.studentId[Op.in]) {
                const nextIds = [];
                for (const id of whereCondition.studentId[Op.in]) {
                    if (includeSet.has(Number(id))) {
                        nextIds.push(id);
                    }
                }
                if (nextIds.length === 0) {
                    return {
                        result: [],
                        totalCount: 0,
                        page,
                        limit,
                        totalPages: 0,
                    };
                }
                whereCondition.studentId = { [Op.in]: nextIds };
            } else if (whereCondition.studentId != null && whereCondition.studentId[Op.notIn]) {
                const nextIds = [];
                for (const id of includeSet) {
                    if (!whereCondition.studentId[Op.notIn].includes(id)) {
                        nextIds.push(id);
                    }
                }
                if (nextIds.length === 0) {
                    return {
                        result: [],
                        totalCount: 0,
                        page,
                        limit,
                        totalPages: 0,
                    };
                }
                whereCondition.studentId = { [Op.in]: nextIds };
            } else if (whereCondition.studentId != null) {
                if (!includeSet.has(Number(whereCondition.studentId))) {
                    return {
                        result: [],
                        totalCount: 0,
                        page,
                        limit,
                        totalPages: 0,
                    };
                }
            } else {
                const included = [];
                for (const id of includeSet) {
                    included.push(id);
                }
                whereCondition.studentId = { [Op.in]: included };
            }
        }

        // Filters needed for accurate ID pagination + count (not only hydrate).
        const filterInclude = [
            studentSessionWithAcademicYearInclude({ academicYearId: resolvedAcademicYearId }),
        ];
        if (search) {
            filterInclude.push({ model: model.courseModel, as: "course", attributes: [] });
        }
        filterInclude.push(classSectionTermIncludeForFilter);

        const offset = (page - 1) * limit;

        // Step 1: page over distinct student IDs matching the filter.
        const idRows = await scoped(model.studentModel).findAll({
            attributes: ["studentId"],
            where: whereCondition,
            include: filterInclude,
            offset,
            limit,
            order: [["studentId", "DESC"]],
            subQuery: false,
            raw: true,
        });
        const studentIds = [];
        for (const row of idRows) {
            studentIds.push(row.studentId);
        }

        // Step 2: hydrate full rows for the paged IDs (no row-collapsing from joins).
        let result = [];
        if (studentIds.length > 0) {
            const rows = await scoped(model.studentModel).findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: { studentId: { [Op.in]: studentIds } },
                include: baseInclude,
                order: [["studentId", "DESC"]],
            });
            for (const row of rows) {
                result.push(row.get({ plain: true }));
            }
        }

        // Step 3: total count of matching students for pagination.
        const totalCount = await scoped(model.studentModel).count({
            where: whereCondition,
            include: filterInclude,
            distinct: true,
            col: 'student_id',
        });

        return {
            result,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
        };

    } catch (error) {
        console.error("Error in getting all students:", error);
        throw error;
    }
};

const studentClassSectionTermInclude = {
    model: model.classSectionTermModel,
    as: 'studentClassSectionTerm',
    attributes: ['classSectionTermId', 'term', 'classSectionsId'],
    required: false,
};

const studentClassSectionInclude = studentClassSectionTermWithSectionInclude();

function buildPromotionStudentIncludes({ term } = {}) {
    return [
        {
            model: model.courseModel,
            as: 'course',
            attributes: ['courseId', 'courseName', 'termType'],
        },
        {
            model: model.specializationModel,
            as: 'specialization',
            attributes: ['specializationId', 'specializationName'],
            required: false,
        },
        studentClassSectionTermWithSectionInclude({
            term,
            sectionRequired: term != null,
            termRequired: term != null,
            sectionAttributes: ['classSectionsId', 'section', 'year', 'academicYearId', 'sessionId'],
        }),
        {
            model: model.studentClassSectionsHistoryModel,
            as: 'sectionHistory',
            required: false,
            separate: true,
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: model.classSectionModel,
                    as: 'classSection',
                    attributes: ['classSectionsId', 'section', 'year', 'academicYearId', 'sessionId'],
                    include: [classSectionTermsInclude()],
                },
                {
                    model: model.classSectionTermModel,
                    as: 'classSectionTerm',
                    attributes: ['classSectionTermId', 'term', 'classSectionsId'],
                },
            ],
        },
    ];
}

export async function getAcademicYearTitlesByIds(yearIds = []) {
    const uniqueIds = [...new Set(yearIds.filter((id) => id != null))];
    if (!uniqueIds.length) {
        return new Map();
    }

    const rows = await scoped(model.acedmicYearModel).findAll({
        where: { academicYearId: { [Op.in]: uniqueIds } },
        attributes: ['academicYearId', 'yearTitle'],
        raw: true,
    });

    return new Map(rows.map((row) => [Number(row.academicYearId), row.yearTitle]));
}

export async function getPromotionStudentList({
    page = 1,
    limit = 20,
    search,
    courseId,
    term,
}) {
    try {
        const whereCondition = buildStudentListWhere(search, courseId);

        const baseInclude = buildPromotionStudentIncludes({ term });

        const offset = (page - 1) * limit;
        const queryOptions = {
            attributes: promotionStudentAttributes,
            where: whereCondition,
            include: baseInclude,
            offset,
            limit,
            order: [['studentId', 'DESC']],
            distinct: true,
            ...(search && { subQuery: false }),
        };

        const { count, rows } = await scoped(model.studentModel).findAndCountAll({
            ...queryOptions,
            ...(search && { subQuery: false }),
        });

        return {
            rows,
            totalCount: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };
    } catch (error) {
        console.error('Error in getPromotionStudentList:', error);
        throw error;
    }
}

const promotionStudentAttributes = [
    'studentId',
    'scholarNumber',
    'enrollNumber',
    'firstName',
    'middleName',
    'lastName',
    'courseId',
    'specializationId',
    'classSectionTermId',
    'sessionId',
    'admisssionDate',
];

export async function getPromotionStudentByStudentId(studentId) {
    try {
        return scoped(model.studentModel).findOne({
            attributes: promotionStudentAttributes,
            where: { studentId },
            include: buildPromotionStudentIncludes(),
        });
    } catch (error) {
        console.error('Error in getPromotionStudentByStudentId:', error);
        throw error;
    }
}

export async function getSingleStudentDetail(studentId) {
    try {
        const inAcademicYear = await assertStudentInRequestAcademicYear(studentId);
        if (!inAcademicYear) {
            return null;
        }

        const result = await scoped(model.studentModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userStudent",
                    attributes: ["universityId", "userId"],
                },
                {
                    model: model.campusModel,
                    as: "campus",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
                },
                {
                    model: model.instituteModel,
                    as: "institute",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
                },
                {
                    model: model.affiliatedIniversityModel,
                    as: "affiliatedUniversity",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
                },
                {
                    model: model.employeeCodeMasterType,
                    as: "courseLevel",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id"] },
                    include: [
                        {
                            model: model.employeeCodeMaster,
                            as: "codes",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                    ],
                },
                {
                    model: model.studentMetaData,
                    as: "studentMetaData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType,
                            as: "typs",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster,
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
                },
                {
                    model: model.specializationModel,
                    as: "specialization",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "specializationId", "course_Id", "specializationCode"] },
                },
                studentClassSectionInclude,
                {
                    model: model.sessionModel,
                    as: "studentSession",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.acedmicYearModel,
                            as: "sessionAcedmic",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                    ],
                },
                {
                    model: model.studentsEntranceDetail,
                    as: "entranceDetails",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.studentsAddress,
                    as: "studentAddress",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.studentCorsAddressModel,
                    as: 'CorsAddressStudent',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType,
                            as: "codeMasterCountryStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster,
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                        {
                            model: model.employeeCodeMasterType,
                            as: "codeMasterStateStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster,
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                        {
                            model: model.employeeCodeMasterType,
                            as: "codeMasterCityStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster,
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.feePlanProfileModel,
                    as: "studentFeePlanProfile",
                    required: false,
                    attributes: ["feePlanProfileId", "name", "planType", "courseSessionId", "instituteId"],
                    include: [
                        {
                            model: model.sessionCouseMappingModel,
                            as: "courseSessionMapping",
                            attributes: ["sessionCourseMappingId", "courseId", "sessionId"],
                        },
                    ],
                },
            ],
            where: {
                studentId,
            },
        });
        return result;
    } catch (error) {
        console.error(`Error in ${studentId}:`, error);
        throw error;
    };
};

export async function getPreviousScholarNumber(scholarNumberPrefix) {
    try {
        const result = await scoped(model.studentModel).findOne({
            attributes: ['scholarNumber'],
            where: {
                scholarNumber: {
                    [Op.like]: `${scholarNumberPrefix}/%`,
                },
            },
            order: [['scholarNumber', 'DESC']],
        });
        return result;
    } catch (error) {
        console.error(`Error in getPreviousScholarNumber for prefix ${scholarNumberPrefix}:`, error);
        throw error;
    }
};

export async function findStudentByIdForInstitute(studentId, options = {}) {
    const { transaction, attributes } = options;
    return scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: attributes ?? [
            "studentId",
            "instituteId",
            "feePlanProfileId",
            "firstName",
            "lastName",
            "scholarNumber",
        ],
        transaction,
    });
}

export async function updateStudentFeePlanProfileId(
    studentId,
    feePlanProfileId,
    options = {}
) {
    const { transaction } = options;
    const existing = await assertScopedStudent(studentId, { transaction });
    if (!existing) {
        return 0;
    }

    const [affected] = await scoped(model.studentModel).update(
        { feePlanProfileId },
        { where: { studentId }, transaction }
    );
    return affected;
}

export async function updateStudentDetails(studentId, data, transaction) {
    try {
        const existing = await assertScopedStudent(studentId, { transaction });
        if (!existing) {
            return [0];
        }

        const result = await scoped(model.studentModel).update(data, {
            where: {
                studentId: studentId
            },
            transaction
        });
        return result;
    } catch (error) {
        console.error(`Error updating student details ${studentId} :`, error);
        throw error;
    }
};

export async function updateStudentEntranceDetails(studentsEntranceDetailId, data, transaction) {
    try {
        const entrance = await model.studentsEntranceDetail.findOne({
            where: { studentsEntranceDetailId },
            attributes: ['studentId'],
            transaction,
        });
        if (!entrance) {
            return [0];
        }
        const student = await assertScopedStudent(entrance.studentId, { transaction });
        if (!student) {
            return [0];
        }

        const result = await model.studentsEntranceDetail.update(data, {
            where: {
                studentsEntranceDetailId: studentsEntranceDetailId
            },
            transaction
        });
        return result;
    } catch (error) {
        console.error(`Error updating student entrance details ${studentsEntranceDetailId} :`, error);
        throw error;
    }
};

export async function updateStudentAddressDetails(studentsAddressId, data, transaction) {
    try {
        const address = await model.studentsAddress.findOne({
            where: { studentsAddressId },
            attributes: ['studentId'],
            transaction,
        });
        if (!address) {
            return [0];
        }
        const student = await assertScopedStudent(address.studentId, { transaction });
        if (!student) {
            return [0];
        }

        const result = await model.studentsAddress.update(data, {
            where: {
                studentsAddressId: studentsAddressId
            },
            transaction
        });
        return result;
    } catch (error) {
        console.error(`Error updating student address details ${studentsAddressId} :`, error);
        throw error;
    }
};

export async function updateStudentCorsAddressDetails(studentCorAddressId, data, transaction) {
    try {
        const corsAddress = await model.studentCorsAddressModel.findOne({
            where: { studentCorAddressId },
            attributes: ['studentId'],
            transaction,
        });
        if (!corsAddress) {
            return [0];
        }
        const student = await assertScopedStudent(corsAddress.studentId, { transaction });
        if (!student) {
            return [0];
        }

        const result = await model.studentCorsAddressModel.update(data, {
            where: {
                studentCorAddressId: studentCorAddressId
            },
            transaction
        });
        return result;
    } catch (error) {
        console.error(`Error updating student cors address details ${studentCorAddressId} :`, error);
        throw error;
    }
};

export async function updateStudentMetaData(studentId, type, code, transaction) {
    // code gender
    // type male,female
    try {
        const student = await assertScopedStudent(studentId, { transaction });
        if (!student) {
            return [0];
        }

        const result = await model.studentMetaData.update(
            {
                types: type
            },
            {
                where: {
                    studentId: studentId,
                    codes: code
                },
                transaction
            }
        );
        return result;
    } catch (error) {
        console.error(`Error updating student metadata for studentId ${studentId} and type ${type}:`, error);
        throw error;
    }
};

export async function findStudentByEmail(email) {
    try {
        return await scoped(model.studentModel).findOne({
            attributes: ["email"],
            where: {
                email,
                deleted_at: null,
            },
        });
    } catch (error) {
        console.error(`Error finding student by email ${email}:`, error);
        throw error;
    }
}

export async function findStudentByEnrollNumber(enrollNumber) {
    try {
        return await scoped(model.studentModel).findOne({
            attributes: ["enroll_number"],
            where: { enrollNumber },
        });
    } catch (error) {
        console.error(`Error finding student by enroll number ${enrollNumber}:`, error);
        throw error;
    }
}

/** @deprecated Use findStudentByEmail */
export async function checkEmail(email) {
    return findStudentByEmail(email);
}

/** @deprecated Use findStudentByEnrollNumber */
export async function checkEnroll(enrollNumber) {
    return findStudentByEnrollNumber(enrollNumber);
}

export async function getEmptyEnrollNumber(academicYearId, { page = 1, limit = 10, search } = {}) {
    try {
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return { result: [], totalCount: 0, page, limit, totalPages: 0 };
        }

        const whereCondition = {
            enrollNumber: {
                [Op.or]: [null, ''],
            },
            ...buildStudentListWhere(search),
        };

        const baseInclude = [
            studentClassSectionInclude,
            studentSessionWithAcademicYearInclude({
                academicYearId: academicYearId,
            }),
            {
                model: model.userModel,
                as: "userStudent",
                attributes: ["universityId", "userId"],
            },
        ];

        const filterInclude = search
            ? [{ model: model.courseModel, as: "course", attributes: [] }]
            : [];

        const offset = (page - 1) * limit;

        const idRows = await scoped(model.studentModel).findAll({
            attributes: ["studentId"],
            where: whereCondition,
            include: filterInclude,
            offset,
            limit,
            order: [["studentId", "DESC"]],
            subQuery: false,
            raw: true,
        });
        const studentIds = idRows.map((row) => row.studentId);

        let result = [];
        if (studentIds.length > 0) {
            const rows = await scoped(model.studentModel).findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: { studentId: { [Op.in]: studentIds } },
                include: baseInclude,
                order: [["studentId", "DESC"]],
            });
            result = rows.map((row) => row.get({ plain: true }));
        }

        const totalCount = await scoped(model.studentModel).count({
            where: whereCondition,
            include: filterInclude,
            distinct: true,
            col: 'student_id',
        });

        return {
            result,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
        };
    } catch (error) {
        console.error('Error in checkEnroll Empty:', error);
        throw error;
    }
};

export async function deleteStudentDetail(studentId) {
    try {
        const existing = await assertScopedStudent(studentId);
        if (!existing) {
            throw new Error('Student not found');
        }

        await scoped(model.studentModel).destroy({
            where: { studentId },
            individualHooks: true,
        });
        return { message: 'Student deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function deleteStudentEntranceDetail(studentsEntranceDetailId) {
    try {
        const entrance = await model.studentsEntranceDetail.findOne({
            where: { studentsEntranceDetailId },
            attributes: ['studentId'],
        });
        if (!entrance) {
            throw new Error('Entrance detail not found');
        }
        const student = await assertScopedStudent(entrance.studentId);
        if (!student) {
            throw new Error('Student not found');
        }

        await model.studentsEntranceDetail.destroy({
            where: { studentsEntranceDetailId },
            individualHooks: true
        });
        return { message: 'Student entrance details deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function deleteStudentAddressDetail(studentsAddressId) {
    try {
        const address = await model.studentsAddress.findOne({
            where: { studentsAddressId },
            attributes: ['studentId'],
        });
        if (!address) {
            throw new Error('Address not found');
        }
        const student = await assertScopedStudent(address.studentId);
        if (!student) {
            throw new Error('Student not found');
        }

        await model.studentsAddress.destroy({
            where: { studentsAddressId },
            individualHooks: true
        });
        return { message: 'Student address deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function findEntranceDetailsByStudentId(studentId) {
    try {
        const student = await assertScopedStudent(studentId);
        if (!student) {
            return [];
        }

        const attribute = ["students_entrance_detail_id"];
        const result = await model.studentsEntranceDetail.findAll({
            attributes: attribute,
            where: {
                studentId: studentId,
                deleted_at: null
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in Entrance Details by student Id for${studentId}:`, error);
        throw error;
    }
};

export async function findStudentAddressByStudentId(StudentId) {
    try {
        const student = await assertScopedStudent(StudentId);
        if (!student) {
            return null;
        }

        const attribute = ["students_address_id"];
        const result = await model.studentsAddress.findOne({
            attributes: attribute,
            where: {
                studentId: StudentId,
                deletedAt: null,
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in student address by student Id for ${StudentId}:`, error);
        throw error;
    }
};

export async function studentCourseMapping(data) {
    try {
        let classSectionTermId =
            data.classSectionTermId != null ? Number(data.classSectionTermId) : null;

        if (!classSectionTermId) {
            const student = await scoped(model.studentModel).findOne({
                where: { studentId: data.studentId },
                attributes: ['classSectionTermId'],
            });
            classSectionTermId = student?.classSectionTermId ?? null;
        }

        if (!classSectionTermId) {
            throw new Error('classSectionTermId could not be resolved');
        }

        const payload = {
            subjectId: data.subjectId,
            studentId: data.studentId,
            courseId: data.courseId,
            specializationId: data.specializationId ?? null,
            classSectionTermId,
            createdBy: data.createdBy,
        };
        const result = await model.subjectMapperModel.create(payload);
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function buildClassStudentMapperCreatePayload(
    { studentId, createdBy, classSectionTermId },
    transaction,
) {
    if (!classSectionTermId) {
        const error = new Error('classSectionTermId is required for class_student_mapper');
        error.statusCode = 400;
        throw error;
    }

    const student = await scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ['studentId'],
        transaction,
    });
    if (!student) {
        const error = new Error('Student not found');
        error.statusCode = 404;
        throw error;
    }

    const termRow = await scoped(model.classSectionTermModel).findOne({
        where: { classSectionTermId: Number(classSectionTermId) },
        attributes: ['classSectionTermId'],
        include: [{
            model: model.classSectionModel,
            as: 'classSection',
            attributes: ['sessionId', 'academicYearId'],
            required: true,
        }],
        transaction,
    });
    if (!termRow) {
        const error = new Error('classSectionTermId not found');
        error.statusCode = 404;
        throw error;
    }

    const { sessionId, academicYearId } = termRow.classSection;
    if (!sessionId || !academicYearId) {
        const error = new Error('class section sessionId and academicYearId are required for class_student_mapper');
        error.statusCode = 400;
        throw error;
    }

    return {
        studentId,
        classSectionTermId: Number(classSectionTermId),
        sessionId,
        academicYearId,
        createdBy,
    };
}

export async function sectionStudentMapping(data, transaction) {
    try {
        if (!data?.classSectionTermId) {
            const error = new Error('classSectionTermId is required for class_student_mapper');
            error.statusCode = 400;
            throw error;
        }
        const student = await assertScopedStudent(data.studentId, { transaction });
        if (!student) {
            throw new Error('Student not found');
        }
        const result = await scoped(model.classStudentMapperModel).create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function sectionStudentMappingExcel(data, transaction) {
    try {
        for (const row of data) {
            const student = await assertScopedStudent(row.studentId, { transaction });
            if (!student) {
                throw new Error(`Student not found: ${row.studentId}`);
            }
            if (!row.classSectionTermId) {
                const error = new Error(`classSectionTermId is required for class_student_mapper (student ${row.studentId})`);
                error.statusCode = 400;
                throw error;
            }
        }
        const result = await scoped(model.classStudentMapperModel).bulkCreate(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in student mapping course excel:", error);
        throw error;
    }
};

export async function getSectionStudentMapping(classSectionTermId, academicYearId, term, { page = 1, limit = 10, search } = {}) {
    try {
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return { result: [], totalCount: 0, page, limit, totalPages: 0 };
        }

        const studentScope = buildScope(model.studentModel);

        const whereConditions = {
            ...buildScope(model.classStudentMapperModel),
            ...(academicYearId != null && { academicYearId }),
        };
        if (classSectionTermId !== 0 && classSectionTermId != null) {
            whereConditions.classSectionTermId = classSectionTermId;
        }

        // Search is applied at the root WHERE (evaluated after all joins) so that
        // the nested course column resolves. Paths are relative to the query root.
        const searchWhere = {};
        if (search) {
            const like = `%${search}%`;
            searchWhere[Op.or] = [
                { '$studentMapped.first_name$': { [Op.like]: like } },
                { '$studentMapped.last_name$': { [Op.like]: like } },
                { '$studentMapped.middle_name$': { [Op.like]: like } },
                { '$studentMapped.scholar_number$': { [Op.like]: like } },
                { '$studentMapped.enroll_number$': { [Op.like]: like } },
                { '$studentMapped.father_name$': { [Op.like]: like } },
            ];
        }

        const termPlacementInclude = {
            model: model.classSectionTermModel,
            as: 'studentTermPlacement',
            attributes: ['classSectionTermId', 'term', 'classSectionsId'],
            include: [{
                model: model.classSectionModel,
                as: 'classSection',
                attributes: ['classSectionsId', 'section', 'year', 'sessionId', 'academicYearId'],
                required: false,
            }],
            ...(term != null && term !== 0 && {
                required: true,
                where: { term: Number(term) },
            }),
        };

        const studentMappedInclude = {
            model: model.studentModel,
            as: "studentMapped",
            required: true,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: studentScope,
            include: [
                studentSessionWithAcademicYearInclude(
                    academicYearId != null ? { academicYearId: academicYearId } : {},
                ),
                {
                    model: model.campusModel,
                    as: "campus",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
                },
                {
                    model: model.instituteModel,
                    as: "institute",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
                },
                {
                    model: model.affiliatedIniversityModel,
                    as: "affiliatedUniversity",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
                },
                {
                    model: model.employeeCodeMasterType,
                    as: "courseLevel",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id"] },
                    include: [
                        {
                            model: model.employeeCodeMaster,
                            as: "codes",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                    ],
                },
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
                },
                {
                    model: model.specializationModel,
                    as: "specialization",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "specializationId", "course_Id", "specializationCode"] },
                },
                studentClassSectionInclude,
                {
                    model: model.studentsEntranceDetail,
                    as: "entranceDetails",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.studentsAddress,
                    as: "studentAddress",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
            ],
        };

        const filterInclude = [
            {
                model: model.studentModel,
                as: "studentMapped",
                attributes: [],
                required: true,
                where: studentScope,
            },
            termPlacementInclude,
        ];

        const offset = (page - 1) * limit;

        const idRows = await model.classStudentMapperModel.findAll({
            attributes: ["classStudentMapperId"],
            where: { ...whereConditions, ...searchWhere },
            include: filterInclude,
            offset,
            limit,
            order: [["classStudentMapperId", "DESC"]],
            subQuery: false,
            raw: true,
        });
        const mapperIds = idRows.map((row) => row.classStudentMapperId);

        let result = [];
        if (mapperIds.length > 0) {
            result = await model.classStudentMapperModel.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                where: { classStudentMapperId: { [Op.in]: mapperIds } },
                include: [
                    {
                        model: model.userModel,
                        as: "userClassStudentMapper",
                        attributes: ["universityId", "userId"],
                    },
                    termPlacementInclude,
                    studentMappedInclude,
                ],
                order: [["classStudentMapperId", "DESC"]],
            });
        }

        const totalCount = await model.classStudentMapperModel.count({
            where: { ...whereConditions, ...searchWhere },
            include: filterInclude,
            distinct: true,
            col: 'class_student_mapper_id',
        });

        return {
            result,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
        };
    } catch (error) {
        console.error(`Error in getting mapped student ${classSectionTermId}:`, error);
        throw error;
    }
};

export async function addElectiveSubject(data) {
    try {
        const result = await model.studentElectiveSubjectModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in student  Elective Subject Model:", error);
        throw error;
    }
};

export async function promoteStudent(studentId, data, transaction) {
    try {
        const existing = await assertScopedStudent(studentId, { transaction });
        if (!existing) {
            return { result1: [0], result2: [0] };
        }

        const {
            academicYearId,
            classSectionTermId,
            sessionId,
            classStudentMapperId,
            ...rest
        } = data;
        const studentUpdate = {
            ...(classSectionTermId != null && { classSectionTermId }),
            ...(sessionId != null && { sessionId }),
            ...rest,
        };
        const mapperUpdate = {
            ...(academicYearId != null && { academicYearId }),
            ...(sessionId != null && { sessionId }),
        };
        if (classSectionTermId == null) {
            const error = new Error('classSectionTermId is required when updating class_student_mapper');
            error.statusCode = 400;
            throw error;
        }
        mapperUpdate.classSectionTermId = classSectionTermId;

        const result1 = await scoped(model.studentModel).update(studentUpdate, {
            where: { studentId },
            transaction,
        });

        const mapperWhere = classStudentMapperId
            ? { classStudentMapperId }
            : { studentId };

        const result2 = await scoped(model.classStudentMapperModel).update(mapperUpdate, {
            where: {
                ...omitAcademicYearScope(buildScope(model.classStudentMapperModel)),
                ...mapperWhere,
            },
            transaction,
        });
        return { result1, result2 };
    } catch (error) {
        console.error(`Error updating student promote ${studentId} :`, error);
        throw error;
    }
};

export async function getSectionStudentMapperByStudentId(studentId) {
    try {
        const student = await assertScopedStudent(studentId);
        if (!student) {
            return null;
        }

        return model.classStudentMapperModel.findOne({
            where: { studentId },
            attributes: ["classStudentMapperId", "academicYearId", "classSectionTermId", "sessionId"],
            order: [["classStudentMapperId", "DESC"]],
        });
    } catch (error) {
        console.error(`Error fetching class student mapper for ${studentId}:`, error);
        throw error;
    }
}

export async function getStudentForPromate(studentId) {
    try {
        const result = await scoped(model.studentModel).findOne({
            where: {
                studentId: studentId
            },
            include: [
                {
                    model: model.sessionModel,
                    as: "studentSession",
                    attributes: ["sessionId", "academicYearId"],
                    include: [
                        {
                            model: model.acedmicYearModel,
                            as: "sessionAcedmic",
                            attributes: ["academicYearId", "yearTitle"],
                        },
                    ],
                },
                {
                    model: model.classStudentMapperModel,
                    as: "studentMapped",
                    attributes: ["academicYearId", "classSectionTermId", "sessionId"],
                    separate: true,
                    limit: 1,
                    order: [["classStudentMapperId", "DESC"]],
                },
                studentClassSectionTermWithSectionInclude({
                    sectionAttributes: ['classSectionsId', 'academicYearId', 'sessionId'],
                }),
            ],
        });
        return result;
    } catch (error) {
        console.error(`Error get student for promote ${studentId} :`, error);
        throw error;
    }
};

export async function getSemesterByCourseId(courseId) {
    try {
        return await getSemesterProgressionByCourseId(courseId);
    } catch (error) {
        console.error(`Error get semester By course Id ${courseId} :`, error);
        throw error;
    }
}

export async function getSemesterProgressionByCourseId(courseId) {
    const course = await scoped(model.courseModel).findOne({
        where: { courseId: Number(courseId) },
        attributes: ['courseId', 'termType', 'totalTerms', 'courseDuration'],
        raw: true,
    });
    if (!course) return [];
    return buildCourseTermOptions(course).map((opt) => ({
        term: opt.term,
        name: opt.name,
        termName: opt.termName,
        courseId: opt.courseId,
    }));
}

export async function getTargetClassSectionForPromotion(classSectionsId) {
    return model.classSectionModel.findOne({
        where: promotionClassSectionWhere({ classSectionsId }),
        attributes: [
            "classSectionsId",
            "courseId",
            "instituteId",
            "sessionId",
            "academicYearId",
            "specializationId",
        ],
        include: [classSectionTermsInclude()],
    });
}

export async function getNextAcedmicYearAfter(currentacademicYearId) {
    const current = await model.acedmicYearModel.findOne({
        where: { academicYearId: currentacademicYearId },
        attributes: ['academicYearId', 'universityId', 'startingDate', 'yearTitle'],
    });

    if (!current) {
        return null;
    }

    // Academic years are university-scoped; institute_id on the row reflects who created it
    // and can differ between consecutive years (see acedmic year backfill migration).
    const nextById = await model.acedmicYearModel.findOne({
        where: {
            universityId: current.universityId,
            academicYearId: { [Op.gt]: current.academicYearId },
        },
        attributes: ['academicYearId', 'yearTitle', 'startingDate', 'endingDate'],
        order: [['academicYearId', 'ASC']],
    });

    if (nextById) {
        return nextById;
    }

    // Fallback when ids are not sequential (legacy data)
    return model.acedmicYearModel.findOne({
        where: {
            universityId: current.universityId,
            startingDate: { [Op.gt]: current.startingDate },
        },
        attributes: ['academicYearId', 'yearTitle', 'startingDate', 'endingDate'],
        order: [['startingDate', 'ASC']],
    });
}

export async function getPromotionClassSections({
    courseId,
    academicYearId,
    term,
    specializationId,
    instituteId,
}) {
    const sectionWhere = promotionClassSectionWhere({
        courseId,
        academicYearId,
        ...(instituteId != null && { instituteId }),
    });

    if (specializationId != null) {
        sectionWhere[Op.or] = [{ specializationId }, { specializationId: null }];
    }

    return scoped(model.classSectionTermModel).findAll({
        where: { term: Number(term) },
        attributes: ['classSectionTermId', 'term', 'classSectionsId'],
        include: [{
            model: model.classSectionModel,
            as: 'classSection',
            where: sectionWhere,
            required: true,
            attributes: [
                'classSectionsId',
                'section',
                'sessionId',
                'academicYearId',
                'specializationId',
                'year',
                'courseId',
                'instituteId',
            ],
        }],
        order: [[{ model: model.classSectionModel, as: 'classSection' }, 'section', 'ASC']],
    });
}

export async function addStudentInvoiceMapper(dataList, transaction) {
    try {
        const result = await model.studentInvoiceMapperModel.bulkCreate(dataList, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Student Invoice Mapper:", error);
        throw error;
    }
};

export async function updateStudentfeeStatus(studentId, data) {
    try {
        const existing = await assertScopedStudent(studentId);
        if (!existing) {
            return [0];
        }

        const result = await scoped(model.studentModel).update(data, {
            where: {
                studentId: studentId
            }
        });
        return result;
    } catch (error) {
        console.error(`Error updating student details ${studentId} :`, error);
        throw error;
    }
};

export async function countStudentsWithFeePlanForInitiate(options = {}) {
    try {
        const { transaction } = options;

        return await model.studentModel.count({
            where: studentWithFeePlanInitiateWhere(),
            transaction,
        });
    } catch (error) {
        console.error("Error in countStudentsWithFeePlanForInitiate:", error);
        throw error;
    }
}

export async function findStudentsWithFeePlanForInitiate(options = {}) {
    try {
        const { page = 1, limit = 20, transaction } = options;
        const offset = (page - 1) * limit;

        return await model.studentModel.findAll({
            where: studentWithFeePlanInitiateWhere(),
            attributes: [
                "studentId",
                "firstName",
                "middleName",
                "lastName",
                "scholarNumber",
                "enrollDate",
                "admisssionDate",
                "feePlanProfileId",
            ],
            include: [
                studentSessionIncludeWithoutAcademicYear(),
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseId", "courseName"],
                },
                studentClassSectionTermWithSectionInclude({
                    sectionAttributes: ["classSectionsId", "year", "section"],
                }),
                {
                    model: model.feePlanProfileModel,
                    as: "studentFeePlanProfile",
                    attributes: ["feePlanProfileId", "name", "planType", "courseSessionId"],
                },
            ],
            order: [
                ["scholarNumber", "ASC"],
                ["studentId", "ASC"],
            ],
            limit,
            offset,
            transaction,
        });
    } catch (error) {
        console.error("Error in findStudentsWithFeePlanForInitiate:", error);
        throw error;
    }
}

export async function findFeePlanItemsByProfileIds(profileIds, options = {}) {
    try {
        const { transaction } = options;
        if (!profileIds?.length) return [];

        return await scoped(model.feePlanItemModel).findAll({
            where: {
                feePlanProfileId: { [Op.in]: profileIds },
            },
            attributes: [
                "feePlanItemId",
                "feePlanProfileId",
                "createDate",
                "dueDate",
            ],
            include: [
                {
                    model: model.feePlanSubItemsModel,
                    as: "feePlanSubItems",
                    required: false,
                    attributes: [
                        "feePlanSubitemId",
                        "feeTypeId",
                        "amount",
                        "isMainSubItem",
                        "feePlanItemId",
                    ],
                    include: [
                        {
                            model: model.feeTypeCatalogModel,
                            as: "feeTypeCatalog",
                            attributes: ["feeTypeCatalogId", "name"],
                        },
                    ],
                },
            ],
            order: [
                ["feePlanProfileId", "ASC"],
                ["createDate", "ASC"],
                ["feePlanItemId", "ASC"],
            ],
            transaction,
        });
    } catch (error) {
        console.error("Error in findFeePlanItemsByProfileIds:", error);
        throw error;
    }
}

export async function findInvoicesByStudentIds(studentIds, options = {}) {
    try {
        const { transaction } = options;
        if (!studentIds.length) return [];

        return await scoped(model.studentFeeInvoiceModel).findAll({
            where: {
                studentId: { [Op.in]: studentIds },
            },
            attributes: [
                "studentFeeInvoiceId",
                "studentId",
                "feePlanItemId",
                "paymentStatus",
                "status",
                "paidAmount",
            ],
            transaction,
        });
    } catch (error) {
        console.error("Error in findInvoicesByStudentIds:", error);
        throw error;
    }
}

export async function findStudentsByFeePlanProfileId(
    feePlanProfileId,
    options = {}
) {
    try {
        const { academicYearId, transaction } = options;
        const where = {
            feePlanProfileId,
        };

        const sessionInclude =
            academicYearId != null
                ? studentSessionWithAcademicYearInclude({ academicYearId: academicYearId })
                : {
                    model: model.sessionModel,
                    as: 'studentSession',
                    attributes: studentSessionAttrs,
                };

        return await scoped(model.studentModel).findAll({
            where,
            attributes: [
                "studentId",
                "firstName",
                "middleName",
                "lastName",
                "scholarNumber",
                "enrollDate",
                "admisssionDate",
                "feePlanProfileId",
            ],
            include: [
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseId", "courseName"],
                },
                sessionInclude,
                studentClassSectionTermWithSectionInclude({
                    sectionAttributes: ["classSectionsId", "year", "section"],
                }),
                {
                    model: model.feePlanProfileModel,
                    as: "studentFeePlanProfile",
                    attributes: ["feePlanProfileId", "name", "planType", "courseSessionId"],
                },
            ],
            order: [
                ["scholarNumber", "ASC"],
                ["studentId", "ASC"],
            ],
            transaction,
        });
    } catch (error) {
        console.error(
            `Error in findStudentsByFeePlanProfileId for profile ${feePlanProfileId}:`,
            error
        );
        throw error;
    }
}

export async function findFeePlanProfileByIdForInitiate(
    feePlanProfileId,
    options = {}
) {
    try {
        const { transaction } = options;
        return await scoped(model.feePlanProfileModel).findOne({
            where: { feePlanProfileId },
            attributes: [
                "feePlanProfileId",
                "name",
                "planType",
                "courseSessionId",
                "instituteId",
            ],
            transaction,
        });
    } catch (error) {
        console.error(
            `Error in findFeePlanProfileByIdForInitiate for profile ${feePlanProfileId}:`,
            error
        );
        throw error;
    }
}

export async function findFeePlanItemsByProfileId(feePlanProfileId, options = {}) {
    try {
        const { transaction } = options;
        return await scoped(model.feePlanItemModel).findAll({
            where: { feePlanProfileId },
            attributes: [
                "feePlanItemId",
                "feePlanProfileId",
                "createDate",
                "dueDate",
            ],
            include: [
                {
                    model: model.feePlanSubItemsModel,
                    as: "feePlanSubItems",
                    required: false,
                    attributes: [
                        "feePlanSubitemId",
                        "feeTypeId",
                        "amount",
                        "isMainSubItem",
                        "feePlanItemId",
                    ],
                },
            ],
            order: [
                ["createDate", "ASC"],
                ["feePlanItemId", "ASC"],
            ],
            transaction,
        });
    } catch (error) {
        console.error(
            `Error in findFeePlanItemsByProfileId for profile ${feePlanProfileId}:`,
            error
        );
        throw error;
    }
}

export async function findInvoicesByStudentIdsForProfile(
    studentIds,
    feePlanProfileId,
    options = {}
) {
    try {
        const { transaction } = options;
        if (!studentIds.length) {
            return [];
        }

        return await scoped(model.studentFeeInvoiceModel).findAll({
            where: {
                studentId: { [Op.in]: studentIds },
            },
            attributes: [
                "studentFeeInvoiceId",
                "studentId",
                "feePlanItemId",
                "paymentStatus",
                "status",
                "paidAmount",
                "total",
            ],
            include: [
                {
                    model: model.feePlanItemModel,
                    as: "feePlanItem",
                    attributes: ["feePlanItemId", "feePlanProfileId"],
                    where: { feePlanProfileId },
                    required: true,
                },
            ],
            transaction,
        });
    } catch (error) {
        console.error(
            `Error in findInvoicesByStudentIdsForProfile for profile ${feePlanProfileId}:`,
            error
        );
        throw error;
    }
}

// Build the WHERE and includes for the fee plan student list. All filters are optional.
function buildFeePlanStudentListQuery(filters = {}) {
    const { courseId, year, term, feePlanProfileId, academicYearId } = filters;

    const where = {};
    if (courseId != null) {
        where.courseId = Number(courseId);
    }
    if (feePlanProfileId != null) {
        where.feePlanProfileId = Number(feePlanProfileId);
    }

    // Inner join the placement only when filtering by year/term.
    const filterByPlacement = year != null || term != null;

    const include = [
        {
            model: model.courseModel,
            as: 'course',
            attributes: ['courseId', 'courseName', 'termType'],
        },
        studentClassSectionTermWithSectionInclude({
            term: term != null ? Number(term) : undefined,
            sectionWhere: year != null ? { year: Number(year) } : undefined,
            sectionRequired: year != null,
            termRequired: filterByPlacement,
            sectionAttributes: ['classSectionsId', 'year', 'section'],
            includeSectionTerms: false,
        }),
        studentSessionWithAcademicYearInclude({ academicYearId }),
        {
            model: model.feePlanProfileModel,
            as: 'studentFeePlanProfile',
            attributes: ['feePlanProfileId', 'name', 'planType'],
        },
    ];

    return { where, include };
}

// Total course fee per plan, summed in SQL: feePlanProfileId -> totalFee.
async function getTotalFeeByProfile(profileIds) {
    if (!profileIds.length) {
        return {};
    }

    const rows = await scoped(model.feePlanItemModel).findAll({
        attributes: [
            'feePlanProfileId',
            [fn('SUM', col('feePlanSubItems.amount')), 'totalFee'],
        ],
        where: { feePlanProfileId: { [Op.in]: profileIds } },
        include: [{
            model: model.feePlanSubItemsModel,
            as: 'feePlanSubItems',
            attributes: [],
        }],
        group: ['feePlanProfileId'],
        raw: true,
    });

    const totalFeeByProfile = {};
    for (const row of rows) {
        totalFeeByProfile[row.feePlanProfileId] = toMoneyNumber(row.totalFee);
    }
    return totalFeeByProfile;
}

// Invoice count, paid count and paid amount per student, aggregated in SQL: studentId -> summary.
async function getInvoiceSummaryByStudent(studentIds) {
    if (!studentIds.length) {
        return {};
    }

    const totals = await scoped(model.studentFeeInvoiceModel).findAll({
        attributes: [
            'studentId',
            [fn('COUNT', col('student_fee_invoice_id')), 'total'],
            [fn('SUM', col('paid_amount')), 'paidAmount'],
        ],
        where: { studentId: { [Op.in]: studentIds } },
        group: ['studentId'],
        raw: true,
    });

    const paidCounts = await scoped(model.studentFeeInvoiceModel).findAll({
        attributes: [
            'studentId',
            [fn('COUNT', col('student_fee_invoice_id')), 'paid'],
        ],
        where: { studentId: { [Op.in]: studentIds }, paymentStatus: 'paid' },
        group: ['studentId'],
        raw: true,
    });

    const summaryByStudent = {};
    for (const row of totals) {
        summaryByStudent[row.studentId] = {
            total: Number(row.total),
            paid: 0,
            paidAmount: toMoneyNumber(row.paidAmount),
        };
    }
    for (const row of paidCounts) {
        if (summaryByStudent[row.studentId]) {
            summaryByStudent[row.studentId].paid = Number(row.paid);
        }
    }
    return summaryByStudent;
}

export async function getStudentsByFeePlanList(filters = {}) {
    try {
        const { academicYearId, page = 1, limit = 10 } = filters;

        // Academic year is mandatory for tenant scope; without it there is nothing to list.
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return { students: [], totalCount: 0, page, limit, totalPages: 0 };
        }

        const { where, include } = buildFeePlanStudentListQuery(filters);

        // All includes are to-one relations, so limit/offset pagination is safe in a single query.
        const { rows, count } = await scoped(model.studentModel).findAndCountAll({
            where,
            include,
            attributes: [
                'studentId',
                'firstName',
                'middleName',
                'lastName',
                'scholarNumber',
                'feePlanProfileId',
                'courseId',
            ],
            order: [['scholarNumber', 'ASC'], ['studentId', 'ASC']],
            offset: (page - 1) * limit,
            limit,
            distinct: true,
            subQuery: false,
        });

        const studentIds = [];
        const profileIds = [];
        for (const row of rows) {
            studentIds.push(row.studentId);
            if (row.feePlanProfileId != null && !profileIds.includes(row.feePlanProfileId)) {
                profileIds.push(row.feePlanProfileId);
            }
        }

        // Fee and invoice totals are aggregated in SQL, then keyed for O(1) lookup.
        const [totalFeeByProfile, invoiceSummaryByStudent] = await Promise.all([
            getTotalFeeByProfile(profileIds),
            getInvoiceSummaryByStudent(studentIds),
        ]);

        const students = [];
        for (const row of rows) {
            const student = row.get({ plain: true });
            const summary = invoiceSummaryByStudent[student.studentId] ?? { total: 0, paid: 0, paidAmount: 0 };
            student.totalFee = totalFeeByProfile[student.feePlanProfileId] ?? 0;
            student.invoices = { total: summary.total, paid: summary.paid };
            student.paidAmount = summary.paidAmount;
            students.push(student);
        }

        return {
            students,
            totalCount: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };
    } catch (error) {
        console.error('Error in getStudentsByFeePlanList:', error);
        throw error;
    }
}

export async function getEmptyFeeDetails(filters = {}) {
    try {
        const { courseId, sessionId, academicYearId, year, search, page = 1, limit = 10 } = filters;
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return { result: [], totalCount: 0, page, limit, totalPages: 0 };
        }

        const where = {
            feePlanProfileId: { [Op.is]: null },
            ...(courseId != null && { courseId }),
            ...(sessionId != null && { sessionId }),
        };

        if (search) {
            const like = `%${search}%`;
            where[Op.or] = [
                { firstName: { [Op.like]: like } },
                { lastName: { [Op.like]: like } },
                { middleName: { [Op.like]: like } },
                { scholarNumber: { [Op.like]: like } },
                { enrollNumber: { [Op.like]: like } },
            ];
        }

        const classSectionInclude = year != null
            ? studentClassSectionTermWithSectionInclude({
                sectionWhere: { year: Number(year) },
                sectionRequired: true,
                termRequired: true,
            })
            : studentClassSectionTermWithSectionInclude();

        const sessionInclude = studentSessionWithAcademicYearInclude({
            academicYearId: academicYearId,
        });

        const include = [
            {
                model: model.courseModel,
                as: "course",
                attributes: ["courseName", "courseCode"],
            },
            classSectionInclude,
            sessionInclude,
        ];

        // Filtering joins (year class section + session) drive which students match.
        const filterInclude = [classSectionInclude, sessionInclude];

        const offset = (page - 1) * limit;

        // Step 1: page over distinct student IDs matching the filter.
        const idRows = await scoped(model.studentModel).findAll({
            attributes: ["studentId"],
            where,
            include: filterInclude,
            offset,
            limit,
            order: [["studentId", "DESC"]],
            subQuery: false,
            raw: true,
        });
        const studentIds = idRows.map((row) => row.studentId);

        // Step 2: hydrate full rows for the paged IDs.
        let result = [];
        if (studentIds.length > 0) {
            const rows = await scoped(model.studentModel).findAll({
                where: { studentId: { [Op.in]: studentIds } },
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                include,
                order: [["studentId", "DESC"]],
            });
            result = rows.map((row) => row.get({ plain: true }));
        }

        // Step 3: total count of matching students for pagination.
        const totalCount = await scoped(model.studentModel).count({
            where,
            include: filterInclude,
            distinct: true,
            col: 'student_id',
        });

        return {
            result,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
        };
    } catch (error) {
        console.error('Error in getting feeplan details:', error);
        throw error;
    }
};

export async function getStudentSubject(studentId) {
    try {
        if (!(await assertStudentInRequestAcademicYear(studentId))) {
            return [];
        }

        return await scoped(model.studentModel).findAll({
            where: {
                studentId,
            },
            attributes: ["studentId", "firstName", "middleName", "lastName", "classSectionTermId", "courseId"],
            include: [
                studentClassSectionTermInclude,
                {
                    model: model.courseModel,
                    as: 'course',
                    attributes: ['courseId', 'termType', 'totalTerms'],
                },
            ],
        });
    } catch (error) {
        console.error('Error in getting feeplan details:', error);
        throw error;
    }
};

export async function getClassSectionRecord(courseId, classSectionId) {
    try {
        const classSectionsId = Number(classSectionId);
        const courseIdNum = Number(courseId);

        const classSection = await scoped(model.classSectionModel).findOne({
            where: { classSectionsId, courseId: courseIdNum },
            attributes: [
                'classSectionsId',
                'courseId',
                'academicYearId',
                'section',
                'year',
            ],
            include: [classSectionTermsInclude()],
        });

        if (!classSection) {
            const error = new Error('Class section not found for this course');
            error.statusCode = 404;
            throw error;
        }

        const plainSection = classSection.get ? classSection.get({ plain: true }) : classSection;
        const termRows = plainSection.classSectionTerms ?? [];
        const termIds = [];

        for (const row of termRows) {
            if (row.classSectionTermId != null) {
                termIds.push(row.classSectionTermId);
            }
        }

        let student = [];

        if (termIds.length) {
            student = await scoped(model.studentModel).findAll({
                where: {
                    courseId: courseIdNum,
                    classSectionTermId: { [Op.in]: termIds },
                },
                attributes: [
                    'studentId',
                    'firstName',
                    'middleName',
                    'lastName',
                    'scholarNumber',
                    'email',
                    'mobileNumber',
                    'phoneNumber',
                    'courseId',
                    'classSectionTermId',
                ],
                include: [
                    studentClassSectionTermWithSectionInclude({
                        includeSectionTerms: false,
                        termRequired: true,
                        sectionRequired: true,
                        sectionWhere: { classSectionsId },
                    }),
                ],
                order: [['studentId', 'ASC']],
            });
        }

        const teacher = await model.teacherSectionMappingModel.findAll({
            where: {
                classSectionsId,
            },
            attributes: ['teacherSectionMappingId', 'classSectionsId', 'userId', 'isCordinatory'],
            include: [
                {
                    model: model.employeeModel,
                    as: 'employeeData',
                    attributes: ['userId', 'employeeId', 'employeeName', 'fatherName', 'motherName', 'employeeCode', 'departmentId', 'employmentType', 'dateOfBirth', 'pickColor'],
                    where: buildScope(model.employeeModel),
                    required: true,
                    include: [
                        {
                            model: model.teacherSubjectMappingModel,
                            as: 'teacherEmployeeData',
                            attributes: ['teacherSubjectMappingId', 'subjectId'],
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'employeeSubject',
                                    attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType'],
                                    where: buildScope(model.subjectModel),
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        return {
            classSection,
            student,
            teacher,
            termRows,
        };
    } catch (error) {
        console.error('Error in getting class record details:', error);
        throw error;
    }
};

/**
 * classSectionsId → class.term → subject.term (same value) + courseId → subjectIds
 */
export async function getSubjectIdsByClassSection(classSectionsId) {
    try {
        const section = await scoped(model.classSectionModel).findOne({
            where: { classSectionsId: Number(classSectionsId) },
            attributes: ['classSectionsId', 'courseId', 'year'],
            include: [classSectionTermsInclude()],
        });
        if (!section) return [];

        const plain = section.get ? section.get({ plain: true }) : section;
        const term = resolveProgramTerm(plain);
        if (term == null || !plain.courseId) return [];

        const rows = await scoped(model.subjectModel).findAll({
            where: {
                courseId: Number(plain.courseId),
                term: Number(term),
            },
            attributes: ['subjectId'],
            raw: true,
        });
        return rows.map((row) => row.subjectId);
    } catch (error) {
        console.error('Error in getSubjectIdsByClassSection:', error);
        throw error;
    }
}

export async function getStudentDetailsRepository(studentId) {
    try {
        if (!(await assertStudentInRequestAcademicYear(studentId))) {
            return null;
        }

        return await scoped(model.studentModel).findOne({
            where: { studentId },
            attributes: ['studentId', 'courseId', 'classSectionTermId'],
            include: [
                studentClassSectionTermWithSectionInclude(),
            ],
        });

    } catch (error) {
        console.error("Error in getStudentDetailsRepository:", error);
        throw error;
    }
}

export async function getStudentsByPlacement(placement, timeTableCellDateWiseId, options = {}) {

    try {
        const academicYearId = getRequestAcademicYearId();
        if (academicYearId == null) {
            return [];
        }

        const classSectionTermId = placement.classSectionTermId;
        const academicGroupId = placement.academicGroupId;

        let whereClause = {};
        let extraIncludes = [];

        if (academicGroupId) {
            extraIncludes.push({
                model: model.academicGroupStudentModel,
                as: 'academicGroupStudents',
                where: { academicGroupId: Number(academicGroupId) },
                required: true,
            });
        } else if (classSectionTermId) {
            whereClause.classSectionTermId = Number(classSectionTermId);
        } else {
            return [];
        }

        const attendanceStatus = options?.attendanceStatus && options.attendanceStatus.length > 0
            ? options.attendanceStatus
            : null;

        const attendanceWhere = Array.isArray(timeTableCellDateWiseId)
            ? { timeTableCellDateWiseId: { [Op.in]: timeTableCellDateWiseId.map(Number) } }
            : { timeTableCellDateWiseId: Number(timeTableCellDateWiseId) };

        if (attendanceStatus) {
            attendanceWhere.attendanceStatus = { [Op.in]: attendanceStatus };
        }

        const students = await scoped(model.studentModel).findAll({
            where: whereClause,
            attributes: [
                "studentId",
                "scholarNumber",
                "enrollNumber",
                "firstName",
                "lastName",
                "classSectionTermId",
            ],
            include: [
                ...extraIncludes,
                studentSessionWithAcademicYearInclude({
                    academicYearId: academicYearId,
                }),
                studentClassSectionTermWithSectionInclude({
                    classSectionTermId: classSectionTermId ? Number(classSectionTermId) : undefined,
                    termRequired: false,
                    sectionRequired: false,
                    sectionWhere: {
                        academicYearId: academicYearId,
                        ...buildScope(model.classSectionModel),
                    },
                    sectionAttributes: ["classSectionsId", "section", "year"],
                }),
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseId", "courseName", "courseCode", "termType"],
                },
                {
                    model: model.attendanceModel,
                    as: "studentAttendance",
                    attributes: [
                        "attendanceId",
                        "attendanceStatus",
                        "notes",
                        "description",
                        "date",
                        "timeTableCellDateWiseId",
                        "timeTableCellId",
                    ],
                    where: attendanceWhere,
                    required: attendanceStatus ? true : false,
                },
            ],
        });

        return students;

    } catch (error) {
        console.error("Repository Error:", error);
        throw error;
    }
}

export async function getScopedExamScheduleForEvaluation(examScheduleId) {
    return scoped(model.examScheduleModel).findOne({
        where: { examScheduleId },
        attributes: ["examScheduleId", "sessionId", "term"],
        include: [
            {
                model: model.examSetupTypeTermModel,
                as: "examSetupTypeTerm",
                attributes: ["examSetupTypeTermId", "courseId", "examSetupTypeId", "instituteId", "universityId", "term"],
                where: buildScope(model.examSetupTypeTermModel),
                required: true,
            },
        ],
    });
}

export async function getStudentsWithAnswerSheetStatus(sessionId, courseId, term, examScheduleId) {
    const academicYearId = getRequestAcademicYearId();
    if (academicYearId == null) {
        return [];
    }

    const sessionFilter = Number(sessionId);
    const courseFilter = Number(courseId);
    const termFilter = Number(term);

    if (!Number.isFinite(sessionFilter) || !Number.isFinite(courseFilter) || !Number.isFinite(termFilter)) {
        return [];
    }

    const sectionWhere = {
        sessionId: sessionFilter,
        courseId: courseFilter,
        academicYearId,
        ...buildScope(model.classSectionModel),
    };
    const answerSheetWhere = {
        examScheduleId: Number(examScheduleId),
        ...buildScope(model.answerSheetQrModel),
    };

    return scoped(model.studentModel).findAll({
        attributes: [
            "studentId",
            "firstName",
            "middleName",
            "lastName",
            "enrollNumber",
            "scholarNumber",
            "classSectionTermId",
        ],
        include: [
            studentSessionWithAcademicYearInclude({}),
            studentClassSectionTermWithSectionInclude({
                term: termFilter,
                termRequired: true,
                sectionRequired: true,
                sectionWhere,
                includeSectionTerms: false,
                termAttributes: ["classSectionTermId", "term", "classSectionsId"],
                sectionAttributes: ["classSectionsId", "year", "section", "sessionId", "courseId"],
            }),
            {
                model: model.answerSheetQrModel,
                as: "answerSheetQrs",
                attributes: ["id", "studentId", "examScheduleId"],
                where: answerSheetWhere,
                required: false,
            },
        ],
        order: [["firstName", "ASC"], ["studentId", "ASC"]],
    });
}


