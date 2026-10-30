import * as service from "../services/curriculumElectiveAssignmentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

/**
 * Get all curriculum elective assignments with filter criteria
 * GET /curriculumElectiveAssignment
 * GET /curriculumElectiveAssignment/list
 * GET /api/curriculum-elective-assignments
 */
export async function getAllCurriculumElectiveAssignments(req, res) {
  try {
    const result = await service.getAllCurriculumElectiveAssignments(req.query);

    if (result.courseInfo || result.summary) {
      return res.status(200).json({
        success: true,
        message: "Curriculum elective assignments fetched successfully",
        data: result.rows,
        paginationData: result.paginationData && {
          ...result.paginationData,
          totalPages: Math.ceil(
            result.paginationData.total / (result.paginationData.limit || 1)
          ),
        },
        courseInfo: result.courseInfo,
        summary: result.summary,
      });
    }

    return SuccessResponse(
      res,
      200,
      "Curriculum elective assignments fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

/**
 * Get single curriculum elective assignment by ID
 * GET /curriculumElectiveAssignment/:id
 */
export async function getCurriculumElectiveAssignmentById(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.getCurriculumElectiveAssignmentById(id);
    return SuccessResponse(
      res,
      200,
      "Curriculum elective assignment fetched successfully",
      result
    );
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

/**
 * Assign a student to an elective course
 * POST /curriculumElectiveAssignment/assign
 * POST /curriculumElectiveAssignment
 */
export async function assignStudent(req, res) {
  try {
    const result = await service.assignStudent(req.body);
    return SuccessResponse(res, 200, result.message || "Student assigned successfully", result);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

/**
 * Bulk assign students to an elective course
 * POST /curriculumElectiveAssignment/bulk-assign
 */
export async function bulkAssignStudents(req, res) {
  try {
    const result = await service.bulkAssignStudents(req.body);
    return SuccessResponse(res, 200, result.message || "Students assigned successfully", result);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

/**
 * Unassign a student from an elective course
 * DELETE /curriculumElectiveAssignment/unassign/:id
 * DELETE /curriculumElectiveAssignment/:id
 * DELETE /curriculumElectiveAssignment/:curriculumElectiveRequirementId/:studentId
 */
export async function unassignStudent(req, res) {
  try {
    const params = {
      id: req.params.id,
      curriculumElectiveRequirementId:
        req.params.curriculumElectiveRequirementId ||
        req.body?.curriculumElectiveRequirementId,
      studentId: req.params.studentId || req.body?.studentId,
    };
    const result = await service.unassignStudent(params);
    return SuccessResponse(res, 200, result.message || "Student unassigned successfully", result);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}

/**
 * Bulk unassign students from an elective requirement
 * POST /curriculumElectiveAssignment/bulk-unassign
 */
export async function bulkUnassignStudents(req, res) {
  try {
    const result = await service.bulkUnassignStudents(req.body);
    return SuccessResponse(res, 200, result.message || "Students unassigned successfully", result);
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
}
