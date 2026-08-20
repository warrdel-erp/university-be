import {
  addAssignVehicle as addAssignVehicleRepo,
  getAssignVehicle as getAssignVehicleRepo,
  getSingleAssignVehicle as getSingleAssignVehicleRepo,
  updateAssignVehicle as updateAssignVehicleRepo,
  deleteAssignVehicle as deleteAssignVehicleRepo,
} from "../repository/assignVehicleRepository.js";

export async function addAssignVehicle(assignVehicleData) {
  try {
    return addAssignVehicleRepo(assignVehicleData);
  } catch (error) {
    throw new Error(`Failed to create vehicle assignment: ${error.message}`);
  }
}

export async function getAssignVehicle(page, limit, search) {
  try {
    return getAssignVehicleRepo(page, limit, search);
  } catch (error) {
    throw new Error(`Failed to fetch vehicle assignments: ${error.message}`);
  }
}

export async function getSingleAssignVehicle(assignVehicleId) {
  try {
    const vehicle = await getSingleAssignVehicleRepo(assignVehicleId);
    if (!vehicle) throw new Error("Vehicle assignment not found");
    return vehicle;
  } catch (error) {
    throw new Error(`Failed to fetch vehicle assignment: ${error.message}`);
  }
}

export async function updateAssignVehicle(assignVehicleId, assignVehicleData, userId) {
  try {
    const updatedBy = userId;
    const vehicleUpdate = { ...assignVehicleData, updatedBy };
    const [updatedRows] = await updateAssignVehicleRepo(assignVehicleId, vehicleUpdate);
    if (updatedRows === 0) throw new Error("Vehicle assignment not found or no changes made");
    return updatedRows;
  } catch (error) {
    throw new Error(`Failed to update vehicle assignment: ${error.message}`);
  }
}

export async function deleteAssignVehicle(assignVehicleId) {
  try {
    const deletedRows = await deleteAssignVehicleRepo(assignVehicleId);
    if (deletedRows === 0) throw new Error("Vehicle assignment not found");
    return deletedRows;
  } catch (error) {
    throw new Error(`Failed to delete vehicle assignment: ${error.message}`);
  }
}
