import * as model from "../models/index.js";

const createVehicle = async (vehicleData) => {
    return await model.vehicleModel.create(vehicleData);
};

const getAllVehicles = async (universityId) => {
    return await model.vehicleModel.findAll({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        include: [
            {
                model: model.employeeModel,
                as: "employee",
                attributes: ["employee_name"],
            },
            {
                model: model.userModel,
                as: 'vehicleUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }
        ]
    });
};

const getVehicleById = async (vehicleId, universityId) => {
    return await model.vehicleModel.findOne({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        include: [
            {
                model: model.userModel,
                as: 'vehicleUser',
                attributes: ["universityId", "userId"],
                where: {
                    universityId: universityId
                }
            }
        ],
        where: { vehicleId },
    });
};

const updateVehicle = async (vehicleId, vehicleData) => {
    return await model.vehicleModel.update(vehicleData, {
        where: { vehicleId }
    });
};

const deleteVehicle = async (vehicleId) => {
    return await model.vehicleModel.destroy({
        where: { vehicleId }
    });
};


export default {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
};