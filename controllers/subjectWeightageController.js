import * as subjectWeightageServices from "../services/subjectWeightageServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function createWeightageBulk(req, res) {
    try {
        const userId = req.user.userId;
        const { weightages } = req.body;
        if (!weightages) return ErrorResponse(res, 400, "weightages array is required");

        const result = await subjectWeightageServices.createWeightageBulk(weightages, userId);
        return SuccessResponse(res, 201, "Bulk subject weightages created/updated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 400, error.message);
    }
}

export async function getSubjectsWithWeightages(req, res) {
    try {
        const { sessionId, courseId, term } = req.query;

        if (!sessionId || !courseId || !term) {
            return ErrorResponse(res, 400, "sessionId, courseId and term are mandatory filters");
        }

        const result = await subjectWeightageServices.getSubjectsWithWeightages(
            parseInt(sessionId),
            parseInt(courseId),
            parseInt(term)
        );
        return SuccessResponse(res, 200, "Subjects with weightages fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
