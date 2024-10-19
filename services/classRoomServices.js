import * as ClassRoomCreationService  from "../repository/classRoomRepository.js";

export async function addClassRoom(ClassRoomData, createdBy, updatedBy) {

        ClassRoomData.createdBy = createdBy;
        ClassRoomData.updatedBy = updatedBy;
        const ClassRoom = await ClassRoomCreationService.addClassRoom(ClassRoomData);
        return ClassRoom;
};

export async function getClassRoomDetails(universityId) {
    return await ClassRoomCreationService.getClassRoomDetails(universityId);
}

export async function getSingleClassRoomDetails(classRoomSectionId,universityId) {
    return await ClassRoomCreationService.getSingleClassRoomDetails(classRoomSectionId,universityId);
}

export async function deleteClassRoom(classRoomSectionId) {
    return await ClassRoomCreationService.deleteClassRoom(classRoomSectionId);
}

export async function updateClassRoom(classRoomSectionId, ClassRoomData, updatedBy) {    

    ClassRoomData.updatedBy = updatedBy;
    await ClassRoomCreationService.updateClassRoom(classRoomSectionId, ClassRoomData);
}