import * as examSetupServices from "../services/examSetupServices.js";

export async function addExamSetup(req, res) {
    const { examSystem, examTypeId, classId, subjectId, totalMarks } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    try {
        if (!examSystem || !examTypeId || !classId || !subjectId || !totalMarks) {
            return res.status(400).send("Required fields are missing");
        }
        const examSetup = await examSetupServices.addExamSetup(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Exam setup created successfully", examSetup });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllExamSetup(req, res) {
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    try {
        const setups = await examSetupServices.getExamSetup(universityId,acedmicYearId);
        res.status(200).json(setups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleExamSetup(req, res) {
    const universityId = req.user.universityId;
    try {
        const { examSetupId } = req.query;
        const examDetails = await examSetupServices.getSingleExamSetup(examSetupId, universityId);
        if (examDetails) {
            res.status(200).json(examDetails);
        } else {
            res.status(404).json({ message: "Exam setup not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateExamSetup(req, res) {
    try {
        const { examSetupId } = req.body;
        if (!examSetupId) {
            return res.status(400).send("examSetupId is required");
        }
        const updatedBy = req.user.userId;
        const examDetails = await examSetupServices.updateExamSetup(examSetupId, req.body, updatedBy);
        res.status(200).json({ message: "Exam setup updated successfully", examDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteExamSetup(req, res) {
    try {
        const { examSetupId } = req.query;
        if (!examSetupId) {
            return res.status(400).json({ message: "examSetupId is required" });
        }
        const deleted = await examSetupServices.deleteExamSetup(examSetupId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for exam setup ID ${examSetupId}` });
        } else {
            res.status(404).json({ message: "Exam setup not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
