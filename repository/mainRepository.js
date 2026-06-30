import * as model from '../models/index.js';
import sequelize from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { getTenantStore } from "../utility/requestContext.js";
import { getCampusIdByInstituteId } from "./buildingRepository.js";
import { classSectionTermsInclude } from "../utility/classSectionIncludes.js";

function omitAcademicYearScope(scopeWhere = {}) {
    const { academicYearId, ...rest } = scopeWhere;
    return rest;
}

function instituteUniversityScope(model) {
    const scope = omitAcademicYearScope(buildScope(model));
    if (!scope.instituteId) {
        throw new Error('Active institute is required');
    }
    return scope;
}

export async function getAllUniversity() {
    try {
        const { universityId } = getTenantStore();
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
        const { instituteId } = getTenantStore();
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
        const { instituteId } = getTenantStore();
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
        const { instituteId } = getTenantStore();
        const campusId = instituteId ? await getCampusIdByInstituteId(instituteId) : undefined;

        return scoped(model.courseModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] },
            include: [
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

export async function getAllSubject(academicYearId, instituteId) {
    try {
        return scoped(model.subjectModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: {
                ...(instituteId && { instituteId }),
                ...(academicYearId && { academicYearId }),
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

export async function addClassSections(data) {
    try {
        return scoped(model.classSectionModel).bulkCreate(data);
    } catch (error) {
        console.error("Error in add class/section creation :", error);
        throw error;
    }
}

export async function createClassSections(data, options = {}) {
    try {
        if (data.year == null) {
            throw new Error('year is required to create class sections');
        }

        const where = {
            courseId: data.courseId,
            sessionId: data.sessionId,
            sectionId: data.sectionId,
            academicYearId: data.academicYearId,
            year: Number(data.year),
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

export async function findOrCreateClassSectionTerm(
    { classSectionsId, term, createdBy, universityId, instituteId },
    options = {},
) {
    try {
        const termNum = Number(term);
        const existing = await scoped(model.classSectionTermModel).findOne({
            where: {
                classSectionsId: Number(classSectionsId),
                term: termNum,
            },
            transaction: options.transaction,
        });
        if (existing) {
            return existing;
        }

        return scoped(model.classSectionTermModel).create(
            {
                classSectionsId: Number(classSectionsId),
                term: termNum,
                createdBy,
                universityId,
                instituteId,
            },
            { transaction: options.transaction },
        );
    } catch (error) {
        console.error("Error in findOrCreateClassSectionTerm:", error);
        throw error;
    }
}

export async function getClassSectionDetails(classSectionsId, academicYearId) {
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
                ...(academicYearId && { academicYearId: Number(academicYearId) }),
            }
        };

        return scoped(model.classSectionModel).findAll(queryOptions);
    } catch (error) {
        console.error("Error in getting class Details:", error);
        throw error;
    }
}

export async function getClassSectionSpecific(campusId, instituteId, academicYearId, courseId, sessionId) {
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
                                    attributes: ["classSectionsId", "sessionId", "sectionId", "section", "class", "year"],
                                    where: {
                                        ...buildScope(model.classSectionModel),
                                        ...(sessionId && { sessionId }),
                                        ...(academicYearId && { academicYearId }),
                                    },
                                },
                                {
                                    model: model.subjectModel,
                                    as: "subjectInfo",
                                    required: false,
                                    attributes: ["subjectId", "subjectName", "subjectCode", "subjectType",],
                                    where: {
                                        ...buildScope(model.subjectModel),
                                        ...(academicYearId && { academicYearId }),
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

export async function addSectionSubjectMapper(data) {
    try {
        return scoped(model.classSubjectMapperModel).bulkCreate(data);
    } catch (error) {
        console.error("Error in add class subject mapper :", error);
        throw error;
    }
}

export async function getSectionSubjectMapper(term, academicYearId) {
    try {
        return scoped(model.classSubjectMapperModel).findAll({
            attributes: ['classSubjectMapperId', 'subjectId'],
            include: [
                {
                    model: model.userModel,
                    as: "userClassSubjectMapper",
                    attributes: ["universityId", "userId"],
                    where: buildScope(model.userModel),
                    required: true,
                },
                {
                    model: model.subjectModel,
                    as: "subjects",
                    attributes: ["subjectName", "subjectId", "subjectType", "subjectCode", "term", "courseId"],
                    where: {
                        ...buildScope(model.subjectModel),
                        ...(academicYearId && { academicYearId }),
                        ...(term && { term: Number(term) }),
                    },
                    required: true,
                    include: [
                        {
                            model: model.courseModel,
                            as: "courseInfo",
                            attributes: ["courseName", "capacity", "courseId", "termType", "totalTerms"],
                            where: buildScope(model.courseModel),
                            required: false,
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
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error fetching class subject mapper details:", error.message);
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

export async function getClassSectionsByFilter(sessionId, courseId, academicYearId) {
    try {
        const session = await scoped(model.sessionModel).findOne({
            attributes: ['sessionId', 'sessionName', 'academicYearId'],
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
                attributes: ['classSectionsId', 'section', 'year', 'class'],
                where: {
                    sessionId,
                    courseId,
                    ...(academicYearId && { academicYearId }),
                },
                include: [
                    classSectionTermsInclude(),
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
