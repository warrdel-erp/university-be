import * as libraryStructureRepository from "../repository/libraryStructureRepository.js";

export async function addFloor(floorData, createdBy, updatedBy) {
  floorData.createdBy = createdBy;
  floorData.updatedBy = updatedBy;
  return libraryStructureRepository.addFloor(floorData);
}

export async function getFloorDetails() {
  return libraryStructureRepository.getFloorDetails();
}

export async function getSingleFloorDetails(libraryFloorId) {
  return libraryStructureRepository.getSingleFloorDetails(libraryFloorId);
}

export async function updateFloor(libraryFloorId, floorData, updatedBy) {
  floorData.updatedBy = updatedBy;
  return libraryStructureRepository.updateFloor(libraryFloorId, floorData);
}

export async function deleteFloor(libraryFloorId) {
  return libraryStructureRepository.deleteFloor(libraryFloorId);
}

export async function addAisle(aisleData, createdBy, updatedBy) {
  aisleData.createdBy = createdBy;
  aisleData.updatedBy = updatedBy;
  return libraryStructureRepository.addAisle(aisleData);
}

export async function getAisleDetails() {
  return libraryStructureRepository.getAisleDetails();
}

export async function getSingleAisle(libraryAisleId) {
  return libraryStructureRepository.getSingleAisle(libraryAisleId);
}

export async function updateAisle(libraryAisleId, aisleData, updatedBy) {
  aisleData.updatedBy = updatedBy;
  return libraryStructureRepository.updateAisle(libraryAisleId, aisleData);
}

export async function deleteAisle(libraryAisleId) {
  return libraryStructureRepository.deleteAisle(libraryAisleId);
}

export async function addRack(rackData, createdBy, updatedBy) {
  rackData.createdBy = createdBy;
  rackData.updatedBy = updatedBy;
  return libraryStructureRepository.addRack(rackData);
}

export async function getRackDetails() {
  return libraryStructureRepository.getRackDetails();
}

export async function getSingleRack(libraryRackId) {
  return libraryStructureRepository.getSingleRack(libraryRackId);
}

export async function updateRack(libraryRackId, rackData, updatedBy) {
  rackData.updatedBy = updatedBy;
  return libraryStructureRepository.updateRack(libraryRackId, rackData);
}

export async function deleteRack(libraryRackId) {
  return libraryStructureRepository.deleteRack(libraryRackId);
}

export async function addRow(rowData, createdBy, updatedBy) {
  rowData.createdBy = createdBy;
  rowData.updatedBy = updatedBy;
  return libraryStructureRepository.addRow(rowData);
}

export async function getRowDetails() {
  return libraryStructureRepository.getRowDetails();
}

export async function getSingleRow(libraryRowId) {
  return libraryStructureRepository.getSingleRow(libraryRowId);
}

export async function updateRow(libraryRowId, rowData, updatedBy) {
  rowData.updatedBy = updatedBy;
  return libraryStructureRepository.updateRow(libraryRowId, rowData);
}

export async function deleteRow(libraryRowId) {
  return libraryStructureRepository.deleteRow(libraryRowId);
}
