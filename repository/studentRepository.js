import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addStudent(data, transaction) {
    try {
        const result = await model.studentModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Student:", error);
        throw error;
    }
};

export async function addStudentExcel(data, transaction) {
    try {
        const result = await model.studentModel.create(data, { transaction });
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

export async function getAllStudents(firstName, universityId, acedmicYearId, page, limit, instituteId, role) {
    try {
        const baseInclude = [
            {
                model: model.userModel,
                as: "userStudent",
                attributes: ["universityId", "userId"],
                where: { universityId },
            },
            {
                model: model.campusModel,
                as: "campus",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
                where: { universityId },
            },
            {
                model: model.instituteModel,
                as: "institute",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
                where: { universityId },
            },
            {
                model: model.acedmicYearModel,
                as: "acdemicYear",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                // where: { universityId },
            },
            {
                model: model.affiliatedIniversityModel,
                as: "affiliatedUniversity",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
                where: { universityId },
            },
            {
                model: model.courseModel,
                as: "course",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
                where: { universityId },
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
                ]
            },
            {
                model: model.sessionModel,
                as: "studentSession",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
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
                ]
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
                        ]
                    },
                ]
            }
        ];

        const whereCondition = {
            ...(firstName !== 'all' && {
                first_name: {
                    [Op.like]: `%${firstName}%`
                }
            }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { instituteId })
        };

        const offset = (page - 1) * limit;

        const result = await model.studentModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereCondition,
            include: baseInclude,
            offset,
            limit
        });

        const totalCount = await model.studentModel.count({
            where: whereCondition,
            include: baseInclude,
            distinct: true,
            col: 'student_id'
        });


        return {
            result, totalCount
        };

    } catch (error) {
        console.error(`Error in getting student name "${firstName}":`, error);
        throw error;
    }
};

