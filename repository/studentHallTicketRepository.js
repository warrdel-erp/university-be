import crypto from "crypto";
import { Op, fn, col } from "sequelize";
import * as model from "../models/index.js";
import sequelize from '../database/sequelizeConfig.js';
import { buildScope, scoped } from "../utility/scoped.js";
import { studentClassSectionTermWithSectionInclude } from "../utility/classSectionIncludes.js";


export async function findExaminationSessionById(examinationSessionId, transaction) {
    return scoped(model.examinationSessionModel).findByPk(examinationSessionId, {
        transaction,
        include: [
            {
                model: model.examSetupTypeModel,
                as: "assessmentType",
                attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
                where: buildScope(model.examSetupTypeModel),
                required: false,
            },
            {
                model: model.acedmicYearModel,
                as: "academicYear",
                attributes: ["academicYearId", "yearTitle"],
            },
            {
                model: model.examinationSessionTermModel,
                as: "examinationSessionTerms",
                include: [
                    {
                        model: model.classSectionTermModel,
                        as: "classSectionTerm",
                    },
                ],
            },
        ],
    });
}

export async function getSchedulesByExaminationSessionId(examinationSessionId, transaction) {
    return scoped(model.examScheduleModel).findAll({
        transaction,
        where: { examinationSessionId },
        attributes: ["examScheduleId", "examDate", "examTime"],
    });
}

export async function getSchedulesWithSubjectsForExaminationSession(examinationSessionId, filters = {}, transaction = null) {
    const { courseId, sessionId, term } = filters;

    return scoped(model.examScheduleModel).findAll({
        transaction,
        where: {
            examinationSessionId,
            ...(term != null && { term }),
            ...(sessionId != null && { sessionId }),
        },
        attributes: ["examScheduleId", "subjectId", "term", "examDate", "examTime", "duration", "type", "examinationSessionSlotId"],
        include: [
            {
                model: model.subjectModel,
                as: "subjectSchedule",
                required: courseId != null,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy"] },
                where: {
                    ...buildScope(model.subjectModel),
                    ...(courseId != null && { courseId }),
                },
            },
            {
                model: model.examinationSessionSlotModel,
                as: "examinationSessionSlot",
                required: false,
                attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
            },
        ],
        order: [
            ["examDate", "ASC"],
            ["examTime", "ASC"],
            ["examScheduleId", "ASC"],
        ],
    });
}

