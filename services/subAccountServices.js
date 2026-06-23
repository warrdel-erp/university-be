import * as SubAccountCreationService from '../repository/subAccountRepository.js';

export async function addSubAccount(SubAccountData, createdBy, updatedBy) {
    SubAccountData.createdBy = createdBy;
    SubAccountData.updatedBy = updatedBy;
    return await SubAccountCreationService.addSubAccount(SubAccountData);
}

export async function getSubAccountDetails(universityId) {
    return await SubAccountCreationService.getSubAccountDetails(universityId);
}

export async function getSingleSubAccountDetails(subAccountId) {
    return await SubAccountCreationService.getSingleSubAccountDetails(subAccountId);
}

export async function deleteSubAccount(subAccountId) {
    return await SubAccountCreationService.deleteSubAccount(subAccountId);
}

export async function updateSubAccount(subAccountId, SubAccountData, updatedBy) {
    SubAccountData.updatedBy = updatedBy;
    await SubAccountCreationService.updateSubAccount(subAccountId, SubAccountData);
}

export async function getAllAccount() {
    return await SubAccountCreationService.getAllAccount();
}
