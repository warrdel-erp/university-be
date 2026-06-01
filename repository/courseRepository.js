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

export async function getAllCourseByInstituteId(instituteId) {
    try {
        const result = await model.courseModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: {
                instituteId: instituteId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in getting course details By InstituteI:", error);
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
 * List courses scoped to university and institute; sessions optionally filtered by academic year.
 * @param {{ universityId: number, instituteId: number, acedmicYearId?: number, campusId?: number }} scope
 */
export async function getAllCourses({ universityId, instituteId, acedmicYearId, campusId }) {
    try {
        return await model.courseModel.findAll({
            where: { universityId, instituteId },
            include: [
                {
                    model: model.instituteModel,
                    as: 'instituted',
                    attributes: ['instituteId', 'instituteName', 'instituteCode', 'campusId'],
                    where: campusId ? { campusId } : {},
                },
                {
                    model: model.affiliatedIniversityModel,
                    as: 'affiliated',
                    attributes: ['affiliatedUniversityId', 'affiliatedUniversityName'],
                    required: false,
                },
                {
                    model: model.employeeCodeMasterType,
                    as: 'courseLevelCourses',
                    attributes: ['employeeCodeMasterTypeId', 'code', 'description'],
                    required: false,
                },
                {
                    model: model.sessionCouseMappingModel,
                    as: 'sessionCourseMappings',
                    attributes: ['sessionCourseMappingId'],
                    where: { instituteId },
                    required: false,
                    include: [
                        {
                            model: model.sessionModel,
                            as: 'session',
                            attributes: ['sessionId', 'sessionName', 'acedmicYearId'],
                            where: {
                                instituteId,
                                ...(acedmicYearId && { acedmicYearId }),
                            },
                            required: false,
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('Error in Course Repository (getAllCourses):', error);
        throw error;
    }
}

/**
 * Course + sessions for GET /courses/:courseId/sessions (plain object).
 * @param {number} courseId
 * @param {number} universityId
 * @param {number} [acedmicYearId] Filter sessions by academic year (property name matches DB / Sequelize model).
 * @param {number} [instituteIdFromUser] Logged-in user default institute; narrows class rows when on same campus.
 */
export async function getCourseWithSessionsData(
    courseId,
    universityId,
    acedmicYearId,
    instituteIdFromUser
) {
    try {
        const courseInstituteRow = await model.courseModel.findOne({
            where: { courseId, universityId },
            attributes: ["instituteId"],
            include: [{ model: model.instituteModel, as: "instituted", attributes: ["campusId"] }],
        });
        if (!courseInstituteRow) return null;

        const { instituteId: courseInstituteId, instituted } = courseInstituteRow.get({ plain: true });
        const instituteCampusId = instituted?.campusId;
        let allowedInstituteIds = [courseInstituteId];

        if (instituteIdFromUser != null) {
            if (instituteCampusId != null) {
                const institutesOnSameCampus = await model.instituteModel.findAll({
                    where: { universityId, campusId: instituteCampusId },
                    attributes: ["instituteId"],
                });
                if (
                    institutesOnSameCampus.some(
                        (institute) => institute.instituteId === instituteIdFromUser
                    )
                ) {
                    allowedInstituteIds = [instituteIdFromUser];
                }
            } else if (instituteIdFromUser === courseInstituteId) {
                allowedInstituteIds = [instituteIdFromUser];
            }
        }

        const instituteScopeWhere =
            allowedInstituteIds.length === 1
                ? { instituteId: allowedInstituteIds[0] }
                : { instituteId: { [Op.in]: allowedInstituteIds } };

        const course = await model.courseModel.findOne({
            where: { courseId, universityId },
            include: [
                {
                    model: model.sessionCouseMappingModel,
                    as: "sessionCourseMappings",
                    attributes: ["sessionCourseMappingId"],
                    include: [
                        {
                            model: model.sessionModel,
                            as: "session",
                            attributes: [
                                "sessionId",
                                "sessionName",
                                "startingDate",
                                "endingDate",
                                "classTillDate",
                                "acedmicYearId",
                            ],
                            where: acedmicYearId ? { acedmicYearId } : {},
                            include: [
                                {
                                    model: model.classSectionModel,
                                    as: "classSession",
                                    attributes: ["classSectionsId", "section"],
                                    required: false,
                                    where: { courseId, ...instituteScopeWhere },
                                },
                                {
                                    model: model.classModel,
                                    as: "classes",
                                    attributes: ["classId", "term"],
                                    required: false,
                                    where: { courseId, universityId, ...instituteScopeWhere },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        if (!course) return null;

        const coursePayload = course.get({ plain: true });
        const dedupedSessionIds = new Set();
        coursePayload.sessionCourseMappings = (coursePayload.sessionCourseMappings || []).filter(
            (sessionCourseMapping) => {
                const sessionId = sessionCourseMapping.session?.sessionId;
                if (sessionId == null) return true;
                if (dedupedSessionIds.has(sessionId)) return false;
                dedupedSessionIds.add(sessionId);
                return true;
            }
        );

        const totalTerms = coursePayload.totalTerms || 0;
        const termTypePrefix = `${coursePayload.termType ?? ""} `;

        for (const sessionCourseMapping of coursePayload.sessionCourseMappings) {
            const session = sessionCourseMapping.session;
            if (!session) continue;

            const termNumbersHavingClasses = new Set(
                (session.classes || []).map((classRow) => classRow.term).filter(Boolean)
            );
            session.missingTerms = Array.from({ length: totalTerms }, (_, index) => index + 1)
                .filter((termNumber) => !termNumbersHavingClasses.has(termNumber))
                .map((termNumber) => termTypePrefix + termNumber);
            delete session.classes;

            const dedupedClassSectionIds = new Set();
            session.classSession = (session.classSession || [])
                .filter(
                    (classSectionRow) =>
                        classSectionRow?.classSectionsId &&
                        !dedupedClassSectionIds.has(classSectionRow.classSectionsId) &&
                        dedupedClassSectionIds.add(classSectionRow.classSectionsId)
                )
                .map((classSectionRow) => ({
                    classSectionsId: classSectionRow.classSectionsId,
                    section: classSectionRow.section,
                }));
        }

        return coursePayload;
    } catch (error) {
        console.error("Error in Course Repository (getCourseWithSessionsData):", error);
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
 * @param {number} acedmicYearId Academic year id (matches DB / Sequelize property spelling).
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
                    required: false
                },
                {
                    model: model.affiliatedIniversityModel,
                    as: 'affiliated',
                    attributes: ['affiliatedUniversityId', 'affiliatedUniversityName'],
                    required: false,
                },
                {
                    model: model.employeeCodeMasterType,
                    as: 'courseLevelCourses',
                    attributes: ['employeeCodeMasterTypeId', 'code', 'description'],
                    required: false,
                },
            ]
        });
    } catch (error) {
        console.error("Error in Course Repository (getCourseListWithSubjects):", error);
        throw error;
    }
}