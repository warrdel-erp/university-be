import * as model from "../models/index.js";

const createVehicle = async (vehicleData) => {
    return await model.vehicleModel.create(vehicleData);
};

const getAllVehicles = async (universityId, acedmicYearId, instituteId) => {
    try {
        const employeeWhere = {
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
        };

        const result = await model.vehicleModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
            },
            where: {
                ...(instituteId && { instituteId }),
            },
            include: [
                {
                    model: model.employeeModel,
                    as: "employee",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    where: employeeWhere,
                    required: Object.keys(employeeWhere).length > 0,
                },
            ],
        });

        return result;
    } catch (error) {
        console.error(`Error fetching vehicles:`, error);
        throw error;
    }
};

const getVehicleById = async (vehicleId, universityId, instituteId) => {
    return await model.vehicleModel.findOne({
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        where: {
            vehicleId,
            ...(instituteId && { instituteId }),
        },
        include: [
            {
                model: model.userModel,
                as: "vehicleUser",
                attributes: ["universityId", "userId"],
                where: { universityId },
                required: true,
            },
        ],
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