export async function getStudentsByExaminationSessionId(examinationSessionId, filters = {}, transaction = null) {
    if (filters && (typeof filters.commit === "function" || filters.finished || filters.LOCK)) {
        transaction = filters;
        filters = {};
    }

    const studentWhere = {
        ...buildScope(model.studentModel),
    };
    if (filters.courseId) {
        studentWhere.courseId = Array.isArray(filters.courseId) ? { [Op.in]: filters.courseId } : Number(filters.courseId);
    }
    if (filters.sessionId) {
        studentWhere.sessionId = Array.isArray(filters.sessionId) ? { [Op.in]: filters.sessionId } : Number(filters.sessionId);
    }
    if (filters.search?.trim()) {
        const search = `%${filters.search.trim()}%`;
        studentWhere[Op.or] = [
            { enrollNumber: { [Op.like]: search } },
            { firstName: { [Op.like]: search } },
            { middleName: { [Op.like]: search } },
            { lastName: { [Op.like]: search } },
        ];
    }

    const classSectionTermWhere = {};
    if (filters.term != null) {
        classSectionTermWhere.term = Array.isArray(filters.term) ? { [Op.in]: filters.term } : filters.term;
    }

    const isPaginated = filters?.page != null || filters?.limit != null;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    const offset = (page - 1) * limit;

    const presentStatuses = ["Present", "Medical Leave", "Duty Leave", "Sports Leave", "NCC Leave", "Approved Leave"];

    const getStudentIncludes = () => [
        {
            model: model.courseModel,
            as: "course",
            required: false,
            attributes: ["courseId", "courseName"]
        },
        {
            model: model.sessionModel,
            as: "studentSession",
            required: false,
            attributes: ["sessionId", "sessionName"]
        },
        {
            model: model.attendanceModel,
            as: "attendances",
            required: false,
            attributes: ["attendanceId", "attendanceStatus", "classSectionTermId"],
            where: {
                attendanceStatus: { [Op.ne]: "Holiday" },
                ...buildScope(model.attendanceModel),
            }
        },
        {
            model: model.assessmentPlanModel,
            as: "assessmentPlans",
            required: false,
            attributes: ["assessmentPlanId", "courseId", "sessionId", "academicYearId", "term", "regulationId"],
            include: [
                {
                    model: model.assessmentPlanComponentModel,
                    as: "components",
                    required: false,
                    attributes: ["assessmentPlanComponentId", "examSetupTypeId"]
                },
                {
                    model: model.academicRegulationModel,
                    as: "academicRegulation",
                    required: false,
                    attributes: ["academicRegulationId", "minimumAttendance"]
                }
            ]
        },
        {
            model: model.studentHallTicketModel,
            as: "hallTickets",
            required: false,
            attributes: ["id", "examinationSessionId", "isPublished", "isBlocked", "publishedAt", "blockedAt"],
            where: {
                examinationSessionId: Number(examinationSessionId)
            }
        }
    ];

    const activeEstQuery = {
        where: {
            examinationSessionId: Number(examinationSessionId),
        },
        attributes: [
            "examinationSessionTermId",
            "classSectionTermId",
        ],
        include: [
            {
                model: model.examinationSessionModel,
                as: "examinationSession",
                required: true,
                attributes: ["examinationSessionId", "assessmentTypeId", "academicYearId"]
            },
            {
                model: model.classSectionTermModel,
                as: "classSectionTerm",
                required: true,
                attributes: ["classSectionTermId", "term"],
                where: Object.keys(classSectionTermWhere).length ? classSectionTermWhere : undefined,
                include: [
                    {
                        model: model.classStudentMapperModel,
                        as: "studentTermPlacement",
                        required: true,
                        attributes: ["classStudentMapperId", "studentId", "sessionId"],
                        where: {
                            isPassed: false,
                            ...buildScope(model.classStudentMapperModel),
                        },
                        include: [
                            {
                                model: model.studentModel,
                                as: "studentMapped",
                                required: true,
                                attributes: [
                                    "studentId",
                                    "enrollNumber",
                                    "firstName",
                                    "middleName",
                                    "lastName",
                                    "courseId",
                                    "sessionId"
                                ],
                                where: Object.keys(studentWhere).length ? studentWhere : undefined,
                                include: getStudentIncludes(),
                            }
                        ]
                    }
                ]
            }
        ],
        distinct: true,
        transaction,
    };

    const historyEstQuery = {
        where: {
            examinationSessionId: Number(examinationSessionId),
        },
        attributes: [
            "examinationSessionTermId",
            "classSectionTermId",
        ],
        include: [
            {
                model: model.examinationSessionModel,
                as: "examinationSession",
                required: true,
                attributes: ["examinationSessionId", "assessmentTypeId", "academicYearId"]
            },
            {
                model: model.classSectionTermModel,
                as: "classSectionTerm",
                required: true,
                attributes: ["classSectionTermId", "term"],
                where: Object.keys(classSectionTermWhere).length ? classSectionTermWhere : undefined,
                include: [
                    {
                        model: model.studentClassSectionsHistoryModel,
                        as: "sectionHistoryTerms",
                        required: true,
                        attributes: ["id", "studentId", "classSectionTermId"],
                        where: buildScope(model.studentClassSectionsHistoryModel),
                        include: [
                            {
                                model: model.studentModel,
                                as: "student",
                                required: true,
                                attributes: [
                                    "studentId",
                                    "enrollNumber",
                                    "firstName",
                                    "middleName",
                                    "lastName",
                                    "courseId",
                                    "sessionId"
                                ],
                                where: Object.keys(studentWhere).length ? studentWhere : undefined,
                                include: getStudentIncludes(),
                            }
                        ]
                    }
                ]
            }
        ],
        distinct: true,
        transaction,
    };

    const [activeEstList, historyEstList] = await Promise.all([
        scoped(model.examinationSessionTermModel).findAll(activeEstQuery),
        scoped(model.examinationSessionTermModel).findAll(historyEstQuery),
    ]);

    const studentRows = [];
    const seenStudentIds = new Set();

    const processStudent = (st, cst, est, mapperSessionId) => {
        const course = st.course;
        const session = st.studentSession;
        const attendances = (st.attendances || []).filter(a => a.classSectionTermId === cst.classSectionTermId);

        const totalClasses = attendances.length;
        const presentClasses = attendances.filter(a => presentStatuses.includes(a.attendanceStatus)).length;
        const attendancePercentage = totalClasses > 0 ? Number(((presentClasses / totalClasses) * 100).toFixed(2)) : 0;

        const plans = st.assessmentPlans || [];
        let minimumAttendance = null;
        for (const plan of plans) {
            if (plan.academicRegulation?.minimumAttendance != null) {
                minimumAttendance = Number(plan.academicRegulation.minimumAttendance);
                break;
            }
        }

        let eligibilityStatus = "Ready";
        let eligibilityReason = null;
        if (totalClasses === 0) {
            eligibilityStatus = "Review";
            eligibilityReason = "Attendance data unavailable";
        } else if (minimumAttendance !== null && attendancePercentage < minimumAttendance) {
            eligibilityStatus = "Blocked";
            eligibilityReason = "Attendance below minimum requirement";
        }

        const hallTickets = st.hallTickets || [];
        const hallTicket = hallTickets[0] || null;

        const isGenerated = !!hallTicket;
        const isPublished = hallTicket?.isPublished ?? false;
        const isBlocked = hallTicket?.isBlocked ?? false;

        let hallTicketStatus = "Not Generated";
        if (isBlocked) hallTicketStatus = "Blocked";
        else if (isPublished) hallTicketStatus = "Published";
        else if (isGenerated) hallTicketStatus = "Generated";

        if (filters.status) {
            const targetStatus = String(filters.status).trim().toLowerCase();
            const eligMatch = eligibilityStatus.toLowerCase() === targetStatus;
            const hallMatch = hallTicketStatus.toLowerCase() === targetStatus;
            if (!eligMatch && !hallMatch) return;
        }

        studentRows.push({
            studentId: st.studentId,
            enrollmentNumber: st.enrollNumber ?? null,
            firstName: st.firstName ?? null,
            middleName: st.middleName ?? null,
            lastName: st.lastName ?? null,
            courseId: st.courseId ?? course?.courseId ?? null,
            courseName: course?.courseName ?? null,
            sessionId: mapperSessionId ?? st.sessionId ?? session?.sessionId ?? null,
            sessionName: session?.sessionName ?? null,
            term: cst.term,
            examinationSessionTermId: est.examinationSessionTermId,
            classSectionTermId: cst.classSectionTermId,
            totalClasses,
            presentClasses,
            attendancePercentage,
            minimumAttendance,
            hallTicketId: hallTicket?.id ?? null,
            isGenerated,
            isPublished,
            isBlocked,
            hallTicketStatus,
            eligibilityStatus,
            eligibilityReason,
        });
    };

    for (const est of activeEstList) {
        const cst = est.classSectionTerm;
        if (!cst) continue;
        const mappers = cst.studentTermPlacement || [];
        for (const mapper of mappers) {
            const st = mapper.studentMapped;
            if (!st || seenStudentIds.has(st.studentId)) continue;
            seenStudentIds.add(st.studentId);
            processStudent(st, cst, est, mapper.sessionId);
        }
    }

    for (const est of historyEstList) {
        const cst = est.classSectionTerm;
        if (!cst) continue;
        const histories = cst.sectionHistoryTerms || [];
        for (const history of histories) {
            const st = history.student;
            if (!st || seenStudentIds.has(st.studentId)) continue;
            seenStudentIds.add(st.studentId);
            processStudent(st, cst, est, null);
        }
    }

    if (!isPaginated) {
        return studentRows;
    }

    const total = studentRows.length;
    const paginatedRows = studentRows.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
        rows: paginatedRows,
        total,
        page,
        limit,
        totalPages,
    };
}

