import * as model from '../models/index.js';
import sequelize from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { requestContext } from "../utility/requestContext.js";
import { getCampusIdByInstituteId } from "./buildingRepository.js";

function omitAcademicYearScope(scopeWhere = {}) {
    const { acedmicYearId, ...rest } = scopeWhere;
    return rest;
}

function instituteUniversityScope(model) {
    const scope = omitAcademicYearScope(buildScope(model));
    if (!scope.instituteId) {
        throw new Error('Active institute is required');
    }
    return scope;
}

function extractTermNumber(name) {
    const match = String(name ?? '').match(/(\d+)/);
    return match ? Number(match[1]) : null;
}

function normalizeTermType(termType) {
    const raw = String(termType ?? '').trim();
    return raw || 'Semester';
}

function buildSemesterName(termType, term) {
    return `${normalizeTermType(termType)} ${Number(term)}`;
}

function defaultSemesterDurationMonths(termType) {
    const normalized = String(termType ?? '').trim().toUpperCase();
    if (normalized.includes('QUARTER')) return 3;
    if (normalized.includes('TRIMEST')) return 4;
    if (normalized.includes('SEMEST')) return 6;
    return 6;
}

/** Resolve semesterId from class.term or semester table for a course + term. */
export async function findSemesterIdByCourseIdAndTerm(
    courseId,
    term,
    acedmicYearId = null,
    transaction = null,
) {
    const courseIdNum = Number(courseId);
    const termNum = Number(term);
    const classScope = omitAcademicYearScope(buildScope(model.classModel));
    const queryTx = transaction ? { transaction } : {};

    const classRow = await model.classModel.findOne({
        where: { courseId: courseIdNum, term: termNum, ...classScope },
        attributes: ['semesterId'],
        order: [['classId', 'DESC']],
        raw: true,
        ...queryTx,
    });
    if (classRow?.semesterId) return classRow.semesterId;

    const semesterScope = omitAcademicYearScope(buildScope(model.semesterModel));
    const semesters = await model.semesterModel.findAll({
        where: { courseId: courseIdNum, ...semesterScope },
        attributes: ['semesterId', 'name', 'acedmicYearId'],
        order: [['semesterId', 'ASC']],
        raw: true,
        ...queryTx,
    });

    const byTermNumber = semesters.filter((s) => extractTermNumber(s.name) === termNum);
    if (acedmicYearId != null) {
        const inYear = byTermNumber.find(
            (s) => Number(s.acedmicYearId) === Number(acedmicYearId),
        );
        if (inYear) return inYear.semesterId;
    }
    if (byTermNumber[0]?.semesterId) return byTermNumber[0].semesterId;

    return semesters[termNum - 1]?.semesterId ?? null;
}

/**
 * Find semester for course + term + academic year, or create one from course metadata.
 * Name format: "{termType} {term}" (e.g. "Semester 1", "Trimester 2").
 */
