import * as DepartmentCreation from "../services/departmentService.js";
import { successResponse, errorResponse } from "../utility/response.js";

export async function addDepartment(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    const departmentDetails = await DepartmentCreation.addDepartment(
      req.body,
      createdBy,
      updatedBy,
    );
    return successResponse(res, "Data added successfully", departmentDetails);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

export async function getAllDepartment(req, res) {
  try {
    const departmentDetails = await DepartmentCreation.getDepartmentDetails();
    return successResponse(
      res,
      "Department details fetched successfully",
      departmentDetails,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

export async function getSingleDepartmentDetails(req, res) {
  try {
    const { departmentId } = req.query;
    const departmentDetails =
      await DepartmentCreation.getSingleDepartmentDetails(departmentId);
    if (departmentDetails) {
      return successResponse(
        res,
        "Department details fetched successfully",
        departmentDetails,
      );
    } else {
      return errorResponse(res, "Department details not found", 404);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

export async function updateDepartment(req, res) {
  try {
    const { departmentId, ...updateData } = req.body;
    const updatedBy = req.user.userId;
    const updated = await DepartmentCreation.updateDepartment(
      departmentId,
      updateData,
      updatedBy,
    );
    if (!updated) {
      return errorResponse(res, "Department details not found", 404);
    }
    return successResponse(res, "Department details updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

export async function deleteDepartment(req, res) {
  try {
    const { departmentId } = req.query;
    const deleted = await DepartmentCreation.deleteDepartment(departmentId);
    if (deleted) {
      return successResponse(
        res,
        `Delete successful for departmentDetails ID ${departmentId}`,
      );
    } else {
      return errorResponse(res, "Department details not found", 404);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

export async function getDepartmentByIdEmployee(req, res) {
  try {
    const { departmentId } = req.query;
    const departmentDetails =
      await DepartmentCreation.getDepartmentByIdEmployee(departmentId);
    if (departmentDetails) {
      return successResponse(
        res,
        "Department details fetched successfully",
        departmentDetails,
      );
    } else {
      return errorResponse(res, "Department details not found", 404);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}
