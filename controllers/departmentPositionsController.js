import * as departmentPositionsService from '../services/departmentPositionsService.js';
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addDepartmentPosition(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const departmentPosition = await departmentPositionsService.addOrgPosition(
            req.body,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 201, "Data added successfully", departmentPosition);
    } catch (error) {
        const status = /not found|Invalid/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function getAllDepartmentPositions(req, res) {
    try {
        const { departmentId, employmentCategory, isVacant, publishStatus } = req.query;
        const positions = await departmentPositionsService.getOrgPositions({
            departmentId,
            employmentCategory,
            isVacant,
            publishStatus,
        });
        return SuccessResponse(res, 200, "Department positions fetched successfully", positions);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getDepartmentPositionCards(req, res) {
    try {
        const { changePeriod } = req.query;
        const cards = await departmentPositionsService.getOrgCardsStats(changePeriod);
        return SuccessResponse(res, 200, "Department position cards fetched successfully", cards);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getSingleDepartmentPosition(req, res) {
    try {
        const { departmentPositionId } = req.query;
        const departmentPosition = await departmentPositionsService.getOrgPositionById(
            departmentPositionId,
        );
        if (!departmentPosition) {
            return ErrorResponse(res, 404, "Department position not found");
        }
        return SuccessResponse(res, 200, "Department position fetched successfully", departmentPosition);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function updateDepartmentPosition(req, res) {
    try {
        const { departmentPositionId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await departmentPositionsService.updateOrgPosition(
            departmentPositionId,
            req.body,
            updatedBy,
        );
        if (!updated) {
            return ErrorResponse(res, 404, "Department position not found");
        }
        return SuccessResponse(res, 200, "Department position update succesfully");
    } catch (error) {
        const status = /not found|Invalid/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function deleteDepartmentPosition(req, res) {
    try {
        const { departmentPositionId } = req.query;
        const updatedBy = req.user.userId;
        const deleted = await departmentPositionsService.deleteOrgPosition(
            departmentPositionId,
            updatedBy,
        );
        if (!deleted) {
            return ErrorResponse(res, 404, "Department position not found");
        }
        return SuccessResponse(res, 200, `Delete successful for departmentPosition ID ${departmentPositionId}`);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function addUserDepartmentPosition(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const userDepartmentPosition = await departmentPositionsService.addHead(
            req.body,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 201, "Data added successfully", userDepartmentPosition);
    } catch (error) {
        const status = /not found|Invalid|already has/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function getUserDepartmentPositions(req, res) {
    try {
        const { departmentPositionId } = req.query;
        const userDepartmentPositions = await departmentPositionsService.getHeadsByPositionId(
            departmentPositionId,
        );
        return SuccessResponse(res, 200, "User department positions fetched successfully", userDepartmentPositions);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function updateUserDepartmentPosition(req, res) {
    try {
        const { userDepartmentPositionId } = req.body;
        const updatedBy = req.user.userId;
        const userDepartmentPosition = await departmentPositionsService.updateHead(
            userDepartmentPositionId,
            req.body,
            updatedBy,
        );
        if (!userDepartmentPosition) {
            return ErrorResponse(res, 404, "User department position not found");
        }
        return SuccessResponse(res, 200, "User department position update succesfully", userDepartmentPosition);
    } catch (error) {
        const status = /Invalid/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function deleteUserDepartmentPosition(req, res) {
    try {
        const { userDepartmentPositionId, endDate } = req.query;
        const updatedBy = req.user.userId;
        const inactivated = await departmentPositionsService.deleteHead(
            userDepartmentPositionId,
            updatedBy,
            endDate,
        );
        if (!inactivated) {
            return ErrorResponse(res, 404, "User department position not found");
        }
        return SuccessResponse(res, 200, "User department position marked inactive");
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getDepartmentPositionTree(req, res) {
    try {
        const tree = await departmentPositionsService.getOrgTreeData();
        return SuccessResponse(res, 200, "Department position tree fetched successfully", tree);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getDepartmentPositionChart(req, res) {
    try {
        const chart = await departmentPositionsService.getOrgChart();
        return SuccessResponse(res, 200, "Department position chart fetched successfully", chart);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getDepartmentPositionsByDepartment(req, res) {
    try {
        const { departmentId } = req.query;
        const positions = await departmentPositionsService.getPositionsByDepartment(departmentId);
        return SuccessResponse(res, 200, "Department positions for department fetched successfully", positions);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}
