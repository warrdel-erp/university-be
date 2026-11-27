import {
  addAssignVehicle as addAssignVehicleRepo,
  getAssignVehicle as getAssignVehicleRepo,
  getSingleAssignVehicle as getSingleAssignVehicleRepo,
  updateAssignVehicle as updateAssignVehicleRepo,
  deleteAssignVehicle as deleteAssignVehicleRepo,
} from "../repository/assignVehicleRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addAssignVehicle(assignVehicleData) {
  return withAuditEvent(AUDIT_EVENTS.ASSIGN_VEHICLE_CREATE, async ({ transaction }) => {
    return addAssignVehicleRepo(assignVehicleData, transaction);
  });
}

export async function getAssignVehicle() {
  try {
    return getAssignVehicleRepo();
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
  return withAuditEvent(AUDIT_EVENTS.ASSIGN_VEHICLE_UPDATE, async ({ transaction }) => {
    const updatedBy = userId;
    const vehicleUpdate = { ...assignVehicleData, updatedBy };
    const [updatedRows] = await updateAssignVehicleRepo(assignVehicleId, vehicleUpdate, transaction);
    if (updatedRows === 0) throw new Error("Vehicle assignment not found or no changes made");
    return updatedRows;
  });
}

export async function deleteAssignVehicle(assignVehicleId) {
  return withAuditEvent(AUDIT_EVENTS.ASSIGN_VEHICLE_DELETE, async ({ transaction }) => {
    const deletedRows = await deleteAssignVehicleRepo(assignVehicleId, transaction);
    if (deletedRows === 0) throw new Error("Vehicle assignment not found");
    return deletedRows;
  });
}