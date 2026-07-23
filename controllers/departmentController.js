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
    return SuccessResponse(res, 200, "Data added successfully", departmentDetails);
  } catch (error) {
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
  }
}

export async function getAllDepartment(req, res) {
  try {
    const departmentDetails = await DepartmentCreation.getDepartmentDetails();
    return SuccessResponse(
      res,
      200,
      "Department details fetched successfully",
      departmentDetails,
    );
  } catch (error) {
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
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
        200,
        "Department details fetched successfully",
        departmentDetails,
      );
    } else {
      return ErrorResponse(res, 404, "Department details not found");
    }
  } catch (error) {
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
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
      return ErrorResponse(res, 404, "Department details not found");
    }
    return SuccessResponse(res, 200, "Department details updated successfully");
  } catch (error) {
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
  }
}

export async function deleteDepartment(req, res) {
  try {
    const { departmentId } = req.query;
    const deleted = await DepartmentCreation.deleteDepartment(departmentId);
    if (deleted) {
      return SuccessResponse(
        res,
        200,
        `Delete successful for departmentDetails ID ${departmentId}`,
      );
    } else {
      return ErrorResponse(res, 404, "Department details not found");
    }
  } catch (error) {
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
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
      return ErrorResponse(res, 404, "Department details not found");
    }
  } catch (error) {
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
  }
}
