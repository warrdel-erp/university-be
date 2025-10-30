import * as examStructureScheduleServices from "../services/examStructureScheduleMappingServices.js";

export async function addExamStructureSchedule(req, res) {
    const { acedmicYearId, sessionId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!(acedmicYearId && sessionId)) {
            return res.status(400).send("Required fields are missing");
        }
        const examStructureSchedule = await examStructureScheduleServices.addExamStructureSchedule(req.body, createdBy, updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Exam Structure Schedule created successfully", examStructureSchedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllExamStructureSchedule(req, res) {
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    const {examSetupTypeId} = req.query
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    try {
        const StructureSchedules = await examStructureScheduleServices.getExamStructureSchedule(universityId,acedmicYearId,role,instituteId,examSetupTypeId);
        res.status(200).json(StructureSchedules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleExamStructureSchedule(req, res) {
  const universityId = req.user.universityId;

  try {
    const courseId = parseInt(req.query.courseId, 10);
    const sessionId = parseInt(req.query.sessionId, 10);

    if (!courseId && !sessionId) {
      return res.status(400).json({ success: false, message: "courseId and sessionId are required" });
    }

    const examDetails = await examStructureScheduleServices.getSingleExamStructureSchedule(courseId, sessionId, universityId);

    if (examDetails) {
      res.status(200).json({ success: true, data: examDetails });
    } else {
      res.status(404).json({ success: false, message: "Exam StructureSchedule not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export async function updateExamStructureSchedule(req, res) {
    try {
        const { examStructureScheduleId } = req.body;
        if (!examStructureScheduleId) {
            return res.status(400).send("examStructureScheduleId is required");
        }
        const updatedBy = req.user.userId;
        const examDetails = await examStructureScheduleServices.updateExamStructureSchedule(examStructureScheduleId, req.body, updatedBy);
        res.status(200).json({ message: "Exam StructureSchedule updated successfully", examDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function deleteExamStructureSchedule(req, res) {
    try {
        const { examStructureScheduleId } = req.query;
        if (!examStructureScheduleId) {
            return res.status(400).json({ message: "examStructureScheduleId is required" });
        }
        const deleted = await examStructureScheduleServices.deleteExamStructureSchedule(examStructureScheduleId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for exam StructureSchedule ID ${examStructureScheduleId}` });
        } else {
            res.status(404).json({ message: "Exam StructureSchedule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function addExamSchedule(req, res) {
    const {examStructureScheduleMapperId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if (!(examStructureScheduleMapperId)) {
            return res.status(400).send("examStructureScheduleMapperId Required fields are missing");
        }
        const examSchedule = await examStructureScheduleServices.addExamSchedule(req.body, createdBy, updatedBy);
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