import * as model from '../models/index.js';
import { Op } from 'sequelize';

export async function getCourseByCourseId(courseId) {
    try {
        const result = await model.courseModel.findOne({
            attributes: ["universityId","courseDuration"] ,
            where: {
                courseId: courseId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in getting course details:", error);
        throw error;
    }
};

export async function getCourseByName(courseName) {
    try {
        const result = await model.courseModel.findOne({
            attributes: ["courseId"],
            where: {
                courseName: {
                    [Op.like]: `%${courseName}%`
                }
            },
        });
        return result;
    } catch (error) {
        console.error("Error in getting course details By Course Name:", error);
        throw error;
    }
}

export async function getClassByName(className,Section) {
    try {
        const results = await model.classSectionModel.findAll({
            where: {
                class: {
                    [Op.like]: `%${className}%`
                }
            },
        });        

        if (results.length === 0) {
            throw new Error('No class sections found for the given class name');
        }

        const matchedClassSectionsIds = [];

        for (const classSection of results) {
            const section = await model.sectionModel.findOne({
                where: {
                    sectionId: classSection.sectionId
                },
            });

            if (section && section.sectionName === Section) { 
                matchedClassSectionsIds.push({
                    classSectionsId: classSection.classSectionsId
                });
            }
        }

        return matchedClassSectionsIds;
    } catch (error) {
        console.error("Error in getting course details by class name:", error);
        throw error; 
    }
};

export async function getStudentBySectionId(classSectionId) {
    
    try {
        const result = await model.classStudentMapperModel.findAll({
            attributes: ["studentId"],
            include: [
                {
                    model: model.studentModel,
                    as: "studentMapped",
                    attributes:["scholarNumber","email","phoneNumber"]
                }
            ],
            where: {
                class_sections_id: classSectionId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in getting student by SectionId:", error);
        throw error;
    }
};

export async function getEmployeeByemployeeId(employeeId) {
    try {
        const result = await model.employeeModel.findAll({
            attributes:["employeeName"],
            include:[
                {
                    model:model.employeeAddressModel,
                    as:'address',
                    attributes:["phoneNumber","mobileNumber","personal_email","officalEmailId"]
                }
            ],
            where: {
                employeeId: employeeId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in getting employee details:", error);
        throw error;
    }
};