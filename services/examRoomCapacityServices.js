import * as examRoomCapacityRepository from "../repository/examRoomCapacityRepository.js";
import { z } from "zod";

const examRoomCapacitySchema = z.object({
    classRoomSectionId: z.number(),
    capacity: z.number(),
    columns: z.number()
});

const updateExamRoomCapacitySchema = z.object({
    examRoomCapacityId: z.number(),
    capacity: z.number().optional(),
    columns: z.number().optional()
});

export async function addExamRoomCapacity(data, userId) {
    const validatedData = examRoomCapacitySchema.parse(data);
    validatedData.createdBy = userId;
    validatedData.updatedBy = userId;
    // By default, a newly created one is active
    validatedData.isActive = true;
    return await examRoomCapacityRepository.addExamRoomCapacity(validatedData);
}

export async function getExamRoomCapacities(classRoomSectionId) {
    return await examRoomCapacityRepository.getExamRoomCapacities(classRoomSectionId);
}

export async function updateExamRoomCapacity(examRoomCapacityId, data, userId) {
    const validatedData = updateExamRoomCapacitySchema.parse({ ...data, examRoomCapacityId });
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }
    if (existing.schedules && existing.schedules.length > 0) {
        throw new Error("Cannot update exam room capacity as it is already assigned to an exam schedule");
    }
    validatedData.updatedBy = userId;
    return await examRoomCapacityRepository.updateExamRoomCapacity(examRoomCapacityId, validatedData);
}

export async function activateExamRoomCapacity(examRoomCapacityId, userId) {
    return await examRoomCapacityRepository.activateExamRoomCapacity(examRoomCapacityId, userId);
}

export async function deleteExamRoomCapacity(examRoomCapacityId) {
    const existing = await examRoomCapacityRepository.getExamRoomCapacityById(examRoomCapacityId);
    if (!existing) {
        throw new Error("Exam room capacity not found");
    }
    if (existing.schedules && existing.schedules.length > 0) {
        throw new Error("Cannot delete exam room capacity as it is already assigned to an exam schedule");
    }
    return await examRoomCapacityRepository.deleteExamRoomCapacity(examRoomCapacityId);
}
