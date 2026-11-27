import * as model from "../../../models/index.js";
import { buildScope, scoped } from "../../../utility/scoped.js";

export async function addAssignVehicle(assignVehicleData, transaction) {
  const route = await scoped(model.transportRouteModel).findOne({
    attributes: ["transportRouteId"],
    where: { transportRouteId: assignVehicleData.transportRouteId },
    transaction,
  });
  if (!route) {
    throw new Error("Transport route not found");
  }

  const vehicle = await scoped(model.vehicleModel).findOne({
    attributes: ["vehicleId"],
    where: { vehicleId: assignVehicleData.vehicleId },
    transaction,
  });
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }

  return scoped(model.assignVehicleModel).create(assignVehicleData, { transaction });
}

export async function getAssignVehicle() {
  try {
    return scoped(model.assignVehicleModel).findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      include: [
        {
          model: model.transportRouteModel,
          as: "transportRoute",
          attributes: ["routeTitle", "fare", "academicYearId", "instituteId"],
          where: buildScope(model.transportRouteModel),
          required: true,
        },
        {
          model: model.vehicleModel,
          as: "vehicle",
          attributes: ["vehicleNumber", "vehicleModel", "instituteId"],
          where: buildScope(model.vehicleModel),
          required: true,
        },
        {
          model: model.userModel,
          as: "assignVehicleUser",
          attributes: ["universityId", "userId"],
          where: buildScope(model.userModel),
          required: true,
        },
      ],
    });
  } catch (error) {
    console.error("Error in getAssignVehicle:", error);
    throw error;
  }
}

export async function getSingleAssignVehicle(assignVehicleId, transaction) {
  return scoped(model.assignVehicleModel).findOne({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
    where: { assignVehicleId },
    include: [
      {
        model: model.transportRouteModel,
        as: "transportRoute",
        attributes: ["routeTitle", "fare", "academicYearId", "instituteId"],
        where: buildScope(model.transportRouteModel),
        required: true,
      },
      {
        model: model.vehicleModel,
        as: "vehicle",
        attributes: ["vehicleNumber", "vehicleModel", "instituteId"],
        where: buildScope(model.vehicleModel),
        required: true,
      },
      {
        model: model.userModel,
        as: "assignVehicleUser",
        attributes: ["universityId", "userId"],
        where: buildScope(model.userModel),
        required: true,
      },
    ],
    transaction,
  });
}

export async function updateAssignVehicle(assignVehicleId, vehicleData, transaction) {
  const existing = await getSingleAssignVehicle(assignVehicleId, transaction);
  if (!existing) {
    return [0];
  }

  if (vehicleData.transportRouteId) {
    const route = await scoped(model.transportRouteModel).findOne({
      attributes: ["transportRouteId"],
      where: { transportRouteId: vehicleData.transportRouteId },
      transaction,
    });
    if (!route) {
      return [0];
    }
  }

  if (vehicleData.vehicleId) {
    const vehicle = await scoped(model.vehicleModel).findOne({
      attributes: ["vehicleId"],
      where: { vehicleId: vehicleData.vehicleId },
      transaction,
    });
    if (!vehicle) {
      return [0];
    }
  }

  return scoped(model.assignVehicleModel).update(vehicleData, {
    where: { assignVehicleId },
    transaction,
    individualHooks: true,
  });
}

export async function deleteAssignVehicle(assignVehicleId, transaction) {
  const existing = await getSingleAssignVehicle(assignVehicleId, transaction);
  if (!existing) {
    return 0;
  }

  return scoped(model.assignVehicleModel).destroy({
    where: { assignVehicleId },
    transaction,
    individualHooks: true,
  });
}
