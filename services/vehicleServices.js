import transportVehicleRepository from '../repository/vehicleRepository.js';

const createVehicle = async (vehicleData) => {
    try {
        return await transportVehicleRepository.createVehicle(vehicleData);
    } catch (error) {
        throw new Error(`Failed to create vehicle: ${error.message}`);
    }
};

const getAllVehicles = async (universityId,acedmicYearId,role,instituteId) => {
    try {
        return await transportVehicleRepository.getAllVehicles(universityId,acedmicYearId,role,instituteId);
    } catch (error) {
        throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }
};

const getVehicleById = async (vehicleId, universityId) => {
    try {
        const vehicle = await transportVehicleRepository.getVehicleById(vehicleId, universityId);
        if (!vehicle) throw new Error('Vehicle not found');
        return vehicle;
    } catch (error) {
        throw new Error(`Failed to fetch vehicle: ${error.message}`);
    }
};

const updateVehicle = async (vehicleId, vehicleData, userId) => {
    try {
        const updatedBy = userId;
        const vehicleUpdate = { ...vehicleData, updatedBy };
        const [updatedRows] = await transportVehicleRepository.updateVehicle(vehicleId, vehicleUpdate);
        if (updatedRows === 0) throw new Error('Vehicle not found or no changes made');
        return updatedRows;
    } catch (error) {
        throw new Error(`Failed to update vehicle: ${error.message}`);
    }
};

const deleteVehicle = async (vehicleId) => {
    try {
        const deletedRows = await transportVehicleRepository.deleteVehicle(vehicleId);
        if (deletedRows === 0) throw new Error('Vehicle not found');
        return deletedRows;
    } catch (error) {
        throw new Error(`Failed to delete vehicle: ${error.message}`);
    }
};

export default {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
};