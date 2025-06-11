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

export async function getSinglePoDetails(PoId,universityId) {
    return await poCreationService.getSinglePoDetails(PoId,universityId);
}

export async function updatePo(PoId, poData, updatedBy) {    
        poData.updatedBy = updatedBy;
       return await poCreationService.updatePo(PoId, poData);
}

export async function deletePo(PoId) {
    return await poCreationService.deletePo(PoId);
}