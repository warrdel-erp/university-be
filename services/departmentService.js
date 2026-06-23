import * as departmentCreationRepository  from "../repository/departmentRepository.js";
import { getSingleSubAccountDetails } from "../repository/subAccountRepository.js";

export async function addDepartment(departmentData, createdBy, updatedBy) {
    try {
        departmentData.createdBy = createdBy;
        departmentData.updatedBy = updatedBy;

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

    departmentData.updatedBy = updatedBy;
    await departmentCreationRepository.updateDepartment(departmentId, departmentData);
};

export async function getDepartmentByIdEmployee(departmentId) {
    try {
        const result = await getSingleSubAccountDetails(departmentId);

        if (!result) {
            throw new Error(`Department not found with ID: ${departmentId}`);
        }

        const departmentName = result.dataValues.departmentName;
        const employeeDetail = await departmentCreationRepository.employeeDetail(departmentName);

        return employeeDetail;
    } catch (error) {
        console.error('Error fetching employees by department ID:', error.message);
        throw error; 
    }
}
