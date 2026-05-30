import * as examStructureServices from "../services/examStructureServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addExamStructure(req, res) {
  const { acedmicYearId, courseId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const universityId = req.user.universityId;
  const instituteId = req.user.defaultInstituteId;
  try {
    if (!(acedmicYearId && courseId)) {
      return ErrorResponse(res, 400, "Required fields are missing");
    }
    const examStructure = await examStructureServices.addExamStructure(
      req.body,
      createdBy,
      updatedBy,
      universityId,
      instituteId,
    );
    return SuccessResponse(res, 201, "Exam Structure created successfully", examStructure);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getAllExamStructure(req, res) {
  const universityId = req.user.universityId;
  const { acedmicYearId } = req.query;
  const role = req.user.role;
  const instituteId = req.user.defaultInstituteId;
  try {
    const Structures = await examStructureServices.getExamStructure(universityId, acedmicYearId, role, instituteId);
    return SuccessResponse(res, 200, "Exam Structures fetched successfully", Structures);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getSingleExamStructure(req, res) {
  const universityId = req.user.universityId;

  try {
    const { courseId, sessionId } = req.query;

    const examDetails = await examStructureServices.getSingleExamStructure(courseId, sessionId, universityId);

    if (examDetails) {
      return SuccessResponse(res, 200, "Exam Structure fetched successfully", examDetails);
    } else {
      return SuccessResponse(res, 200, "Exam Structure not found", []);
    }
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
    const updatedBy = req.user.userId;
    const examDetails = await examStructureServices.updateExamStructure(examStructureId, req.body, updatedBy);
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
    } else {
      return SuccessResponse(res, 200, "Exam Structure not found", []);
    }
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function addExamType(req, res) {
  const { examStructureId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    // if (!(examStructureId)) {
    //   return ErrorResponse(res, 400, "examStructureId Required fields are missing");
    // }
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const examStructure = await examStructureServices.addExamType(
      req.body,
      createdBy,
      updatedBy,
      universityId,
      instituteId,
    );
    return SuccessResponse(res, 201, "Exam setup type created successfully", examStructure);
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getDetailByExamType(req, res) {
  const universityId = req.user.universityId;

  try {
    const { examSetupTypeId } = req.query;

    const examDetails = await examStructureServices.getDetailByExamType(examSetupTypeId);

    if (examDetails) {
      return SuccessResponse(res, 200, "Exam Type fetched successfully", examDetails);
    } else {
      return SuccessResponse(res, 200, "Exam Type not found", []);
    }
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}

export async function getSingleExamType(req, res) {
  const universityId = req.user.universityId;
  const instituteId = req.user.defaultInstituteId;

  try {
    const { courseId, sessionId, termNumber } = req.query;

    const examDetails = await examStructureServices.getSingleExamType(
      courseId,
      sessionId,
      universityId,
      termNumber ?? null,
      instituteId,
    );

    if (examDetails?.length) {
      return SuccessResponse(res, 200, "Exam Type fetched successfully", examDetails);
    } else {
      return SuccessResponse(res, 200, "Exam Type not found", []);
    }
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
    const updatedBy = req.user.userId;
    const examDetails = await examStructureServices.updateExamType(examSetupTypeId, req.body, updatedBy);
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
    } else {
      return SuccessResponse(res, 200, "Exam examType not found", []);
    }
  } catch (error) {
    return ErrorResponse(res, 500, error.message);
  }
}
