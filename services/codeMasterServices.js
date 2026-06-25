import * as codeMasterRepository from '../repository/codeMasterRepository.js';

export async function getAllEmployeeType() {
    return codeMasterRepository.getAllEmployeeType();
}

export async function addEmployeeCode(data, createdBy) {
    await codeMasterRepository.getCodeMasterById(data.employeeCodeMasterId);
    data.createdBy = createdBy;
    return codeMasterRepository.addEmployeeCode(data);
}

export async function getEmployeeCodesTypes(employeeCodeMasterId, key) {
    return codeMasterRepository.getEmployeeCodesTypes(employeeCodeMasterId, key);
}

export async function updateCodeMasterType(employeeCodeMasterTypeId, info) {
    const {
        instituteId: _instituteId,
        universityId: _universityId,
        employeeCodeMasterTypeId: _typeId,
        employeeCodeMasterId: _masterId,
        createdBy: _createdBy,
        ...updateData
    } = info;
    return codeMasterRepository.updateCodeMasterType(employeeCodeMasterTypeId, updateData);
}

export async function deleteCodeMasterType(employeeCodeMasterTypeId) {
    return codeMasterRepository.deleteCodeMasterType(employeeCodeMasterTypeId);
}