export async function findOrCreateSemesterIdForClass({
    courseId,
    term,
    acedmicYearId,
    createdBy,
    transaction,
}) {
    const courseIdNum = Number(courseId);
    const termNum = Number(term);
    const yearId = Number(acedmicYearId);

    const existing = await findSemesterIdByCourseIdAndTerm(
        courseIdNum,
        termNum,
        yearId,
        transaction,
    );
    if (existing) return existing;

    const course = await scoped(model.courseModel).findOne({
        where: { courseId: courseIdNum },
        attributes: [
            'courseId',
            'universityId',
            'instituteId',
            'termType',
            'courseDuration',
            'totalTerms',
            'createdBy',
        ],
        transaction,
    });
    if (!course) {
        throw new Error('Course not found');
    }

    const coursePlain = course.get ? course.get({ plain: true }) : course;
    const termType = normalizeTermType(coursePlain.termType);
    const name = buildSemesterName(termType, termNum);
    const courseDuration = Number(coursePlain.courseDuration) || 1;
    const totalTerms = Number(coursePlain.totalTerms) || 1;

    const byName = await scoped(model.semesterModel).findOne({
        where: {
            courseId: courseIdNum,
            acedmicYearId: yearId,
            name,
        },
        attributes: ['semesterId'],
        transaction,
    });
    if (byName?.semesterId) return byName.semesterId;

    const semesterScope = omitAcademicYearScope(buildScope(model.semesterModel));
    const template = await scoped(model.semesterModel).findOne({
        where: { courseId: courseIdNum, ...semesterScope },
        attributes: ['semesterDuration'],
        order: [['semesterId', 'ASC']],
        transaction,
    });
    const semesterDuration =
        template?.semesterDuration ?? defaultSemesterDurationMonths(termType);

    const row = await scoped(model.semesterModel).create(
        {
            universityId: coursePlain.universityId,
            instituteId: coursePlain.instituteId,
            courseId: courseIdNum,
            acedmicYearId: yearId,
            termType,
            name,
            semesterDuration,
            courseDuration,
            totalTerms,
            createdBy: createdBy ?? coursePlain.createdBy,
        },
        { transaction },
    );

    return row.semesterId ?? row.dataValues?.semesterId;
}

export async function getAllUniversity() {
    try {
        const { universityId } = requestContext.getStore() ?? {};
        return scoped(model.universityModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { ...(universityId && { universityId }) },
        });
    } catch (error) {
        console.error("Error in get all university details:", error);
        throw error;
    }
}

export async function getAllCampus() {
    try {
        const { instituteId } = requestContext.getStore() ?? {};
        const campusId = await getCampusIdByInstituteId(instituteId);
        return scoped(model.campusModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
            where: { campusId },
        });
    } catch (error) {
        console.error("Error in get all Campus details:", error);
        throw error;
    }
}

export async function getAllInstitute() {
    try {
        const { instituteId } = requestContext.getStore() ?? {};
        return scoped(model.instituteModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
            where: { ...(instituteId && { instituteId }) },
        });
    } catch (error) {
        console.error("Error in get all institute details:", error);
        throw error;
    }
}

export async function getAllAffiliatedUniversity() {
    try {
        return scoped(model.affiliatedIniversityModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
            include: [
                {
                    model: model.instituteModel,
                    as: "affiliateInstitute",
                    attributes: ["instituteId", "instituteName"],
                    required: false,
                },
            ],
        });
    } catch (error) {
        console.error("Error in get all Affiliated University details:", error);
        throw error;
    }
}

