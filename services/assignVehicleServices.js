import {
    addAssignVehicle as addAssignVehicleRepo,
    getAssignVehicle as getAssignVehicleRepo,
    getSingleAssignVehicle as getSingleAssignVehicleRepo,
    updateAssignVehicle as updateAssignVehicleRepo,
    deleteAssignVehicle as deleteAssignVehicleRepo
} from '../repository/assignVehicleRepository.js';

 
export const addAssignVehicle = async (assignVehicleData) => {
    try {
        return await addAssignVehicleRepo(assignVehicleData);
    } catch (error) {
        throw new Error(`Failed to create vehicle: ${error.message}`);
    }
};
 
export const getAssignVehicle = async (universityId,acedmicYearId) => {
    try {
        return await getAssignVehicleRepo(universityId,acedmicYearId);
    } catch (error) {
        throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }
};
 
export const getSingleAssignVehicle = async (assignVehicleId, universityId) => {
    try {
        const vehicle = await getSingleAssignVehicleRepo(assignVehicleId, universityId);
        if (!vehicle) throw new Error('Vehicle not found');
        return vehicle;
    } catch (error) {
        throw new Error(`Failed to fetch vehicle: ${error.message}`);
    }
};
 
export const updateAssignVehicle = async (assignVehicleId, assignVehicleData, userId) => {
    try {
        const updatedBy = userId;
        const vehicleUpdate = { ...assignVehicleData, updatedBy };
        const [updatedRows] = await updateAssignVehicleRepo(assignVehicleId, vehicleUpdate);
        if (updatedRows === 0) throw new Error('Vehicle not found or no changes made');
        return updatedRows;
    } catch (error) {
        throw new Error(`Failed to update vehicle: ${error.message}`);
    }
};

 
export const deleteAssignVehicle = async (assignVehicleId) => {
    try {
        const deletedRows = await deleteAssignVehicleRepo(assignVehicleId);
        if (deletedRows === 0) throw new Error('Vehicle not found');
        return deletedRows;
    } catch (error) {
        throw new Error(`Failed to delete vehicle: ${error.message}`);
    }
};
