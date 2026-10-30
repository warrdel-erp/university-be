import * as service from "../services/curriculumElectiveRequirementServices.js";
import * as assignmentService from "../services/curriculumElectiveAssignmentServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addCurriculumElectiveRequirement(req, res) {
  try {
    const result = await service.addCurriculumElectiveRequirement(req.body);
    return SuccessResponse(res, 201, "Curriculum elective requirement created successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getAllCurriculumElectiveRequirements(req, res) {
  try {
    const result = await service.getAllCurriculumElectiveRequirements(req.query);
    return SuccessResponse(
      res,
      200,
      "Curriculum elective requirements fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCurriculumElectiveRequirementById(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    if (req.query.view === "overview") {
      const result = await service.getCurriculumElectiveRequirementOverview(id, req.query);
      return SuccessResponse(res, 200, "Curriculum elective requirement overview fetched successfully", result);
    }
    const result = await service.getCurriculumElectiveRequirementById(id, req.query);
    return SuccessResponse(res, 200, "Curriculum elective requirement fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCurriculumElectiveRequirementOverview(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.getCurriculumElectiveRequirementOverview(id, req.query);
    return SuccessResponse(res, 200, "Curriculum elective requirement overview fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCurriculumElectiveRequirementCourseOfferings(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.getCurriculumElectiveRequirementCourseOfferings(id, req.query);
    return SuccessResponse(res, 200, "Curriculum elective course offerings fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function updateCurriculumElectiveRequirement(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.updateCurriculumElectiveRequirement(id, req.body);
    return SuccessResponse(res, 200, "Curriculum elective requirement updated successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function toggleStatusCurriculumElectiveRequirement(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.toggleStatusCurriculumElectiveRequirement(id);
    return SuccessResponse(res, 200, "Curriculum elective requirement status toggled successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function deleteCurriculumElectiveRequirement(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    await service.deleteCurriculumElectiveRequirement(id);
    return SuccessResponse(res, 200, "Curriculum elective requirement deleted successfully");
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCurriculumElectiveRequirementAssignments(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.getCurriculumElectiveRequirementAssignments(id, req.query);
    return SuccessResponse(res, 200, "Curriculum elective assignments fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function assignStudentToCurriculumElective(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.assignStudentToCurriculumElective(id, req.body);
    return SuccessResponse(res, 200, result.message || "Student assigned successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function unassignStudentFromCurriculumElective(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    const studentId = req.params.studentId || req.body.studentId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    if (!studentId) {
      return ErrorResponse(res, 400, "studentId is required");
    }
    const result = await service.unassignStudentFromCurriculumElective(id, studentId);
    return SuccessResponse(res, 200, result.message || "Student unassigned successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function bulkAssignStudentsToCurriculumElective(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.bulkAssignStudentsToCurriculumElective(id, req.body);
    return SuccessResponse(res, 200, result.message || "Students assigned successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function bulkUnassignStudentsFromCurriculumElective(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.curriculumElectiveRequirementId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const result = await service.bulkUnassignStudentsFromCurriculumElective(id, req.body);
    return SuccessResponse(res, 200, result.message || "Students unassigned successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCourseStudentsForManagement(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    const subjectId = req.params.subjectId || req.query.subjectId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    if (!subjectId) {
      return ErrorResponse(res, 400, "subjectId is required");
    }
    const result = await service.getCourseStudentsForManagement(id, subjectId, req.query);
    return SuccessResponse(res, 200, "Course students for management fetched successfully", result);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}

export async function getCourseAssignedStudents(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.curriculumElectiveRequirementId;
    const subjectId = req.params.subjectId || req.query.subjectId;
    if (!id) {
      return ErrorResponse(res, 400, "id is required");
    }
    const query = {
      ...req.query,
      curriculumElectiveRequirementId: id,
      subjectId: subjectId || req.query.subjectId,
    };
    const result = await assignmentService.getAllCurriculumElectiveAssignments(query);
    if (result.courseInfo || result.summary) {
      return res.status(200).json({
        success: true,
        message: "Assigned course students fetched successfully",
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
      "Assigned course students fetched successfully",
      result.rows,
      result.paginationData
    );
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
  }
}




