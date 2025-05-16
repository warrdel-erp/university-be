import * as RoomTypeCreationService  from "../repository/roomTypeRepository.js";

export async function addRoomType(RoomTypeData, createdBy, updatedBy) {

        RoomTypeData.createdBy = createdBy;
        RoomTypeData.updatedBy = updatedBy;
        const RoomType = await RoomTypeCreationService.addRoomType(RoomTypeData);
        return RoomType;
};

export async function getRoomTypeDetails(universityId,acedmicYearId) {
    return await RoomTypeCreationService.getRoomTypeDetails(universityId,acedmicYearId);
}

export async function getSingleRoomTypeDetails(roomTypeId,universityId) {
    return await RoomTypeCreationService.getSingleRoomTypeDetails(roomTypeId,universityId);
}

export async function deleteRoomType(roomTypeId) {
    return await RoomTypeCreationService.deleteRoomType(roomTypeId);
}

export async function updateRoomType(roomTypeId, RoomTypeData, updatedBy) {    

    RoomTypeData.updatedBy = updatedBy;
    await RoomTypeCreationService.updateRoomType(roomTypeId, RoomTypeData);
}