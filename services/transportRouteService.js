import {
  createTransportRoute,
  findAllTransportRoutes,
  findTransportRouteById,
  updateTransportRouteById,
  deleteTransportRouteById,
} from "../repository/transportRouteRepository.js";

export async function addTransportRouteService(data) {
  try {
    return createTransportRoute(data);
  } catch (error) {
    console.error("Error in addTransportRouteService:", error);
    throw error;
  }
}

export async function getAllTransportRouteService(page, limit, search) {
  try {
    return findAllTransportRoutes(page, limit, search);
  } catch (error) {
    console.error("Error in getAllTransportRouteService:", error);
    throw error;
  }
}

export async function getSingleTransportRouteService(id) {
  try {
    return findTransportRouteById(id);
  } catch (error) {
    console.error(`Error in getSingleTransportRouteService for ID ${id}:`, error);
    throw error;
  }
}

export async function updateTransportRouteService(id, data) {
  try {
    return updateTransportRouteById(id, data);
  } catch (error) {
    console.error(`Error in updateTransportRouteService for ID ${id}:`, error);
    throw error;
  }
}

export async function deleteTransportRouteService(id) {
  try {
    return deleteTransportRouteById(id);
  } catch (error) {
    console.error(`Error in deleteTransportRouteService for ID ${id}:`, error);
    throw error;
  }
}
