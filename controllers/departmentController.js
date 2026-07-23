import * as DepartmentCreation from "../services/departmentService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addDepartment(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    const departmentDetails = await DepartmentCreation.addDepartment(
      req.body,
      createdBy,
      updatedBy,
    );
    return SuccessResponse(res, "Data added successfully", departmentDetails);
  } catch (error) {
    return ErrorResponse(res, error.message, 500);
  }
}

export async function getAllDepartment(req, res) {
  try {
    const departmentDetails = await DepartmentCreation.getDepartmentDetails();
    return SuccessResponse(
      res,
      "Department details fetched successfully",
      departmentDetails,
    );
  } catch (error) {
    return ErrorResponse(res, error.message, 500);
  }
}

export async function getSingleDepartmentDetails(req, res) {
  try {
    const { departmentId } = req.query;
    const departmentDetails =
      await DepartmentCreation.getSingleDepartmentDetails(departmentId);
    if (departmentDetails) {
      return SuccessResponse(
        res,
        "Department details fetched successfully",
        departmentDetails,
      );
    } else {
      return ErrorResponse(res, "Department details not found", 404);
    }
  } catch (error) {
    return ErrorResponse(res, error.message, 500);
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
      return ErrorResponse(res, "Department details not found", 404);
    }
    return SuccessResponse(res, "Department details updated successfully");
  } catch (error) {
    return ErrorResponse(res, error.message, 500);
  }
}

export async function deleteDepartment(req, res) {
  try {
    const { departmentId } = req.query;
    const deleted = await DepartmentCreation.deleteDepartment(departmentId);
    if (deleted) {
      return SuccessResponse(
        res,
        `Delete successful for departmentDetails ID ${departmentId}`,
      );
    } else {
      return ErrorResponse(res, "Department details not found", 404);
    }
  } catch (error) {
    return ErrorResponse(res, error.message, 500);
  }
}

export async function getDepartmentByIdEmployee(req, res) {
  try {
    const { departmentId } = req.query;
    const departmentDetails =
      await DepartmentCreation.getDepartmentByIdEmployee(departmentId);
    if (departmentDetails) {
      return SuccessResponse(
        res,
        "Department details fetched successfully",
        departmentDetails,
      );
    } else {
      return ErrorResponse(res, "Department details not found", 404);
    }
  } catch (error) {
    return ErrorResponse(res, error.message, 500);
  }
}
