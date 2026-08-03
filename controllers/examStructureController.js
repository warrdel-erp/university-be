import * as examStructureServices from "../services/examStructureServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { getAcademicYearId } from "../utility/requestContext.js";

export async function addExamStructure(req, res) {
  const { courseId } = req.body;
  const academicYearId = getAcademicYearId();
  try {
    if (!(academicYearId && courseId)) {
      return ErrorResponse(res, 400, "Required fields are missing");
    }
    const examStructure = await examStructureServices.addExamStructure(
      { ...req.body, academicYearId },
      req.user.userId,
      req.user.userId,
    );
    return SuccessResponse(res, 201, "Exam Structure created successfully", examStructure);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getAllExamStructure(req, res) {
  try {
    const Structures = await examStructureServices.getExamStructure();
    return SuccessResponse(res, 200, "Exam Structures fetched successfully", Structures);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getSingleExamStructure(req, res) {
  try {
    const { courseId, sessionId } = req.query;
    const examDetails = await examStructureServices.getSingleExamStructure(
      courseId,
      sessionId,
    );

    if (examDetails) {
      return SuccessResponse(res, 200, "Exam Structure fetched successfully", examDetails);
    }
    return SuccessResponse(res, 200, "Exam Structure not found", []);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function updateExamStructure(req, res) {
  try {
    const { examStructureId } = req.body;
    if (!examStructureId) {
      return res.status(400).send("examStructureId is required");
    }
    const examDetails = await examStructureServices.updateExamStructure(
      examStructureId,
      req.body,
      req.user.userId,
    );
    return SuccessResponse(res, 200, "Exam Structure updated successfully", examDetails);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function deleteExamStructure(req, res) {
  try {
    const { examStructureId } = req.query;
    if (!examStructureId) {
      return ErrorResponse(res, 400, "examStructureId is required");
    }
    const deleted = await examStructureServices.deleteExamStructure(examStructureId);
    if (deleted) {
      return SuccessResponse(res, 200, `Delete successful for exam Structure ID ${examStructureId}`);
    }
    return SuccessResponse(res, 200, "Exam Structure not found", []);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function addExamType(req, res) {
  try {
    const examStructure = await examStructureServices.addExamType(
      req.body,
      req.user,
    );
    return SuccessResponse(res, 201, "Exam setup type created successfully", examStructure);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
}

export async function getDetailByExamType(req, res) {
  try {
    const { examSetupTypeId, courseId, sessionId, termNumber, search, page = 1, limit = 10 } = req.query;

    if (examSetupTypeId) {
      const examDetails = await examStructureServices.getDetailByExamType(examSetupTypeId);
      if (examDetails) {
        return SuccessResponse(res, 200, "Exam Type fetched successfully", examDetails);
      }
      return SuccessResponse(res, 200, "Exam Type not found", null);
    }

    const result = await examStructureServices.getAllExamTypes(
      courseId,
      sessionId,
      undefined,
      termNumber ?? null,
      { search, page, limit }
    );

    return SuccessResponse(
      res,
      200,
      result.data?.length ? "Exam Type fetched successfully" : "Exam Type not found",
      result.data ?? [],
      result.meta
    );
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getAllExamTypes(req, res) {
  try {
    const { courseId, sessionId, termNumber, search, page = 1, limit = 10 } = req.query;
    const result = await examStructureServices.getAllExamTypes(
      courseId,
      sessionId,
      undefined,
      termNumber ?? null,
      { search, page, limit }
    );

    return SuccessResponse(
      res,
      200,
      result.data?.length ? "Exam Types fetched successfully" : "Exam Types not found",
      result.data ?? [],
      result.meta
    );
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function updateExamType(req, res) {
  try {
    const { examSetupTypeId } = req.body;
    if (!examSetupTypeId) {
      return ErrorResponse(res, 400, "ExamTypeId is required");
    }
    const examDetails = await examStructureServices.updateExamType(
      examSetupTypeId,
      req.body,
      req.user.userId,
    );
    return SuccessResponse(res, 200, "Exam Type updated successfully", examDetails);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function deleteExamType(req, res) {
  try {
    const { examSetupTypeId } = req.params;
    if (!examSetupTypeId) {
      return ErrorResponse(res, 400, "examSetupTypeId is required");
    }
    const deleted = await examStructureServices.deleteExamType(examSetupTypeId);
    if (deleted) {
      return SuccessResponse(res, 200, `Delete successful for exam type ID ${examSetupTypeId}`);
    }
    return SuccessResponse(res, 200, "Exam examType not found", []);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}
