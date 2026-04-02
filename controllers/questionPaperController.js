import * as questionPaperServices from "../services/questionPaperServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addQuestionPaper(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    try {
        const result = await questionPaperServices.addQuestionPaper(req.body, createdBy, updatedBy);

        return SuccessResponse(res, 201, "Question paper created successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getAllQuestionPapers(req, res) {
    const { page = 1, limit = 10, examScheduleId, createdBy } = req.query;
    const offset = (page - 1) * limit;

    try {
        const result = await questionPaperServices.getQuestionPapers(
            { examScheduleId, createdBy },
            { limit, offset }
        );
        return SuccessResponse(res, 200, "Question papers fetched successfully", result.questionPapers, {
            total: result.total,
            limit: parseInt(limit, 10),
            page: parseInt(page, 10)
        });
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getSingleQuestionPaper(req, res) {
    try {
        const { id } = req.params;

        const result = await questionPaperServices.getSingleQuestionPaper(id);

        if (result) {
            return SuccessResponse(res, 200, "Question paper fetched successfully", result);
        } else {
            return ErrorResponse(res, 404, "Question paper not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateQuestionPaper(req, res) {
    try {
        const { id } = req.body;
        const updatedBy = req.user.userId;

        const result = await questionPaperServices.updateQuestionPaper(id, req.body, updatedBy);

        return SuccessResponse(res, 200, "Question paper updated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteQuestionPaper(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            return ErrorResponse(res, 400, "id is required");
        }
        const deleted = await questionPaperServices.deleteQuestionPaper(id);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for question paper ID ${id}`);
        } else {
            return ErrorResponse(res, 404, "Question paper not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function generateQuestionPaper(req, res) {
    try {
        const { blueprintId, examScheduleId, numberOfPapers = 1 } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const universityId = req.user.universityId;

        if (!blueprintId || !examScheduleId) {
            return ErrorResponse(res, 400, "blueprintId and examScheduleId are required");
        }

        const result = await questionPaperServices.generateQuestionPaper(
            blueprintId,
            examScheduleId,
            numberOfPapers,
            createdBy,
            updatedBy,
            universityId
        );

        return SuccessResponse(res, 201, `${numberOfPapers} Question paper(s) generated successfully`, result);
    } catch (error) {
        console.error("Generate Question Paper Error:", error);
        return ErrorResponse(res, 500, error.message);
    }
}

