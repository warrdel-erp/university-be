import * as departmentCreationRepository from '../repository/departmentRepository.js';

export async function addDepartment(departmentData, createdBy, updatedBy) {
    departmentData.createdBy = createdBy;
    departmentData.updatedBy = updatedBy;
    return await departmentCreationRepository.addDepartment(departmentData);
}

export async function getDepartmentDetails() {
    return await departmentCreationRepository.getDepartmentDetails();
}

export async function getSingleDepartmentDetails(departmentId) {
    return await departmentCreationRepository.getSingleDepartmentDetails(departmentId);
}

export async function deleteDepartment(departmentId) {
    return await departmentCreationRepository.deleteDepartment(departmentId);
}

export async function updateDepartment(departmentId, departmentData, updatedBy) {
    const {
        instituteId: _instituteId,
        universityId: _universityId,
        departmentId: _departmentId,
        ...updateData
    } = departmentData;
    updateData.updatedBy = updatedBy;
    return await departmentCreationRepository.updateDepartment(departmentId, updateData);
}

export async function getDepartmentByIdEmployee(departmentId) {
    const department = await departmentCreationRepository.getSingleDepartmentDetails(departmentId);
    if (!department) {
        return null;
    }

    const departmentName = department.departmentName ?? department.dataValues?.departmentName;
    return await departmentCreationRepository.employeeDetail(departmentName);
}
