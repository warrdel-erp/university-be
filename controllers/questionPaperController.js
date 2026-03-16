import * as questionPaperServices from "../services/questionPaperServices.js";

export async function addQuestionPaper(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    try {
        const result = await questionPaperServices.addQuestionPaper(req.body, createdBy, updatedBy);

        res.status(201).json({ message: "Question paper created successfully", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllQuestionPapers(req, res) {
    try {
        const result = await questionPaperServices.getQuestionPapers();
        res.status(200).json({ result, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
}

export async function getSingleQuestionPaper(req, res) {
    try {
        const { id } = req.params;

        const result = await questionPaperServices.getSingleQuestionPaper(id);

        if (result) {
            res.status(200).json({ data: result, success: true });
        } else {
            res.status(404).json({ message: "Question paper not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateQuestionPaper(req, res) {
    try {
        const { id } = req.body;
        const updatedBy = req.user.userId;

        const result = await questionPaperServices.updateQuestionPaper(id, req.body, updatedBy);

        res.status(200).json({ message: "Question paper updated successfully", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteQuestionPaper(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "id is required" });
        }
        const deleted = await questionPaperServices.deleteQuestionPaper(id);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for question paper ID ${id}` });
        } else {
            res.status(404).json({ message: "Question paper not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

