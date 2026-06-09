import * as model from '../models/index.js'

export const createTransportRoute = async (data) => {
    try {
        return await model.transportRouteModel.create(data);
    } catch (error) {
        console.error("Error in createTransportRoute:", error);
        throw error;
    }
};

export const findAllTransportRoutes = async (universityId, acedmicYearId, instituteId) => {
    try {
        const whereClause = {
            universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
        };
        return await model.transportRouteModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: whereClause,
            include: [{
                model: model.userModel,
                as: "transportUser",
                attributes: ["universityId", "userId"],
                where: { universityId },
                required: true,
            }],
        });
    } catch (error) {
        console.error("Error in findAllTransportRoutes:", error);
        throw error;
    }
};

export const findTransportRouteById = async (transportRouteId, universityId, instituteId) => {
    try {
        return await model.transportRouteModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: {
                transportRouteId,
                universityId,
                ...(instituteId && { instituteId }),
            },
            include: [{
                model: model.userModel,
                as: "transportUser",
                attributes: ["universityId", "userId"],
                where: { universityId },
                required: true,
            }],
        });
    } catch (error) {
        console.error(`Error in findTransportRouteById for ID ${transportRouteId}:`, error);
        throw error;
    }
};

export const updateTransportRouteById = async (id, data) => {
    try {
        return await model.transportRouteModel.update(data, {
            where: { transportRouteId: id }
        });
    } catch (error) {
        console.error(`Error in updateTransportRouteById for ID ${id}:`, error);
        throw error;
    }
};

export const deleteTransportRouteById = async (id) => {
    try {
        return await model.transportRouteModel.destroy({
            where: { transportRouteId: id }
        });
    } catch (error) {
        console.error(`Error in deleteTransportRouteById for ID ${id}:`, error);
        throw error;
    }
};
