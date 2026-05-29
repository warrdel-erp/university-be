import sequelize from "../database/sequelizeConfig.js";
import * as examRoomCapacityRepository from "../repository/examScheduleRoomCapacityRepository.js";
import * as examScheduleServices from "./examScheduleServices.js";
import { z } from "zod";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toMinutes = (time) => {
    const [h = 0, m = 0] = String(time).split(":").map(Number);
    return h * 60 + m;
};

const toTime = (mins) => {
    const n = ((mins % 1440) + 1440) % 1440;
    return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}:00`;
};

const getExamSlot = (examDate, examTime, duration) => {
    const startMinutes = toMinutes(examTime);
    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new Error("Invalid exam duration");
    }
    const endMinutes = startMinutes + durationMinutes;
    return {
        day: DAYS[new Date(`${examDate}T00:00:00`).getDay()],
        startTime: toTime(startMinutes),
        endTime: toTime(endMinutes),
        startMinutes,
        endMinutes,
    };
};

const examRoomCapacitySchema = z.object({
    classRoomSectionIds: z.array(
        z.union([
            z.number(),
            z.object({
                classRoomSectionId: z.number(),
                orderKey: z.number().int().positive().optional()
            })
        ])
    ),
    examScheduleId: z.number()
});

const updateExamRoomCapacitySchema = z.object({
    examScheduleRoomCapacityId: z.number(),
    capacity: z.number().optional(),
    columns: z.number().optional()
});

function normalizeRoomIds(classRoomSectionIds) {
    const uniqueRoomIds = new Set();
    const roomSelections = [];

    for (let index = 0; index < classRoomSectionIds.length; index++) {
        const item = classRoomSectionIds[index];
        const roomId = typeof item === "number" ? item : item.classRoomSectionId;
        const orderKey =
            typeof item === "number" || item.orderKey === undefined || item.orderKey === null
                ? index + 1
                : Number(item.orderKey);

        if (!Number.isFinite(orderKey) || orderKey <= 0) {
            throw new Error("Invalid orderKey. It must be a positive number for each selected room.");
        }

        if (uniqueRoomIds.has(roomId)) {
            continue;
        }

        uniqueRoomIds.add(roomId);
        roomSelections.push({ roomId, orderKey, index });
    }

    const normalizedOrderKeys = [...new Set(roomSelections.map((item) => item.orderKey))].sort((a, b) => a - b);
    if (normalizedOrderKeys.length !== roomSelections.length) {
        throw new Error("Invalid room order. Order keys must be unique and sequential from 1.");
    }

    const hasSequentialOrder = normalizedOrderKeys.every((orderKey, idx) => orderKey === idx + 1);
    if (!hasSequentialOrder) {
        throw new Error(`Invalid room order. For ${roomSelections.length} selected rooms, order keys must be 1 to ${roomSelections.length} without gaps.`);
    }

    roomSelections.sort((a, b) => (a.orderKey - b.orderKey) || (a.index - b.index));
    const orderedRoomIds = roomSelections.map((item) => item.roomId);
    const roomOrderLookup = new Map(roomSelections.map((item) => [item.roomId, item.orderKey]));

    return { uniqueRoomIds, orderedRoomIds, roomOrderLookup };
}

export async function addExamRoomCapacity(data, userId) {
    const validatedData = examRoomCapacitySchema.parse(data);
    const { uniqueRoomIds, orderedRoomIds, roomOrderLookup } = normalizeRoomIds(validatedData.classRoomSectionIds);

    // 1. Fetch Student Count for the Exam
    const exam = await examScheduleServices.getExamScheduleById(validatedData.examScheduleId);
    if (!exam) {
        throw new Error("Exam schedule not found");
    }
    const studentCount = exam.getDataValue('studentCount') || 0;

    // 2. Fetch Room Details
    const roomLookup = await examRoomCapacityRepository.getRoomsForAllocationLookup([...uniqueRoomIds]);
    if (roomLookup.size !== uniqueRoomIds.size) {
        throw new Error("One or more class rooms not found");
    }

    // 3. Validate Capacities and Calculate Total
    let totalCapacity = 0;
    const assignments = [];

    for (const roomId of orderedRoomIds) {
        const room = roomLookup.get(roomId);
        const resolvedExamCapacity = room.examCapacity ?? room.capacity;
        const resolvedExamColumns = room.examCapacityColumns ?? 1;

        if (!resolvedExamCapacity || resolvedExamCapacity <= 0) {
            throw new Error(`Room ${room.roomNumber} has invalid capacity`);
        }
        totalCapacity += resolvedExamCapacity;

        assignments.push({
            classRoomSectionId: room.classRoomSectionId,
            examScheduleId: validatedData.examScheduleId,
            capacity: resolvedExamCapacity,
            columns: resolvedExamColumns,
            orderKey: roomOrderLookup.get(room.classRoomSectionId),
            createdBy: userId,
            updatedBy: userId
        });
    }

    // 4. Final Validation against student count
    if (totalCapacity < studentCount) {
        throw new Error(`Selected rooms have a total capacity of ${totalCapacity}, but ${studentCount} students are enrolled. Please select more or larger rooms.`);
    }

    const transaction = await sequelize.transaction();

    try {
        const result = await examRoomCapacityRepository.bulkAddExamRoomCapacity(assignments, transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}



export async function updateExamRoomCapacity(examScheduleRoomCapacityId, data, userId) {
    const { capacity, columns } = data;
    const updatePayload = {
        examScheduleRoomCapacityId,
        capacity,
        columns
    };
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examScheduleRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }
    // Check if assigned to any schedule? 
    // In the new implementation, it IS an assignment to a schedule.

    updatePayload.updatedBy = userId;

    const transaction = await sequelize.transaction();

    try {
        const result = await examRoomCapacityRepository.updateExamRoomCapacity(
            examScheduleRoomCapacityId,
            updatePayload,
            transaction
        );
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function deleteExamRoomCapacity(examScheduleRoomCapacityId) {
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examScheduleRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }

    const transaction = await sequelize.transaction();

    try {
        const result = await examRoomCapacityRepository.deleteExamRoomCapacity(
            examScheduleRoomCapacityId,
            transaction
        );
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function getAvailableRoomsForExamSchedule(examScheduleId, universityId) {
    const examSchedule = await examRoomCapacityRepository.getExamScheduleSlot(examScheduleId);
    if (!examSchedule) {
        throw new Error("Exam schedule not found");
    }

    const { day, startTime, endTime, startMinutes, endMinutes } = getExamSlot(
        examSchedule.examDate,
        examSchedule.examTime,
        examSchedule.duration
    );

    const busyRoomIds = await examRoomCapacityRepository.collectBusyRoomIdsForExamSlot({
        examScheduleId,
        examDate: examSchedule.examDate,
        day,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
    });

    const availableRooms = await examRoomCapacityRepository.findAvailableRoomsForExamSlot(
        universityId,
        busyRoomIds
    );

    return {
        examScheduleId: examSchedule.examScheduleId,
        examDate: examSchedule.examDate,
        examTime: examSchedule.examTime,
        duration: examSchedule.duration,
        slotStartTime: startTime,
        slotEndTime: endTime,
        day,
        availableRooms,
    };
}
