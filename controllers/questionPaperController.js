import * as questionPaperServices from "../services/questionPaperServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { validateEmployeeUser } from "../utility/employeeValidation.js";
import { ROLES } from "../const/roles.js";
import { questionStatus } from "../constant.js";



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
            if (result.status === questionStatus[1] && req.user.role !== ROLES.ADMIN) {
                return ErrorResponse(res, 403, "This question paper is approved and can only be viewed by an administrator.");
            }
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
        const { name, blueprintId, examScheduleId, numberOfPapers = 1 } = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;

        if (!name || !blueprintId || !examScheduleId) {
            return ErrorResponse(res, 400, "name, blueprintId and examScheduleId are required");
        }

        const result = await questionPaperServices.generateQuestionPaper(
            name,
            blueprintId,
            examScheduleId,
            numberOfPapers,
            createdBy,
            updatedBy
        );

        return SuccessResponse(res, 201, `${numberOfPapers} Question paper(s) generated successfully`, result);
    } catch (error) {
        console.error("Generate Question Paper Error:", error);
        return ErrorResponse(res, error.statusCode || 400, error.message);
    }
}

export async function approveQuestionPaper(req, res) {
    try {
        const { questionPaperId, status, remarks } = req.body;
        const updatedBy = req.user.userId;

        const result = await questionPaperServices.approveQuestionPaper({
            questionPaperId,
            status,
            remarks,
            updatedBy
        });

        return SuccessResponse(res, 200, `Question paper status updated to ${status} successfully`, result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}


export async function approvefinalpaper(req, res) {
    try {
        const { examScheduleId } = req.body;
        const updatedBy = req.user.userId;

        const result = await questionPaperServices.approvefinalpaper({
            examScheduleId,
            updatedBy
        });

        return SuccessResponse(res, 200, "Question paper randomly selected and final approved successfully", result);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
}

export async function getMyQuestionPapers(req, res) {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
        return ErrorResponse(res, validation.status, validation.message);
    }
    const { userId } = validation;
    const { page = 1, limit = 10, examScheduleId } = req.query;
    const offset = (page - 1) * limit;

    try {
        const result = await questionPaperServices.getQuestionPapers(
            { examScheduleId, createdBy: userId },
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

export async function addMyQuestionPaper(req, res) {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
        return ErrorResponse(res, validation.status, validation.message);
    }
    const { userId } = validation;

    try {
        const result = await questionPaperServices.addQuestionPaper(req.body, userId, userId);

        return SuccessResponse(res, 201, "Question paper created successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getMySingleQuestionPaper(req, res) {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
        return ErrorResponse(res, validation.status, validation.message);
    }
    const { userId } = validation;
    try {
        const { id } = req.params;

        const result = await questionPaperServices.getSingleQuestionPaper(id, userId);

        if (result) {
            return SuccessResponse(res, 200, "Question paper fetched successfully", result);
        } else {
            return ErrorResponse(res, 404, "Question paper not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateMyQuestionPaper(req, res) {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
        return ErrorResponse(res, validation.status, validation.message);
    }
    const { userId } = validation;
    try {
        const { id } = req.body;
        const result = await questionPaperServices.updateQuestionPaper(id, req.body, userId, userId);

        if (result[0] > 0) {
            return SuccessResponse(res, 200, "Question paper updated successfully", result);
        } else {
            return ErrorResponse(res, 404, "Question paper not found or unauthorized");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function deleteMyQuestionPaper(req, res) {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
        return ErrorResponse(res, validation.status, validation.message);
    }
    const { userId } = validation;
    try {
        const { id } = req.params;
        if (!id) {
            return ErrorResponse(res, 400, "id is required");
        }
        const deleted = await questionPaperServices.deleteQuestionPaper(id, userId);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for question paper ID ${id}`);
        } else {
            return ErrorResponse(res, 404, "Question paper not found or unauthorized");
        }
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function generateMyQuestionPaper(req, res) {
    try {
        const validation = await validateEmployeeUser(req, res);
        if (!validation.valid) {
            return ErrorResponse(res, validation.status, validation.message);
        }
        const { userId } = validation;

        const { name, blueprintId, examScheduleId, numberOfPapers = 1 } = req.body;

        if (!name || !blueprintId || !examScheduleId) {
            return ErrorResponse(res, 400, "name, blueprintId and examScheduleId are required");
        }

        const result = await questionPaperServices.generateQuestionPaper(
            name,
            blueprintId,
            examScheduleId,
            numberOfPapers,
            userId,
            userId
        );

        return SuccessResponse(res, 201, `${numberOfPapers} Question paper(s) generated successfully`, result);
    } catch (error) {
        console.error("Generate My Question Paper Error:", error);
        return ErrorResponse(res, error.statusCode || 400, error.message);
    }
}