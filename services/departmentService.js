import * as departmentCreationRepository  from "../repository/departmentRepository.js";

export async function addDepartment(departmentData, createdBy, updatedBy, universityId) {
    try {
        departmentData.createdBy = createdBy;
        departmentData.updatedBy = updatedBy;
        departmentData.universityId = universityId;

        const subAccountId = departmentData.subAccountId;
        const department = await departmentCreationRepository.getlatestEntry(subAccountId);

        let departmentOrder = 1;

        if (department) {
            departmentOrder = department.dataValues.departmentOrder + 1;
        }

        const newDepartmentData = { ...departmentData, departmentOrder };

        const newDepartment = await departmentCreationRepository.addDepartment(newDepartmentData);

        return newDepartment;
    } catch (error) {
        console.error('Error adding department:', error);
        throw error;
    }
};

export async function getDepartmentDetails(universityId) {
    return await departmentCreationRepository.getDepartmentDetails(universityId);
}

export async function getSingleDepartmentDetails(departmentId,universityId) {
    return await departmentCreationRepository.getSingleDepartmentDetails(departmentId,universityId);
}

export async function deleteDepartment(departmentId) {
    return await departmentCreationRepository.deleteDepartment(departmentId);
}

export async function updateDepartment(departmentId, departmentData, updatedBy) {    

    departmentData.updatedBy = updatedBy;
    await departmentCreationRepository.updateDepartment(departmentId, departmentData);
};

export async function getAllAccount() {
    return await departmentCreationRepository.getAllAccount();
}