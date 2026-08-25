import sequelize from "../database/sequelizeConfig.js";
import * as examRoomCapacityRepository from "../repository/examScheduleRoomCapacityRepository.js";
import * as examScheduleServices from "./examScheduleServices.js";
import * as examinationSessionServices from "./examinationSessionServices.js";
import * as model from "../models/index.js";
import { z } from "zod";
import { getTimeSlotRange, minutesToTime } from "../utility/timeSlot.js";
import { decimalSubtract } from "../utility/decimalMoney.js";

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

    // Normalize room inputs and detect duplicates in payload
    const inputSelections = validatedData.classRoomSectionIds.map((item, idx) => {
        const classRoomSectionId = typeof item === "number" ? item : item.classRoomSectionId;
        const orderKey = (typeof item === "number" || item.orderKey === undefined || item.orderKey === null)
            ? null
            : Number(item.orderKey);
        return { classRoomSectionId, orderKey, originalIndex: idx };
    });

    const inputRoomIds = inputSelections.map(s => s.classRoomSectionId);
    if (new Set(inputRoomIds).size !== inputRoomIds.length) {
        throw new Error("Duplicate room IDs in assignment request");
    }

    const inputOrderKeys = inputSelections.map(s => s.orderKey).filter(k => k !== null);
    if (new Set(inputOrderKeys).size !== inputOrderKeys.length) {
        throw new Error("Duplicate order keys in assignment request");
    }

    // Fetch existing room capacities for the exam schedule
    const existingAssignments = await examRoomCapacityRepository.getRoomsByExamScheduleId(validatedData.examScheduleId);
    const existingMap = new Map(existingAssignments.map(a => [a.classRoomSectionId, a]));

    // Separate self-assigned rooms from new candidate rooms
    const newCandidates = [];
    const finalRoomsMap = new Map();

    for (const ext of existingAssignments) {
        finalRoomsMap.set(ext.classRoomSectionId, ext.orderKey);
    }

    for (const input of inputSelections) {
        if (existingMap.has(input.classRoomSectionId)) {
            // Skip insertion, preserve existing assignment
            continue;
        }
        newCandidates.push(input);
    }

    // Assign order keys to new candidates if they weren't explicitly provided
    let maxOrderKey = finalRoomsMap.size > 0 ? Math.max(...finalRoomsMap.values()) : 0;
    for (const candidate of newCandidates) {
        if (candidate.orderKey === null) {
            maxOrderKey++;
            candidate.orderKey = maxOrderKey;
        }
        finalRoomsMap.set(candidate.classRoomSectionId, candidate.orderKey);
    }

    // Validate final combined sequence of order keys
    const allOrderKeys = Array.from(finalRoomsMap.values()).sort((a, b) => a - b);
    if (new Set(allOrderKeys).size !== allOrderKeys.length) {
        throw new Error("Invalid room order. Duplicate order keys detected in final assignments.");
    }
    const hasSequentialOrder = allOrderKeys.every((orderKey, idx) => orderKey === idx + 1);
    if (!hasSequentialOrder) {
        throw new Error(`Invalid room order. Order keys must be 1 to ${allOrderKeys.length} without gaps.`);
    }

    // If there are no new rooms to insert, return the existing assignments (idempotent success)
    if (newCandidates.length === 0) {
        return [];
    }

    const candidateRoomIds = newCandidates.map(c => c.classRoomSectionId);

    // Fetch Room Details for new candidates
    const roomLookup = await examRoomCapacityRepository.getRoomsForAllocationLookup(candidateRoomIds);
    if (roomLookup.size !== candidateRoomIds.length) {
        throw new Error("One or more class rooms not found");
    }

    const examSchedule = await examRoomCapacityRepository.getExamScheduleSlot(validatedData.examScheduleId);
    if (!examSchedule) throw new Error("Exam schedule not found");
    if (examSchedule.published) {
        throw new Error("Room assignment cannot be changed because the exam schedule is already published.");
    }

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

    const transaction = await sequelize.transaction();

    try {
        const totalStudents = await examRoomCapacityRepository.getEnrolledStudentsCount(
            examSchedule.sessionId,
            examSchedule.subjectSchedule?.courseId,
            examSchedule.term,
            examSchedule.academicYearId,
            transaction
        );

        const alreadyAssignedCapacity = await examRoomCapacityRepository.getAlreadyAssignedCapacity(
            validatedData.examScheduleId,
            transaction
        );

        let remainingStudents = Math.max(0, decimalSubtract(totalStudents, alreadyAssignedCapacity));

        const assignments = [];
        for (const candidate of newCandidates) {
            const roomId = candidate.classRoomSectionId;
            const room = roomLookup.get(roomId);

            const roomMaxCapacity = room.examCapacity ?? room.capacity;
            const resolvedExamColumns = room.examCapacityColumns ?? 1;

            if (!roomMaxCapacity || roomMaxCapacity <= 0) {
                throw new Error(`Room ${room.roomNumber} has invalid capacity`);
            }

            const usedCapacity = await examRoomCapacityRepository.getOccupiedCapacityForRoomSlot(
                roomId,
                examDate,
                examSchedule.examinationSessionSlotId,
                transaction
            );

            const remainingRoomCapacity = Math.max(0, decimalSubtract(roomMaxCapacity, usedCapacity));
            const capacityToSave = Math.min(remainingStudents, remainingRoomCapacity);

            if (remainingRoomCapacity <= 0) {
                throw new Error(`Room ${room.roomNumber} is not available for the selected time slot. Booked capacity: ${usedCapacity}/${roomMaxCapacity}`);
            }

            remainingStudents = Math.max(0, decimalSubtract(remainingStudents, capacityToSave));

            assignments.push({
                classRoomSectionId: room.classRoomSectionId,
                examScheduleId: validatedData.examScheduleId,
                capacity: capacityToSave,
                columns: resolvedExamColumns,
                orderKey: candidate.orderKey,
                createdBy: userId,
                updatedBy: userId
            });
        }

        const result = await examRoomCapacityRepository.bulkAddExamRoomCapacity(assignments, transaction);

        // Auto allocate seats using "ascending" strategy within the same transaction
        try {
            await examScheduleServices.allocateSeatsByStrategy(validatedData.examScheduleId, userId, "ascending", { transaction });
        } catch (seatErr) {
            console.error("Auto seat allocation skipped or failed:", seatErr.message);
        }

        // If examination session is Published, re-evaluate and mark this schedule as published: true if it is now Ready
        try {
            const currentSession = await examRoomCapacityRepository.assertScopedExamSchedule(validatedData.examScheduleId, {
                attributes: ["examinationSessionId"],
                transaction
            });
            if (currentSession?.examinationSessionId) {
                const sessionRecord = await model.examinationSessionModel.findByPk(currentSession.examinationSessionId, { transaction });
                if (sessionRecord?.status === "Published") {
                    const mappedSubjects = await examinationSessionServices.getMappedSubjectsBySessionAndTerm(
                        { examinationSessionId: currentSession.examinationSessionId },
                        { transaction, skipTeacherAndPaperEnrichment: true }
                    );
                    const scheduleInfo = mappedSubjects.find(sub => sub.examScheduleId === Number(validatedData.examScheduleId));
                    if (scheduleInfo?.ready === true) {
                        await model.examScheduleModel.update(
                            { published: true, updatedBy: userId },
                            { where: { examScheduleId: validatedData.examScheduleId }, transaction }
                        );
                    }
                }
            }
        } catch (publishErr) {
            console.error("Auto publishing schedule after room assignment failed:", publishErr.message);
        }

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

    const schedule = await examRoomCapacityRepository.getExamScheduleSlot(existing.examScheduleId);
    if (schedule?.published) {
        throw new Error("Room assignment cannot be changed because the exam schedule is already published.");
    }

    updatePayload.updatedBy = userId;

    const transaction = await sequelize.transaction();

    try {
        const seatCount = await examRoomCapacityRepository.getSeatAllocationCountByCapacityId(examScheduleRoomCapacityId, transaction);
        if (seatCount > 0) {
            if (Number(existing.columns) !== Number(columns)) {
                throw new Error("Room seating configuration cannot be changed because seats have already been allocated.");
            }
            if (Number(capacity) < seatCount) {
                throw new Error("Room seating configuration cannot be changed because seats have already been allocated.");
            }
        }

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
        return [];
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

export async function deleteExamRoomCapacity(examScheduleRoomCapacityId, userId) {
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examScheduleRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }

    const examScheduleId = existing.examScheduleId;
    const schedule = await examRoomCapacityRepository.getExamScheduleSlot(examScheduleId);
    if (schedule?.published) {
        throw new Error("Room assignment cannot be changed because the exam schedule is already published.");
    }
    const transaction = await sequelize.transaction();

    try {
        await examRoomCapacityRepository.deleteAssociatedSeatsAndAttendance(
            examScheduleRoomCapacityId,
            transaction
        );

        const result = await examRoomCapacityRepository.deleteExamRoomCapacity(
            examScheduleRoomCapacityId,
            transaction
        );

        // Fetch remaining room capacities and re-sequence orderKey sequentially from 1
        const remainingRooms = await examRoomCapacityRepository.getRoomsByExamScheduleId(examScheduleId, transaction);
        let currentOrder = 1;
        for (const room of remainingRooms) {
            if (room.examScheduleRoomCapacityId !== Number(examScheduleRoomCapacityId)) {
                await examRoomCapacityRepository.updateExamRoomCapacityOrderKey(
                    room.examScheduleRoomCapacityId,
                    currentOrder,
                    transaction
                );
                currentOrder++;
            }
        }

        // Auto allocate seats using "ascending" strategy for the remaining rooms in their updated order
        try {
            await examScheduleServices.allocateSeatsByStrategy(examScheduleId, userId, "ascending", { transaction });
        } catch (seatErr) {
            console.error("Auto seat allocation after room deletion skipped or failed:", seatErr.message);
        }

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

    const [classBusyRoomIds, assignedRoomIds, occupiedCapacitiesMap] = await Promise.all([
        examRoomCapacityRepository.findOccupiedRoomIdsByClassSchedule(day, startTime, endTime, examDate),
        examRoomCapacityRepository.findAssignedRoomIdsForExam(examScheduleId),
        examRoomCapacityRepository.getOccupiedCapacitiesForDateSlot(examDate, examSchedule.examinationSessionSlotId),
    ]);

    const allRooms = await examRoomCapacityRepository.findAllRoomsForExamSlot();
    const availableRooms = [];

    for (let i = 0; i < allRooms.length; i++) {
        const room = allRooms[i];
        const isConflict = classBusyRoomIds.includes(room.classRoomSectionId) || assignedRoomIds.includes(room.classRoomSectionId);
        
        if (isConflict) {
            continue;
        }

        const roomMaxCapacity = room.examCapacity ?? room.capacity;
        const usedCapacity = occupiedCapacitiesMap[room.classRoomSectionId] || 0;
        const remainingCapacity = Math.max(0, roomMaxCapacity - usedCapacity);

        if (remainingCapacity > 0) {
            availableRooms.push({
                ...room,
                examCapacity: remainingCapacity,
                effectiveExamCapacity: remainingCapacity,
            });
        }
    }

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
        rooms: availableRooms,
    };
}
