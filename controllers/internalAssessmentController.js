import * as InternalAssessmentServices from "../services/internalAssessmentService.js";

export async function addInternalAssessment(req, res) {
    const {
        subjectId, semesterId, examSetupTypeId, type, totalMarks,
        publishDate, dueDate, description,employeeId,
    } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const file = req.files;

    if (!subjectId || !semesterId || !examSetupTypeId || !type || !totalMarks || !publishDate || !dueDate || !description) {
        return res.status(400).send("Required fields are missing");
    }
    try {
        const data = {
            subjectId, semesterId, examSetupTypeId, type, totalMarks,
            publishDate, dueDate, description,
            createdBy, updatedBy,employeeId
        };
        const assessment = await InternalAssessmentServices.addInternalAssessment(data,file);
        res.status(201).json({ message: "Internal Assessment created", assessment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllInternalAssessment(req, res) {
    const {examSetupTypeId} = req.query
    try {
        const list = await InternalAssessmentServices.getAllInternalAssessment(examSetupTypeId);
        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleInternalAssessment(req, res) {
    const { examAssessmentId } = req.query;
    if (!examAssessmentId) return res.status(400).json({ message: "examAssessmentId is required" });
    try {
        const record = await InternalAssessmentServices.getInternalAssessmentById(examAssessmentId);
        if (record) res.status(200).json(record);
        else res.status(404).json({ message: "Not found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateInternalAssessments(req, res) {
  try {
    const payload = req.body;

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ message: "Request body must be a non-empty array." });
    }

    for (const item of payload) {
      if (!item.examAssessmentId) {
        return res.status(400).json({ message: "Each item must include examAssessmentId." });
      }
    }

    const updated = await InternalAssessmentServices.updateInternalAssessment(payload);

    return res.status(200).json({
      message: "Internal assessments updated successfully.",
      data: updated
    });
  } catch (error) {
    console.error("Error in updateInternalAssessments controller:", error);
    return res.status(500).json({ message: error.message || "Something went wrong." });
  }
}

export async function deleteInternalAssessment(req, res) {
    const { examAssessmentId } = req.query;
    if (!examAssessmentId) return res.status(400).json({ message: "examAssessmentId is required" });
    try {
        const deleted = await InternalAssessmentServices.deleteInternalAssessment(examAssessmentId);
        if (deleted) res.status(200).json({ message: "Deleted" });
        else res.status(404).json({ message: "Not found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};