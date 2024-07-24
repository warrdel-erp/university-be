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
                        model: model.courseLevelModel,
                        as: "courseLevel",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "collegeId", "universityId","courseLevelId","affiliatedUniversityId","courseLevelCode"] },
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
                        model: model.courseLevelModel,
                        as: "courseLevel",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "collegeId", "universityId","courseLevelId","affiliatedUniversityId","courseLevelCode"] },
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
                model: model.courseLevelModel,
                as: "courseLevel",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "collegeId", "universityId","courseLevelId","affiliatedUniversityId","courseLevelCode"] },
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

export async function checkEmail(email) {
    try {
        const attribute = ["email"];
        const result = await model.studentModel.findOne({
            attributes: attribute,
            where: {
                email: email
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