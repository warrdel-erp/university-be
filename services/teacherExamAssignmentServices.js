import * as teacherExamAssignmentRepository from "../repository/teacherExamAssignmentRepository.js";

export async function assignExam(data) {
    return await teacherExamAssignmentRepository.assignExam(data);
}

export async function getAssignments(filters) {
    const whereClause = {
        ...(filters.examScheduleId && { examScheduleId: filters.examScheduleId }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.acedmicYearId && { acedmicYearId: filters.acedmicYearId })
    };
    return await teacherExamAssignmentRepository.getAssignments(whereClause);
}

export async function deleteAssignment(teacherExamAssignmentId) {
    return await teacherExamAssignmentRepository.deleteAssignment(teacherExamAssignmentId);
}