export async function getEligibleStudentsForExaminationSession(examinationSessionId, transaction) {
    return getStudentsByExaminationSessionId(
        examinationSessionId,
        { status: "Ready" },
        transaction
    );
}

export async function getHallTicketEligibilityOverview(examinationSessionId, transaction = null) {
    const students = await getStudentsByExaminationSessionId(examinationSessionId, {}, transaction);
    const studentList = Array.isArray(students) ? students : (students?.rows || []);

    let ready = 0;
    let blocked = 0;
    let review = 0;

    for (const student of studentList) {
        if (student.eligibilityStatus === "Ready") {
            ready++;
        } else if (student.eligibilityStatus === "Blocked") {
            blocked++;
        } else if (student.eligibilityStatus === "Review") {
            review++;
        }
    }

    return {
        totalStudents: studentList.length,
        ready,
        blocked,
        review,
    };
}

export async function bulkCreateHallTickets(payloads, transaction) {
    return scoped(model.studentHallTicketModel).bulkCreate(payloads, { transaction });
}

export async function getHallTicketById(id, transaction) {
    return scoped(model.studentHallTicketModel).findByPk(id, {
        transaction,
        include: getHallTicketIncludes(),
    });
}

export async function getHallTicketByQr(qr, transaction) {
    return scoped(model.studentHallTicketModel).findOne({
        transaction,
        where: { qr },
        include: getHallTicketIncludes(),
    });
}

