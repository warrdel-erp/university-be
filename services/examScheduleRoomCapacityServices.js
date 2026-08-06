import sequelize from "../database/sequelizeConfig.js";
import * as examRoomCapacityRepository from "../repository/examScheduleRoomCapacityRepository.js";
import * as examScheduleServices from "./examScheduleServices.js";
import { z } from "zod";
import { getTimeSlotRange, minutesToTime } from "../utility/timeSlot.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getExamSlot = (examDate, examTime, duration, examinationSessionSlot) => {
    const resolvedStartTime = examinationSessionSlot?.startTime || examTime;
    const resolvedDuration = examinationSessionSlot?.durationMinutes ?? duration;
    const range = getTimeSlotRange({
        startTime: resolvedStartTime,
        endTime: examinationSessionSlot?.endTime,
        duration: resolvedDuration,
    });

    if (!range) {
        throw new Error("Invalid exam slot time");
    }

    return {
        day: DAYS[new Date(`${examDate}T00:00:00`).getDay()],
        startTime: minutesToTime(range.startMinutes),
        endTime: minutesToTime(range.endMinutes),
        startMinutes: range.startMinutes,
        endMinutes: range.endMinutes,
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

    // Fetch Room Details
    const roomLookup = await examRoomCapacityRepository.getRoomsForAllocationLookup([...uniqueRoomIds]);
    if (roomLookup.size !== uniqueRoomIds.size) {
        throw new Error("One or more class rooms not found");
    }

    const assignments = [];

    for (const roomId of orderedRoomIds) {
        const room = roomLookup.get(roomId);
        const resolvedExamCapacity = room.examCapacity ?? room.capacity;
        const resolvedExamColumns = room.examCapacityColumns ?? 1;

        if (!resolvedExamCapacity || resolvedExamCapacity <= 0) {
            throw new Error(`Room ${room.roomNumber} has invalid capacity`);
        }

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

export async function getExamScheduleRooms(examScheduleId) {
    const examSchedule = await examScheduleServices.getExamScheduleExists(examScheduleId);
    if (!examSchedule) {
        throw new Error("Exam schedule not found");
    }

    const rows = await examRoomCapacityRepository.getRoomsByExamScheduleId(examScheduleId);
    if (!rows.length) {
        throw new Error("No rooms assigned to this exam schedule");
    }

    return rows.map((plain) => {
      return {
        examScheduleRoomCapacityId: plain.examScheduleRoomCapacityId,
        examScheduleId: plain.examScheduleId,
        classRoomSectionId: plain.classRoomSectionId,
        capacity: plain.capacity,
        columns: plain.columns,
        orderKey: plain.orderKey,
        classRoom: plain.classRoom ?? null,
      };
    });
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

export async function getAvailableRoomsForExamSchedule(examScheduleId) {
    const examSchedule = await examRoomCapacityRepository.getExamScheduleSlot(examScheduleId);
    if (!examSchedule) throw new Error("Exam schedule not found");

    const slot = getExamSlot(
        examSchedule.examDate,
        examSchedule.examTime,
        examSchedule.duration,
        examSchedule.examinationSessionSlot,
    );

    const { examDate, day, startTime, endTime, startMinutes, endMinutes } = {
        examDate: examSchedule.examDate,
        ...slot,
    };

    const [classBusyRoomIds, assignedRoomIds, overlappingExamRoomIds] = await Promise.all([
        examRoomCapacityRepository.findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate),
        examRoomCapacityRepository.findAssignedRoomIdsForExam(examScheduleId),
        examRoomCapacityRepository.findOverlappingExamBusyRoomIds(examDate, examScheduleId, startMinutes, endMinutes),
    ]);

    const busyRoomIds = [...new Set([...classBusyRoomIds, ...assignedRoomIds, ...overlappingExamRoomIds])];
    
    // Retrieve all rooms (including busy ones) and mark conflict flag
    const allRooms = await examRoomCapacityRepository.findAllRoomsForExamSlot();
    const roomsWithConflict = allRooms.map((room) => ({
        ...room,
        conflict: busyRoomIds.includes(room.classRoomSectionId),
    }));

    return {
        examScheduleId: examSchedule.examScheduleId,
        examDate: examSchedule.examDate,
        examTime: examSchedule.examTime,
        duration: examSchedule.duration,
        examinationSessionSlotId: examSchedule.examinationSessionSlotId,
        examinationSessionSlot: examSchedule.examinationSessionSlot,
        slotStartTime: startTime,
        slotEndTime: endTime,
        day,
        rooms: roomsWithConflict,
    };
}
