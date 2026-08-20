import * as DormitoryListCreationService from "../repository/dormitoryListRepository.js";

export async function addDormitoryList(dormitoryListData, createdBy, updatedBy) {
  dormitoryListData.createdBy = createdBy;
  dormitoryListData.updatedBy = updatedBy;
  return DormitoryListCreationService.addDormitoryList(dormitoryListData);
}

export async function getDormitoryListDetails(page, limit, search) {
  return DormitoryListCreationService.getDormitoryListDetails(page, limit, search);
}

export async function getSingleDormitoryListDetails(dormitoryListId) {
  return DormitoryListCreationService.getSingleDormitoryListDetails(dormitoryListId);
}

export async function deleteDormitoryList(dormitoryListId) {
  return DormitoryListCreationService.deleteDormitoryList(dormitoryListId);
}

export async function updateDormitoryList(dormitoryListId, dormitoryListData, updatedBy) {
  dormitoryListData.updatedBy = updatedBy;
  return DormitoryListCreationService.updateDormitoryList(dormitoryListId, dormitoryListData);
}
