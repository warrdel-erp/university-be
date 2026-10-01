import * as model from "../models/index.js";
import { Op } from "sequelize";
import { buildScope, scoped } from "../utility/scoped.js";
import { lookupStudentCount, buildTermCohortGroupKey } from "../utility/studentCount.js";
import * as studentCountRepository from "./studentCountRepository.js";
import { curriculumBatchTermScheduleInclude } from "./curriculumBatchTermRepository.js";

async function assertScopedRoomCapacity(examScheduleRoomCapacityId, transaction) {
    return model.examScheduleRoomCapacityModel.findOne({
        where: { examScheduleRoomCapacityId },
        attributes: ['examScheduleRoomCapacityId'],
        transaction,
        include: [{
            model: model.examScheduleModel,
            as: 'examSchedule',
            required: true,
            where: buildScope(model.examScheduleModel),
            attributes: ['examScheduleId'],
        }],
    });
}

export async function getExamSchedules(filters = {}) {
    try {
        const { subjectId, examSetupTypeTermId, courseId, term, sessionId, batchId } = filters;

        const result = await scoped(model.examScheduleModel).findAll({
            where: {
                ...(subjectId && { subjectId }),
                ...(term && { term: Number(term) }),
                ...(examSetupTypeTermId && { examSetupTypeTermId }),
                ...(batchId && { batchId: Number(batchId) }),
            },
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"],
                        },
                    ],
                },
                {
                    model: model.teacherExamAssignmentModel,
                    as: "teacherAssignments",
                    include: [
                        {
                            model: model.employeeModel, as: "teacherEmployee",
                            attributes: ["employeeName", "employeeId", "userId"],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
                    where: {
                        ...(courseId && { courseId: Number(courseId) }),
                    },
                    required: !!courseId,
                },
                {
                    model: model.batchModel,
                    as: "batch",
                    attributes: ["batchId", "batch", "sessionId", "status"],
                    where: {
                        ...(sessionId && { sessionId: Number(sessionId) }),
                    },
                    required: !!sessionId,
                    include: [
                        {
                            model: model.sessionModel,
                            as: "session",
                            attributes: ["sessionId", "sessionName"],
                            required: false,
                        },
                    ],
                },
                {
                    model: model.curriculumSubjectTermMappingModel,
                    as: "curriculumSubjectTermMapping",
                    attributes: ["curriculumSubjectTermMappingId", "curriculumId", "term", "subjectId"],
                },
                {
                    model: model.examinationSessionModel,
                    as: "examinationSession",
                    attributes: ["examinationSessionId", "assessmentTypeId"],
                    include: [
                        {
                            model: model.examSetupTypeModel,
                            as: "assessmentType",
                            attributes: ["examSetupTypeId", "examType", "examName"],
                        }
                    ]
                },
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam schedules:", error);
        throw error;
    }
}

export async function getExamScheduleExists(examScheduleId) {
    return await scoped(model.examScheduleModel).findByPk(examScheduleId, {
        attributes: ["examScheduleId"],
    });
}

export async function getExamScheduleById(examScheduleId, options = {}) {
    try {
        const result = await scoped(model.examScheduleModel).findByPk(examScheduleId, {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            transaction: options.transaction,
            include: [
                {
                    model: model.examScheduleRoomCapacityModel,
                    as: "roomCapacities",
                    include: [
                        {
                            model: model.classRoomModel,
                            as: "classRoom",
                            attributes: ["classRoomSectionId", "roomNumber"],
                        },
                        {
                            model: model.studentExamSeatModel,
                            as: "seats",
                            attributes: ["studentExamSeatId", "row", "column"],
                            include: [
                                {
                                    model: model.studentModel,
                                    as: "student",
                                    attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber", "admissionNumber"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: "subjectSchedule",
                    attributes: ["subjectId", "subjectName", "subjectCode", "courseId"],
                },
                {
                    model: model.batchModel,
                    as: "batch",
                    attributes: ["batchId", "batch", "sessionId", "status"],
                    include: [
                        {
                            model: model.sessionModel,
                            as: "session",
                            attributes: ["sessionId", "sessionName"],
                            required: false,
                        },
                    ],
                },
                {
                    model: model.curriculumSubjectTermMappingModel,
                    as: "curriculumSubjectTermMapping",
                    attributes: ["curriculumSubjectTermMappingId", "curriculumId", "term", "subjectId"],
                },
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam schedule by id:", error);
        throw error;
    }
}

export async function getStudentCountsByGroups(groups) {
    try {
        const countMap = new Map();
        const unique = [];
        const seen = new Set();
        for (const group of groups || []) {
            const key = buildTermCohortGroupKey(group);
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(group);
        }

        await Promise.all(
            unique.map(async (group) => {
                countMap.set(
                    buildTermCohortGroupKey(group),
                    await studentCountRepository.countTermCohortStudents(group),
                );
            }),
        );

        const counts = [];
        for (const group of groups || []) {
            counts.push({
                ...group,
                studentCount: lookupStudentCount(countMap, group),
            });
        }
        return counts;
    } catch (error) {
        console.error("Error fetching student counts by groups:", error);
        throw error;
    }
}

export async function getStudentCountByGroup(sessionId, courseId, term, academicYearId, options = {}) {
    try {
        return studentCountRepository.countTermCohortStudents(
            {
                sessionId,
                courseId,
                term,
                academicYearId,
                batchYear: options.batchYear,
                yearNumber: options.yearNumber,
            },
            options,
        );
    } catch (error) {
        console.error("Error fetching student count by group:", error);
        throw error;
    }
}

export async function getStudentsForSchedule(sessionId, courseId, term, academicYearId, options = {}) {
    try {
        return studentCountRepository.findTermCohortStudents(
            {
                sessionId: Number(sessionId),
                courseId: Number(courseId),
                term: Number(term),
                academicYearId: Number(academicYearId),
                batchYear: options.batchYear != null ? Number(options.batchYear) : null,
                yearNumber: options.yearNumber != null ? Number(options.yearNumber) : null,
            },
            options,
        );
    } catch (error) {
        console.error("Error fetching students for schedule:", error);
        throw error;
    }
}

export async function getStudentsForSchedulePaginated(
    sessionId,
    courseId,
    term,
    academicYearId,
    {
      page = 1,
      limit = 10,
      search,
      batchYear,
      yearNumber,
    } = {},
) {
    const { rows, totalCount } = await studentCountRepository.findTermCohortStudents(
        {
            sessionId: Number(sessionId),
            courseId: Number(courseId),
            term: Number(term),
            academicYearId: Number(academicYearId),
            batchYear: batchYear != null ? Number(batchYear) : null,
            yearNumber: yearNumber != null ? Number(yearNumber) : null,
        },
        { page, limit, search },
    );
    return {
        result: rows,
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)) || 0,
    };
}

export async function allocateSeats(allocations, transaction) {
    try {
        const capacityIds = [...new Set(allocations.map(a => a.examScheduleRoomCapacityId))];
        if (capacityIds.length > 0) {
            const count = await model.examScheduleRoomCapacityModel.count({
                where: {
                    examScheduleRoomCapacityId: { [Op.in]: capacityIds },
                    ...buildScope(model.examScheduleRoomCapacityModel)
                },
                include: [{
                    model: model.examScheduleModel,
                    as: 'examSchedule',
                    required: true,
                    where: buildScope(model.examScheduleModel)
                }],
                transaction
            });
            if (count !== capacityIds.length) {
                throw new Error('Exam schedule room capacity not found');
            }
        }
        return await model.studentExamSeatModel.bulkCreate(allocations, { transaction });
    } catch (error) {
        console.error("Error allocating seats:", error);
        throw error;
    }
}

export async function clearExistingAllocations(examScheduleRoomCapacityIds, transaction) {
    try {
        if (examScheduleRoomCapacityIds.length > 0) {
            const count = await model.examScheduleRoomCapacityModel.count({
                where: {
                    examScheduleRoomCapacityId: { [Op.in]: examScheduleRoomCapacityIds },
                    ...buildScope(model.examScheduleRoomCapacityModel)
                },
                include: [{
                    model: model.examScheduleModel,
                    as: 'examSchedule',
                    required: true,
                    where: buildScope(model.examScheduleModel)
                }],
                transaction
            });
            if (count !== examScheduleRoomCapacityIds.length) {
                throw new Error('Exam schedule room capacity not found');
            }
        }
        return await model.studentExamSeatModel.destroy({
            where: {
                examScheduleRoomCapacityId: { [Op.in]: examScheduleRoomCapacityIds },
            },
            transaction,
        });
    } catch (error) {
        console.error("Error clearing existing allocations:", error);
        throw error;
    }
}

export async function getExamScheduleIdBySubject(subjectId, sessionId, batchId) {
    const schedule = await scoped(model.examScheduleModel).findOne({
        where: {
            subjectId,
            ...(batchId && { batchId }),
        },
        include: sessionId ? [
            {
                model: model.batchModel,
                as: "batch",
                where: { sessionId: Number(sessionId) },
                required: true,
                attributes: [],
            }
        ] : [],
        attributes: ["examScheduleId"],
        raw: true,
    });
    return schedule?.examScheduleId || null;
}

export async function getStudentSeatAllocationsBySchedule(examScheduleId) {
    return await model.studentExamSeatModel.findAll({
        include: [
            {
                model: model.examScheduleRoomCapacityModel,
                as: "roomCapacity",
                where: { examScheduleId },
                include: [
                    {
                        model: model.classRoomModel,
                        as: "classRoom",
                        attributes: ["roomNumber"],
                    }
                ]
            }
        ]
    });
}

export async function findAndCountAllocatedSeatsByFilters(filters = {}, options = {}) {
    const {
        examScheduleId,
        examScheduleRoomCapacityId,
        classRoomSectionId,
        search,
        page = 1,
        limit = 10,
    } = filters;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const seatWhere = {};
    if (examScheduleRoomCapacityId) {
        seatWhere.examScheduleRoomCapacityId = Number(examScheduleRoomCapacityId);
    }

    const roomCapacityWhere = {};
    if (examScheduleId) {
        roomCapacityWhere.examScheduleId = Number(examScheduleId);
    }
    if (classRoomSectionId) {
        roomCapacityWhere.classRoomSectionId = Number(classRoomSectionId);
    }

    const studentWhere = {};
    if (search && String(search).trim()) {
        const query = `%${String(search).trim()}%`;
        studentWhere[Op.or] = [
            { scholarNumber: { [Op.like]: query } },
            { enrollNumber: { [Op.like]: query } },
            { firstName: { [Op.like]: query } },
            { lastName: { [Op.like]: query } },
            { fatherName: { [Op.like]: query } },
        ];
    }

    const { count, rows } = await model.studentExamSeatModel.findAndCountAll({
        where: seatWhere,
        include: [
            {
                model: model.examScheduleRoomCapacityModel,
                as: "roomCapacity",
                where: Object.keys(roomCapacityWhere).length > 0 ? roomCapacityWhere : undefined,
                required: true,
                include: [
                    {
                        model: model.classRoomModel,
                        as: "classRoom",
                        attributes: [
                            "classRoomSectionId",
                            "roomNumber",
                            "capacity",
                            "examCapacity",
                            "examCapacityColumns",
                        ],
                        required: false,
                    },
                ],
            },
            {
                model: model.studentModel,
                as: "student",
                where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
                required: true,
                include: [
                    {
                        model: model.courseModel,
                        as: "course",
                        attributes: ["courseId", "courseName", "courseCode"],
                        required: false,
                    },
                    {
                        model: model.batchModel,
                        as: "batch",
                        attributes: ["batchId", "batch"],
                        required: false,
                    },
                ],
            },
        ],
        order: [
            [{ model: model.examScheduleRoomCapacityModel, as: "roomCapacity" }, "orderKey", "ASC"],
            ["row", "ASC"],
            ["column", "ASC"],
        ],
        limit: limitNum,
        offset,
        distinct: true,
        transaction: options.transaction,
    });

    return { count, rows, page: pageNum, limit: limitNum };
}

/**
 * Fetch students for exam schedule using batchId + term:
 * 1. Find classSectionTermIds for batchId and term
 * 2. Find students where batchId = batchId and classSectionTermId IN (classSectionTermIds)
 */
export async function findStudentsByBatchAndTerm(batchId, term, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    const bId = Number(batchId);
    const tNum = Number(term);
    if (!bId || !tNum) return [];

    const cstRows = await model.classSectionTermModel.findAll({
        attributes: ["classSectionTermId"],
        where: { term: tNum },
        include: [
            {
                model: model.classSectionModel,
                as: "classSection",
                attributes: ["classSectionsId", "batchId"],
                required: true,
                where: {
                    batchId: bId,
                    ...buildScope(model.classSectionModel),
                },
            },
        ],
        raw: true,
        transaction: tx,
    });

    const classSectionTermIds = cstRows.map((r) => Number(r.classSectionTermId)).filter(Boolean);
    if (!classSectionTermIds.length) {
        return [];
    }

    return await model.studentModel.findAll({
        where: {
            batchId: bId,
            classSectionTermId: { [Op.in]: classSectionTermIds },
            ...buildScope(model.studentModel),
        },
        attributes: [
            "studentId",
            "scholarNumber",
            "enrollNumber",
            "firstName",
            "middleName",
            "lastName",
            "batchId",
            "classSectionTermId",
        ],
        order: [
            ["scholarNumber", "ASC"],
            ["firstName", "ASC"],
            ["lastName", "ASC"],
            ["studentId", "ASC"],
        ],
        transaction: tx,
    });
}

export async function findStudentsByBatchAndTermPaginated(batchId, term, {
    page = 1,
    limit = 10,
    search,
    transaction,
} = {}) {
    const tx = transaction || undefined;
    const bId = Number(batchId);
    const tNum = Number(term);
    if (!bId || !tNum) return { rows: [], totalCount: 0 };

    const cstRows = await model.classSectionTermModel.findAll({
        attributes: ["classSectionTermId"],
        where: { term: tNum },
        include: [
            {
                model: model.classSectionModel,
                as: "classSection",
                attributes: ["classSectionsId", "batchId"],
                required: true,
                where: {
                    batchId: bId,
                    ...buildScope(model.classSectionModel),
                },
            },
        ],
        raw: true,
        transaction: tx,
    });

    const classSectionTermIds = cstRows.map((r) => Number(r.classSectionTermId)).filter(Boolean);
    if (!classSectionTermIds.length) {
        return { rows: [], totalCount: 0 };
    }

    const where = {
        batchId: bId,
        classSectionTermId: { [Op.in]: classSectionTermIds },
        ...buildScope(model.studentModel),
    };

    if (search && String(search).trim()) {
        const query = `%${String(search).trim()}%`;
        where[Op.or] = [
            { scholarNumber: { [Op.like]: query } },
            { enrollNumber: { [Op.like]: query } },
            { firstName: { [Op.like]: query } },
            { lastName: { [Op.like]: query } },
            { fatherName: { [Op.like]: query } },
        ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await model.studentModel.findAndCountAll({
        where,
        attributes: [
            "studentId",
            "scholarNumber",
            "enrollNumber",
            "firstName",
            "middleName",
            "lastName",
            "fatherName",
            "batchId",
            "classSectionTermId",
            "courseId",
        ],
        include: [
            {
                model: model.courseModel,
                as: "course",
                attributes: ["courseId", "courseName", "courseCode"],
                required: false,
            },
        ],
        order: [
            ["scholarNumber", "ASC"],
            ["firstName", "ASC"],
            ["lastName", "ASC"],
            ["studentId", "ASC"],
        ],
        limit: limitNum,
        offset,
        distinct: true,
        transaction: tx,
    });

    return { rows, totalCount: count };
}

export async function getExamScheduleForRoomAssignment(examScheduleId, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    return await scoped(model.examScheduleModel).findByPk(examScheduleId, {
        attributes: [
            "examScheduleId",
            "universityId",
            "instituteId",
            "examDate",
            "examTime",
            "duration",
            "examinationSessionSlotId",
            "batchId",
            "curriculumSubjectTermMappingId",
            "subjectId",
            "term",
            "published",
        ],
        include: [
            {
                model: model.examinationSessionSlotModel,
                as: "examinationSessionSlot",
                attributes: ["examinationSessionSlotId", "startTime", "endTime", "durationMinutes"],
                required: false,
                paranoid: true,
            },
            {
                model: model.batchModel,
                as: "batch",
                attributes: ["batchId", "batch", "sessionId"],
                required: false,
                include: [
                    {
                        model: model.sessionModel,
                        as: "session",
                        attributes: ["sessionId", "sessionName", "courseId"],
                        required: false,
                    },
                ],
            },
            {
                model: model.curriculumSubjectTermMappingModel,
                as: "curriculumSubjectTermMapping",
                attributes: ["curriculumSubjectTermMappingId", "curriculumId", "term", "subjectId"],
                required: false,
            },
        ],
        transaction: tx,
    });
}

export async function getRoomsForAssignmentLookup(roomIds, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    const rows = await scoped(model.classRoomModel).findAll({
        where: { classRoomSectionId: { [Op.in]: roomIds } },
        attributes: [
            "classRoomSectionId",
            "roomNumber",
            "capacity",
            "examCapacity",
            "examCapacityColumns",
        ],
        transaction: tx,
    });
    const map = new Map();
    for (const r of rows) {
        map.set(r.classRoomSectionId, r.get({ plain: true }));
    }
    return map;
}

export async function getAlreadyAssignedRoomCapacity(examScheduleId, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    const result = await model.examScheduleRoomCapacityModel.sum("capacity", {
        where: { examScheduleId },
        transaction: tx,
    });
    return result || 0;
}

export async function getOccupiedRoomSlotCapacity(classRoomSectionId, examDate, examinationSessionSlotId, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    const where = {
        classRoomSectionId,
    };
    const scheduleWhere = {
        examDate,
    };
    if (examinationSessionSlotId != null) {
        scheduleWhere.examinationSessionSlotId = examinationSessionSlotId;
    }
    const result = await model.examScheduleRoomCapacityModel.sum("capacity", {
        where,
        include: [
            {
                model: model.examScheduleModel,
                as: "examSchedule",
                attributes: [],
                where: scheduleWhere,
                required: true,
            },
        ],
        transaction: tx,
    });
    return result || 0;
}

export async function bulkCreateRoomAssignments(assignments, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    return await model.examScheduleRoomCapacityModel.bulkCreate(assignments, {
        transaction: tx,
    });
}

export async function getRoomsByExamScheduleId(examScheduleId, options = {}) {
    const tx = options?.transaction || (options && options.commit ? options : undefined);
    return await model.examScheduleRoomCapacityModel.findAll({
        where: { examScheduleId },
        include: [
            {
                model: model.classRoomModel,
                as: "classRoom",
            },
        ],
        order: [["orderKey", "ASC"]],
        transaction: tx,
    });
}
