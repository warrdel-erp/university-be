import * as model from '../models/index.js'
import { Op } from 'sequelize';

export async function addStudent(data) {
    try {
        const result = await model.studentModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add Student:", error);
        throw error;
    }
};

export async function addStudentsEntranceDetail(data) {
    try {
        const result = await model.studentsEntranceDetail.bulkCreate(data);
        return result;
    } catch (error) {
        console.error("Error in add students Entrance Detail:", error);
        throw error;
    }
};

export async function addStudentsAddress(data) {
    try {
        const result = await model.studentsAddress.create(data);
        return result;
    } catch (error) {
        console.error("Error in add students Address:", error);
        throw error;
    }
};

export async function getAllStudents(firstName) {
    let result;
    try {
        if (firstName !== 'all') {
            result = await model.studentModel.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.campusModel,
                        as: "campus",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","campusId","campusCode"] },
                    },
                    {
                        model: model.instituteModel,
                        as: "institute",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","instituteId","campusId","instituteCode"] },
                    },
                    {
                        model: model.affiliatedIniversityModel,
                        as: "affiliatedUniversity",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","affiliatedUniversityId","instituteId","affiliatedUniversityCode"] },
                    },
                    {
                        // model: model.courseLevelModel,
                        // as: "courseLevel",
                        // attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "collegeId", "universityId","courseLevelId","affiliatedUniversityId","courseLevelCode"] },
                    },
                    {
                        model: model.courseModel,
                        as: "course",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","courseId","course_levelId","courseCode"] },
                    },
                    {
                        model: model.specializationModel,
                        as: "specialization",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","specializationId","course_Id","specializationCode"] },
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
                    }
                    ],
                where: {
                    first_name: {
                        [Op.like]: `%${firstName}%`
                    },
                },
            });
        } else {
            result = await model.studentModel.findAll({
                include: [
                    {
                        model: model.campusModel,
                        as: "campus",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","campusId","campusCode"] },
                    },
                    {
                        model: model.instituteModel,
                        as: "institute",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","instituteId","campusId","instituteCode"] },
                    },
                    {
                        model: model.affiliatedIniversityModel,
                        as: "affiliatedUniversity",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","affiliatedUniversityId","instituteId","affiliatedUniversityCode"] },
                    },
                    {
                        model: model.employeeCodeMasterType,
                        as: "courseLevel",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id"] },
                        include :[
                            {
                                model: model.employeeCodeMaster,
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ]
                    },
                    {
                        model: model.courseModel,
                        as: "course",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","courseId","course_levelId","courseCode"] },
                    },
                    {
                        model: model.specializationModel,
                        as: "specialization",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","specializationId","course_Id","specializationCode"] },
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
                    }
                    ],
            });
        };
        return result;
    } catch (error) {
        console.error(`Error in getting student name${firstName}:`, error);
        throw error;
    };
};

export async function getSingleStudentDetail(studentId) {
    try {
        const result = await model.studentModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
            {
                model: model.campusModel,
                as: "campus",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","campusId","campusCode"] },
            },
            {
                model: model.instituteModel,
                as: "institute",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","instituteId","campusId","instituteCode"] },
            },
            {
                model: model.affiliatedIniversityModel,
                as: "affiliatedUniversity",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","affiliatedUniversityId","instituteId","affiliatedUniversityCode"] },
            },
            {
                model: model.employeeCodeMasterType,
                as: "courseLevel",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id"] },
                include :[
                    {
                        model: model.employeeCodeMaster,
                        as: "codes",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    },
                ]
            },
            {
                model: model.courseModel,
                as: "course",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","courseId","course_levelId","courseCode"] },
            },
            {
                model: model.specializationModel,
                as: "specialization",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","specializationId","course_Id","specializationCode"] },
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
        console.error(`Error in getPreviousScholarNumber for institue Code ${institueCode}:`, error);
        throw error;
    }
};

export async function updateStudentDetails(studentId, data) {
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

export async function updateStudentEntranceDetails(studentsEntranceDetailId, data) {
    try {
        const result = await model.studentsEntranceDetail.update(data, {
            where: {
                studentsEntranceDetailId: studentsEntranceDetailId
            }
        });
     return result; 
    } catch (error) {
        console.error(`Error updating student entrance details ${studentsEntranceDetailId} :`, error);
        throw error; 
    }
};

export async function updateStudentAddressDetails(studentsAddressId, data) {
    try {
        const result = await model.studentsAddress.update(data, {
            where: {
                studentsAddressId: studentsAddressId
            }
        });
     return result; 
    } catch (error) {
        console.error(`Error updating student address details ${studentsAddressId} :`, error);
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

export async function getEmptyEnrollNumber() {
    try {
        // const attributes = ["first_name","father_name"];
        const result = await model.studentModel.findAll({
            // attributes: attributes,
            where: {
                enrollNumber: {
                    [Op.or]: [null, '']
                }
            }
        });
        return result;
    } catch (error) {
        console.error('Error in checkEnroll Empty:', error);
        throw error;
    }
};

export async function deleteStudentDetail (studentId) {
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

export async function deleteStudentEntranceDetail (studentsEntranceDetailId) {
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

export async function deleteStudentAddressDetail (studentsAddressId) {
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

export async function classStudentMapping(data) {
    try {
        const result = await model.classStudentMapperModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function getclassStudentMapping(classSectionId) {
    
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.studentModel,
                    as: "studentMapped",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: model.campusModel,
                            as: "campus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","campusId","campusCode"] },
                        },
                        {
                            model: model.instituteModel,
                            as: "institute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","instituteId","campusId","instituteCode"] },
                        },
                        {
                            model: model.affiliatedIniversityModel,
                            as: "affiliatedUniversity",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","affiliatedUniversityId","instituteId","affiliatedUniversityCode"] },
                        },
                        {
                            model: model.employeeCodeMasterType,
                            as: "courseLevel",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id"] },
                            include :[
                                {
                                    model: model.employeeCodeMaster,
                                    as: "codes",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                },
                            ]
                        },
                        {
                            model: model.courseModel,
                            as: "course",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","courseId","course_levelId","courseCode"] },
                        },
                        {
                            model: model.specializationModel,
                            as: "specialization",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId","specializationId","course_Id","specializationCode"] },
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
                        }
                        ],
                },
            ],
        };
        if (classSectionId !== 0) {
            queryOptions.where = { class_sections_id: classSectionId };
        }
        const result = await model.classStudentMapperModel.findAll(queryOptions);
        return result;
    } catch (error) {
        console.error(`Error in getting mapped student ${classSectionId}:`, error);
        throw error;
    }
}


export async function addElectiveSubject(data) {
    try {
        const result = await model.studentElectiveSubjectModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in student  Elective Subject Model:", error);
        throw error;
    }
};