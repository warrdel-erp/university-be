import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function addDepartmentStructure(departmentStructureData) {
    try {
        const result = await scoped(model.departmentStructureModel).create(departmentStructureData);
        return result;
    } catch (error) {
        console.error("Error in add department Structure :", error);
        throw error;
    }
};

export async function getdepartmentStructureDetails() {
    try {
        const departmentStructure = await scoped(model.departmentStructureModel).findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include:
                [
                    {
                        model: model.accountModel,
                        as: "mainAccount",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                    {
                        model: model.subAccountModel,
                        as: "subAccountDetails",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                ]
        });

        return departmentStructure;
    } catch (error) {
        console.error('Error fetching departmentStructure details:', error);
        throw error;
    }
}


export async function getSingledepartmentStructureDetails(departmentStructureId) {
    try {
        const departmentStructure = await scoped(model.departmentStructureModel).findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { departmentStructureId },
            include:
            [
                {
                    model: model.accountModel,
                    as: "mainAccount",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                },
                {
                    model: model.subAccountModel,
                    as: "subAccountDetails",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                },
            ]
        });

        return departmentStructure;
    } catch (error) {
        console.error('Error fetching departmentStructure details:', error);
        throw error;
    }
}

export async function deletedepartmentStructure(departmentStructureId) {
    const deleted = await scoped(model.departmentStructureModel).destroy({ where: { departmentStructureId } });
    return deleted > 0;
}

export async function updatedepartmentStructure(departmentStructureId, departmentStructureData) {
    try {
        const result = await scoped(model.departmentStructureModel).update(departmentStructureData, {
            where: { departmentStructureId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating departmentStructure creation ${departmentStructureId}:`, error);
        throw error;
    }
}
