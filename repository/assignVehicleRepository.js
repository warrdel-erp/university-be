import * as model from "../models/index.js";

export const addAssignVehicle = async (assignVehicleData) => {
    return await model.assignVehicleModel.create(assignVehicleData);
};

export const getAssignVehicle = async (universityId, acedmicYearId,role,instituteId) => {
    try {
        const result = await model.assignVehicleModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
            },
            include: [
                {
                    model: model.transportRouteModel,
                    as: 'transportRoute',
                    attributes: ["routeTitle", "fare"],
                    where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId })
                    }
                },
                {
                    model: model.vehicleModel,
                    as: 'vehicle',
                    attributes: ["vehicleNumber", "vehicleModel"],
                },
                {
                    model: model.userModel,
                    as: 'assignVehicleUser',
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    }
                }
            ]
        });

        return result;
    } catch (error) {
        console.error(`Error in getAssignVehicle:`, error);
        throw error;
    }
};

export const getSingleAssignVehicle = async (assignVehicleId, universityId) => {
    return await model.assignVehicleModel.findOne({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        include: [
            {
                model: model.transportRouteModel,
                as: 'transportRoute',
                attributes: ["routeTitle", "fare"],

            },
            {
                model: model.vehicleModel,
                as: 'vehicle',
                attributes: ["vehicleNumber", "vehicleModel"],
            },
            {
                model: model.userModel,
                as: 'assignVehicleUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }
        ],
        where: { assignVehicleId },
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
