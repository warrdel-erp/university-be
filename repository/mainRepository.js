import * as model from '../models/index.js';
import sequelize, { Op } from "sequelize";
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
                            attributes: ["sessionName"],
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
        const { universityId } = getTenantStore();
        return model.affiliatedIniversityModel.create({
            ...data,
            universityId,
        });
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
        if (!data.departmentId && data.courseId) {
            const course = await model.courseModel.findByPk(data.courseId, { attributes: ['departmentId'] });
            if (course?.departmentId) data.departmentId = course.departmentId;
        }
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
        if (Array.isArray(data) && data.length > 0) {
            const courseIds = [...new Set(data.filter(r => !r.departmentId && r.courseId).map(r => r.courseId))];
            if (courseIds.length > 0) {
                const courses = await model.courseModel.findAll({
                    where: { courseId: { [Op.in]: courseIds } },
                    attributes: ['courseId', 'departmentId'],
                    raw: true
                });
                const map = new Map(courses.map(c => [c.courseId, c.departmentId]));
                for (const r of data) {
                    if (!r.departmentId && r.courseId && map.has(r.courseId)) {
                        r.departmentId = map.get(r.courseId);
                    }
                }
            }
        }
        return scoped(model.subjectModel).bulkCreate(data, options);
    } catch (error) {
        console.error("Error in subject bulk create:", error);
        throw error;
    }
}

export async function addClassSections(data) {
    try {
        if (Array.isArray(data) && data.length > 0) {
            const courseIds = [...new Set(data.filter(r => !r.departmentId && r.courseId).map(r => r.courseId))];
            if (courseIds.length > 0) {
                const courses = await model.courseModel.findAll({
                    where: { courseId: { [Op.in]: courseIds } },
                    attributes: ['courseId', 'departmentId'],
                    raw: true
                });
                const map = new Map(courses.map(c => [c.courseId, c.departmentId]));
                for (const r of data) {
                    if (!r.departmentId && r.courseId && map.has(r.courseId)) {
                        r.departmentId = map.get(r.courseId);
                    }
                }
            }
        }
        return scoped(model.classSectionModel).bulkCreate(data);
    } catch (error) {
        console.error("Error in add class/section creation :", error);
        throw error;
    }
}

export async function findClassSectionForYear(
    { courseId, sessionId, section, year, batchId },
    options = {},
) {
    try {
        const sectionName = String(section).trim();
        if (!sectionName) {
            return null;
        }

        const whereClause = {
            courseId: Number(courseId),
            sessionId: Number(sessionId),
            section: sectionName,
            year: Number(year),
        };

        if (batchId !== undefined) {
            whereClause.batchId = Number(batchId);
        }

        return scoped(model.classSectionModel).findOne({
            where: whereClause,
            ...options,
        });
    } catch (error) {
        console.error('Error finding class section for year:', error);
        throw error;
    }
}

export async function createClassSectionRow(data, options = {}) {
    try {
        if (data.year == null) {
            throw new Error('year is required to create class sections');
        }

        const sectionName = String(data.section).trim();
        if (!sectionName) {
            throw new Error('section is required to create class sections');
        }

        if (!data.departmentId && data.courseId) {
            const course = await model.courseModel.findByPk(data.courseId, { attributes: ['departmentId'] });
            if (course?.departmentId) data.departmentId = course.departmentId;
        }

        return scoped(model.classSectionModel).create(
            { ...data, section: sectionName, year: Number(data.year) },
            { transaction: options.transaction },
        );
    } catch (error) {
        console.error('Error creating class section row:', error);
        throw error;
    }
}

