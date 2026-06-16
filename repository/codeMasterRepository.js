import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function getAllEmployeeType() {
  try {
    return scoped(model.employeeCodeMaster).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error in getting all employee type:", error);
    throw error;
  }
}

export async function addEmployeeCode(data) {
  try {
    return scoped(model.employeeCodeMasterType).create(data);
  } catch (error) {
    console.error("Error in add employee code:", error);
    throw error;
  }
}

export async function getEmployeeCodesTypes(employeeCodeMasterId, key) {
  try {
    const queryOptions = {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        {
          model: model.employeeCodeMasterType.unscoped(),
          as: "codes",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt", "employeeCodeMasterId", "employee_code_master_id"],
          },
          include: [
            {
              model: model.userModel.unscoped(),
              as: "userEmployeeCodeType",
              attributes: ["universityId", "userId"],
              where: buildScope(model.userModel),
              required: true,
            },
          ],
        },
      ],
      where: {},
    };

    if (employeeCodeMasterId && Number(employeeCodeMasterId) !== 0) {
      queryOptions.where.employeeCodeMasterId = employeeCodeMasterId;
    }

    if (key) {
      queryOptions.where.codeMasterType = key;
    }

    return scoped(model.employeeCodeMaster).findAll(queryOptions);
  } catch (error) {
    console.error(`Error in getting employee code and types for Id ${employeeCodeMasterId} or key ${key}:`, error);
    throw error;
  }
}

export async function updateCodeMasterType(employeeCodeMasterTypeId, info) {
  try {
    const existing = await scoped(model.employeeCodeMasterType).findOne({
      attributes: ["employeeCodeMasterTypeId"],
      where: { employeeCodeMasterTypeId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.employeeCodeMasterType).update(info, {
      where: { employeeCodeMasterTypeId },
    });
  } catch (error) {
    console.error(`Error updating student entrance details ${employeeCodeMasterTypeId} :`, error);
    throw error;
  }
}

export async function deleteCodeMasterType(employeeCodeMasterTypeId) {
  try {
    const existing = await scoped(model.employeeCodeMasterType).findOne({
      attributes: ["employeeCodeMasterTypeId"],
      where: { employeeCodeMasterTypeId },
    });
    if (!existing) {
      throw new Error("Code master type not found");
    }

    await scoped(model.employeeCodeMasterType).destroy({
      where: { employeeCodeMasterTypeId },
      individualHooks: true,
    });
    return { message: "employee Code Master Type deleted successfully" };
  } catch (error) {
    console.error("Error during soft delete:", error);
    throw new Error("Unable to soft delete account");
  }
}

export async function getEmployeeCodesTypesForStudentImport() {
  try {
    return scoped(model.employeeCodeMaster).findAll({
      attributes: ["employeeCodeMasterId", "codeMasterType"],
      include: [
        {
          model: model.employeeCodeMasterType.unscoped(),
          as: "codes",
          attributes: ["employeeCodeMasterTypeId", "code"],
          include: [
            {
              model: model.userModel.unscoped(),
              as: "userEmployeeCodeType",
              attributes: ["universityId"],
              where: buildScope(model.userModel),
              required: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error in getting employee code and types in bul import :", error);
    throw error;
  }
}
