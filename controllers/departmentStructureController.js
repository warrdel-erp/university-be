import * as departmentStructureCreation from "../services/departmentStructureServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addDepartmentStructure(req, res) {
    const { departmentId, parentDepartmentId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const payload = {
            ...req.body,
            departmentId: departmentId == null ? null : Number(departmentId),
            parentDepartmentId: parentDepartmentId == null ? null : Number(parentDepartmentId),
        };
        const departmentStructure = await departmentStructureCreation.addDepartmentStructure(payload, createdBy, updatedBy);
        return SuccessResponse(res, 201, "Data added successfully", departmentStructure);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

export async function getAlldepartmentStructure(req, res) {
    try {
        const departmentStructureDetails = await departmentStructureCreation.getdepartmentStructureDetails();
        return SuccessResponse(res, 200, "Department structure details fetched successfully", departmentStructureDetails);
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function getSingledepartmentStructureDetails(req, res) {
    try {
        const { departmentStructureId } = req.query;
        const departmentStructure = await departmentStructureCreation.getSingledepartmentStructureDetails(departmentStructureId);
        if (departmentStructure) {
            return SuccessResponse(res, 200, "Department structure details fetched successfully", departmentStructure);
        } else {
            return ErrorResponse(res, 404, "Department structure not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function updatedepartmentStructure(req, res) {
    try {
        const { departmentStructureId } = req.body;
        if (!departmentStructureId) {
            return ErrorResponse(res, 400, "departmentStructureId is required");
        }
        const updatedBy = req.user.userId;
        await departmentStructureCreation.updatedepartmentStructure(departmentStructureId, req.body, updatedBy);
        return SuccessResponse(res, 200, "Department structure update succesfully");
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}

export async function deletedepartmentStructure(req, res) {
    try {
        const { departmentStructureId } = req.query;
        if (!departmentStructureId) {
            return ErrorResponse(res, 400, "departmentStructureId is required");
        }
        const deleted = await departmentStructureCreation.deletedepartmentStructure(departmentStructureId);
        if (deleted) {
            return SuccessResponse(res, 200, `Delete successful for departmentStructure ID ${departmentStructureId}`);
        } else {
            return ErrorResponse(res, 404, "Department structure not found");
        }
    } catch (error) {
        return ErrorResponse(res, 500, "Internal Server Error", error.message);
    }
}
