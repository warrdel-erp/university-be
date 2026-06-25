import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

const excludeMeta = ["createdAt", "updatedAt", "deletedAt"];
const excludeTypeMeta = [...excludeMeta, "employeeCodeMasterId", "employee_code_master_id"];

export async function getCodeMasterById(employeeCodeMasterId) {
    const master = await scoped(model.employeeCodeMaster).findOne({
        where: { employeeCodeMasterId },
        attributes: ["employeeCodeMasterId"],
    });
    if (!master) {
        throw new Error("Code master category not found");
    }
    return master;
}

export async function getAllEmployeeType() {
    try {
        return scoped(model.employeeCodeMaster).findAll({
            attributes: { exclude: excludeMeta },
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
        return scoped(model.employeeCodeMaster).findAll({
            attributes: { exclude: excludeMeta },
            where: {
                ...(employeeCodeMasterId && Number(employeeCodeMasterId) !== 0 && { employeeCodeMasterId }),
                ...(key && { codeMasterType: key }),
            },
            include: [
                {
                    model: model.employeeCodeMasterType,
                    as: "codes",
                    attributes: { exclude: excludeTypeMeta },
                    where: buildScope(model.employeeCodeMasterType),
                    required: false,
                },
            ],
        });
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
            return false;
        }

        await scoped(model.employeeCodeMasterType).update(info, {
            where: { employeeCodeMasterTypeId },
        });
        return true;
    } catch (error) {
        console.error(`Error updating code master type ${employeeCodeMasterTypeId}:`, error);
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
        throw error;
    }
}

export async function getEmployeeCodesTypesForStudentImport() {
    try {
        return scoped(model.employeeCodeMaster).findAll({
            attributes: ["employeeCodeMasterId", "codeMasterType"],
            include: [
                {
                    model: model.employeeCodeMasterType,
                    as: "codes",
                    attributes: ["employeeCodeMasterTypeId", "code"],
                    where: buildScope(model.employeeCodeMasterType),
                    required: false,
                },
            ],
        });
    } catch (error) {
        console.error("Error in getting employee code and types in bul import :", error);
        throw error;
    }
}