export async function createClassSections(data, options = {}) {
    try {
        const existing = await findClassSectionForYear(data, options);
        if (existing) {
            return existing;
        }

        return createClassSectionRow(data, options);
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
                                    attributes: ["classSectionsId", "sessionId", "section", "year"],
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
                                                    attributes: ["sessionName",],
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

async function resolveAcademicYearStartYear(academicYearId) {
    const academicYear = await scoped(model.acedmicYearModel).findOne({
        where: { academicYearId: Number(academicYearId) },
        attributes: ['academicYearId', 'yearTitle'],
    });
    if (!academicYear) {
        const error = new Error('Academic year not found');
        error.statusCode = 404;
        throw error;
    }

    const match = String(academicYear.yearTitle).match(/^(\d{4})/);
    if (!match) {
        const error = new Error(
            `Cannot parse year from academic year title '${academicYear.yearTitle}'`,
        );
        error.statusCode = 400;
        throw error;
    }
    return Number(match[1]);
}

/**
 * Active curriculum term slots for an academic year:
 * curriculum_batch_term_mapping.year === academic-year start year,
 * joined to curriculum + batch.
 */
async function findActiveCurriculumTermSlots(academicYearId) {
    const startYear = await resolveAcademicYearStartYear(academicYearId);

    const rows = await model.curriculumBatchTermMappingModel.findAll({
        attributes: ['term', 'year', 'yearNumber'],
        where: { year: startYear },
        include: [
            {
                model: model.curriculumBatchMappingModel,
                as: 'batchMapping',
                attributes: ['curriculumBatchMappingId', 'curriculumId', 'batch'],
                required: true,
                include: [
                    {
                        model: model.curriculumModel,
                        as: 'curriculum',
                        attributes: ['curriculumId', 'courseId', 'name', 'publishStatus'],
                        required: true,
                        where: buildScope(model.curriculumModel),
                    },
                ],
            },
        ],
    });

    const slots = [];
    for (const row of rows) {
        const plain = row.get ? row.get({ plain: true }) : row;
        const batchMapping = plain.batchMapping;
        if (!batchMapping?.curriculumId) continue;
        slots.push({
            curriculumId: Number(batchMapping.curriculumId),
            curriculumBatchMappingId: Number(batchMapping.curriculumBatchMappingId),
            batch: Number(batchMapping.batch),
            term: Number(plain.term),
            year: Number(plain.year),
            curriculum: batchMapping.curriculum || null,
        });
    }
    return slots;
}

function buildSubjectMapperRow(subjectPlain, mappingRows) {
    const terms = [];
    const batches = [];
    const termSeen = new Set();
    const batchSeen = new Set();
    const mappings = [];

    for (const mapping of mappingRows) {
        const term = mapping.term == null ? null : Number(mapping.term);
        const batch = mapping.batch == null ? null : Number(mapping.batch);

        if (term != null && !termSeen.has(term)) {
            termSeen.add(term);
            terms.push(term);
        }
        if (batch != null && !batchSeen.has(batch)) {
            batchSeen.add(batch);
            batches.push(batch);
        }

        mappings.push({
            curriculumSubjectTermMappingId: mapping.curriculumSubjectTermMappingId,
            curriculumId: mapping.curriculumId,
            curriculumName: mapping.curriculumName ?? null,
            term,
            credit: mapping.credit ?? null,
            batch,
            curriculumBatchMappingId: mapping.curriculumBatchMappingId ?? null,
        });
    }

    terms.sort((a, b) => a - b);
    batches.sort((a, b) => a - b);

    const subjectType = subjectPlain.subjectType ?? null;
    const normalizedType = String(subjectType || '').trim().toLowerCase();

    return {
        subjectId: subjectPlain.subjectId,
        universityId: subjectPlain.universityId,
        campusId: subjectPlain.campusId,
        instituteId: subjectPlain.instituteId,
        courseId: subjectPlain.courseId,
        specializationId: subjectPlain.specializationId ?? null,
        subjectName: subjectPlain.subjectName,
        subjectCode: subjectPlain.subjectCode,
        subjectType,
        subjectCategory: subjectPlain.subjectCategory ?? null,
        shortName: subjectPlain.shortName ?? null,
        description: subjectPlain.description ?? null,
        isActive: subjectPlain.isActive,
        departmentId: subjectPlain.departmentId ?? null,
        isElective: normalizedType.includes('elective'),
        isCore: normalizedType === 'core',
        terms,
        batches,
        mappings,
        course: subjectPlain.courseInfo
            ? {
                courseId: subjectPlain.courseInfo.courseId,
                courseName: subjectPlain.courseInfo.courseName,
                termType: subjectPlain.courseInfo.termType,
                totalTerms: subjectPlain.courseInfo.totalTerms,
            }
            : null,
    };
}

export async function getSectionSubjectMapper(arg1, arg2) {
    try {
        let opts = {};
        if (typeof arg1 === 'object' && arg1 !== null) {
            opts = arg1;
        } else {
            opts = {
                term: arg1,
                academicYearId: arg2,
            };
        }

        const { term, courseId, search, page, limit, academicYearId } = opts;
        const termFilter = term != null && term !== '' ? Number(term) : null;
        const courseFilter = courseId != null && courseId !== '' ? Number(courseId) : null;

        const subjectWhere = {
            ...(courseFilter && { courseId: courseFilter }),
        };
        if (search) {
            subjectWhere[Op.or] = [
                { subjectName: { [Op.like]: `%${search}%` } },
                { subjectCode: { [Op.like]: `%${search}%` } },
            ];
        }

        const subjectInclude = {
            model: model.courseModel,
            as: 'courseInfo',
            attributes: ['courseId', 'courseName', 'termType', 'totalTerms'],
            where: buildScope(model.courseModel),
            required: false,
        };

        let mappingBySubjectId = new Map();

        if (academicYearId != null && academicYearId !== '') {
            const slots = await findActiveCurriculumTermSlots(academicYearId);
            if (!slots.length) {
                const isPaginated = page != null && limit != null;
                if (!isPaginated) return [];
                return {
                    data: [],
                    pagination: {
                        page: Number(page) || 1,
                        limit: Number(limit) || 10,
                        total: 0,
                    },
                };
            }

            const mappingOr = [];
            const slotMetaByKey = new Map();
            for (const slot of slots) {
                if (termFilter != null && slot.term !== termFilter) continue;
                const key = `${slot.curriculumId}_${slot.term}`;
                mappingOr.push({
                    curriculumId: slot.curriculumId,
                    term: slot.term,
                });
                if (!slotMetaByKey.has(key)) {
                    slotMetaByKey.set(key, slot);
                }
            }

            if (!mappingOr.length) {
                const isPaginated = page != null && limit != null;
                if (!isPaginated) return [];
                return {
                    data: [],
                    pagination: {
                        page: Number(page) || 1,
                        limit: Number(limit) || 10,
                        total: 0,
                    },
                };
            }

            const mappingRows = await model.curriculumSubjectTermMappingModel.findAll({
                attributes: [
                    'curriculumSubjectTermMappingId',
                    'curriculumId',
                    'subjectId',
                    'term',
                    'credit',
                ],
                where: { [Op.or]: mappingOr },
                include: [
                    {
                        model: model.subjectModel,
                        as: 'subject',
                        attributes: [
                            'subjectId',
                            'universityId',
                            'campusId',
                            'instituteId',
                            'courseId',
                            'specializationId',
                            'subjectName',
                            'subjectCode',
                            'subjectType',
                            'subjectCategory',
                            'shortName',
                            'description',
                            'isActive',
                            'departmentId',
                        ],
                        required: true,
                        where: {
                            ...buildScope(model.subjectModel),
                            ...subjectWhere,
                        },
                        include: [subjectInclude],
                    },
                    {
                        model: model.curriculumModel,
                        as: 'curriculum',
                        attributes: ['curriculumId', 'name'],
                        required: true,
                        where: buildScope(model.curriculumModel),
                    },
                ],
            });

            for (const row of mappingRows) {
                const plain = row.get ? row.get({ plain: true }) : row;
                const subjectId = Number(plain.subjectId);
                const slotKey = `${Number(plain.curriculumId)}_${Number(plain.term)}`;
                const slot = slotMetaByKey.get(slotKey);

                if (!mappingBySubjectId.has(subjectId)) {
                    mappingBySubjectId.set(subjectId, {
                        subject: plain.subject,
                        mappings: [],
                    });
                }

                mappingBySubjectId.get(subjectId).mappings.push({
                    curriculumSubjectTermMappingId: plain.curriculumSubjectTermMappingId,
                    curriculumId: Number(plain.curriculumId),
                    curriculumName: plain.curriculum?.name ?? null,
                    term: Number(plain.term),
                    credit: plain.credit,
                    batch: slot?.batch ?? null,
                    curriculumBatchMappingId: slot?.curriculumBatchMappingId ?? null,
                });
            }
        } else {
            const mappingWhere = {
                ...(termFilter != null && { term: termFilter }),
            };

            const subjects = await scoped(model.subjectModel).findAll({
                attributes: [
                    'subjectId',
                    'universityId',
                    'campusId',
                    'instituteId',
                    'courseId',
                    'specializationId',
                    'subjectName',
                    'subjectCode',
                    'subjectType',
                    'subjectCategory',
                    'shortName',
                    'description',
                    'isActive',
                    'departmentId',
                ],
                where: subjectWhere,
                include: [
                    subjectInclude,
                    {
                        model: model.curriculumSubjectTermMappingModel,
                        as: 'curriculumTermMappings',
                        attributes: [
                            'curriculumSubjectTermMappingId',
                            'curriculumId',
                            'subjectId',
                            'term',
                            'credit',
                        ],
                        required: termFilter != null,
                        where: Object.keys(mappingWhere).length ? mappingWhere : undefined,
                        include: [
                            {
                                model: model.curriculumModel,
                                as: 'curriculum',
                                attributes: ['curriculumId', 'name'],
                                required: true,
                                where: buildScope(model.curriculumModel),
                                include: [
                                    {
                                        model: model.curriculumBatchMappingModel,
                                        as: 'batchMappings',
                                        attributes: ['curriculumBatchMappingId', 'batch'],
                                        required: false,
                                    },
                                ],
                            },
                        ],
                    },
                ],
                order: [
                    ['courseId', 'ASC'],
                    ['subjectName', 'ASC'],
                ],
            });

            for (const subject of subjects) {
                const plain = subject.get ? subject.get({ plain: true }) : subject;
                const mappings = [];
                for (const mapping of plain.curriculumTermMappings || []) {
                    const batchMappings = mapping.curriculum?.batchMappings || [];
                    if (!batchMappings.length) {
                        mappings.push({
                            curriculumSubjectTermMappingId: mapping.curriculumSubjectTermMappingId,
                            curriculumId: Number(mapping.curriculumId),
                            curriculumName: mapping.curriculum?.name ?? null,
                            term: Number(mapping.term),
                            credit: mapping.credit,
                            batch: null,
                            curriculumBatchMappingId: null,
                        });
                        continue;
                    }
                    for (const batchMapping of batchMappings) {
                        mappings.push({
                            curriculumSubjectTermMappingId: mapping.curriculumSubjectTermMappingId,
                            curriculumId: Number(mapping.curriculumId),
                            curriculumName: mapping.curriculum?.name ?? null,
                            term: Number(mapping.term),
                            credit: mapping.credit,
                            batch: Number(batchMapping.batch),
                            curriculumBatchMappingId: Number(batchMapping.curriculumBatchMappingId),
                        });
                    }
                }

                mappingBySubjectId.set(Number(plain.subjectId), {
                    subject: plain,
                    mappings,
                });
            }
        }

        const subjectIds = [];
        for (const subjectId of mappingBySubjectId.keys()) {
            subjectIds.push(subjectId);
        }

        const formatted = [];
        for (const subjectId of subjectIds) {
            const entry = mappingBySubjectId.get(subjectId);
            formatted.push(buildSubjectMapperRow(entry.subject, entry.mappings));
        }

        formatted.sort((a, b) => {
            if (a.courseId !== b.courseId) return a.courseId - b.courseId;
            return String(a.subjectName).localeCompare(String(b.subjectName));
        });

        const isPaginated = page != null && limit != null;
        if (!isPaginated) {
            return formatted;
        }

        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const pageNum = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const limitNum = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
        const offset = (pageNum - 1) * limitNum;
        const total = formatted.length;

        return {
            data: formatted.slice(offset, offset + limitNum),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
            },
        };
    } catch (error) {
        console.error('Error fetching class subject mapper details:', error.message);
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
                attributes: ['classSectionsId', 'section', 'year'],
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
