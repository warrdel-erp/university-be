import * as questionPaperBlueprintServices from "../services/questionPaperBlueprintServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

/**
 * Add a new question paper blueprint
 *
 * @param {Object} req - The express request object containing blueprint data.
 * @param {Object} res - The express response object.
 * @returns {Promise<Object>} - A SuccessResponse or ErrorResponse.
 */
export async function addBlueprint(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;

    try {
        const result = await questionPaperBlueprintServices.addBlueprint(req.body, createdBy, updatedBy, universityId);
        return SuccessResponse(res, 201, "Question paper blueprint added successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

/**
 * Get all question paper blueprints for the university, optionally filtered by subject.
 *
 * @param {Object} req - The express request object with optional subjectId in query.
 * @param {Object} res - The express response object.
 * @returns {Promise<Object>} - A SuccessResponse or ErrorResponse.
 */
export async function getAllBlueprints(req, res) {
    const universityId = req.user.universityId;
    const { subjectId } = req.query;

    try {
        const result = await questionPaperBlueprintServices.getBlueprints(universityId, { subjectId });
        return SuccessResponse(res, 200, "Question paper blueprints fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

/**
 * Delete a question paper blueprint.
 *
 * @param {Object} req - The express request object with blueprint ID in params.
 * @param {Object} res - The express response object.
 * @returns {Promise<Object>} - A SuccessResponse or ErrorResponse.
 */
export async function deleteBlueprint(req, res) {
    const { id } = req.params;
    const universityId = req.user.universityId;

    if (!id) {
        return ErrorResponse(res, 400, "Blueprint ID is required");
    }

    try {
        const deleted = await questionPaperBlueprintServices.deleteBlueprint(id, universityId);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for blueprint ID ${id}`);
        } else {
            return ErrorResponse(res, 404, "Blueprint not found in bank");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
