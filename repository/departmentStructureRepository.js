import * as model from '../models/index.js'

export async function addDepartmentStructure(departmentStructureData) {
    try {
        const result = await model.departmentStructureModel.create(departmentStructureData);
        return result;
    } catch (error) {
        console.error("Error in add department Structure :", error);
        throw error;
    }
};

export async function getdepartmentStructureDetails(universityId) {
    try {
        const departmentStructure = await model.departmentStructureModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { universityId },
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
                    // {
                    //     model: model.subAccountModel,
                    //     as: "parentAccount",
                    //     foreignKey: "sub_account_id",
                    //     // attributes: ['location'],
                    // },
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
        const departmentStructure = await model.departmentStructureModel.findOne({
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
                // {
                //     model: model.subAccountModel,
                //     as: "departmentStructures",
                //     // foreignKey: "sub_account_id",
                //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                // },
            ]
        });

        return departmentStructure;
    } catch (error) {
        console.error('Error fetching departmentStructure details:', error);
        throw error;
    }
}

export async function deletedepartmentStructure(departmentStructureId) {
    const deleted = await model.departmentStructureModel.destroy({ where: { departmentStructureId: departmentStructureId } });
    return deleted > 0;
}

export async function updatedepartmentStructure(departmentStructureId, departmentStructureData) {
    try {
        const result = await model.departmentStructureModel.update(departmentStructureData, {
            where: { departmentStructureId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating departmentStructure creation ${departmentStructureId}:`, error);
        throw error;
    }
}