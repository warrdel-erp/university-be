import * as DormitoryRoomCreationService  from "../repository/addDormitoryRepository.js";

export async function addDormitoryRoom(DormitoryRoomData, createdBy, updatedBy) {

        DormitoryRoomData.createdBy = createdBy;
        DormitoryRoomData.updatedBy = updatedBy;
        const DormitoryRoom = await DormitoryRoomCreationService.addDormitoryRoom(DormitoryRoomData);
        return DormitoryRoom;
};

export async function getDormitoryRoomDetails(universityId,acedmicYearId,role,instituteId) {
    return await DormitoryRoomCreationService.getDormitoryRoomDetails(universityId,acedmicYearId,role,instituteId);
}

export async function getSingleDormitoryRoomDetails(dormitoryListId,universityId) {
    return await DormitoryRoomCreationService.getSingleDormitoryRoomDetails(dormitoryListId,universityId);
}

export async function deleteDormitoryRoom(dormitoryListId) {
    return await DormitoryRoomCreationService.deleteDormitoryRoom(dormitoryListId);
}

export async function updateDormitoryRoom(dormitoryListId, DormitoryRoomData, updatedBy) {    

    DormitoryRoomData.updatedBy = updatedBy;
    await DormitoryRoomCreationService.updateDormitoryRoom(dormitoryListId, DormitoryRoomData);
}