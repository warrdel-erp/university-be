import * as model from '../models/index.js'

export async function getAllEmployeeType() {
    try {
        const result = await model.employeeCodeMaster.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
        });
        return result;
    } catch (error) {
        console.error(`Error in getting all employee type:`, error);
        throw error;
    };
};

export async function addEmployeeCode(data) {
    try {
        const result = await model.employeeCodeMasterType.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee code:", error);
        throw error;
    }
};

export async function getEmployeeCodesTypes(employeeCodeMasterId) {
    let result;
    try {
        if (employeeCodeMasterId !== 0) {
            result = await model.employeeCodeMaster.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.employeeCodeMasterType,
                        as: "codes",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterId","employee_code_master_id"] },
                    },
                    ],
                where: {
                    employeeCodeMasterId:employeeCodeMasterId
                },
            });
        } else {
            result = await model.employeeCodeMaster.findAll({
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include: [
                    {
                        model: model.employeeCodeMasterType,
                        as: "codes",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterId","employee_code_master_id"] },
                    },
                    ],
            });
        };
        return result;
    } catch (error) {
        console.error(`Error in getting employee code and types${employeeCodeMasterId}:`, error);
        throw error;
    };
};

export async function updateCodeMasterType(employeeCodeMasterTypeId, info) {
    try {
        const result = await model.employeeCodeMasterType.update(info, {
            where: {
                employeeCodeMasterTypeId: employeeCodeMasterTypeId
            }
        });
     return result; 
    } catch (error) {
        console.error(`Error updating student entrance details ${employeeCodeMasterTypeId} :`, error);
        throw error; 
    }
};

export async function deleteCodeMasterType (employeeCodeMasterTypeId) {
    try {
        const result = await model.employeeCodeMasterType.destroy({
            where: { employeeCodeMasterTypeId },
            individualHooks: true
        });
        return { message: 'employee Code Master Type deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};