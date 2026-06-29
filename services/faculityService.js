import * as faculityLoadRepository from "../repository/faculityLoadRepository.js";

export async function addFaculityLoad(data, createdBy, updatedBy) {
  data.createdBy = createdBy;
  data.updatedBy = updatedBy;
  return faculityLoadRepository.addFaculityLoad(data);
}

export async function getFaculityLoadDetails() {
  return faculityLoadRepository.getFaculityLoadDetails();
}

export async function getSingleFaculityLoadDetails(employeeId) {
  return faculityLoadRepository.getSingleFaculityLoadDetails(employeeId);
}

export async function updateFaculityLoad(faculityLoadId, info, updatedBy) {
  try {
    info.updatedBy = updatedBy;
    return faculityLoadRepository.updateFaculityLoad(faculityLoadId, info);
  } catch (error) {
    console.error("Error updating faculity load:", error);
    throw new Error("Failed to update time table");
  }
}

export async function deleteFaculityLoad(faculityLoadId) {
  return faculityLoadRepository.deleteFaculityLoad(faculityLoadId);
}
