import * as examSetupTypeServices from '../services/examSetupTypeServices.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';

export const getExamSetupTypes = async (req, res) => {
    try {
        const { courseId, term } = req.query;
        const universityId = req.user.universityId;

        if (!courseId || !term) {
            return ErrorResponse(res, 400, "courseId and term are required query parameters");
        }

        const filters = {
            courseId: parseInt(courseId),
            term: parseInt(term),
            universityId
        };

        const result = await examSetupTypeServices.getExamSetupTypes(filters);
        return SuccessResponse(res, 200, "Exam setup types fetched successfully", result);
    } catch (error) {
        console.error("Error in getExamSetupTypes controller:", error);
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};
