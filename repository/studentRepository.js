import * as model from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { buildScope, scoped } from '../utility/scoped.js';

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
                model: model.userModel.unscoped(),
                as: "userStudent",
                attributes: ["universityId", "userId"],
            },
            {
                model: model.campusModel.unscoped(),
                as: "campus",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
            },
            {
                model: model.instituteModel.unscoped(),
                as: "institute",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
            },
            {
                model: model.acedmicYearModel.unscoped(),
                as: "acdemicYear",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
                model: model.affiliatedIniversityModel.unscoped(),
                as: "affiliatedUniversity",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
            },
            {
                model: model.courseModel.unscoped(),
                as: "course",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
            },
            {
                model: model.semesterModel.unscoped(),
                as: "studentSemester",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.classSectionModel.unscoped(),
                        as: 'classSections',
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                ],
            },
            {
                model: model.sessionModel.unscoped(),
                as: "studentSession",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
                model: model.specializationModel.unscoped(),
                as: "specialization",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "specializationId", "course_Id", "specializationCode"] },
            },
            {
                model: model.studentsEntranceDetail.unscoped(),
                as: "entranceDetails",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
                model: model.studentsAddress.unscoped(),
                as: "studentAddress",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
            {
                model: model.employeeCodeMasterType.unscoped(),
                as: "courseLevel",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id"] },
                include: [
                    {
                        model: model.employeeCodeMaster.unscoped(),
                        as: "codes",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    },
                ],
            },
            {
                model: model.studentMetaData.unscoped(),
                as: "studentMetaData",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.employeeCodeMasterType.unscoped(),
                        as: "typs",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include: [
                            {
                                model: model.employeeCodeMaster.unscoped(),
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ],
                    },
                ],
            },
            {
                model: model.feePlanProfileModel.unscoped(),
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
        const result = await scoped(model.studentModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: "userStudent",
                    attributes: ["universityId", "userId"],
                },
                {
                    model: model.campusModel.unscoped(),
                    as: "campus",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
                },
                {
                    model: model.instituteModel.unscoped(),
                    as: "institute",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
                },
                {
                    model: model.acedmicYearModel.unscoped(),
                    as: "acdemicYear",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.affiliatedIniversityModel.unscoped(),
                    as: "affiliatedUniversity",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
                },
                {
                    model: model.employeeCodeMasterType.unscoped(),
                    as: "courseLevel",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id"] },
                    include: [
                        {
                            model: model.employeeCodeMaster.unscoped(),
                            as: "codes",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                    ],
                },
                {
                    model: model.studentMetaData.unscoped(),
                    as: "studentMetaData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "typs",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.courseModel.unscoped(),
                    as: "course",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
                },
                {
                    model: model.specializationModel.unscoped(),
                    as: "specialization",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "specializationId", "course_Id", "specializationCode"] },
                },
                {
                    model: model.semesterModel.unscoped(),
                    as: "studentSemester",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.classSectionModel.unscoped(),
                            as: 'classSections',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                    ],
                },
                {
                    model: model.sessionModel.unscoped(),
                    as: "studentSession",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.studentsEntranceDetail.unscoped(),
                    as: "entranceDetails",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.studentsAddress.unscoped(),
                    as: "studentAddress",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.studentCorsAddressModel.unscoped(),
                    as: 'CorsAddressStudent',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterCountryStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterStateStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "codeMasterCityStudent",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id", "createdBy"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.feePlanProfileModel.unscoped(),
                    as: "studentFeePlanProfile",
                    required: false,
                    attributes: ["feePlanProfileId", "name", "planType", "courseSessionId", "instituteId"],
                    include: [
                        {
                            model: model.sessionCouseMappingModel.unscoped(),
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

export async function getEmptyEnrollNumber() {
    try {
        return await scoped(model.studentModel).findAll({
            where: {
                enrollNumber: {
                    [Op.or]: [null, ''],
                },
            },
            include: [
                {
                    model: model.userModel.unscoped(),
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

export async function classStudentMapping(data, transaction) {
    try {
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
        const studentScope = buildScope(model.studentModel);

        const whereConditions = {};
        if (semesterId !== 0) whereConditions.semester_id = semesterId;
        if (acedmicYearId) whereConditions.acedmicYearId = acedmicYearId;

        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereConditions,
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: "userClassStudentMapper",
                    attributes: ["universityId", "userId"],
                },
                {
                    model: model.semesterModel.unscoped(),
                    as: "studentSection",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.classSectionModel.unscoped(),
                            as: 'classSections',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                    ],
                },
                {
                    model: model.studentModel.unscoped(),
                    as: "studentMapped",
                    required: true,
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: studentScope,
                    include: [
                        {
                            model: model.campusModel.unscoped(),
                            as: "campus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
                        },
                        {
                            model: model.instituteModel.unscoped(),
                            as: "institute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
                        },
                        {
                            model: model.acedmicYearModel.unscoped(),
                            as: "acdemicYear",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                        {
                            model: model.affiliatedIniversityModel.unscoped(),
                            as: "affiliatedUniversity",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
                        },
                        {
                            model: model.employeeCodeMasterType.unscoped(),
                            as: "courseLevel",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterTypeId", "employeeCodeMasterId", "employee_code_master_id"] },
                            include: [
                                {
                                    model: model.employeeCodeMaster.unscoped(),
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ],
                        },
                        {
                            model: model.courseModel.unscoped(),
                            as: "course",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
                        },
                        {
                            model: model.specializationModel.unscoped(),
                            as: "specialization",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "specializationId", "course_Id", "specializationCode"] },
                        },
                        {
                            model: model.studentsEntranceDetail.unscoped(),
                            as: "entranceDetails",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        },
                        {
                            model: model.studentsAddress.unscoped(),
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

export async function promoteStudent(studentId, data) {
    try {
        const existing = await assertScopedStudent(studentId);
        if (!existing) {
            return { result1: [0], result2: [0] };
        }

        const result1 = await scoped(model.studentModel).update(data, {
            where: {
                studentId,
            },
        });

        const result2 = await model.classStudentMapperModel.update(data, {
            where: {
                studentId,
            },
        });
        return { result1, result2 };
    } catch (error) {
        console.error(`Error updating student promote ${studentId} :`, error);
        throw error;
    }
};

export async function getStudentForPromate(studentId) {
    try {
        const result = await scoped(model.studentModel).findOne({
            where: {
                studentId: studentId
            },
        });
        return result;
    } catch (error) {
        console.error(`Error get student for promote ${studentId} :`, error);
        throw error;
    }
};

export async function getSemesterByCourseId(courseId) {
    try {
        return await scoped(model.semesterModel).findAll({
            where: { courseId },
            order: [['semesterId', 'ASC']],
            raw: true
        });
    } catch (error) {
        console.error(`Error get semester By course Id ${courseId} :`, error);
        throw error;
    }
};

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
        return await scoped(model.studentModel).count({
            where: {
                feePlanProfileId: { [Op.ne]: null },
            },
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
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseId", "courseName"],
                },
                {
                    model: model.sessionModel,
                    as: "studentSession",
                    attributes: ["sessionId", "sessionName"],
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
        if (acedmicYearId != null) {
            where.acedmicYearId = acedmicYearId;
        }

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
                {
                    model: model.sessionModel,
                    as: "studentSession",
                    attributes: ["sessionId", "sessionName"],
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
        const { courseId, sessionId } = filters;
        const where = {
            feePlanProfileId: { [Op.is]: null },
            ...(courseId != null && { courseId }),
            ...(sessionId != null && { sessionId }),
        };

        return await scoped(model.studentModel).findAll({
            where,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            include: [
                {
                    model: model.courseModel.unscoped(),
                    as: "course",
                    attributes: ["courseName", "courseCode"],
                },
                {
                    model: model.classSectionModel.unscoped(),
                    as: 'studentSections',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                },
                {
                    model: model.semesterModel.unscoped(),
                    as: 'studentSemester',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                },
            ],
        });
    } catch (error) {
        console.error('Error in getting feeplan details:', error);
        throw error;
    }
};

export async function getStudentSubject(studentId) {
    try {
        return await scoped(model.studentModel).findAll({
            where: {
                studentId,
            },
            attributes: ["studentId", "firstName", "middleName", "lastName"],
            include: [
                {
                    model: model.semesterModel.unscoped(),
                    as: "studentSemester",
                    attributes: ["semesterId", "name", "termType", "semesterDuration", "courseDuration", "totalTerms"],
                    include: [
                        {
                            model: model.classSubjectMapperModel.unscoped(),
                            as: 'semestermapping',
                            attributes: ['classSubjectMapperId', 'subjectId', 'semesterId'],
                            include: [
                                {
                                    model: model.subjectModel.unscoped(),
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
        const student = await scoped(model.studentModel).findAll({
            where: {
                classSectionsId: classSectionId,
                courseId,
                semesterId,
                acedmicYearId,
            },
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "email", "mobileNumber", "phoneNumber", "courseId", "semesterId", "classSectionsId", "acedmicYearId"],
            include: [
                {
                    model: model.classSectionModel.unscoped(),
                    as: 'studentSections',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                },
                {
                    model: model.semesterModel.unscoped(),
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
                    model: model.employeeModel.unscoped(),
                    as: 'employeeData',
                    attributes: ["employeeId", "employeeName", "fatherName", "motherName", "employeeCode", "department", "employmentType", "dateOfBirth", "pickColor"],
                    where: buildScope(model.employeeModel),
                    required: true,
                    include: [
                        {
                            model: model.teacherSubjectMappingModel.unscoped(),
                            as: 'teacherEmployeeData',
                            attributes: ['teacherSubjectMappingId', 'classSubjectMapperId'],
                            include: [
                                {
                                    model: model.classSubjectMapperModel.unscoped(),
                                    as: 'employeeSubject',
                                    attributes: ['classSubjectMapperId', 'subjectId'],
                                    include: [
                                        {
                                            model: model.subjectModel.unscoped(),
                                            as: 'subjects',
                                            attributes: ['subjectName', 'subjectCode', 'subjectType'],
                                        },
                                    ],
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

        return await scoped(model.studentModel).findOne({
            where: { studentId },
            include: [
                {
                    model: model.classSectionModel.unscoped(),
                    as: "studentSections",
                },
                {
                    model: model.semesterModel.unscoped(),
                    as: "studentSemester",
                    include: [
                        {
                            model: model.classSubjectMapperModel.unscoped(),
                            as: "semestermapping",
                            include: [
                                {
                                    model: model.subjectModel.unscoped(),
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
                acedmicYearId: academicYearId,
            },
            include: [
                {
                    model: model.classSectionModel.unscoped(),
                    as: "studentSections",
                    attributes: ["classSectionsId", "section"],
                },
                {
                    model: model.courseModel.unscoped(),
                    as: "course",
                    attributes: ["courseName"],
                },
                {
                    model: model.attendanceModel.unscoped(),
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
                model: model.examSetupTypeTermModel.unscoped(),
                as: "examSetupTypeTerm",
                attributes: ["examSetupTypeTermId", "courseId", "examSetupTypeId", "instituteId", "universityId", "term"],
                where: buildScope(model.examSetupTypeTermModel),
                required: true,
            },
        ],
    });
}

export async function getStudentsWithAnswerSheetStatus(sessionId, courseId, term, examScheduleId) {
    const sectionWhere = {
        sessionId,
        courseId,
        acedmicYearId: { [Op.ne]: null },
        ...buildScope(model.classSectionModel),
    };
    const answerSheetWhere = {
        examScheduleId,
        ...buildScope(model.answerSheetQrModel),
    };

    return scoped(model.studentModel).findAll({
        where: { sessionId },
        attributes: ["studentId", "firstName", "middleName", "lastName", "enrollNumber", "scholarNumber"],
        include: [
            {
                model: model.classSectionModel.unscoped(),
                as: "studentSections",
                required: true,
                attributes: [],
                where: sectionWhere,
                include: [
                    {
                        model: model.classModel.unscoped(),
                        as: "classGroup",
                        required: true,
                        attributes: [],
                        where: { term },
                    },
                ],
            },
            {
                model: model.answerSheetQrModel.unscoped(),
                as: "answerSheetQrs",
                attributes: ["id", "studentId", "examScheduleId"],
                where: answerSheetWhere,
                required: false,
            },
        ],
        order: [["firstName", "ASC"], ["studentId", "ASC"]],
    });
}


