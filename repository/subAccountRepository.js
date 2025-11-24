import * as model from '../models/index.js'

export async function addSubAccount(SubAccountData) {
    try {
        const result = await model.subAccountModel.create(SubAccountData);
        return result;
    } catch (error) {
        console.error("Error in add SubAccount :", error);
        throw error;
    }
};

export async function getSubAccountDetails(universityId) {
    try {
        const SubAccount = await model.subAccountModel.findAll({
            // attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            // where: { universityId :universityId },
            // include:
            //     [
            //         {
            //             model: model.accountModel,
            //             as: "accountDetail",
            //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            //         },
            // ]
        });
        return SubAccount;
    } catch (error) {
        console.error('Error fetching SubAccount details:', error);
        throw error;
    }
}


export async function getSingleSubAccountDetails(subAccountId) {
    try {
        const SubAccount = await model.subAccountModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { subAccountId },
            include:
                [
                    {
                        model: model.accountModel,
                        as: "accountDetail",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
            ]
        });

        return SubAccount;
    } catch (error) {
        console.error('Error fetching SubAccount details:', error);
        throw error;
    }
}

export async function deleteSubAccount(subAccountId) {
    const deleted = await model.subAccountModel.destroy({ where: { subAccountId: subAccountId } });
    return deleted > 0;
}

export async function updateSubAccount(subAccountId, SubAccountData) {
    try {
        const result = await model.subAccountModel.update(SubAccountData, {
            where: { subAccountId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating SubAccount creation ${subAccountId}:`, error);
        throw error;
    }
}

export async function getAllAccount() {
    try {
        const account = await model.accountModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            
        });

        return account;
    } catch (error) {
        console.error('Error fetching account details:', error);
        throw error;
    }
}
