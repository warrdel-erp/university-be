import * as codeMasterRepository from "../repository/codeMasterRepository.js";

export async function getAllEmployeeType() {
  return codeMasterRepository.getAllEmployeeType();
}

export async function addEmployeeCode(data, createdBy) {
  data.createdBy = createdBy;
  return codeMasterRepository.addEmployeeCode(data);
}

export async function getEmployeeCodesTypes(employeeCodeMasterId, key) {
  return codeMasterRepository.getEmployeeCodesTypes(employeeCodeMasterId, key);
}

export async function updateCodeMasterType(employeeCodeMasterTypeId, info) {
  return codeMasterRepository.updateCodeMasterType(employeeCodeMasterTypeId, info);
}

export async function deleteCodeMasterType(employeeCodeMasterTypeId) {
  return codeMasterRepository.deleteCodeMasterType(employeeCodeMasterTypeId);
}
