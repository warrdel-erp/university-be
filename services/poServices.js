import * as poCreationService  from "../repository/poRepository.js";

export async function addPo(poData, createdBy, updatedBy,universityId,instituteId) {

        poData.createdBy = createdBy;
        poData.updatedBy = updatedBy;
        poData.universityId = universityId;
        poData.instituteId =instituteId;
        const po = await poCreationService.addPo(poData);
        return po;
};

export async function getPoDetails(universityId,instituteId,role,acedmicYearId) {
    return await poCreationService.getPoDetails(universityId,instituteId,role,acedmicYearId);
}

export async function getSinglePoDetails(poId,universityId) {
    return await poCreationService.getSinglePoDetails(poId,universityId);
}

export async function updatePo(poId, poData, updatedBy) {    
        poData.updatedBy = updatedBy;
       return await poCreationService.updatePo(poId, poData);
}

export async function deletePo(poId) {
    return await poCreationService.deletePo(poId);
}