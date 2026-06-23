import * as departmentStructureCreationService from "../repository/departmentStructureRepository.js";

export async function addDepartmentStructure(departmentStructureData, createdBy, updatedBy) {
    departmentStructureData.createdBy = createdBy;
    departmentStructureData.updatedBy = updatedBy;
    return await departmentStructureCreationService.addDepartmentStructure(departmentStructureData);
};

export async function getdepartmentStructureDetails() {
    return await departmentStructureCreationService.getdepartmentStructureDetails();
}

export async function getSingledepartmentStructureDetails(departmentStructureId) {
    return await departmentStructureCreationService.getSingledepartmentStructureDetails(departmentStructureId);
}

export async function deletedepartmentStructure(departmentStructureId) {
    return await departmentStructureCreationService.deletedepartmentStructure(departmentStructureId);
}

export async function updatedepartmentStructure(departmentStructureId, departmentStructureData, updatedBy) {
    departmentStructureData.updatedBy = updatedBy;
    return await departmentStructureCreationService.updatedepartmentStructure(departmentStructureId, departmentStructureData);
}
