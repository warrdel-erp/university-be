import * as transportVehicleRepository from "../repository/vehicleRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function createVehicle(vehicleData) {
  return withAuditEvent(AUDIT_EVENTS.VEHICLE_CREATE, async ({ transaction }) => {
    return transportVehicleRepository.createVehicle(vehicleData, transaction);
  });
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
  return withAuditEvent(AUDIT_EVENTS.VEHICLE_UPDATE, async ({ transaction }) => {
    const updatedBy = userId;
    const vehicleUpdate = { ...vehicleData, updatedBy };
    const [updatedRows] = await transportVehicleRepository.updateVehicle(vehicleId, vehicleUpdate, transaction);
    if (updatedRows === 0) throw new Error("Vehicle not found or no changes made");
    return updatedRows;
  });
}

export async function deleteVehicle(vehicleId) {
  return withAuditEvent(AUDIT_EVENTS.VEHICLE_DELETE, async ({ transaction }) => {
    const deletedRows = await transportVehicleRepository.deleteVehicle(vehicleId, transaction);
    if (deletedRows === 0) throw new Error("Vehicle not found");
    return deletedRows;
  });
}