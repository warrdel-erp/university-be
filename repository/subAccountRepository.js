import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

const excludeMeta = ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'];

export async function getAccountById(accountId) {
    return await scoped(model.accountModel).findOne({
        where: { accountId },
        attributes: { exclude: excludeMeta },
    });
}

export async function addSubAccount(SubAccountData) {
    try {
        return await scoped(model.subAccountModel).create(SubAccountData);
    } catch (error) {
        console.error('Error in add SubAccount :', error);
        throw error;
    }
}

export async function getSubAccountDetails() {
    try {
        return await scoped(model.subAccountModel).findAll({
            attributes: { exclude: excludeMeta },
            include: [
                {
                    model: model.accountModel,
                    as: 'accountDetail',
                    attributes: { exclude: excludeMeta },
                },
            ],
        });
    } catch (error) {
        console.error('Error fetching SubAccount details:', error);
        throw error;
    }
}

export async function getSingleSubAccountDetails(subAccountId) {
    try {
        return await scoped(model.subAccountModel).findOne({
            attributes: { exclude: excludeMeta },
            where: { subAccountId },
            include: [
                {
                    model: model.accountModel,
                    as: 'accountDetail',
                    attributes: { exclude: excludeMeta },
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
            return false;
        }

        await scoped(model.subAccountModel).update(SubAccountData, {
            where: { subAccountId },
        });
        return true;
    } catch (error) {
        console.error(`Error updating SubAccount creation ${subAccountId}:`, error);
        throw error;
    }
}

/** Accounts linked to sub_accounts in the active university + institute. */
export async function getAllAccount() {
    try {
        const subAccounts = await scoped(model.subAccountModel).findAll({
            attributes: ['accountId'],
            include: [
                {
                    model: model.accountModel,
                    as: 'accountDetail',
                    attributes: { exclude: excludeMeta },
                    required: true,
                },
            ],
        });

        const accountsById = new Map();
        for (const row of subAccounts) {
            const account = row.accountDetail;
            if (account && !accountsById.has(account.accountId)) {
                accountsById.set(account.accountId, account);
            }
        }
        return [...accountsById.values()];
    } catch (error) {
        console.error('Error fetching account details:', error);
        throw error;
    }
}
