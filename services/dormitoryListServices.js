import * as DormitoryListCreationService from "../repository/dormitoryListRepository.js";

export async function addDormitoryList(dormitoryListData, createdBy, updatedBy,instituteId) {
    dormitoryListData.createdBy = createdBy;
    dormitoryListData.updatedBy = updatedBy;
    dormitoryListData.instituteId=instituteId
    const DormitoryList = await DormitoryListCreationService.addDormitoryList(dormitoryListData);
    return DormitoryList;
}

export async function getDormitoryListDetails(universityId,acedmicYearId,role,instituteId) {
    return await DormitoryListCreationService.getDormitoryListDetails(universityId,acedmicYearId,role,instituteId);
}

export async function getSingleDormitoryListDetails(dormitoryListId, universityId) {
    return await DormitoryListCreationService.getSingleDormitoryListDetails(dormitoryListId, universityId);
}

export async function deleteDormitoryList(dormitoryListId) {
    return await DormitoryListCreationService.deleteDormitoryList(dormitoryListId);
}

export async function updateDormitoryList(dormitoryListId, dormitoryListData, updatedBy) {

    dormitoryListData.updatedBy = updatedBy;
    await DormitoryListCreationService.updateDormitoryList(dormitoryListId, dormitoryListData);
}