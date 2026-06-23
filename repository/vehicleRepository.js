import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function createVehicle(vehicleData) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["employeeId"],
    where: { employeeId: vehicleData.employeeId },
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  return scoped(model.vehicleModel).create(vehicleData);
}

export async function getAllVehicles() {
  try {
    return scoped(model.vehicleModel).findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      include: [
        {
          model: model.employeeModel,
          as: "employee",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: buildScope(model.employeeModel),
          required: true,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
}

export async function getVehicleById(vehicleId) {
  return scoped(model.vehicleModel).findOne({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
    where: { vehicleId },
    include: [
      {
        model: model.employeeModel,
        as: "employee",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
        where: buildScope(model.employeeModel),
        required: true,
      },
    ],
  });
}

export async function updateVehicle(vehicleId, vehicleData) {
  const existing = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId },
  });
  if (!existing) {
    return [0];
  }

  return scoped(model.vehicleModel).update(vehicleData, {
    where: { vehicleId },
  });
}

export async function deleteVehicle(vehicleId) {
  const existing = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId },
  });
  if (!existing) {
    return 0;
  }

  return scoped(model.vehicleModel).destroy({
    where: { vehicleId },
  });
}
