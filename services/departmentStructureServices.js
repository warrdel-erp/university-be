import * as departmentStructureCreationService  from "../repository/departmentStructureRepository.js";

export async function addDepartmentStructure(departmentStructureData, createdBy, updatedBy,universityId) {

        departmentStructureData.createdBy = createdBy;
        departmentStructureData.updatedBy = updatedBy;
        departmentStructureData.universityId = universityId;
        const departmentStructure = await departmentStructureCreationService.addDepartmentStructure(departmentStructureData);
        return departmentStructure;
};

export async function getdepartmentStructureDetails(universityId) {
    return await departmentStructureCreationService.getdepartmentStructureDetails(universityId);
}

export async function getSingledepartmentStructureDetails(departmentStructureId,universityId) {
    return await departmentStructureCreationService.getSingledepartmentStructureDetails(departmentStructureId,universityId);
}

export async function deletedepartmentStructure(departmentStructureId) {
    return await departmentStructureCreationService.deletedepartmentStructure(departmentStructureId);
}

export async function updatedepartmentStructure(departmentStructureId, departmentStructureData, updatedBy) {    

    departmentStructureData.updatedBy = updatedBy;
    await departmentStructureCreationService.updatedepartmentStructure(departmentStructureId, departmentStructureData);
}