import * as model from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';
import { getAcademicYearId } from '../utility/requestContext.js';
import {
    classSectionTermsInclude,
    resolveProgramTerm,
    resolveProgramYear,
    studentClassSectionTermWithSectionInclude,
} from '../utility/classSectionIncludes.js';
import { buildCourseTermOptions } from '../utility/courseTerms.js';

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

function buildStudentListWhere(search, courseId) {
    const where = {};

    if (courseId) {
        where.courseId = courseId;
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
        include.where = { academicYearId: academicYearId };
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
}) {
    try {
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
            studentSessionWithAcademicYearInclude(),
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

        const whereCondition = buildStudentListWhere(search, courseId);

        const offset = (page - 1) * limit;
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereCondition,
            include: baseInclude,
            offset,
            limit,
            order: [["studentId", "DESC"]],
            ...(search && { subQuery: false }),
        };

        const rows = await scoped(model.studentModel).findAll(queryOptions);
        const result = rows.map((row) => row.get({ plain: true }));

        const totalCount = await scoped(model.studentModel).count({
            where: whereCondition,
            include: baseInclude,
            distinct: true,
            col: 'student_id',
            ...(search && { subQuery: false }),
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

export async function getEmptyEnrollNumber(academicYearId) {
    try {
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return [];
        }

        return await scoped(model.studentModel).findAll({
            where: {
                enrollNumber: {
                    [Op.or]: [null, ''],
                },
            },
            include: [
                studentClassSectionInclude,
                studentSessionWithAcademicYearInclude({
                    academicYearId: academicYearId,
                }),
                {
                    model: model.userModel,
                    as: "userStudent",
                    attributes: ["universityId", "userId"],
                },
            ],
        });
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

export async function getSectionStudentMapping(classSectionTermId, academicYearId, term) {
    try {
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return [];
        }

        const studentScope = buildScope(model.studentModel);

        const whereConditions = {
            ...buildScope(model.classStudentMapperModel),
            ...(academicYearId != null && { academicYearId }),
        };
        if (classSectionTermId !== 0 && classSectionTermId != null) {
            whereConditions.classSectionTermId = classSectionTermId;
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

        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereConditions,
            include: [
                {
                    model: model.userModel,
                    as: "userClassStudentMapper",
                    attributes: ["universityId", "userId"],
                },
                termPlacementInclude,
                {
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
                },
            ],
        };

        return await model.classStudentMapperModel.findAll(queryOptions);
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

export async function getEmptyFeeDetails(filters = {}) {
    try {
        const { courseId, sessionId, academicYearId } = filters;
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return [];
        }

        const where = {
            feePlanProfileId: { [Op.is]: null },
            ...(courseId != null && { courseId }),
            ...(sessionId != null && { sessionId }),
        };

        const include = [
            {
                model: model.courseModel,
                as: "course",
                attributes: ["courseName", "courseCode"],
            },
            studentClassSectionTermWithSectionInclude(),
            studentSessionWithAcademicYearInclude({
                academicYearId: academicYearId,
            }),
        ];

        return await scoped(model.studentModel).findAll({
            where,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            include,
        });
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
            attributes: ['teacherSectionMappingId', 'classSectionsId', 'employeeId', 'isCordinatory'],
            include: [
                {
                    model: model.employeeModel,
                    as: 'employeeData',
                    attributes: ['employeeId', 'employeeName', 'fatherName', 'motherName', 'employeeCode', 'department', 'employmentType', 'dateOfBirth', 'pickColor'],
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

export async function getStudentsByClassSection(classSectionTermId, timeTableMappingId, date) {

    try {
        const academicYearId = getRequestAcademicYearId();
        if (academicYearId == null) {
            return [];
        }

        const students = await scoped(model.studentModel).findAll({
            where: {
                classSectionTermId: Number(classSectionTermId),
            },
            attributes: [
                "studentId",
                "scholarNumber",
                "enrollNumber",
                "firstName",
                "lastName",
                "classSectionTermId",
            ],
            include: [
                studentSessionWithAcademicYearInclude({
                    academicYearId: academicYearId,
                }),
                studentClassSectionTermWithSectionInclude({
                    classSectionTermId: Number(classSectionTermId),
                    termRequired: true,
                    sectionRequired: true,
                    sectionWhere: {
                        academicYearId: academicYearId,
                        ...buildScope(model.classSectionModel),
                    },
                    sectionAttributes: ["classSectionsId", "section"],
                }),
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseName"],
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
                        "timeTableMappingId",
                    ],
                    where: {
                        timeTableMappingId,
                        [Op.and]: [Sequelize.where(Sequelize.fn('DATE', Sequelize.col('studentAttendance.date')), date)],
                    },
                    required: false,
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

    const sectionWhere = {
        sessionId,
        courseId,
        academicYearId,
        ...buildScope(model.classSectionModel),
    };
    const answerSheetWhere = {
        examScheduleId,
        ...buildScope(model.answerSheetQrModel),
    };

    return scoped(model.studentModel).findAll({
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        include: [
            studentSessionWithAcademicYearInclude({}),
            studentClassSectionTermWithSectionInclude({
                term,
                termRequired: true,
                sectionRequired: true,
                sectionWhere,
                sectionAttributes: [],
                termAttributes: [],
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


