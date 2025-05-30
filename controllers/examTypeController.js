import * as examTypeServices from "../services/examTypeServices.js";

export async function addExamType(req, res) {
    const { examName } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!examName) {
            return res.status(400).send('examName is required')
        }
        const examType = await examTypeServices.addExamType(req.body, createdBy, updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", examType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllExamType(req, res) {
    const universityId = req.user.universityId;
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    const { acedmicYearId } = req.query;
    try {
        const libraries = await examTypeServices.getExamType(universityId,acedmicYearId,role,instituteId);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleExamType(req, res) {
    const universityId = req.user.universityId;
    try {
        const { examTypeId } = req.query;
        const examDetails = await examTypeServices.getSingleExamType(examTypeId, universityId);
        if (examDetails) {
            res.status(200).json(examDetails);
        } else {
            res.status(404).json({ message: "examDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateExamType(req, res) {
    try {
        const { examTypeId } = req.body
        if (!(examTypeId)) {
            return res.status(400).send('examTypeId is required')
        }
        const updatedBy = req.user.userId;
        const examDetails = await examTypeServices.updateExamType(examTypeId, req.body, updatedBy);
        res.status(200).json({ message: "examDetails update succesfully", examDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteExamType(req, res) {
    try {
        const { examTypeId } = req.query;
        if (!examTypeId) {
            return res.status(400).json({ message: "examTypeId is required" });
        }
        const deleted = await examTypeServices.deleteExamType(examTypeId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for examDetails ID ${examTypeId}` });
        } else {
            res.status(404).json({ message: "examDetails not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}