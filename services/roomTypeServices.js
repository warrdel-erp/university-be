import * as RoomTypeCreationService from "../repository/roomTypeRepository.js";

export async function addRoomType(roomTypeData, createdBy, updatedBy) {
    roomTypeData.createdBy = createdBy;
    roomTypeData.updatedBy = updatedBy;
    return await RoomTypeCreationService.addRoomType(roomTypeData);
};

export async function getRoomTypeDetails() {
    return await RoomTypeCreationService.getRoomTypeDetails();
}

export async function getSingleRoomTypeDetails(roomTypeId) {
    return await RoomTypeCreationService.getSingleRoomTypeDetails(roomTypeId);
}

export async function deleteRoomType(roomTypeId) {
    return await RoomTypeCreationService.deleteRoomType(roomTypeId);
}

export async function updateRoomType(roomTypeId, roomTypeData, updatedBy) {
    roomTypeData.updatedBy = updatedBy;
    return await RoomTypeCreationService.updateRoomType(roomTypeId, roomTypeData);
}