export async function getAllCourse() {
    try {
        const { instituteId } = requestContext.getStore() ?? {};
        const campusId = instituteId ? await getCampusIdByInstituteId(instituteId) : undefined;

        return scoped(model.courseModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
            include: [
                {
                    model: model.semesterModel,
                    as: 'semesterCourse',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
                    where: buildScope(model.semesterModel),
                    required: false,
                },
                {
                    model: model.sessionCouseMappingModel,
                    as: 'sessionCourseMappings',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
                    where: buildScope(model.sessionCouseMappingModel),
                    required: false,
                    include: [
                        {
                            model: model.sessionModel,
                            as: 'session',
                            attributes: ["sessionName", "startingDate", "endingDate", "classTillDate"],
                            where: buildScope(model.sessionModel),
                            required: false,
                        }
                    ]
                },
                {
                    model: model.instituteModel,
                    as: 'instituted',
                    attributes: [],
                    where: {
                        ...buildScope(model.instituteModel),
                        ...(instituteId && { instituteId }),
                    },
                    required: true,
                    include: [
                        {
                            model: model.campusModel,
                            as: 'campues',
                            attributes: [],
                            where: {
                                ...buildScope(model.campusModel),
                                ...(campusId && { campusId }),
                            },
                            required: true,
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Error in get all course details:", error);
        throw error;
    }
}

export async function getAllSpecialization() {
    try {
        return scoped(model.specializationModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
            include: [
                {
                    model: model.courseModel,
                    as: "specializationCourse",
                    attributes: ["courseId", "courseName", "courseCode"],
                    where: buildScope(model.courseModel),
                    required: false,
                },
            ],
        });
    } catch (error) {
        console.error("Error in get all Specialization details:", error);
        throw error;
    }
}

export async function getAllSubject(acedmicYearId, instituteId) {
    try {
        return scoped(model.subjectModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: {
                ...(instituteId && { instituteId }),
                ...(acedmicYearId && { acedmicYearId }),
            },
        });
    } catch (error) {
        console.error("Error in get all subject details:", error);
        throw error;
    }
}

export async function addCampus(data) {
    try {
        return scoped(model.campusModel).create(data);
    } catch (error) {
        console.error("Error in Add campus:", error);
        throw error;
    }
}

export async function addInstitute(data) {
    try {
        return scoped(model.instituteModel).create(data);
    } catch (error) {
        console.error("Error in Add Institute:", error);
        throw error;
    }
}

export async function addAffiliatedUniversity(data) {
    try {
        return scoped(model.affiliatedIniversityModel).create(data);
    } catch (error) {
        console.error("Error in add Affiliated Universit:", error);
        throw error;
    }
}

export async function addCourse(data, transaction) {
    try {
        return scoped(model.courseModel).create(data, { transaction });
    } catch (error) {
        console.error("Error in add Course:", error);
        throw error;
    }
}

export async function addSpecialization(data) {
    try {
        return scoped(model.specializationModel).create(data);
    } catch (error) {
        console.error("Error in add specialization :", error);
        throw error;
    }
}

export async function addSubject(data) {
    try {
        return scoped(model.subjectModel).create(data);
    } catch (error) {
        console.error("Error in add subject :", error);
        throw error;
    }
}

export async function updateSubject(subjectId, data) {
    try {
        const existing = await scoped(model.subjectModel).findOne({
            where: { subjectId },
            attributes: ['subjectId'],
        });
        if (!existing) {
            return [0];
        }
        return scoped(model.subjectModel).update(data, {
            where: { subjectId }
        });
    } catch (error) {
        console.error(`Error updating subject update for ${subjectId}:`, error);
        throw error;
    }
}

export async function subjectBulkCreate(data, options = {}) {
    try {
        return scoped(model.subjectModel).bulkCreate(data, options);
    } catch (error) {
        console.error("Error in subject bulk create:", error);
        throw error;
    }
}

export async function addClass(data) {
    try {
        return scoped(model.classSectionModel).bulkCreate(data);
    } catch (error) {
        console.error("Error in add class/section creation :", error);
        throw error;
    }
}

export async function createClassSections(data, options = {}) {
    try {
        if (!data.classId) {
            throw new Error('classId is required to create class sections');
        }

        const where = {
            courseId: data.courseId,
            sessionId: data.sessionId,
            sectionId: data.sectionId,
            acedmicYearId: data.acedmicYearId,
            classId: data.classId,
        };

        const existing = await scoped(model.classSectionModel).findOne({
            where,
            transaction: options.transaction,
        });
        if (existing) {
            return existing;
        }

        return scoped(model.classSectionModel).create(data, {
            transaction: options.transaction,
        });
    } catch (error) {
        console.error("Error in add class directly :", error);
        throw error;
    }
}

export async function seprateAddClass(data, options = {}) {
    try {
        const existing = await scoped(model.classModel).findOne({
            where: {
                courseId: data.courseId,
                sessionId: data.sessionId,
                term: data.term,
            },
            transaction: options.transaction,
        });
        return existing ?? scoped(model.classModel).create(data, { transaction: options.transaction });
    } catch (error) {
        console.error("Error in add class seprate :", error);
        throw error;
    }
}

export async function getClassDetails(classSectionsId, acedmicYearId) {
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userClassSection",
                    attributes: ["universityId", "userId"],
                    where: buildScope(model.userModel),
                    required: false,
                },
                {
                    model: model.courseModel,
                    as: "courseSectionAdd",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "course_levelId", "universityId"] },
                    where: buildScope(model.courseModel),
                    required: false,
                },
                {
                    model: model.specializationModel,
                    as: "specializationSectionAdd",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "course_Id", "specializationId"] },
                    where: buildScope(model.specializationModel),
                    required: false,
                },
            ],
            where: {
                ...(classSectionsId && Number(classSectionsId) !== 0 && {
                    classSectionsId: Number(classSectionsId),
                }),
                ...(acedmicYearId && { acedmicYearId: Number(acedmicYearId) }),
            }
        };

        return scoped(model.classSectionModel).findAll(queryOptions);
    } catch (error) {
        console.error("Error in getting class Details:", error);
        throw error;
    }
}

