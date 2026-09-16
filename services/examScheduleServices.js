import * as examScheduleRepository from '../repository/examScheduleRepository.js';
import * as examRoomCapacityRepository from '../repository/examScheduleRoomCapacityRepository.js';
import sequelize from "../database/sequelizeConfig.js";
import {
    buildStudentGroupFromSchedule,
    lookupStudentCount,
} from "../utility/studentCount.js";
import {
    getStudentCountMapByGroups,
    countStudentsForTermCohort,
    findStudentsForExamGroup,
} from "./studentCountServices.js";

function firstId(value) {
    if (value == null) return null;
    if (Array.isArray(value)) {
        return value[0] != null ? Number(value[0]) : null;
    }
    return Number(value);
}

export async function getExamSchedules(filters) {
    const result = await examScheduleRepository.getExamSchedules(filters);
    if (!result.length) return result;

    const studentGroups = [];
    for (const schedule of result) {
        studentGroups.push(buildStudentGroupFromSchedule(schedule));
    }

    const countMap = await getStudentCountMapByGroups(studentGroups);

    for (let i = 0; i < result.length; i++) {
        result[i].setDataValue(
            "studentCount",
            lookupStudentCount(countMap, studentGroups[i]),
        );
    }

    return result;
}

export async function getExamScheduleExists(examScheduleId) {
    return await examScheduleRepository.getExamScheduleExists(examScheduleId);
}

export async function getExamScheduleById(examScheduleId) {
    const result = await examScheduleRepository.getExamScheduleById(examScheduleId);
    if (!result) return result;

    const group = buildStudentGroupFromSchedule(result);
    result.setDataValue(
        "studentCount",
        await countStudentsForTermCohort(group),
    );
    return result;
}

function getStudentDisplayName(student) {
    return `${student.firstName || ""} ${student.middleName || ""} ${student.lastName || ""}`.trim().toLowerCase();
}

function orderStudentsByStrategy(students, strategy) {
    if (strategy === "ascending") {
        return [...students].sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)));
    }
    if (strategy === "descending") {
        return [...students].sort((a, b) => getStudentDisplayName(b).localeCompare(getStudentDisplayName(a)));
    }
    return [...students].sort(() => Math.random() - 0.5);
}

function sortRoomCapacitiesByAllocationOrder(roomCapacities) {
    const normalizedOrderKeys = roomCapacities.map((room) => Number(room.orderKey));
    const hasInvalidOrderKey = normalizedOrderKeys.some((orderKey) => !Number.isInteger(orderKey) || orderKey <= 0);
    if (hasInvalidOrderKey) {
        throw new Error("Invalid room allocation order. Please assign rooms with sequential order keys before allocating seats.");
    }

    const uniqueOrderKeys = [...new Set(normalizedOrderKeys)].sort((a, b) => a - b);
    if (uniqueOrderKeys.length !== roomCapacities.length) {
        throw new Error("Invalid room allocation order. Order keys must be unique for all assigned rooms.");
    }

    const isSequential = uniqueOrderKeys.every((orderKey, index) => orderKey === index + 1);
    if (!isSequential) {
        throw new Error(`Invalid room allocation order. For ${roomCapacities.length} rooms, order keys must be 1 to ${roomCapacities.length} without gaps.`);
    }

    return [...roomCapacities].sort((a, b) => a.orderKey - b.orderKey);
}

export async function allocateSeatsByStrategy(examScheduleId, userId, strategy = "random", options = {}) {
    const transaction = options.transaction || await sequelize.transaction();
    const isLocalTransaction = !options.transaction;
    try {
        const schedule = await examScheduleRepository.getExamScheduleById(examScheduleId, { transaction });
        if (!schedule) {
            throw new Error("Exam schedule not found");
        }

        const cohort = buildStudentGroupFromSchedule(schedule);

        // 1. Get students — batch + term → classSectionTerm when CBTM present
        const students = await findStudentsForExamGroup(
            cohort.sessionId,
            cohort.courseId,
            cohort.term,
            cohort.academicYearId,
            {
                batchYear: cohort.batchYear,
                yearNumber: cohort.yearNumber,
                curriculumBatchTermMappingId: cohort.curriculumBatchTermMappingId,
                transaction,
            },
        );
        if (students.length === 0) {
            throw new Error("No students found for this schedule");
        }

        // 2. Get room capacities directly using transaction so newly assigned rooms are visible
        const roomCapacities = await examRoomCapacityRepository.getRoomsByExamScheduleId(examScheduleId, transaction);
        if (!roomCapacities.length) {
            throw new Error("No rooms assigned to this exam schedule");
        }

        // Room allocation must strictly follow orderKey: 1 first, 2 second, then onward.
        const orderedRoomCapacities = sortRoomCapacitiesByAllocationOrder(roomCapacities);

        const totalCapacity = orderedRoomCapacities.reduce((sum, rc) => sum + rc.capacity, 0);
        if (totalCapacity < students.length) {
            throw new Error(`Insufficient capacity. Total capacity: ${totalCapacity}, Students: ${students.length}`);
        }

        // 3. Prepare seat pool
        let seatPool = [];
        orderedRoomCapacities.forEach(rc => {
            const cols = rc.columns;
            for (let i = 0; i < rc.capacity; i++) {
                seatPool.push({
                    examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
                    row: Math.floor(i / cols) + 1,
                    column: (i % cols) + 1
                });
            }
        });

        // 4. Order students by allocation strategy
        const orderedStudents = orderStudentsByStrategy(students, strategy);

        // 5. Clear existing allocations for these rooms
        const rcIds = orderedRoomCapacities.map(rc => rc.examScheduleRoomCapacityId);
        await examScheduleRepository.clearExistingAllocations(rcIds, transaction);

        // 6. Allocate
        const allocations = orderedStudents.map((student, index) => ({
            examScheduleRoomCapacityId: seatPool[index].examScheduleRoomCapacityId,
            studentId: student.studentId,
            row: seatPool[index].row,
            column: seatPool[index].column,
            createdBy: userId,
            updatedBy: userId
        }));

        const result = await examScheduleRepository.allocateSeats(allocations, transaction);

        if (isLocalTransaction) {
            await transaction.commit();
        }
        return {
            allocatedCount: result.length,
            totalStudents: orderedStudents.length,
            totalCapacity
        };
    } catch (error) {
        if (isLocalTransaction) {
            await transaction.rollback();
        }
        console.error(`Error in allocateSeatsByStrategy service (${strategy}):`, error);
        throw error;
    }
}

