import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";

export async function addFloor(floorData, createdBy, updatedBy) {
  floorData.createdBy = createdBy;
  floorData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_FLOOR_CREATE, async ({ transaction }) => {
    return libraryStructureRepository.addFloor(floorData, transaction);
  });
}

export async function getFloorDetails() {
  return libraryStructureRepository.getFloorDetails();
}

export async function getSingleFloorDetails(libraryFloorId) {
  return libraryStructureRepository.getSingleFloorDetails(libraryFloorId);
}

export async function updateFloor(libraryFloorId, floorData, updatedBy) {
  floorData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_FLOOR_UPDATE, async ({ transaction }) => {
    return libraryStructureRepository.updateFloor(libraryFloorId, floorData, transaction);
  });
}

export async function deleteFloor(libraryFloorId) {
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_FLOOR_DELETE, async ({ transaction }) => {
    return libraryStructureRepository.deleteFloor(libraryFloorId, transaction);
  });
}

export async function addAisle(aisleData, createdBy, updatedBy) {
  aisleData.createdBy = createdBy;
  aisleData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_AISLE_CREATE, async ({ transaction }) => {
    return libraryStructureRepository.addAisle(aisleData, transaction);
  });
}

export async function getAisleDetails() {
  return libraryStructureRepository.getAisleDetails();
}

export async function getSingleAisle(libraryAisleId) {
  return libraryStructureRepository.getSingleAisle(libraryAisleId);
}

export async function updateAisle(libraryAisleId, aisleData, updatedBy) {
  aisleData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_AISLE_UPDATE, async ({ transaction }) => {
    return libraryStructureRepository.updateAisle(libraryAisleId, aisleData, transaction);
  });
}

export async function deleteAisle(libraryAisleId) {
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_AISLE_DELETE, async ({ transaction }) => {
    return libraryStructureRepository.deleteAisle(libraryAisleId, transaction);
  });
}

export async function addRack(rackData, createdBy, updatedBy) {
  rackData.createdBy = createdBy;
  rackData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_RACK_CREATE, async ({ transaction }) => {
    return libraryStructureRepository.addRack(rackData, transaction);
  });
}

export async function getRackDetails() {
  return libraryStructureRepository.getRackDetails();
}

export async function getSingleRack(libraryRackId) {
  return libraryStructureRepository.getSingleRack(libraryRackId);
}

export async function updateRack(libraryRackId, rackData, updatedBy) {
  rackData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_RACK_UPDATE, async ({ transaction }) => {
    return libraryStructureRepository.updateRack(libraryRackId, rackData, transaction);
  });
}

export async function deleteRack(libraryRackId) {
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_RACK_DELETE, async ({ transaction }) => {
    return libraryStructureRepository.deleteRack(libraryRackId, transaction);
  });
}

export async function addRow(rowData, createdBy, updatedBy) {
  rowData.createdBy = createdBy;
  rowData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_ROW_CREATE, async ({ transaction }) => {
    return libraryStructureRepository.addRow(rowData, transaction);
  });
}

export async function getRowDetails() {
  return libraryStructureRepository.getRowDetails();
}

export async function getSingleRow(libraryRowId) {
  return libraryStructureRepository.getSingleRow(libraryRowId);
}

export async function updateRow(libraryRowId, rowData, updatedBy) {
  rowData.updatedBy = updatedBy;
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_ROW_UPDATE, async ({ transaction }) => {
    return libraryStructureRepository.updateRow(libraryRowId, rowData, transaction);
  });
}

export async function deleteRow(libraryRowId) {
  return withAuditEvent(AUDIT_EVENTS.LIBRARY_ROW_DELETE, async ({ transaction }) => {
    return libraryStructureRepository.deleteRow(libraryRowId, transaction);
  });
}
