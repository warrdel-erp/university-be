import * as codeMasterRepository from '../repository/codeMasterRepository.js';

export async function getAllEmployeeType(){
    return await codeMasterRepository.getAllEmployeeType()
};

export async function addEmployeeCode(data){
    return await codeMasterRepository.addEmployeeCode(data)
};

export async function getEmployeeCodesTypes(employeeCodeMasterId){
    return await codeMasterRepository.getEmployeeCodesTypes(employeeCodeMasterId)
};

export async function updateCodeMasterType(employeeCodeMasterTypeId,info){
    return await codeMasterRepository.updateCodeMasterType(employeeCodeMasterTypeId,info)
};

export async function deleteCodeMasterType(employeeCodeMasterTypeId){
    return await codeMasterRepository.deleteCodeMasterType(employeeCodeMasterTypeId)
};