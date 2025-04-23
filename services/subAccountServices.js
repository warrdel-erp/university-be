import * as SubAccountCreationService  from "../repository/subAccountRepository.js";

export async function addSubAccount(SubAccountData, createdBy, updatedBy,universityId) {

        SubAccountData.createdBy = createdBy;
        SubAccountData.updatedBy = updatedBy;
        SubAccountData.universityId = universityId;
        const SubAccount = await SubAccountCreationService.addSubAccount(SubAccountData);
        return SubAccount;
};

export async function getSubAccountDetails(universityId) {
        console.log("universityId--------------", universityId);
    const data = await SubAccountCreationService.getSubAccountDetails(universityId);
        console.log("data--------------", data);
        return data;
}

export async function getSingleSubAccountDetails(subAccountId,universityId) {
    return await SubAccountCreationService.getSingleSubAccountDetails(subAccountId,universityId);
}

export async function deleteSubAccount(subAccountId) {
    return await SubAccountCreationService.deleteSubAccount(subAccountId);
}

export async function updateSubAccount(subAccountId, SubAccountData, updatedBy) {    

    SubAccountData.updatedBy = updatedBy;
    await SubAccountCreationService.updateSubAccount(subAccountId, SubAccountData);
};

export async function getAllAccount() {
    return await SubAccountCreationService.getAllAccount();
}
