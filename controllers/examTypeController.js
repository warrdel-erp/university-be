import * as examTypeServices from "../services/examTypeServices.js";

export async function addExamType(req, res) {
    try {
        const user = req.user;
        const examType = await examTypeServices.addExamType(req.body, user);
        res.status(201).json({ message: "Data added successfully", examType });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllExamType(req, res) {
    try {
        const user = req.user;
        const academicYearId = req.query.academicYearId || user?.academicYearId;
        const libraries = await examTypeServices.getExamType(academicYearId, user);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleExamType(req, res) {
    try {
        const { examTypeId } = req.query;
        const examDetails = await examTypeServices.getSingleExamType(examTypeId);
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
        const { examTypeId } = req.body;
        if (!examTypeId) {
            return res.status(400).send('examTypeId is required');
        }
        const user = req.user;
        const examDetails = await examTypeServices.updateExamType(examTypeId, req.body, user);
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
