import * as faculityLoadRepository from '../repository/faculityLoadRepository.js';

export async function addFaculityLoad(data, createdBy, updatedBy) {
    data.createdBy = createdBy;
    data.updatedBy = updatedBy;
    return await faculityLoadRepository.addFaculityLoad(data);
}

export async function getFaculityLoadDetails(universityId,acedmicYearId){
    return await faculityLoadRepository.getFaculityLoadDetails(universityId,acedmicYearId)
};

export async function getSingleFaculityLoadDetails(employeeId,universityId){
    return await faculityLoadRepository.getSingleFaculityLoadDetails(employeeId,universityId)
};

export async function updateFaculityLoad(faculityLoadId,info,updatedBy) {
    try {
        info.updatedBy = updatedBy;
        const data = await faculityLoadRepository.updateFaculityLoad(faculityLoadId, info);
        return data; 
    } catch (error) {
        console.error('Error updating faculity load:', error);
        throw new Error('Failed to update time table'); 
    }
};

export async function deleteFaculityLoad(faculityLoadId){
    return await faculityLoadRepository.deleteFaculityLoad(faculityLoadId)
};