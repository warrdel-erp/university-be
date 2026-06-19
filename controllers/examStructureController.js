import * as examStructureServices from "../services/examStructureServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addExamStructure(req, res) {
  const { acedmicYearId, courseId } = req.body;
  try {
    if (!(acedmicYearId && courseId)) {
      return ErrorResponse(res, 400, "Required fields are missing");
    }
    const examStructure = await examStructureServices.addExamStructure(
      req.body,
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
    const Structures = await examStructureServices.getExamStructure(req.query.acedmicYearId);
    return SuccessResponse(res, 200, "Exam Structures fetched successfully", Structures);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getSingleExamStructure(req, res) {
  try {
    const { courseId, sessionId, acedmicYearId } = req.query;
    const examDetails = await examStructureServices.getSingleExamStructure(
      courseId,
      sessionId,
      acedmicYearId,
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
      req.user.userId,
      req.user.userId,
    );
    return SuccessResponse(res, 201, "Exam setup type created successfully", examStructure);
  } catch (error) {
    return ErrorResponse(res, error.statusCode || 500, error.message);
  }
}

export async function getDetailByExamType(req, res) {
  try {
    const { examSetupTypeId } = req.query;
    const examDetails = await examStructureServices.getDetailByExamType(examSetupTypeId);

    if (examDetails) {
      return SuccessResponse(res, 200, "Exam Type fetched successfully", examDetails);
    }
    return SuccessResponse(res, 200, "Exam Type not found", []);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getSingleExamType(req, res) {
  try {
    const { courseId, sessionId, acedmicYearId, termNumber } = req.query;
    const examDetails = await examStructureServices.getSingleExamType(
      courseId,
      sessionId,
      acedmicYearId,
      termNumber ?? null,
    );

    if (examDetails?.length) {
      return SuccessResponse(res, 200, "Exam Type fetched successfully", examDetails);
    }
    return SuccessResponse(res, 200, "Exam Type not found", []);
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
