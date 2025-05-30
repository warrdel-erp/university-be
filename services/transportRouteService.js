import {
    createTransportRoute,
    findAllTransportRoutes,
    findTransportRouteById,
    updateTransportRouteById,
    deleteTransportRouteById
} from "../repository/transportRouteRepository.js";

export const addTransportRouteService = async (data) => {
    try {
        return await createTransportRoute(data);
    } catch (error) {
        console.error("Error in addTransportRouteService:", error);
        throw error;
    }
};

export const getAllTransportRouteService = async (universityId,acedmicYearId,instituteId,role) => {
    try {
        return await findAllTransportRoutes(universityId,acedmicYearId,instituteId,role);
    } catch (error) {
        console.error("Error in getAllTransportRouteService:", error);
        throw error;
    }
};

export const getSingleTransportRouteService = async (id, universityId) => {
    try {
        return await findTransportRouteById(id, universityId);
    } catch (error) {
        console.error(`Error in getSingleTransportRouteService for ID ${id}:`, error);
        throw error;
    }
};

export const updateTransportRouteService = async (id, data) => {
    try {
        return await updateTransportRouteById(id, data);
    } catch (error) {
        console.error(`Error in updateTransportRouteService for ID ${id}:`, error);
        throw error;
    }
};

export const deleteTransportRouteService = async (id) => {
    try {
        return await deleteTransportRouteById(id);
    } catch (error) {
        console.error(`Error in deleteTransportRouteService for ID ${id}:`, error);
        throw error;
    }
};