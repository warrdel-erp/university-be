import * as model from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

function omitAcademicYearScope(scopeWhere = {}) {
    const { acedmicYearId, ...rest } = scopeWhere;
    return rest;
}

/** Class-section reads for promotion may target a different academic year than request context. */
function promotionClassSectionWhere(filters = {}) {
    const { acedmicYearId, ...rest } = filters;
    return {
        ...omitAcademicYearScope(buildScope(model.classSectionModel)),
        ...rest,
        ...(acedmicYearId != null && { acedmicYearId }),
    };
}

function buildStudentName({ firstName, middleName, lastName }) {
    return [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
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

const sessionAcedmicYearAttrs = { exclude: ["createdAt", "updatedAt", "deletedAt"] };

function getRequestAcademicYearId() {
    return requestContext.getStore()?.academicYearId;
}

function studentSessionWithAcademicYearInclude(options = {}) {
    const { attributes } = options;
    const acedmicYearId = options.acedmicYearId ?? getRequestAcademicYearId();
    return {
        model: model.sessionModel,
        as: "studentSession",
        attributes: attributes ?? sessionAcedmicYearAttrs,
        ...(acedmicYearId != null && {
            required: true,
            where: {
                acedmicYearId,
                ...buildScope(model.sessionModel),
            },
        }),
        include: [
            {
                model: model.acedmicYearModel,
                as: "sessionAcedmic",
                attributes: sessionAcedmicYearAttrs,
            },
        ],
    };
}

/** Scoped read: student must belong to the logged-in academic year (via session). */
export async function assertStudentInRequestAcademicYear(studentId, options = {}) {
    const acedmicYearId = getRequestAcademicYearId();
    if (acedmicYearId == null) {
        return null;
    }

    return scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: options.attributes ?? ['studentId'],
        include: [studentSessionWithAcademicYearInclude({ acedmicYearId, attributes: [] })],
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
            {
                model: model.semesterModel,
                as: "studentSemester",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.classSectionModel,
                        as: 'classSections',
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                ],
            },
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
        const result = rows.map((row) => {
            const student = row.get({ plain: true });
            return {
                ...student,
                name: buildStudentName(student),
            };
        });

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
                {
                    model: model.semesterModel,
                    as: "studentSemester",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.classSectionModel,
                            as: 'classSections',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                    ],
                },
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

export async function getPreviousScholarNumber(instituteCode) {
    try {
        const attribute = ["scholar_number"];
        const result = await scoped(model.studentModel).findOne({
            attributes: attribute,
            where: {
                scholar_number: {
                    [Op.regexp]: `^${instituteCode}(/|$)`
                }
            },
            order: [['scholar_number', 'DESC']]
        });
        return result;
    } catch (error) {
        console.error(`Error in getPreviousScholarNumber for institue Code ${instituteCode}:`, error);
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

export async function getEmptyEnrollNumber(acedmicYearId) {
    try {
        if (getRequestAcademicYearId() == null && acedmicYearId == null) {
            return [];
        }

        return await scoped(model.studentModel).findAll({
            where: {
                enrollNumber: {
                    [Op.or]: [null, ''],
                },
            },
            include: [
                studentSessionWithAcademicYearInclude({
                    ...(acedmicYearId != null && { acedmicYearId }),
                    attributes: [],
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
        const result = await model.subjectMapperModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function buildClassStudentMapperCreatePayload(
    {
        studentId,
        classSectionsId,
        createdBy,
        semesterId,
        sessionId,
        acedmicYearId,
    },
    transaction,
) {
    const student = await scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ['studentId', 'semesterId', 'sessionId', 'classSectionsId'],
        transaction,
    });
    if (!student) {
        const error = new Error('Student not found');
        error.statusCode = 404;
        throw error;
    }

    const sectionId = classSectionsId ?? student.classSectionsId;
    let resolvedSemesterId = semesterId ?? student.semesterId ?? null;
    let resolvedSessionId = sessionId ?? student.sessionId ?? null;
    let resolvedAcedmicYearId = acedmicYearId ?? null;

    if (sectionId) {
        const section = await getTargetClassSectionForPromotion(sectionId);
        const plain = section?.get({ plain: true });
        if (plain) {
            resolvedSemesterId = resolvedSemesterId ?? plain.semesterId ?? null;
            resolvedSessionId = resolvedSessionId ?? plain.sessionId ?? null;
            resolvedAcedmicYearId = resolvedAcedmicYearId ?? plain.acedmicYearId ?? null;
        }
    }

    if (!resolvedAcedmicYearId && resolvedSessionId) {
        const session = await model.sessionModel.findByPk(resolvedSessionId, {
            attributes: ['acedmicYearId'],
            transaction,
        });
        resolvedAcedmicYearId = session?.acedmicYearId ?? null;
    }

    if (!resolvedSemesterId) {
        const error = new Error('semesterId is required for class_student_mapper');
        error.statusCode = 400;
        throw error;
    }
    if (!resolvedSessionId || !resolvedAcedmicYearId) {
        const error = new Error('sessionId and acedmicYearId are required for class_student_mapper');
        error.statusCode = 400;
        throw error;
    }

    return {
        studentId,
        semesterId: resolvedSemesterId,
        sessionId: resolvedSessionId,
        acedmicYearId: resolvedAcedmicYearId,
        createdBy,
    };
}

export async function classStudentMapping(data, transaction) {
    try {
        if (!data?.semesterId) {
            const error = new Error('semesterId is required for class_student_mapper');
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

export async function classStudentMappingExcel(data, transaction) {
    try {
        for (const row of data) {
            const student = await assertScopedStudent(row.studentId, { transaction });
            if (!student) {
                throw new Error(`Student not found: ${row.studentId}`);
            }
            if (!row.semesterId) {
                const error = new Error(`semesterId is required for class_student_mapper (student ${row.studentId})`);
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

export async function getclassStudentMapping(semesterId, acedmicYearId) {
    try {
        if (getRequestAcademicYearId() == null && acedmicYearId == null) {
            return [];
        }

        const studentScope = buildScope(model.studentModel);

        const whereConditions = {
            ...buildScope(model.classStudentMapperModel),
            ...(acedmicYearId != null && { acedmicYearId }),
        };
        if (semesterId !== 0) whereConditions.semester_id = semesterId;

        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereConditions,
            include: [
                {
                    model: model.userModel,
                    as: "userClassStudentMapper",
                    attributes: ["universityId", "userId"],
                },
                {
                    model: model.semesterModel,
                    as: "studentSection",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.classSectionModel,
                            as: 'classSections',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                    ],
                },
                {
                    model: model.studentModel,
                    as: "studentMapped",
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: studentScope,
                    include: [
                        studentSessionWithAcademicYearInclude({
                            ...(acedmicYearId != null && { acedmicYearId }),
                            attributes: [],
                        }),
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
                        studentSessionWithAcademicYearInclude(
                            acedmicYearId ? { acedmicYearId, attributes: sessionAcedmicYearAttrs } : {},
                        ),
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
        console.error(`Error in getting mapped student ${semesterId}:`, error);
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
            acedmicYearId,
            semesterId,
            classSectionsId,
            sessionId,
            classStudentMapperId,
            ...rest
        } = data;
        const studentUpdate = {
            ...(semesterId != null && { semesterId }),
            ...(classSectionsId != null && { classSectionsId }),
            ...(sessionId != null && { sessionId }),
            ...rest,
        };
        const mapperUpdate = {
            ...(acedmicYearId != null && { acedmicYearId }),
            ...(sessionId != null && { sessionId }),
        };
        if (semesterId == null) {
            const error = new Error('semesterId is required when updating class_student_mapper');
            error.statusCode = 400;
            throw error;
        }
        mapperUpdate.semesterId = semesterId;

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

export async function getClassStudentMapperByStudentId(studentId) {
    try {
        const student = await assertScopedStudent(studentId);
        if (!student) {
            return null;
        }

        return model.classStudentMapperModel.findOne({
            where: { studentId },
            attributes: ["classStudentMapperId", "acedmicYearId", "semesterId", "sessionId"],
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
                    attributes: ["sessionId", "acedmicYearId"],
                    include: [
                        {
                            model: model.acedmicYearModel,
                            as: "sessionAcedmic",
                            attributes: ["acedmicYearId", "yearTitle"],
                        },
                    ],
                },
                {
                    model: model.classStudentMapperModel,
                    as: "studentMapped",
                    attributes: ["acedmicYearId", "semesterId", "sessionId"],
                    separate: true,
                    limit: 1,
                    order: [["classStudentMapperId", "DESC"]],
                },
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
    return scoped(model.semesterModel).findAll({
        where: {
            courseId,
            ...omitAcademicYearScope(buildScope(model.semesterModel)),
        },
        attributes: ["semesterId", "acedmicYearId", "semesterDuration", "name"],
        order: [
            ["acedmicYearId", "ASC"],
            ["semesterId", "ASC"],
        ],
        raw: true,
    });
}

export async function getTargetClassSectionForPromotion(classSectionsId) {
    return scoped(model.classSectionModel).findOne({
        where: promotionClassSectionWhere({ classSectionsId }),
        attributes: [
            "classSectionsId",
            "courseId",
            "instituteId",
            "sessionId",
            "acedmicYearId",
            "semesterId",
            "specializationId",
        ],
        include: [
            {
                model: model.classModel,
                as: "classGroup",
                attributes: ["term"],
            },
        ],
    });
}

export async function getNextAcedmicYearAfter(currentAcedmicYearId) {
    const current = await model.acedmicYearModel.findOne({
        where: { acedmicYearId: currentAcedmicYearId },
        attributes: ['acedmicYearId', 'universityId', 'startingDate', 'yearTitle'],
    });

    if (!current) {
        return null;
    }

    // Academic years are university-scoped; institute_id on the row reflects who created it
    // and can differ between consecutive years (see acedmic year backfill migration).
    const nextById = await model.acedmicYearModel.findOne({
        where: {
            universityId: current.universityId,
            acedmicYearId: { [Op.gt]: current.acedmicYearId },
        },
        attributes: ['acedmicYearId', 'yearTitle', 'startingDate', 'endingDate'],
        order: [['acedmicYearId', 'ASC']],
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
        attributes: ['acedmicYearId', 'yearTitle', 'startingDate', 'endingDate'],
        order: [['startingDate', 'ASC']],
    });
}

export async function getPromotionClassSections({
    courseId,
    acedmicYearId,
    term,
    specializationId,
    instituteId,
}) {
    const where = promotionClassSectionWhere({
        courseId,
        acedmicYearId,
        ...(instituteId != null && { instituteId }),
    });

    if (specializationId != null) {
        where[Op.or] = [{ specializationId }, { specializationId: null }];
    }

    return scoped(model.classSectionModel).findAll({
        where,
        attributes: [
            'classSectionsId',
            'section',
            'sessionId',
            'acedmicYearId',
            'semesterId',
            'specializationId',
        ],
        include: [
            {
                model: model.classModel,
                as: 'classGroup',
                attributes: ['term', 'className'],
                where: { term },
                required: true,
            },
        ],
        order: [['section', 'ASC']],
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
        if (getRequestAcademicYearId() == null) {
            return 0;
        }

        return await scoped(model.studentModel).count({
            where: {
                feePlanProfileId: { [Op.ne]: null },
            },
            include: [studentSessionWithAcademicYearInclude({ attributes: [] })],
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
        if (getRequestAcademicYearId() == null) {
            return [];
        }

        return await scoped(model.studentModel).findAll({
            where: {
                feePlanProfileId: { [Op.ne]: null },
            },
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
                studentSessionWithAcademicYearInclude({
                    attributes: ["sessionId", "sessionName"],
                }),
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseId", "courseName"],
                },
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    attributes: ["classSectionsId", "class", "section"],
                },
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
        const { acedmicYearId, transaction } = options;
        const where = {
            feePlanProfileId,
        };

        const sessionInclude =
            acedmicYearId != null
                ? studentSessionWithAcademicYearInclude({
                    acedmicYearId,
                    attributes: ["sessionId", "sessionName"],
                })
                : {
                    model: model.sessionModel,
                    as: "studentSession",
                    attributes: ["sessionId", "sessionName"],
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
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    attributes: ["classSectionsId", "class", "section"],
                },
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
        const { courseId, sessionId, acedmicYearId } = filters;
        if (getRequestAcademicYearId() == null && acedmicYearId == null) {
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
            {
                model: model.classSectionModel,
                as: 'studentSections',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            },
            {
                model: model.semesterModel,
                as: 'studentSemester',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            },
            studentSessionWithAcademicYearInclude({
                ...(acedmicYearId != null && { acedmicYearId }),
                attributes: [],
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
            attributes: ["studentId", "firstName", "middleName", "lastName"],
            include: [
                {
                    model: model.semesterModel,
                    as: "studentSemester",
                    attributes: ["semesterId", "name", "termType", "semesterDuration", "courseDuration", "totalTerms"],
                    include: [
                        {
                            model: model.classSubjectMapperModel,
                            as: 'semestermapping',
                            attributes: ['classSubjectMapperId', 'subjectId', 'semesterId'],
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'subjects',
                                    attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType'],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error in getting feeplan details:', error);
        throw error;
    }
};

export async function getClassRecord(courseId, semesterId, classSectionId, acedmicYearId) {
    try {
        const sectionInclude = {
            model: model.classSectionModel,
            as: 'studentSections',
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            ...(acedmicYearId && {
                where: { acedmicYearId },
                required: true,
            }),
        };

        const student = await scoped(model.studentModel).findAll({
            where: {
                classSectionsId: classSectionId,
                courseId,
                semesterId,
            },
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "email", "mobileNumber", "phoneNumber", "courseId", "semesterId", "classSectionsId"],
            include: [
                sectionInclude,
                {
                    model: model.semesterModel,
                    as: 'studentSemester',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                },
            ],
        });

        const teacher = await model.teacherSectionMappingModel.findAll({
            where: {
                classSectionsId: classSectionId,
            },
            attributes: ["teacherSectionMappingId", "classSectionsId", "employeeId", "isCordinatory"],
            include: [
                {
                    model: model.employeeModel,
                    as: 'employeeData',
                    attributes: ["employeeId", "employeeName", "fatherName", "motherName", "employeeCode", "department", "employmentType", "dateOfBirth", "pickColor"],
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
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        return { student, teacher };
    } catch (error) {
        console.error('Error in getting class record details:', error);
        throw error;
    }
};

export async function getStudentDetailsRepository(studentId) {
    try {
        if (!(await assertStudentInRequestAcademicYear(studentId))) {
            return null;
        }

        return await scoped(model.studentModel).findOne({
            where: { studentId },
            include: [
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                },
                {
                    model: model.semesterModel,
                    as: "studentSemester",
                    include: [
                        {
                            model: model.classSubjectMapperModel,
                            as: "semestermapping",
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: "subjects",
                                },
                            ],
                        },
                    ],
                },
            ],
        });

    } catch (error) {
        console.error("Error in getStudentDetailsRepository:", error);
        throw error;
    }
}

export async function getStudentsByClassSection(classSectionsId, timeTableMappingId, academicYearId, date) {

    try {
        if (getRequestAcademicYearId() == null && academicYearId == null) {
            return [];
        }

        const students = await scoped(model.studentModel).findAll({
            attributes: [
                "studentId",
                "scholarNumber",
                "enrollNumber",
                "firstName",
                "lastName",
                "classSectionsId",
            ],
            where: {
                classSectionsId,
            },
            include: [
                studentSessionWithAcademicYearInclude({
                    ...(academicYearId != null && { acedmicYearId: academicYearId }),
                    attributes: [],
                }),
                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    attributes: ["classSectionsId", "section"],
                    where: {
                        acedmicYearId: academicYearId ?? getRequestAcademicYearId(),
                        ...buildScope(model.classSectionModel),
                    },
                    required: true,
                },
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
        attributes: ["examScheduleId", "sessionId", "semesterId"],
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
    const acedmicYearId = getRequestAcademicYearId();
    if (acedmicYearId == null) {
        return [];
    }

    const sectionWhere = {
        sessionId,
        courseId,
        acedmicYearId,
        ...buildScope(model.classSectionModel),
    };
    const answerSheetWhere = {
        examScheduleId,
        ...buildScope(model.answerSheetQrModel),
    };

    return scoped(model.studentModel).findAll({
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        include: [
            studentSessionWithAcademicYearInclude({ attributes: [] }),
            {
                model: model.classSectionModel,
                as: "studentSections",
                required: true,
                attributes: [],
                where: sectionWhere,
                include: [
                    {
                        model: model.classModel,
                        as: "classGroup",
                        required: true,
                        attributes: [],
                        where: { term },
                    },
                ],
            },
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


