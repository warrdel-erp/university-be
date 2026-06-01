import * as model from "../models/index.js";

export const addAssignVehicle = async (assignVehicleData) => {
    return await model.assignVehicleModel.create(assignVehicleData);
};

export const getAssignVehicle = async (universityId, acedmicYearId, instituteId) => {
    try {
        const transportRouteWhere = {
            universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
        };

        const result = await model.assignVehicleModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
            },
            include: [
                {
                    model: model.transportRouteModel,
                    as: "transportRoute",
                    attributes: ["routeTitle", "fare", "acedmicYearId", "instituteId"],
                    where: transportRouteWhere,
                    required: true,
                },
                {
                    model: model.vehicleModel,
                    as: "vehicle",
                    attributes: ["vehicleNumber", "vehicleModel", "instituteId"],
                    ...(instituteId && { where: { instituteId }, required: true }),
                },
                {
                    model: model.userModel,
                    as: "assignVehicleUser",
                    attributes: ["universityId", "userId"],
                    where: { universityId },
                    required: true,
                },
            ],
        });

        return result;
    } catch (error) {
        console.error(`Error in getAssignVehicle:`, error);
        throw error;
    }
};

export const getSingleAssignVehicle = async (assignVehicleId, universityId, instituteId) => {
    return await model.assignVehicleModel.findOne({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        where: { assignVehicleId },
        include: [
            {
                model: model.transportRouteModel,
                as: "transportRoute",
                attributes: ["routeTitle", "fare", "acedmicYearId", "instituteId"],
                where: {
                    universityId,
                    ...(instituteId && { instituteId }),
                },
                required: true,
            },
            {
                model: model.vehicleModel,
                as: "vehicle",
                attributes: ["vehicleNumber", "vehicleModel", "instituteId"],
                ...(instituteId && { where: { instituteId }, required: true }),
            },
            {
                model: model.userModel,
                as: "assignVehicleUser",
                attributes: ["universityId", "userId"],
                where: { universityId },
                required: true,
            },
        ],
    });
};

export const updateAssignVehicle = async (assignVehicleId, vehicleData) => {
    return await model.assignVehicleModel.update(vehicleData, {
        where: { assignVehicleId }
    });
};

export const deleteAssignVehicle = async (assignVehicleId) => {
    return await model.assignVehicleModel.destroy({
        where: { assignVehicleId }
    });
};
