import * as model from "../models/index.js";

const createVehicle = async (vehicleData) => {
    return await model.vehicleModel.create(vehicleData);
};

const getAllVehicles = async (universityId, acedmicYearId,role,instituteId) => {
    try {
        const result = await model.vehicleModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
            },
            where:{
                ...(role === 'Head' && { instituteId })
            },
            include: [
                {
                    model: model.employeeModel,
                    as: "employee",
                    attributes: ["employee_name"],
                    where: {
                        ...(acedmicYearId && { acedmicYearId })
                    },
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

        return result;
    } catch (error) {
        console.error(`Error fetching vehicles:`, error);
        throw error;
    }
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