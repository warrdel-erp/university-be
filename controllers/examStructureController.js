import * as examStructureServices from "../services/examStructureServices.js";

export async function addExamStructure(req, res) {
    const { acedmicYearId, courseId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!(acedmicYearId && courseId)) {
            return res.status(400).send("Required fields are missing");
        }
        const examStructure = await examStructureServices.addExamStructure(req.body, createdBy, updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Exam Structure created successfully", examStructure });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllExamStructure(req, res) {
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    try {
        const Structures = await examStructureServices.getExamStructure(universityId,acedmicYearId,role,instituteId);
        res.status(200).json(Structures);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleExamStructure(req, res) {
    const universityId = req.user.universityId;
    try {
        const { examStructureId } = req.query;
        const examDetails = await examStructureServices.getSingleExamStructure(examStructureId, universityId);
        if (examDetails) {
            res.status(200).json(examDetails);
        } else {
            res.status(404).json({ message: "Exam Structure not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(200).json({ message: "Exam Structure updated successfully", examDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteExamStructure(req, res) {
    try {
        const { examStructureId } = req.query;
        if (!examStructureId) {
            return res.status(400).json({ message: "examStructureId is required" });
        }
        const deleted = await examStructureServices.deleteExamStructure(examStructureId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for exam Structure ID ${examStructureId}` });
        } else {
            res.status(404).json({ message: "Exam Structure not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
