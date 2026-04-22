import * as examRoomCapacityRepository from "../repository/examScheduleRoomCapacityRepository.js";
import { z } from "zod";
import * as examScheduleServices from "./examScheduleServices.js";
import * as model from "../models/index.js";

const examRoomCapacitySchema = z.object({
    classRoomSectionIds: z.array(z.number()),
    examScheduleId: z.number()
});

const updateExamRoomCapacitySchema = z.object({
    examScheduleRoomCapacityId: z.number(),
    capacity: z.number().optional(),
    columns: z.number().optional()
});

export async function addExamRoomCapacity(data, userId) {
    const validatedData = examRoomCapacitySchema.parse(data);

    // 1. Fetch Student Count for the Exam
    const exam = await examScheduleServices.getExamScheduleById(validatedData.examScheduleId);
    if (!exam) {
        throw new Error("Exam schedule not found");
    }
    const studentCount = exam.getDataValue('studentCount') || 0;

    // 2. Fetch Room Details
    const rooms = await model.classRoomModel.findAll({
        where: { classRoomSectionId: validatedData.classRoomSectionIds }
    });

    if (rooms.length !== validatedData.classRoomSectionIds.length) {
        throw new Error("One or more class rooms not found");
    }

    // 3. Validate Capacities and Calculate Total
    let totalCapacity = 0;
    const assignments = [];

    for (const room of rooms) {
        if (room.examCapacity === null || room.examCapacityColumns === null) {
            throw new Error(`Room ${room.roomNumber} exam capacity is not configured`);
        }
        totalCapacity += room.examCapacity;

        assignments.push({
            classRoomSectionId: room.classRoomSectionId,
            examScheduleId: validatedData.examScheduleId,
            capacity: room.examCapacity,
            columns: room.examCapacityColumns,
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
