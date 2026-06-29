import * as teacherExamAssignmentServices from "../services/teacherExamAssignmentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function assignTeacherToExam(req, res) {
    const { examScheduleId, employeeId, deadline } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    try {
        const assignment = await teacherExamAssignmentServices.assignExam({
            examScheduleId,
            employeeId,
            deadline,
            createdBy,
            updatedBy
        });

        return SuccessResponse(res, 201, "Teacher assigned to exam successfully", assignment);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message);
    }
}

export async function getAllExamAssignments(req, res) {
    const { examScheduleId, employeeId } = req.query;

    try {
        const assignments = await teacherExamAssignmentServices.getAssignments({
            examScheduleId,
            employeeId,
        });
        return SuccessResponse(res, 200, "Assignments retrieved successfully", assignments);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function removeTeacherFromExam(req, res) {
    const { teacherExamAssignmentId } = req.params;

    try {
        const deleted = await teacherExamAssignmentServices.deleteAssignment(teacherExamAssignmentId);

        if (deleted) {
            return SuccessResponse(res, 200, "Teacher unassigned from exam successfully");
        } else {
            return ErrorResponse(res, 404, "Assignment not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
