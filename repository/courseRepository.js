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

async function resolveInstituteScope(courseId, universityId, instituteIdFromUser) {
    if (instituteIdFromUser != null && instituteIdFromUser !== undefined) {
        return instituteIdFromUser;
    }
    const row = await model.courseModel.findOne({
        where: { courseId, universityId },
        attributes: ["instituteId"],
    });
    return row?.instituteId ?? null;
}

function collectTermsThatHaveClasses(classRows) {
    const termNumbers = new Set();
    for (const row of classRows || []) {
        if (row.term) termNumbers.add(row.term);
    }
    return termNumbers;
}

function listMissingTermLabels(termNumbersPresent, totalTerms, termTypePrefix) {
    const labels = [];
    const prefix = termTypePrefix ?? "";
    for (let termIndex = 1; termIndex <= totalTerms; termIndex++) {
        if (!termNumbersPresent.has(termIndex)) {
            labels.push(prefix + " " + termIndex);
        }
    }
    return labels;
}

function sectionsWithUniversityId(rawSections, universityIdFallback) {
    return rawSections.map(({ courseSection, ...fields }) => ({
        ...fields,
        universityId: courseSection?.universityId ?? universityIdFallback,
    }));
}

function bucketSectionsByUniversityAndInstitute(sections) {
    const buckets = {};
    for (const section of sections) {
        const key = `${section.universityId}_${section.instituteId}`;
        if (!buckets[key]) {
            buckets[key] = {
                universityId: section.universityId,
                instituteId: section.instituteId,
                classSections: [],
            };
        }
        buckets[key].classSections.push(section);
    }
    return Object.values(buckets);
}

function shapeCourseSessionsPayload(data) {
    const courseUniversityId = data.universityId;

    for (const mapping of data.sessionCourseMappings || []) {
        const session = mapping.session;
        if (!session) continue;

        const termsThatHaveClasses = collectTermsThatHaveClasses(session.classes);

        session.missingTerms = listMissingTermLabels(
            termsThatHaveClasses,
            data.totalTerms || 0,
            data.termType
        );

        delete session.classes;

        const rawSections = session.classSession;
        if (!rawSections?.length) continue;

        session.classSession = sectionsWithUniversityId(rawSections, courseUniversityId);

        session.classSectionsByUniversityAndInstitute = bucketSectionsByUniversityAndInstitute(
            session.classSession
        );
    }

    return data;
}

/**
 * Course + sessions for GET /course/:id/sessions — query + API shaping (plain object).
 */
export async function getCourseWithSessionsData(
    courseId,
    universityId,
    acedmicYearId,
    instituteIdFromUser
) {
    try {
        const instituteScope = await resolveInstituteScope(
            courseId,
            universityId,
            instituteIdFromUser
        );

        const classSessionInclude = {
            model: model.classSectionModel,
            as: "classSession",
            attributes: ["classSectionsId", "section", "instituteId"],
            include: [
                {
                    model: model.courseModel,
                    as: "courseSection",
                    attributes: ["universityId"],
                },
            ],
        };

        const classesInclude = {
            model: model.classModel,
            as: "classes",
            attributes: ["classId", "term", "instituteId", "universityId"],
        };

        if (instituteScope != null) {
            classSessionInclude.required = false;
            classSessionInclude.where = { instituteId: instituteScope };
            classesInclude.required = false;
            classesInclude.where = {
                universityId,
                instituteId: instituteScope,
            };
        }

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
                            include: [classSessionInclude, classesInclude],
                        },
                    ],
                },
            ],
        });

        if (!course) return null;

        const plain = course.get({ plain: true });
        return shapeCourseSessionsPayload(plain);
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
                    required: false
                }
            ]
        });
    } catch (error) {
        console.error("Error in Course Repository (getCourseListWithSubjects):", error);
        throw error;
    }
}