export async function getSingleStudentDetail(studentId, universityId) {
    try {
        const result = await model.studentModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userStudent",
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    },
                },
                {
                    model: model.campusModel,
                    as: "campus",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] },
                    where: {
                        universityId: universityId
                    },
                },
                {
                    model: model.instituteModel,
                    as: "institute",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] },
                    where: {
                        universityId: universityId
                    },
                },
                {
                    model: model.acedmicYearModel,
                    as: "acdemicYear",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.affiliatedIniversityModel,
                    as: "affiliatedUniversity",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "affiliatedUniversityId", "instituteId", "affiliatedUniversityCode"] },
                    where: {
                        universityId: universityId
                    },
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
                    ]
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
                            ]
                        },
                    ]
                },
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "courseId", "course_levelId", "courseCode"] },
                    where: {
                        universityId: universityId
                    },
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
                    ]
                },
                {
                    model: model.sessionModel,
                    as: "studentSession",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
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
                            ]
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
                            ]
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
                            ]
                        },
                    ]
                },
                {
                    model: model.feePlanModel,
                    as: 'studentFeePlan',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                    include: [
                        // {
                        //     model: model.feePlanTypeModel,
                        //     as: "feePlanType",
                        //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        //     include:[
                        //         {
                        //             model:model.feeTypeModel,
                        //             as:'feeType',
                        //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        //         }
                        //     ]
                        // },
                        // {
                        //     model:model.feePlanSemesterModel,
                        //     as:'feePlanSemester',
                        //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        //     include :[
                        //         {
                        //             model:model.semesterModel,
                        //             as:'Semester',
                        //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        //             // include:[
                        //             //     {
                        //             //         model:model.courseModel,
                        //             //         as:'semesterCourse',
                        //             //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        //             //     }
                        //             // ]
                        //         }
                        //     ]
                        // }
                    ]
                }
            ],
            where: {
                student_id: studentId
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
        const result = await model.studentModel.findOne({
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

export async function updateStudentDetails(studentId, data, transaction) {
    try {
        const result = await model.studentModel.update(data, {
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

export async function checkEmail(email) {
    try {
        const attribute = ["email"];
        const result = await model.studentModel.findOne({
            attributes: attribute,
            where: {
                email: email,
                deleted_at: null
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in check Email for ${email}:`, error);
        throw error;
    }
};

export async function checkEnroll(enrollNumber) {
    try {
        const attribute = ["enroll_number"];
        const result = await model.studentModel.findOne({
            attributes: attribute,
            where: {
                enrollNumber: enrollNumber
            }
        });
        return result;
    } catch (error) {
        console.error(`Error in check Email for ${email}:`, error);
        throw error;
    }
};

export async function getEmptyEnrollNumber(universityId, acedmicYearId, instituteId, role) {
    try {
        const result = await model.studentModel.findAll({
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                enrollNumber: {
                    [Op.or]: [null, '']
                },
                ...(role === 'Head' && { instituteId })
            },
            include: [
                {
                    model: model.userModel,
                    as: "userStudent",
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    }
                }
            ]
        });

        return result;
    } catch (error) {
        console.error('Error in checkEnroll Empty:', error);
        throw error;
    }
};

export async function deleteStudentDetail(studentId) {
    try {
        const result = await model.studentModel.destroy({
            where: { studentId },
            individualHooks: true
        });
        return { message: 'Student deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function deleteStudentEntranceDetail(studentsEntranceDetailId) {
    try {
        const result = await model.studentsEntranceDetail.destroy({
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
        const result = await model.studentsAddress.destroy({
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
        const attribute = ["students_address_id"];
        const result = await model.studentsAddress.findOne({
            attributes: attribute,
            where: {
                student_id: StudentId,
                deleted_at: null
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
        const result = await model.classStudentMapperModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function classStudentMappingExcel(data, transaction) {
    try {
        const result = await model.classStudentMapperModel.bulkCreate(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in student mapping course excel:", error);
        throw error;
    }
};

export async function getclassStudentMapping(semesterId, universityId, acedmicYearId, instituteId, role) {
    try {
        const studentWhere = {
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { instituteId }),
        };

        const whereConditions = {};
        if (semesterId !== 0) whereConditions.semester_id = semesterId;
        if (acedmicYearId) whereConditions.acedmicYearId = acedmicYearId;

        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: whereConditions,
            include: [
                {
                    model: model.userModel,
                    as: "userClassStudentMapper",
                    attributes: ["universityId", "userId"],
                    where: { universityId },
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
                    ]
                },
                {
                    model: model.studentModel,
                    as: "studentMapped",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: studentWhere,
                    include: [
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
                            model: model.acedmicYearModel,
                            as: "acdemicYear",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
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

        const result = await model.classStudentMapperModel.findAll(queryOptions);
        return result;
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

    // return 
    try {
        const result1 = await model.studentModel.update(data, {
            where: {
                studentId: studentId
            },
        });

        const result2 = await model.classStudentMapperModel.update(data, {
            where: {
                studentId: studentId
            },
        });
        return { result1, result2 };

        return result;
    } catch (error) {
        console.error(`Error updating student promote ${studentId} :`, error);
        throw error;
    }
};

export async function getStudentForPromate(studentId) {
    try {
        const result = await model.studentModel.findOne({
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
        return await model.semesterModel.findAll({
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
        const result = await model.studentModel.update(data, {
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

export async function getEmptyFeeDetails(universityId, acedmicYearId, instituteId, role) {
    try {
        const result = await model.studentModel.findAll({
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                feePlanId: {
                    [Op.or]: [null, '']
                },
                ...(role === 'Head' && { instituteId })
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
            include: [
                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseName", "courseCode"],
                    where: {
                        universityId: universityId
                    }
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
            ]
        });

        return result;
    } catch (error) {
        console.error('Error in getting feeplan details:', error);
        throw error;
    }
};

export async function getStudentSubject(studentId) {
    try {
        const result = await model.studentModel.findAll({
            where: {
                studentId
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
                                    attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType']
                                }
                            ]
                        }
                    ]
                },

            ]
        });

        return result;
    } catch (error) {
        console.error('Error in getting feeplan details:', error);
        throw error;
    }
};

export async function getClassRecord(courseId, semesterId, classSectionId, acedmicYearId) {
    try {
        const student = await model.studentModel.findAll({
            where: {
                classSectionsId: classSectionId,
                courseId,
                semesterId,
                acedmicYearId
            },
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "email", "mobileNumber", "phoneNumber", "courseId", "semesterId", "classSectionsId", "acedmicYearId"],
            include: [
                {
                    model: model.classSectionModel,
                    as: 'studentSections',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                },
                {
                    model: model.semesterModel,
                    as: 'studentSemester',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                }
            ]
        });

        const teacher = await model.teacherSectionMappingModel.findAll({
            where: {
                classSectionsId: classSectionId
            },
            attributes: ["teacherSectionMappingId", "classSectionsId", "employeeId", "isCordinatory"],
            include: [
                {
                    model: model.employeeModel,
                    as: 'employeeData',
                    attributes: ["employeeId", "employeeName", "fatherName", "motherName", "employeeCode", "department", "employmentType", "dateOfBirth", "pickColor"],
                    include: [
                        {
                            model: model.teacherSubjectMappingModel,
                            as: 'teacherEmployeeData',
                            attributes: ['teacherSubjectMappingId', 'classSubjectMapperId'],
                            include: [
                                {
                                    model: model.classSubjectMapperModel,
                                    as: 'employeeSubject',
                                    attributes: ['classSubjectMapperId', 'subjectId'],
                                    include: [
                                        {
                                            model: model.subjectModel,
                                            as: 'subjects',
                                            attributes: ['subjectName', 'subjectCode', 'subjectType']
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        return { student, teacher };
    } catch (error) {
        console.error('Error in getting class record details:', error);
        throw error;
    }
};

export async function getStudentDetailsRepository(studentId) {
    try {

        return await model.studentModel.findOne({
            where: { studentId },
            include: [
                {
                    model: model.classSectionModel,
                    as: "studentSections"
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
                                    as: "subjects"
                                }
                            ]
                        }
                    ]
                }
            ]
        });

    } catch (error) {
        console.error("Error in getStudentDetailsRepository:", error);
        throw error;
    }
}
// export async function getStudentsByClassSection(classSectionId, acedmicYearId, universityId) {
//     try {

//         const students = await model.classStudentMapperModel.findAll({

//             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },

//             where: {
//                 acedmicYearId: acedmicYearId
//             },

//             include: [

//                 {
//                     model: model.userModel,
//                     as: "userClassStudentMapper",
//                     attributes: ["universityId", "userId"],
//                     where: { universityId }
//                 },

//                 {
//                     model: model.semesterModel,
//                     as: "studentSection",
//                     attributes: ["semesterId", "name"],

//                     include: [
//                         {
//                             model: model.classSectionModel,
//                             as: "classSections",
//                             attributes: ["classSectionsId", "section"],
//                             where: {
//                                 classSectionsId: classSectionId
//                             }
//                         }
//                     ]
//                 },

//                 {
//                     model: model.studentModel,
//                     as: "studentMapped",
//                     attributes: [
//                         "studentId",
//                         "firstName",
//                         "lastName",
//                         "scholarNumber",
//                         "email",
//                         "mobileNumber"
//                     ]
//                 }

//             ]

//         });

//         return students;

//     } catch (error) {
//         console.error("Error in getStudentsByClassSection:", error);
//         throw error;
//     }
// }

// repository/studentRepository.js


// export async function getStudentsByClassSection(classSectionId, academicYearId) {

//     try {

//         const students = await model.studentModel.findAll({

//             attributes: [
//                 "studentId",
//                 "firstName",
//                 "lastName",
//                 "scholarNumber",
//                 "email",
//                 "mobileNumber",
//                 "classSectionsId",
//                 "acedmicYearId"
//             ],

//             where: {
//                 classSectionsId: classSectionId,
//                 acedmicYearId: academicYearId
//             }

//         });

//         return students;

//     } catch (error) {
//         console.error("Repository Error:", error);
//         throw error;
//     }

// }

// export async function getStudentsByClassSection(classSectionId, academicYearId) {

//     try {

//         const students = await model.studentModel.findAll({

//             attributes: [
//                 "studentId",
//                 "firstName",
//                 "lastName",
//                 "scholarNumber",
//                 "email",
//                 "mobileNumber",
//                 "classSectionsId",
//                 "acedmicYearId"
//             ],

//             where: {
//                 classSectionsId: classSectionId,
//                 acedmicYearId: academicYearId
//             },

//             include: [
//                 {
//                     model: model.attendanceModel,
//                     attributes: [
//                         "attendanceStatus",
//                         "notes",
//                         "description",
//                         "date"
//                     ],
//                     required: false // LEFT JOIN (important)
//                 }
//             ]

//         });

//         return students;

//     } catch (error) {
//         console.error("Repository Error:", error);
//         throw error;
//     }

// }
export async function getStudentsByClassSection(classSectionId, academicYearId) {

    try {

        const students = await model.studentModel.findAll({

            attributes: [
                "studentId",
                "scholarNumber",
                "enrollNumber",
                "firstName",
                "lastName",
                "classSectionsId"
            ],

            where: {
                classSectionsId: classSectionId,
                acedmicYearId: academicYearId
            },

            include: [

                {
                    model: model.classSectionModel,
                    as: "studentSections",
                    attributes: ["classSectionsId", "section"]
                },

                {
                    model: model.courseModel,
                    as: "course",
                    attributes: ["courseName"]
                },

                {
                    model: model.attendanceModel,
                    as: "studentAttendance",   // ⭐ same alias
                    attributes: [
                        "attendanceStatus",
                        "notes",
                        "description",
                        "date",
                        "timeTableMappingId"
                    ],
                    required: false
                }

            ]

        });

        return students;

    } catch (error) {
        console.error("Repository Error:", error);
        throw error;
    }

}