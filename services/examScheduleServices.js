import * as examScheduleRepository from '../repository/examScheduleRepository.js';
import sequelize from "../database/sequelizeConfig.js";

export async function getExamSchedules(universityId, acedmicYearId, instituteId, filters) {
    const result = await examScheduleRepository.getExamSchedules(universityId, acedmicYearId, instituteId, filters);

    if (result && result.length > 0) {
        const sessions = [...new Set(result.map(r => r.sessionId))];
        const courses = [...new Set(result.map(r => r.examSetupTypeTerm?.courseId).filter(Boolean))];
        const terms = [...new Set(result.map(r => r.examSetupTypeTerm?.term).filter(Boolean))];
        const acedmicYears = [...new Set(result.map(r => r.acedmicYearId))];

        if (sessions.length > 0 && courses.length > 0 && terms.length > 0) {
            const counts = await examScheduleRepository.getStudentCountsByGroups(sessions, courses, terms, acedmicYears);

            result.forEach(schedule => {
                const term = schedule.examSetupTypeTerm?.term;
                const courseId = schedule.examSetupTypeTerm?.courseId;
                const sessionId = schedule.sessionId;
                const acedmicYearId = schedule.acedmicYearId;

                const countObj = counts.find(c =>
                    c.sessionId === sessionId &&
                    c.term === term &&
                    c.courseId === courseId &&
                    c.acedmicYearId === acedmicYearId
                );
                schedule.setDataValue('studentCount', countObj ? parseInt(countObj.studentCount) : 0);
            });
        } else {
            result.forEach(schedule => {
                schedule.setDataValue('studentCount', 0);
            });
        }
    }

    return result;
}

export async function getExamScheduleById(examScheduleId) {
    const result = await examScheduleRepository.getExamScheduleById(examScheduleId);

    if (result) {
        const term = result.examSetupTypeTerm?.term;
        const courseId = result.examSetupTypeTerm?.courseId;
        const sessionId = result.sessionId;
        const acedmicYearId = result.acedmicYearId;

        if (term && courseId && sessionId) {
            const count = await examScheduleRepository.getStudentCountByGroup(sessionId, courseId, term, acedmicYearId);
            result.setDataValue('studentCount', count);
        } else {
            result.setDataValue('studentCount', 0);
        }
    }

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

async function allocateSeatsByStrategy(examScheduleId, userId, strategy = "random") {
    const transaction = await sequelize.transaction();
    try {
        const schedule = await examScheduleRepository.getExamScheduleById(examScheduleId);
        if (!schedule) {
            throw new Error("Exam schedule not found");
        }

        const term = schedule.examSetupTypeTerm?.term;
        const courseId = schedule.examSetupTypeTerm?.courseId;
        const sessionId = schedule.sessionId;
        const acedmicYearId = schedule.acedmicYearId;

        if (!term || !courseId || !sessionId) {
            throw new Error("Incomplete schedule details for seat allocation");
        }

        // 1. Get students
        const students = await examScheduleRepository.getStudentsForSchedule(sessionId, courseId, term, acedmicYearId);
        if (students.length === 0) {
            throw new Error("No students found for this schedule");
        }

        // 2. Get room capacities
        const roomCapacities = schedule.roomCapacities;
        if (!roomCapacities || roomCapacities.length === 0) {
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

        await transaction.commit();
        return {
            allocatedCount: result.length,
            totalStudents: orderedStudents.length,
            totalCapacity
        };
    } catch (error) {
        await transaction.rollback();
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
