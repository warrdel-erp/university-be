import * as codeMasterRepository from '../repository/codeMasterRepository.js';

export async function getAllEmployeeType(){
    return await codeMasterRepository.getAllEmployeeType()
};

export async function addEmployeeCode(data,createdBy){
    data.createdBy = createdBy;
    return await codeMasterRepository.addEmployeeCode(data)
};

export async function getEmployeeCodesTypes(employeeCodeMasterId, universityId, key) {
    return await codeMasterRepository.getEmployeeCodesTypes(employeeCodeMasterId, universityId, key);
}

export async function updateCodeMasterType(employeeCodeMasterTypeId,info){
    return await codeMasterRepository.updateCodeMasterType(employeeCodeMasterTypeId,info)
};

export async function deleteCodeMasterType(employeeCodeMasterTypeId){
    return await codeMasterRepository.deleteCodeMasterType(employeeCodeMasterTypeId)
};