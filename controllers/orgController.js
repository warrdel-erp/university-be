import * as orgServices from '../services/orgServices.js';
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addOrgPosition(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const orgPosition = await orgServices.addOrgPosition(
            req.body,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 201, "Data added successfully", orgPosition);
    } catch (error) {
        const status = /not found|Invalid/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function getAllOrgPositions(req, res) {
    try {
        const { departmentId, employmentCategory, isVacant } = req.query;
        const positions = await orgServices.getOrgPositions({
            departmentId,
            employmentCategory,
            isVacant,
        });
        return SuccessResponse(res, 200, "Organization positions fetched successfully", positions);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getOrgCards(req, res) {
    try {
        const cards = await orgServices.getOrgCardsStats();
        return SuccessResponse(res, 200, "Organization cards fetched successfully", cards);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getSingleOrgPosition(req, res) {
    try {
        const { orgPositionId } = req.query;
        const orgPosition = await orgServices.getOrgPositionById(
            orgPositionId,
        );
        if (!orgPosition) {
            return ErrorResponse(res, 404, "Organization position not found");
        }
        return SuccessResponse(res, 200, "Organization position fetched successfully", orgPosition);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function updateOrgPosition(req, res) {
    try {
        const { orgPositionId } = req.body;
        const updatedBy = req.user.userId;
        const updated = await orgServices.updateOrgPosition(
            orgPositionId,
            req.body,
            updatedBy,
        );
        if (!updated) {
            return ErrorResponse(res, 404, "Organization position not found");
        }
        return SuccessResponse(res, 200, "Organization position update succesfully");
    } catch (error) {
        const status = /not found|Invalid/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function deleteOrgPosition(req, res) {
    try {
        const { orgPositionId } = req.query;
        const deleted = await orgServices.deleteOrgPosition(orgPositionId);
        if (!deleted) {
            return ErrorResponse(res, 404, "Organization position not found");
        }
        return SuccessResponse(res, 200, `Delete successful for orgPosition ID ${orgPositionId}`);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function markPositionVacant(req, res) {
    try {
        const { orgPositionId } = req.body;
        const updatedBy = req.user.userId;
        const orgPosition = await orgServices.markPositionVacant(
            orgPositionId,
            updatedBy,
        );
        return SuccessResponse(res, 200, "Position marked vacant", orgPosition);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function addHead(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const head = await orgServices.addHead(
            req.body,
            createdBy,
            updatedBy,
        );
        return SuccessResponse(res, 201, "Data added successfully", head);
    } catch (error) {
        const status = /not found|Invalid|already has/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function getHeads(req, res) {
    try {
        const { orgPositionId } = req.query;
        const heads = await orgServices.getHeadsByPositionId(
            orgPositionId,
        );
        return SuccessResponse(res, 200, "Heads fetched successfully", heads);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function updateHead(req, res) {
    try {
        const { orgPositionHeadId } = req.body;
        const updatedBy = req.user.userId;
        const head = await orgServices.updateHead(
            orgPositionHeadId,
            req.body,
            updatedBy,
        );
        if (!head) {
            return ErrorResponse(res, 404, "Head not found");
        }
        return SuccessResponse(res, 200, "Head update succesfully", head);
    } catch (error) {
        const status = /Invalid/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, "Internal Server Error", error.message);
    }
}

export async function deleteHead(req, res) {
    try {
        const { orgPositionHeadId } = req.query;
        const updatedBy = req.user.userId;
        const deleted = await orgServices.deleteHead(
            orgPositionHeadId,
            updatedBy,
        );
        if (!deleted) {
            return ErrorResponse(res, 404, "Head not found");
        }
        return SuccessResponse(res, 200, `Delete successful for head ID ${orgPositionHeadId}`);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getOrgTree(req, res) {
    try {
        const tree = await orgServices.getOrgTreeData();
        return SuccessResponse(res, 200, "Organization tree fetched successfully", tree);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getOrgChart(req, res) {
    try {
        const chart = await orgServices.getOrgChart();
        return SuccessResponse(res, 200, "Organization chart fetched successfully", chart);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getPositionsByDepartment(req, res) {
    try {
        const { departmentId } = req.query;
        const positions = await orgServices.getPositionsByDepartment(departmentId);
        return SuccessResponse(res, 200, "Positions for department fetched successfully", positions);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}