export async function allocateSeatsRandomly(examScheduleId, userId) {
    return allocateSeatsByStrategy(examScheduleId, userId, "random");
}

export async function allocateSeatsAscending(examScheduleId, userId) {
    return allocateSeatsByStrategy(examScheduleId, userId, "ascending");
}

export async function allocateSeatsDescending(examScheduleId, userId) {
    return allocateSeatsByStrategy(examScheduleId, userId, "descending");
}

export async function getExamScheduleStudents(filters) {
    const {
        page = 1,
        limit = 10,
        search,
        courseId,
        sessionId,
        term,
        subjectId,
        examScheduleId,
    } = filters;

    let resolvedExamScheduleId = firstId(examScheduleId);
    if (!resolvedExamScheduleId && subjectId) {
        resolvedExamScheduleId = await examScheduleRepository.getExamScheduleIdBySubject(
            firstId(subjectId),
            firstId(sessionId),
        );
    }

    let resolvedCourseId = firstId(courseId);
    let resolvedSessionId = firstId(sessionId);
    let resolvedTerm = firstId(term);
    let resolvedAcademicYearId = null;
    let batchYear = null;
    let yearNumber = null;
    let curriculumBatchTermMappingId = null;

    if (resolvedExamScheduleId) {
        const schedule = await examScheduleRepository.getExamScheduleById(resolvedExamScheduleId);
        const cohort = buildStudentGroupFromSchedule(schedule);
        resolvedCourseId = resolvedCourseId || cohort.courseId;
        resolvedSessionId = resolvedSessionId || cohort.sessionId;
        resolvedTerm = resolvedTerm || cohort.term;
        resolvedAcademicYearId = cohort.academicYearId;
        batchYear = cohort.batchYear;
        yearNumber = cohort.yearNumber;
        curriculumBatchTermMappingId = cohort.curriculumBatchTermMappingId;
    }

    if (
        resolvedSessionId == null ||
        resolvedCourseId == null ||
        resolvedTerm == null ||
        resolvedAcademicYearId == null
    ) {
        return {
            result: [],
            totalCount: 0,
            page: Number(page),
            limit: Number(limit),
            totalPages: 0,
        };
    }

    const { rows, totalCount } = await findStudentsForExamGroup(
        resolvedSessionId,
        resolvedCourseId,
        resolvedTerm,
        resolvedAcademicYearId,
        { page, limit, search, batchYear, yearNumber, curriculumBatchTermMappingId },
    );
    const result = {
        result: rows,
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)) || 0,
    };

    const seatMap = new Map();
    if (resolvedExamScheduleId) {
        const seats = await examScheduleRepository.getStudentSeatAllocationsBySchedule(resolvedExamScheduleId);
        for (const seat of seats) {
            const rowVal = seat.row || 0;
            const colVal = seat.column || 0;
            const rowChar = rowVal ? String.fromCharCode(64 + rowVal) : "";
            const seatNumber = rowChar ? `${rowChar}${colVal}` : "";
            seatMap.set(seat.studentId, {
                roomAllocatedSeatNumber: seatNumber,
                roomName: seat.roomCapacity?.classRoom?.roomNumber || null,
            });
        }
    }

    const mapped = [];
    for (const student of result.result) {
        const plain = student.get ? student.get({ plain: true }) : student;
        const allocation = seatMap.get(plain.studentId);
        mapped.push({
            studentId: plain.studentId,
            scholarNumber: plain.scholarNumber,
            enrollNumber: plain.enrollNumber,
            firstName: plain.firstName,
            middleName: plain.middleName,
            lastName: plain.lastName,
            fatherName: plain.fatherName,
            course: plain.course || null,
            roomAllocatedSeatNumber: allocation ? allocation.roomAllocatedSeatNumber : null,
            roomName: allocation ? allocation.roomName : null,
        });
    }
    result.result = mapped;

    return result;
}
