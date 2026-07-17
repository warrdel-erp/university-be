import * as teacherExamAssignmentRepository from "../repository/teacherExamAssignmentRepository.js";

export async function assignExam(data) {
    const existing = await teacherExamAssignmentRepository.findAssignment({
        examScheduleId: data.examScheduleId,
        userId: data.userId
    });
    if (existing) {
        const error = new Error("This teacher is already assigned to the selected exam schedule.");
        error.statusCode = 409;
        throw error;
    }
    return await teacherExamAssignmentRepository.assignExam(data);
}

export async function getAssignments(filters) {
    const whereClause = {
        ...(filters.examScheduleId && { examScheduleId: filters.examScheduleId }),
        ...(filters.userId && { userId: filters.userId }),
    };
    return await teacherExamAssignmentRepository.getAssignments(whereClause);
}

export async function deleteAssignment(teacherExamAssignmentId) {
    return await teacherExamAssignmentRepository.deleteAssignment(teacherExamAssignmentId);
}
