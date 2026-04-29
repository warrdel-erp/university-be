import * as examRoomCapacityRepository from "../repository/examScheduleRoomCapacityRepository.js";
import { z } from "zod";
import * as examScheduleServices from "./examScheduleServices.js";

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

    return await examRoomCapacityRepository.bulkAddExamRoomCapacity(assignments);
}



export async function updateExamRoomCapacity(examScheduleRoomCapacityId, data, userId) {
    const validatedData = updateExamRoomCapacitySchema.parse({ ...data, examScheduleRoomCapacityId });
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examScheduleRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }
    // Check if assigned to any schedule? 
    // In the new implementation, it IS an assignment to a schedule.
    
    validatedData.updatedBy = userId;
    return await examRoomCapacityRepository.updateExamRoomCapacity(examScheduleRoomCapacityId, validatedData);
}

export async function deleteExamRoomCapacity(examScheduleRoomCapacityId) {
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examScheduleRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }
    return await examRoomCapacityRepository.deleteExamRoomCapacity(examScheduleRoomCapacityId);
}
