import * as codeMasterRepository from '../repository/codeMasterRepository.js';

export async function getAllEmployeeType() {
    return codeMasterRepository.getAllEmployeeType();
}

export async function addEmployeeCode(data, createdBy) {
    await codeMasterRepository.getCodeMasterById(data.employeeCodeMasterId);
    const {
        universityId: _universityId,
        instituteId: _instituteId,
        createdBy: _createdBy,
        ...payload
    } = data;
    return codeMasterRepository.addEmployeeCode({
        ...payload,
        createdBy,
    });
}

export async function getEmployeeCodesTypes(employeeCodeMasterId, key, search) {
    return codeMasterRepository.getEmployeeCodesTypes(employeeCodeMasterId, key, search);
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
