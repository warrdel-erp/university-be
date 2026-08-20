import * as DormitoryRoomCreationService from "../repository/addDormitoryRepository.js";

export async function addDormitoryRoom(DormitoryRoomData, createdBy, updatedBy) {
  DormitoryRoomData.createdBy = createdBy;
  DormitoryRoomData.updatedBy = updatedBy;
  return DormitoryRoomCreationService.addDormitoryRoom(DormitoryRoomData);
}

export async function getDormitoryRoomDetails(page, limit, search) {
  return DormitoryRoomCreationService.getDormitoryRoomDetails(page, limit, search);
}

export async function getSingleDormitoryRoomDetails(dormitoryListId) {
  return DormitoryRoomCreationService.getSingleDormitoryRoomDetails(dormitoryListId);
}

export async function deleteDormitoryRoom(dormitoryListId) {
  return DormitoryRoomCreationService.deleteDormitoryRoom(dormitoryListId);
}

export async function updateDormitoryRoom(dormitoryListId, DormitoryRoomData, updatedBy) {
  DormitoryRoomData.updatedBy = updatedBy;
  return DormitoryRoomCreationService.updateDormitoryRoom(dormitoryListId, DormitoryRoomData);
}
