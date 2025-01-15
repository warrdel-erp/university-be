import * as model from '../models/index.js'

export const createTransportRoute = async (data) => {
    try {
        return await model.transportRouteModel.create(data);
    } catch (error) {
        console.error("Error in createTransportRoute:", error);
        throw error;
    }
};

export const findAllTransportRoutes = async (universityId) => {
    try {
        return await model.transportRouteModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
             include: [{
                model: model.userModel,
                 as: 'transportUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }]
        });
    } catch (error) {
        console.error("Error in findAllTransportRoutes:", error);
        throw error;
    }
};

export const findTransportRouteById = async (transportRouteId, universityId) => {
    try {
        return await model.transportRouteModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            include: [{
                model: model.userModel,
                as: 'transportUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }],
            where: { transportRouteId },
        });
    } catch (error) {
        console.error(`Error in findTransportRouteById for ID ${id}:`, error);
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
