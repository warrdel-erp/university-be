import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function addSubAccount(SubAccountData) {
    try {
        return await scoped(model.subAccountModel).create(SubAccountData);
    } catch (error) {
        console.error('Error in add SubAccount :', error);
        throw error;
    }
}

export async function getSubAccountDetails(universityId) {
    try {
        return await scoped(model.subAccountModel).findAll({
            where: { universityId },
        });
    } catch (error) {
        console.error('Error fetching SubAccount details:', error);
        throw error;
    }
}

export async function getSingleSubAccountDetails(subAccountId) {
    try {
        return await scoped(model.subAccountModel).findOne({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
            where: { subAccountId },
            include: [
                {
                    model: model.accountModel,
                    as: 'accountDetail',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching SubAccount details:', error);
        throw error;
    }
}

export async function deleteSubAccount(subAccountId) {
    const existing = await scoped(model.subAccountModel).findOne({
        where: { subAccountId },
        attributes: ['subAccountId'],
    });
    if (!existing) {
        return false;
    }

    const deleted = await scoped(model.subAccountModel).destroy({ where: { subAccountId } });
    return deleted > 0;
}

export async function updateSubAccount(subAccountId, SubAccountData) {
    try {
        const existing = await scoped(model.subAccountModel).findOne({
            where: { subAccountId },
            attributes: ['subAccountId'],
        });
        if (!existing) {
            return [0];
        }

        return await scoped(model.subAccountModel).update(SubAccountData, {
            where: { subAccountId },
        });
    } catch (error) {
        console.error(`Error updating SubAccount creation ${subAccountId}:`, error);
        throw error;
    }
}

/** Global account master list — no tenant columns on account model. */
export async function getAllAccount() {
    try {
        return await scoped(model.accountModel).findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
        });
    } catch (error) {
        console.error('Error fetching account details:', error);
        throw error;
    }
}
