import * as headCreationService  from "../repository/headRepository.js";

export async function addHead(headData, createdBy, updatedBy,universityId) {

        headData.createdBy = createdBy;
        headData.updatedBy = updatedBy;
        headData.universityId = universityId;
        const Head = await headCreationService.addHead(headData);
        return Head;
};

export async function getHeadDetails(universityId) {
    return await headCreationService.getHeadDetails(universityId);
}

export async function getSingleHeadDetails(headId,universityId) {
    return await headCreationService.getSingleHeadDetails(headId,universityId);
}

export async function deleteHead(headId) {
    return await headCreationService.deleteHead(headId);
}

export async function updateHead(headId, headData, updatedBy) {    

    headData.updatedBy = updatedBy;
    await headCreationService.updateHead(headId, headData);
}