export async function getClassSpecific(campusId, instituteId, acedmicYearId, courseId, sessionId) {
    try {
        return scoped(model.campusModel).findOne({
            attributes: ["campusId", "campusName"],
            where: {
                ...(campusId && { campusId }),
            },
            include: [
                {
                    model: model.instituteModel,
                    as: "instituteData",
                    attributes: ["instituteId", "instituteName"],
                    required: false,
                    where: {
                        ...buildScope(model.instituteModel),
                        ...(instituteId && { instituteId }),
                    },
                    include: [
                        {
                            model: model.courseModel,
                            as: "instituted",
                            required: false,
                            attributes: ["courseId", "courseName", "courseCode", "instituteId", "affiliatedUniversityId", "courseDuration", "capacity", "isActive",],
                            where: {
                                ...buildScope(model.courseModel),
                                ...(courseId && { courseId }),
                            },
                            include: [
                                {
                                    model: model.classSectionModel,
                                    as: "courseSection",
                                    required: false,
                                    attributes: ["classSectionsId", "sessionId", "sectionId", "classId", "section", "class"],
                                    where: {
                                        ...buildScope(model.classSectionModel),
                                        ...(sessionId && { sessionId }),
                                        ...(acedmicYearId && { acedmicYearId }),
                                    },
                                },
                                {
                                    model: model.subjectModel,
                                    as: "subjectInfo",
                                    required: false,
                                    attributes: ["subjectId", "subjectName", "subjectCode", "subjectType",],
                                    where: {
                                        ...buildScope(model.subjectModel),
                                        ...(acedmicYearId && { acedmicYearId }),
                                    },
                                },
                                ...(courseId
                                    ? [
                                        {
                                            model: model.affiliatedIniversityModel,
                                            as: "affiliated",
                                            required: false,
                                            attributes: ["affiliatedUniversityName", "instituteId",],
                                        },
                                        {
                                            model: model.employeeCodeMasterType,
                                            as: "courseLevelCourses",
                                            required: false,
                                            attributes: ["employeeCodeMasterTypeId", "employeeCodeMasterId", "code",],
                                        },
                                        {
                                            model: model.semesterModel,
                                            as: "semesterCourse",
                                            required: false,
                                            attributes: ["termType", "totalTerms", "semesterId", "name", "acedmicYearId",],
                                            where: {
                                                ...buildScope(model.semesterModel),
                                                ...(acedmicYearId && { acedmicYearId }),
                                            },
                                            include: [
                                                {
                                                    model: model.classSubjectMapperModel,
                                                    as: "semestermapping",
                                                    required: false,
                                                    attributes: ["classSubjectMapperId", "subjectId", "semesterId",],
                                                    where: buildScope(model.classSubjectMapperModel),
                                                    include: [
                                                        {
                                                            model: model.subjectModel,
                                                            as: "subjects",
                                                            required: false,
                                                            attributes: ["subjectId", "subjectName", "subjectCode", "subjectType",],
                                                            where: buildScope(model.subjectModel),
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            model: model.sessionCouseMappingModel,
                                            as: "sessionCourseMappings",
                                            required: false,
                                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "updatedBy", "createdBy",], },
                                            where: buildScope(model.sessionCouseMappingModel),
                                            include: [
                                                {
                                                    model: model.sessionModel,
                                                    as: "session",
                                                    required: false,
                                                    attributes: ["sessionName", "startingDate", "endingDate", "classTillDate",],
                                                    where: buildScope(model.sessionModel),
                                                },
                                            ],
                                        },
                                    ]
                                    : [
                                        {
                                            model: model.affiliatedIniversityModel,
                                            as: "affiliated",
                                            required: false,
                                            attributes: ["affiliatedUniversityName", "instituteId",],
                                        },
                                        {
                                            model: model.employeeCodeMasterType,
                                            as: "courseLevelCourses",
                                            required: false,
                                            attributes: ["employeeCodeMasterTypeId", "employeeCodeMasterId", "code",],
                                        },
                                        {
                                            model: model.semesterModel,
                                            as: "semesterCourse",
                                            required: false,
                                            attributes: ["termType", "totalTerms", "semesterId", "name", "acedmicYearId",],
                                            where: buildScope(model.semesterModel),
                                        },
                                    ]),
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error in getting class Details specific:", error);
        throw error;
    }
}

export async function addClassSubjectMapper(data) {
    try {
        return scoped(model.classSubjectMapperModel).bulkCreate(data);
    } catch (error) {
        console.error("Error in add class subject mapper :", error);
        throw error;
    }
}

export async function getClassSubjectMapper(semesterId, acedmicYearId) {
    try {
        return scoped(model.classSubjectMapperModel).findAll({
            attributes: ['classSubjectMapperId'],
            ...(semesterId && { where: { semesterId } }),
            include: [
                {
                    model: model.userModel,
                    as: "userClassSubjectMapper",
                    attributes: ["universityId", "userId"],
                    where: buildScope(model.userModel),
                    required: true,
                },
                {
                    model: model.semesterModel,
                    as: "semestermapping",
                    where: {
                        ...buildScope(model.semesterModel),
                        ...(acedmicYearId && { acedmicYearId }),
                    },
                    required: true,
                    attributes: {
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
                    },
                    include: [
                        {
                            model: model.classSectionModel,
                            as: "classSections",
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
                            },
                            where: buildScope(model.classSectionModel),
                            include: [
                                {
                                    model: model.acedmicYearModel,
                                    as: "acedmicYearSection",
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
                                    },
                                },
                            ],
                        },
                        {
                            model: model.courseModel,
                            as: "semesterCourse",
                            attributes: ["courseName", "capacity", "courseId"],
                            where: buildScope(model.courseModel),
                            required: true,
                            include: [
                                {
                                    model: model.affiliatedIniversityModel,
                                    as: "affiliated",
                                    attributes: ["affiliatedUniversityName"],
                                    include: [
                                        {
                                            model: model.instituteModel,
                                            as: "institut",
                                            attributes: ["instituteName", "instituteId"],
                                            where: buildScope(model.instituteModel),
                                            include: [
                                                {
                                                    model: model.campusModel,
                                                    as: "campues",
                                                    attributes: ["campusName", "campusId"],
                                                    where: buildScope(model.campusModel),
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            model: model.specializationModel,
                            as: "specializationSemester",
                            attributes: ["specializationName"],
                            where: buildScope(model.specializationModel),
                            required: false,
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: "subjects",
                    attributes: ["subjectName", "subjectId", "subjectType", "subjectCode"],
                    where: {
                        ...buildScope(model.subjectModel),
                        ...(acedmicYearId && { acedmicYearId }),
                    },
                    required: true,
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching class subject mapper details:", error.message);
        throw error;
    }
}

export async function addSemester(data, transaction) {
    try {
        return scoped(model.semesterModel).create(data, { transaction });
    } catch (error) {
        console.error("Error in add semester:", error);
        throw error;
    }
}

export async function getSemester(courseId, specializationId, acedmicYearId) {
    try {
        return scoped(model.semesterModel).findAll({
            include: [
                {
                    model: model.userModel,
                    as: "userSemester",
                    attributes: ["universityId", "userId"],
                    where: buildScope(model.userModel),
                    required: false,
                }
            ],
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                ...(courseId && { courseId }),
                ...(specializationId && { specializationId }),
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] }
        });
    } catch (error) {
        console.error(`Error in getSemester details for courseId: ${courseId}, specializationId: ${specializationId} and acedmicYearId :${acedmicYearId}:`, error);
        throw error;
    }
}

export async function getSectionByClassId(classId) {
    try {
        return scoped(model.classSectionModel).findAll({
            where: { classId }
        });
    } catch (error) {
        console.error("Error in getting class section by class Id:", error);
        throw error;
    }
}

export async function getSemesterById(semesterId) {
    try {
        return scoped(model.semesterModel).findOne({
            attributes: ['semesterId', 'name', 'semesterDuration', 'termType'],
            where: { semesterId },
        });
    } catch (error) {
        console.error("Error in get semester by id", error);
        throw error;
    }
}

export async function getMonthlyIncomeRepository() {
    try {
        return scoped(model.feeInvoiceDetailRecordModel).findAll({
            attributes: [
                [
                    sequelize.fn("DATE_FORMAT", sequelize.col("payment_date"), "%Y-%m-01"),
                    "month"
                ],
                [sequelize.fn("SUM", sequelize.col("paid_amount")), "totalIncome"]
            ],
            where: {
                paymentStatus: "paid"
            },
            include: [
                {
                    model: model.studentInvoiceMapperModel,
                    as: "studentMakePayment",
                    attributes: [],
                    required: true,
                    where: buildScope(model.studentInvoiceMapperModel),
                    include: [
                        {
                            model: model.studentModel,
                            as: "studentinvoice",
                            attributes: [],
                            where: buildScope(model.studentModel),
                            required: true,
                        },
                    ],
                },
            ],
            group: ["month"],
            order: [[sequelize.literal("month"), "ASC"]]
        });
    } catch (error) {
        console.error("Error in getMonthlyIncomeRepository:", error);
        throw error;
    }
}

export async function getClassSectionsByFilter(sessionId, courseId, acedmicYearId) {
    try {
        const session = await scoped(model.sessionModel).findOne({
            attributes: ['sessionId', 'sessionName', 'acedmicYearId'],
            where: {
                sessionId,
                ...omitAcademicYearScope(buildScope(model.sessionModel)),
            },
        });

        const routineIncludeWhere = {
            ...omitAcademicYearScope(buildScope(model.timeTableRoutineModel)),
            ...(courseId && { courseId: Number(courseId) }),
        };

        const [course, classSections] = await Promise.all([
            scoped(model.courseModel).findOne({
                attributes: ['courseId', "courseName"],
                where: { courseId },
            }),
            scoped(model.classSectionModel).findAll({
                attributes: ['classSectionsId', "section"],
                where: {
                    sessionId,
                    courseId,
                    ...(acedmicYearId && { acedmicYearId }),
                },
                include: [
                    {
                        model: model.timeTableRoutineModel,
                        as: "timeTableClassSection",
                        attributes: [
                            'timeTableRoutineId',
                            'endingDate',
                            'startingDate',
                            'isPublish',
                            'timeTableType',
                            'timeTableNameId',
                        ],
                        where: routineIncludeWhere,
                        required: false,
                        separate: true,
                        order: [['timeTableRoutineId', 'DESC']],
                    },
                ],
            }),
        ]);

        return {
            course,
            session,
            classSections
        };
    } catch (error) {
        console.error("Error in getClassSectionsByFilter:", error);
        throw error;
    }
}
