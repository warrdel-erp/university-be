import * as model from "../../../models/index.js";
import { buildScope, scoped } from "../../../utility/scoped.js";

export async function createVehicle(vehicleData, transaction) {
  const employee = await scoped(model.employeeModel).findOne({
    attributes: ["userId"],
    where: { userId: vehicleData.userId },
    transaction,
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  return scoped(model.vehicleModel).create(vehicleData, { transaction });
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

export async function getVehicleById(vehicleId, transaction) {
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
    transaction,
  });
}

export async function updateVehicle(vehicleId, vehicleData, transaction) {
  const existing = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId },
    transaction,
  });
  if (!existing) {
    return [0];
  }

  return scoped(model.vehicleModel).update(vehicleData, {
    where: { vehicleId },
    transaction,
    individualHooks: true,
  });
}

export async function deleteVehicle(vehicleId, transaction) {
  const existing = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId },
    transaction,
  });
  if (!existing) {
    return 0;
  }

  return scoped(model.vehicleModel).destroy({
    where: { vehicleId },
    transaction,
    individualHooks: true,
  });
}
