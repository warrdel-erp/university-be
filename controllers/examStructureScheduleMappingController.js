import * as examStructureScheduleServices from "../services/examStructureScheduleMappingServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { getAcademicYearId } from "../utility/requestContext.js";

export async function addExamStructureSchedule(req, res) {
  const { sessionId } = req.body;
  const academicYearId = getAcademicYearId();
  try {
    if (!(academicYearId && sessionId)) {
      return res.status(400).send("Required fields are missing");
    }
    const examStructureSchedule = await examStructureScheduleServices.addExamStructureSchedule(
      { ...req.body, academicYearId },
      req.user.userId,
      req.user.userId,
    );
    res.status(201).json({ message: "Exam Structure Schedule created successfully", examStructureSchedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllExamStructureSchedule(req, res) {
  const { examSetupTypeId } = req.query;
  try {
    const StructureSchedules = await examStructureScheduleServices.getExamStructureSchedule(examSetupTypeId);
    res.status(200).json(StructureSchedules);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
}

export async function publishExamSchedule(req, res) {
  try {
    const examDetails = await examStructureScheduleServices.publishExamSchedule(req.body);

    if (examDetails) {
      res.status(200).json({ success: true, message: "Exam  Schedule publish successfully" });
    } else {
      res.status(404).json({ success: false, message: "Exam Schedule publish in error" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateExamSchedule(req, res) {
  try {
    const { examScheduleId } = req.body;
    await examStructureScheduleServices.updateExamSchedule(
      examScheduleId,
      req.body,
      req.user.userId,
    );
    return SuccessResponse(res, 200, "Exam schedule updated successfully");
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to update exam schedule",
    );
  }
}

export async function deleteExamSchedule(req, res) {
  try {
    const { examScheduleId } = req.query;
    await examStructureScheduleServices.deleteExamSchedule(examScheduleId);
    return SuccessResponse(res, 200, "Exam schedule deleted successfully");
  } catch (error) {
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Failed to delete exam schedule",
    );
  }
}

export async function addExamSchedule(req, res) {
  try {
    const academicYearId = getAcademicYearId() || req.user?.academicYearId || req.body.academicYearId || null;

    const examSchedule = await examStructureScheduleServices.addExamSchedule(
      {
        ...req.body,
        examSetupTypeTermId: req.body.examSetupTypeTermId || null,
        academicYearId,
      },
      req.user?.userId ,
      req.user?.userId ,
    );
    res.status(201).json({ message: "Exam schedule created successfully", examSchedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getDetailByExamType(req, res) {
  try {
    const examSetupTypeId = parseInt(req.query.examSetupTypeId, 10);

    if (!examSetupTypeId) {
      return res.status(400).json({ success: false, message: "examSetupTypeId is required" });
    }

    const examDetails = await examStructureScheduleServices.getDetailByExamType(examSetupTypeId);

    if (examDetails) {
      res.status(200).json({ success: true, data: examDetails });
    } else {
      res.status(404).json({ success: false, message: "Exam type not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getExamDetailByStudentId(req, res) {
  try {
    const studentId = parseInt(req.query.studentId, 10);
    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    const examDetails = await examStructureScheduleServices.getExamDetailByStudentId(studentId);

    if (examDetails) {
      res.status(200).json({ success: true, data: examDetails });
    } else {
      res.status(404).json({ success: false, message: "Exam type not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getExamScheduleById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return ErrorResponse(res, 400, "examScheduleId is required");
    }
    const result = await examStructureScheduleServices.getExamScheduleById(id);
    if (result) {
      return SuccessResponse(res, 200, "Exam schedule details fetched successfully", result);
    }
    return ErrorResponse(res, 404, "Exam schedule not found");
  } catch (error) {
    console.error("Error in getExamScheduleById controller:", error);
    return ErrorResponse(res, 500, error.message);
  }
}
