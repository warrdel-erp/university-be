import * as examStructureScheduleServices from "../services/examStructureScheduleMappingServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";


export async function addExamStructureSchedule(req, res) {
  const { acedmicYearId, sessionId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const universityId = req.user.universityId;
  const instituteId = req.user.defaultInstituteId;
  try {
    if (!(acedmicYearId && sessionId)) {
      return res.status(400).send("Required fields are missing");
    }
    const examStructureSchedule = await examStructureScheduleServices.addExamStructureSchedule(req.body, createdBy, updatedBy, universityId, instituteId);
    res.status(201).json({ message: "Exam Structure Schedule created successfully", examStructureSchedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export async function getAllExamStructureSchedule(req, res) {
  const universityId = req.user.universityId;
  const { acedmicYearId } = req.query
  const { examSetupTypeId } = req.query
  // const {examStructureScheduleMapperId} = req.query
  const role = req.user.role;
  const instituteId = req.user.defaultInstituteId;
  try {
    const StructureSchedules = await examStructureScheduleServices.getExamStructureSchedule(universityId, acedmicYearId, role, instituteId, examSetupTypeId);
    res.status(200).json(StructureSchedules);
  } catch (error) {
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
};



export async function updateExamSchedule(req, res) {
  try {
    const { examScheduleId } = req.body;
    if (!examScheduleId) {
      return res.status(400).send("examScheduleId is required");
    }
    const updatedBy = req.user.userId;
    const examDetails = await examStructureScheduleServices.updateExamSchedule(examScheduleId, req.body, updatedBy);
    res.status(200).json({ message: "Exam Schedule updated successfully", examDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export async function deleteExamSchedule(req, res) {
  try {
    const { examScheduleId } = req.query;
    if (!examScheduleId) {
      return res.status(400).json({ message: "examScheduleId is required" });
    }
    const deleted = await examStructureScheduleServices.deleteExamSchedule(examScheduleId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for exam StructureSchedule ID ${examScheduleId}` });
    } else {
      res.status(404).json({ message: "Exam StructureSchedule not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export async function addExamSchedule(req, res) {
  const { examSetupTypeTermId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;

  // Use acedmicYearId from body or fallback to user's defaultAcademicYearId
  const acedmicYearId = req.user.defaultAcademicYearId;

  try {
    if (!(examSetupTypeTermId)) {
      return res.status(400).send("examSetupTypeTermId is required");
    }

    const examSchedule = await examStructureScheduleServices.addExamSchedule(
      { ...req.body, acedmicYearId: acedmicYearId },
      createdBy,
      updatedBy
    );
    res.status(201).json({ message: "Exam schedule created successfully", examSchedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export async function getDetailByExamType(req, res) {
  const universityId = req.user.universityId;

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
};



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
};



export async function getExamScheduleById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return ErrorResponse(res, 400, "examScheduleId is required");
    }
    const result = await examStructureScheduleServices.getExamScheduleById(id);
    if (result) {
      return SuccessResponse(res, 200, "Exam schedule details fetched successfully", result);
    } else {
      return ErrorResponse(res, 404, "Exam schedule not found");
    }
  } catch (error) {
    console.error("Error in getExamScheduleById controller:", error);
    return ErrorResponse(res, 500, error.message);
  }
}