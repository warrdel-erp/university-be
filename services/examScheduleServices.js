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

export async function allocateSeatsRandomly(examScheduleId, userId) {
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

        const totalCapacity = roomCapacities.reduce((sum, rc) => sum + rc.capacity, 0);
        if (totalCapacity < students.length) {
            throw new Error(`Insufficient capacity. Total capacity: ${totalCapacity}, Students: ${students.length}`);
        }

        // 3. Prepare seat pool
        let seatPool = [];
        roomCapacities.forEach(rc => {
            const cols = rc.columns;
            for (let i = 0; i < rc.capacity; i++) {
                seatPool.push({
                    examScheduleRoomCapacityId: rc.examScheduleRoomCapacityId,
                    row: Math.floor(i / cols) + 1,
                    column: (i % cols) + 1
                });
            }
        });

        // 4. Shuffle students for random allocation
        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

        // 5. Clear existing allocations for these rooms
        const rcIds = roomCapacities.map(rc => rc.examScheduleRoomCapacityId);
        await examScheduleRepository.clearExistingAllocations(rcIds, transaction);

        // 6. Allocate
        const allocations = shuffledStudents.map((student, index) => ({
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
            totalStudents: students.length,
            totalCapacity
        };
    } catch (error) {
        await transaction.rollback();
        console.error("Error in allocateSeatsRandomly service:", error);
        throw error;
    }
}
