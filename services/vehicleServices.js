import * as transportVehicleRepository from "../repository/vehicleRepository.js";

export async function createVehicle(vehicleData) {
  try {
    return transportVehicleRepository.createVehicle(vehicleData);
  } catch (error) {
    throw new Error(`Failed to create vehicle: ${error.message}`);
  }
}

export async function getAllVehicles() {
  try {
    return transportVehicleRepository.getAllVehicles();
  } catch (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }
}

export async function getVehicleById(vehicleId) {
  try {
    const vehicle = await transportVehicleRepository.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");
    return vehicle;
  } catch (error) {
    throw new Error(`Failed to fetch vehicle: ${error.message}`);
  }
}

export async function updateVehicle(vehicleId, vehicleData, userId) {
  try {
    const updatedBy = userId;
    const vehicleUpdate = { ...vehicleData, updatedBy };
    const [updatedRows] = await transportVehicleRepository.updateVehicle(vehicleId, vehicleUpdate);
    if (updatedRows === 0) throw new Error("Vehicle not found or no changes made");
    return updatedRows;
  } catch (error) {
    throw new Error(`Failed to update vehicle: ${error.message}`);
  }
}

export async function deleteVehicle(vehicleId) {
  try {
    const deletedRows = await transportVehicleRepository.deleteVehicle(vehicleId);
    if (deletedRows === 0) throw new Error("Vehicle not found");
    return deletedRows;
  } catch (error) {
    throw new Error(`Failed to delete vehicle: ${error.message}`);
  }
}