export async function getAllHallTickets(filters = {}, transaction, options = {}) {
    const where = {};
    if (filters.examinationSessionId) where.examinationSessionId = filters.examinationSessionId;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.studentId) where.studentId = filters.studentId;

    const query = {
        transaction,
        where,
        include: getHallTicketIncludes(),
        order: [["id", "DESC"]],
    };

    if (options.limit != null) query.limit = options.limit;
    if (options.offset != null) query.offset = options.offset;

    return scoped(model.studentHallTicketModel).findAll(query);
}

export async function countHallTickets(filters = {}, transaction) {
    const where = {};
    if (filters.examinationSessionId) where.examinationSessionId = filters.examinationSessionId;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.studentId) where.studentId = filters.studentId;

    return scoped(model.studentHallTicketModel).count({ where, transaction });
}

export async function countHallTicketsBySessionIds(examinationSessionIds, transaction) {
    if (!examinationSessionIds?.length) {
        return new Map();
    }

    const rows = await scoped(model.studentHallTicketModel).findAll({
        attributes: [
            "examinationSessionId",
            [fn("COUNT", col("student_hall_ticket.id")), "count"],
        ],
        where: {
            examinationSessionId: { [Op.in]: examinationSessionIds },
        },
        group: ["examinationSessionId"],
        raw: true,
        transaction,
    });

    return new Map(rows.map((row) => [row.examinationSessionId, Number(row.count)]));
}

function getHallTicketIncludes() {
    return [
        {
            model: model.instituteModel,
            as: "institute",
            attributes: ["instituteId", "instituteName"],
        },
        {
            model: model.universityModel,
            as: "university",
            attributes: ["universityId", "universityName"],
        },
        {
            model: model.acedmicYearModel,
            as: "academicYear",
            attributes: ["academicYearId", "yearTitle"],
        },
        {
            model: model.studentModel,
            as: "student",
            attributes: ["studentId", "firstName", "middleName", "lastName", "scholarNumber", "enrollNumber", "courseId", "sessionId"],
            where: buildScope(model.studentModel),
            required: false,
            include: [
                studentClassSectionTermWithSectionInclude({
                    sectionAttributes: ["classSectionsId", "year", "section", "sessionId"],
                    includeSectionTerms: false,
                }),
            ],
        },
        {
            model: model.examinationSessionModel,
            as: "examinationSession",
            attributes: ["examinationSessionId", "sessionName", "examStartDate", "examEndDate", "assessmentTypeId", "academicYearId"],
            where: buildScope(model.examinationSessionModel),
            required: false,
            include: [
                {
                    model: model.examSetupTypeModel,
                    as: "assessmentType",
                    attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
                },
                {
                    model: model.acedmicYearModel,
                    as: "academicYear",
                    attributes: ["academicYearId", "yearTitle"],
                },
            ],
        },
    ];
}

