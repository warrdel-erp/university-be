import * as departmentCreationRepository from '../repository/departmentRepository.js';
import { getSingleSubAccountDetails } from '../repository/subAccountRepository.js';

export async function addDepartment(departmentData, createdBy, updatedBy) {
    const subAccount = await getSingleSubAccountDetails(departmentData.subAccountId);
    if (!subAccount) {
        throw new Error('Sub account not found for this institute');
    }

    departmentData.createdBy = createdBy;
    departmentData.updatedBy = updatedBy;

    const latest = await departmentCreationRepository.getlatestEntry(departmentData.subAccountId);
    const departmentOrder = latest
        ? (latest.departmentOrder ?? latest.dataValues?.departmentOrder) + 1
        : 1;

    return await departmentCreationRepository.addDepartment({ ...departmentData, departmentOrder });
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
    if (departmentData.subAccountId) {
        const subAccount = await getSingleSubAccountDetails(departmentData.subAccountId);
        if (!subAccount) {
            throw new Error('Sub account not found for this institute');
        }
    }

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
