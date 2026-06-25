import * as SubAccountCreationService from '../repository/subAccountRepository.js';

export async function addSubAccount(SubAccountData, createdBy, updatedBy) {
    const account = await SubAccountCreationService.getAccountById(SubAccountData.accountId);
    if (!account) {
        throw new Error('Account not found');
    }

    SubAccountData.createdBy = createdBy;
    SubAccountData.updatedBy = updatedBy;
    return await SubAccountCreationService.addSubAccount(SubAccountData);
}

export async function getSubAccountDetails() {
    return await SubAccountCreationService.getSubAccountDetails();
}

export async function getSingleSubAccountDetails(subAccountId) {
    return await SubAccountCreationService.getSingleSubAccountDetails(subAccountId);
}

export async function deleteSubAccount(subAccountId) {
    return await SubAccountCreationService.deleteSubAccount(subAccountId);
}

export async function updateSubAccount(subAccountId, SubAccountData, updatedBy) {
    if (SubAccountData.accountId) {
        const account = await SubAccountCreationService.getAccountById(SubAccountData.accountId);
        if (!account) {
            throw new Error('Account not found');
        }
    }

    const {
        instituteId: _instituteId,
        universityId: _universityId,
        subAccountId: _subAccountId,
        ...updateData
    } = SubAccountData;
    updateData.updatedBy = updatedBy;
    return await SubAccountCreationService.updateSubAccount(subAccountId, updateData);
}

export async function getAllAccount() {
    return await SubAccountCreationService.getAllAccount();
}
