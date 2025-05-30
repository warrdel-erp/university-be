import * as RoomTypeCreationService  from "../repository/roomTypeRepository.js";

export async function addRoomType(RoomTypeData, createdBy, updatedBy,universityId,instituteId) {

        RoomTypeData.createdBy = createdBy;
        RoomTypeData.updatedBy = updatedBy;
        RoomTypeData.universityId =universityId;
        RoomTypeData.instituteId = instituteId 
        const RoomType = await RoomTypeCreationService.addRoomType(RoomTypeData);
        return RoomType;
};

export async function getRoomTypeDetails(universityId,acedmicYearId,role,instituteId) {
    return await RoomTypeCreationService.getRoomTypeDetails(universityId,acedmicYearId,role,instituteId);
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