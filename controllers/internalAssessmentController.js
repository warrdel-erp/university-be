import * as InternalAssessmentServices from "../services/internalAssessmentService.js";

export async function addInternalAssessment(req, res) {
    const { examSystem, examTypeId, classId, subjectId, totalMarks } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    try {
        if (!examSystem || !examTypeId || !classId || !subjectId || !totalMarks) {
            return res.status(400).send("Required fields are missing");
        }
        const InternalAssessment = await InternalAssessmentServices.addInternalAssessment(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Exam setup created successfully", InternalAssessment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllInternalAssessment(req, res) {
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    try {
        const setups = await InternalAssessmentServices.getInternalAssessment(universityId,acedmicYearId,role,instituteId);
        res.status(200).json(setups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleInternalAssessment(req, res) {
    const universityId = req.user.universityId;
    try {
        const { InternalAssessmentId } = req.query;
        const examDetails = await InternalAssessmentServices.getSingleInternalAssessment(InternalAssessmentId, universityId);
        if (examDetails) {
            res.status(200).json(examDetails);
        } else {
            res.status(404).json({ message: "Exam setup not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateInternalAssessment(req, res) {
    try {
        const { InternalAssessmentId } = req.body;
        if (!InternalAssessmentId) {
            return res.status(400).send("InternalAssessmentId is required");
        }
        const updatedBy = req.user.userId;
        const examDetails = await InternalAssessmentServices.updateInternalAssessment(InternalAssessmentId, req.body, updatedBy);
        res.status(200).json({ message: "Exam setup updated successfully", examDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteInternalAssessment(req, res) {
    try {
        const { InternalAssessmentId } = req.query;
        if (!InternalAssessmentId) {
            return res.status(400).json({ message: "InternalAssessmentId is required" });
        }
        const deleted = await InternalAssessmentServices.deleteInternalAssessment(InternalAssessmentId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for exam setup ID ${InternalAssessmentId}` });
        } else {
            res.status(404).json({ message: "Exam setup not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