export async function getMappedExamScheduleIds(studentId, examScheduleIds, transaction) {
    if (!examScheduleIds || examScheduleIds.length === 0) {
        return [];
    }
    const student = await scoped(model.studentModel).findOne({
        where: { studentId },
        attributes: ['studentId'],
        transaction,
    });
    if (!student) {
        return [];
    }
    const answerSheetQrs = await scoped(model.answerSheetQrModel).findAll({
        where: {
            studentId,
            examScheduleId: examScheduleIds,
        },
        attributes: ["examScheduleId"],
        transaction,
    });
    return answerSheetQrs.map((a) => a.examScheduleId);
}

export async function blockHallTicket(id, transaction) {
    const ticket = await scoped(model.studentHallTicketModel).findByPk(id, { transaction });
    if (!ticket) return null;
    await ticket.update(
        {
            isBlocked: true,
            blockedAt: new Date(),
        },
        { transaction }
    );
    return ticket;
}

export async function publishHallTickets(examinationSessionId, studentIds = null, transaction = null) {
    const whereClause = {
        examinationSessionId,
        isBlocked: false,
    };
    if (studentIds && studentIds.length > 0) {
        whereClause.studentId = {
            [Op.in]: studentIds
        };
    }

    const [updatedCount] = await scoped(model.studentHallTicketModel).update(
        {
            isPublished: true,
            publishedAt: new Date(),
        },
        {
            where: whereClause,
            transaction,
        }
    );
    return updatedCount;
}

export async function getStudentRoomSeatingDetails(studentId, examScheduleIds, transaction) {
    if (!examScheduleIds || !examScheduleIds.length) return new Map();

    const seats = await scoped(model.studentExamSeatModel).findAll({
        where: {
            studentId,
        },
        include: [
            {
                model: model.examScheduleRoomCapacityModel,
                as: "roomCapacity",
                where: {
                    examScheduleId: { [Op.in]: examScheduleIds },
                },
                include: [
                    {
                        model: model.classRoomModel,
                        as: "classRoom",
                        attributes: ["classRoomSectionId", "roomNumber"],
                    },
                ],
            },
        ],
        transaction,
    });

    const seatMap = new Map();
    for (const seat of seats) {
        const roomCap = seat.roomCapacity;
        if (!roomCap) continue;
        const examScheduleId = roomCap.examScheduleId;
        seatMap.set(examScheduleId, {
            row: seat.row,
            column: seat.column,
            roomName: roomCap.classRoom?.roomNumber ?? null,
            roomNumber: roomCap.classRoom?.roomNumber ?? null,
            block: null,
        });
    }
    return seatMap;
}

export async function generateOrRegenerateStudentHallTicket({ examinationSessionId, academicYearId, studentId }, transaction) {
    let ticket = await scoped(model.studentHallTicketModel).findOne({
        where: { examinationSessionId, studentId },
        transaction,
    });

    if (ticket) {
        await ticket.update(
            {
                isBlocked: false,
                blockedAt: null,
                updatedAt: new Date(),
            },
            { transaction }
        );
    } else {
        ticket = await scoped(model.studentHallTicketModel).create(
            {
                examinationSessionId,
                academicYearId,
                studentId,
                qr: crypto.randomUUID(),
                isBlocked: false,
                isPublished: false,
            },
            { transaction }
        );
    }

    return ticket;
}
