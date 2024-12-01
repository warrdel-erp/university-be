import * as DormitoryListCreationService  from "../repository/dormitoryListRepository.js";

export async function addDormitoryList(DormitoryListData, createdBy, updatedBy) {

        DormitoryListData.createdBy = createdBy;
        DormitoryListData.updatedBy = updatedBy;
        const DormitoryList = await DormitoryListCreationService.addDormitoryList(DormitoryListData);
        return DormitoryList;
};

export async function getDormitoryListDetails(universityId) {
    return await DormitoryListCreationService.getDormitoryListDetails(universityId);
}

export async function getSingleDormitoryListDetails(dormitoryListId,universityId) {
    return await DormitoryListCreationService.getSingleDormitoryListDetails(dormitoryListId,universityId);
}

export async function deleteDormitoryList(dormitoryListId) {
    return await DormitoryListCreationService.deleteDormitoryList(dormitoryListId);
}

export async function updateDormitoryList(dormitoryListId, DormitoryListData, updatedBy) {    

    DormitoryListData.updatedBy = updatedBy;
    await DormitoryListCreationService.updateDormitoryList(dormitoryListId, DormitoryListData);
}