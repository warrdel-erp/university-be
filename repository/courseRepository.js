import * as model from '../models/index.js';
import { Op } from 'sequelize';

export async function getCourseByCourseId(courseId) {
    try {
        const result = await model.courseModel.findOne({
            attributes: ["universityId", "courseDuration", "isActive", "termType", "totalTerms"],
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

export async function addBulkCourse(courseData) {
    try {
        const result = await model.courseModel.bulkCreate(courseData);

        return result;
    } catch (error) {
        console.error("Error in add course bulk:", error);
        throw error;
    }
};

export async function changeCourseStatuss(courseId, status) {
    try {
        const result = await model.courseModel.update(status, {
            where: { courseId }
        });
        return result;
    } catch (error) {
        console.error(`Error change coursse status ${courseId}:`, error);
        throw error;
    }
}

export async function getCourseByAcedmicId(acedmicYearId) {
    try {
        const result = await model.courseModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: {
                acedmicYearId: acedmicYearId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in getting course details By Acedmic Year:", error);
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

export async function getClassByName(className, Section) {
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
                    attributes: ["scholarNumber", "email", "phoneNumber"]
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
            attributes: ["employeeName"],
            include: [
                {
                    model: model.employeeAddressModel,
                    as: 'address',
                    attributes: ["phoneNumber", "mobileNumber", "personal_email", "officalEmailId"]
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

/**
 * Get all courses for a university
 * @param {number} universityId 
 * @param {number} [instituteId] 
 * @param {number} [campusId]
 * @returns {Promise<Array>}
 */
export async function getAllCourses(universityId, instituteId, campusId) {
    try {
        const whereClause = {
            universityId,
            ...(instituteId && { instituteId })
        };

        return await model.courseModel.findAll({
            where: whereClause,
            include: [
                {
                    model: model.instituteModel,
                    as: 'instituted',
                    attributes: ["instituteId", "instituteName", "instituteCode", "campusId"],
                    where: campusId ? { campusId } : {},
                }
            ]
        });
    } catch (error) {
        console.error("Error in Course Repository (getAllCourses):", error);
        throw error;
    }
}

/**
 * Get single course with its sessions
 * @param {number} courseId 
 * @param {number} universityId 
 * @param {number} [acedmicYearId] 
 * @returns {Promise<Object>}
 */
export async function getCourseByIdWithSessions(courseId, universityId, acedmicYearId) {
    try {
        return await model.courseModel.findOne({
            where: { courseId, universityId },
            include: [
                {
                    model: model.sessionCouseMappingModel,
                    as: 'sessionCourseMappings',
                    attributes: ["sessionCourseMappingId"],
                    include: [
                        {
                            model: model.sessionModel,
                            as: 'session',
                            attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate", "acedmicYearId"],
                            where: acedmicYearId ? { acedmicYearId } : {},
                            include: [
                                {
                                    model: model.classSectionModel,
                                    as: 'classSession',
                                    attributes: ["classSectionsId", "section"],
                                },
                                {
                                    model: model.classModel,
                                    as: 'classes',
                                    attributes: ["classId", "term"],
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Error in Course Repository (getCourseByIdWithSessions):", error);
        throw error;
    }
}

/**
 * Get class sections for a course and session
 * @param {number} courseId 
 * @param {number} sessionId 
 * @returns {Promise<Array>}
 */
export async function getClassSectionsByCourseAndSession(courseId, sessionId) {
    try {
        return await model.classSectionModel.findAll({
            where: { courseId, sessionId },
            include: [
                {
                    model: model.classModel,
                    as: 'classGroup',
                    attributes: ['term']
                }
            ],
            attributes: ['classSectionsId', 'section']
        });
    } catch (error) {
        console.error("Error in Course Repository (getClassSectionsByCourseAndSession):", error);
        throw error;
    }
}

/**
 * Get course list with associated subjects
 * @param {number} universityId 
 * @param {number} instituteId 
 * @param {number} acedmicYearId 
 * @returns {Promise<Array>}
 */
export async function getCourseListWithSubjects(universityId, instituteId, acedmicYearId) {
    try {
        const whereClause = {
            universityId,
            instituteId,
        };

        return await model.courseModel.findAll({
            where: whereClause,
            include: [
                {
                    model: model.subjectModel,
                    as: 'subjectInfo',
                    attributes: ['subjectId', 'subjectCode'],
                    where: {
                        acedmicYearId,
                        instituteId,
                    },
                    required: true
                }
            ]
        });
    } catch (error) {
        console.error("Error in Course Repository (getCourseListWithSubjects):", error);
        throw error;
    }
}