import * as examRoomCapacityRepository from "../repository/examScheduleRoomCapacityRepository.js";
import { z } from "zod";

import * as model from "../models/index.js";

const examRoomCapacitySchema = z.object({
    classRoomSectionId: z.number(),
    examScheduleId: z.number()
});

const updateExamRoomCapacitySchema = z.object({
    examScheduleRoomCapacityId: z.number(),
    capacity: z.number().optional(),
    columns: z.number().optional()
});

export async function addExamRoomCapacity(data, userId) {
    const validatedData = examRoomCapacitySchema.parse(data);
    
    // Fetch room details
    const room = await model.classRoomModel.findByPk(validatedData.classRoomSectionId);
    if (!room) {
        throw new Error("Class room not found");
    }

    if (room.examCapacity === null || room.examCapacityColumns === null) {
        throw new Error("Room exam capacity is not configured");
    }

    const assignmentData = {
        classRoomSectionId: validatedData.classRoomSectionId,
        examScheduleId: validatedData.examScheduleId,
        capacity: room.examCapacity,
        columns: room.examCapacityColumns,
        createdBy: userId,
        updatedBy: userId
    };

    return await examRoomCapacityRepository.addExamRoomCapacity(assignmentData);
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
