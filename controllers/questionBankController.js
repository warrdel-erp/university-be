import * as questionBankServices from "../services/questionBankServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addQuestion(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;

    try {
        const result = await questionBankServices.addQuestion(req.body, createdBy, updatedBy, universityId);
        return SuccessResponse(res, 201, "Question added to bank successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getAllQuestions(req, res) {
    const universityId = req.user.universityId;
    try {
        const result = await questionBankServices.getQuestions(universityId);
        return SuccessResponse(res, 200, "Questions fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getSingleQuestion(req, res) {
    try {
        const { id } = req.params;
        const result = await questionBankServices.getSingleQuestion(id);

        if (result) {
            return SuccessResponse(res, 200, "Question fetched successfully", result);
        } else {
            return ErrorResponse(res, 404, "Question not found in bank");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateQuestion(req, res) {
    try {
        const { id } = req.body;
        if (!id) {
            return ErrorResponse(res, 400, "id is required in body");
        }
        const updatedBy = req.user.userId;
        const universityId = req.user.universityId;
        const result = await questionBankServices.updateQuestion(id, req.body, updatedBy, universityId);

        return SuccessResponse(res, 200, "Question updated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteQuestion(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            return ErrorResponse(res, 400, "id is required");
        }
        const deleted = await questionBankServices.deleteQuestion(id);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for question ID ${id}`);
        } else {
            return ErrorResponse(res, 404, "Question not found in bank");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
